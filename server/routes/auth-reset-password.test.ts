/**
 * Test alur Lupa Password & Reset Password (F6.5 / Item #27).
 */

const mockKueri = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: mockKueri,
      release: () => undefined,
    }),
  },
}));

jest.mock("../middleware/socketAuth", () => ({
  __esModule: true,
  roomPengguna: () => "room",
  sidikToken: () => "sidik",
}));

jest.mock("../services/email.service", () => ({
  __esModule: true,
  kirimEmailSelamatDatang: jest.fn().mockResolvedValue({ success: true }),
  kirimEmailResetPassword: jest.fn().mockResolvedValue({ success: true }),
  kirimEmailPasswordBaru: jest.fn().mockResolvedValue({ success: true }),
  kirimEmailTaskDigest: jest.fn().mockResolvedValue({ success: true }),
  emailTerkonfigurasi: () => false,
  // Wajib ada sejak #277: pemanggil non-blocking kini melewati helper ini.
  kirimEmailLatarBelakang: jest.fn(),
}));

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import authRoutes from "./auth.routes";
import { getJwtSecret } from "../helpers/jwtSecret";
import { kirimEmailPasswordBaru, kirimEmailResetPassword } from "../services/email.service";

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authRoutes);
  return app;
};

describe("Auth Routes - Forgot Password & Reset Password (Item #27)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockKueri.mockReset();
    jest.clearAllMocks();
    (kirimEmailPasswordBaru as jest.Mock).mockResolvedValue({ success: true });
    (kirimEmailResetPassword as jest.Mock).mockResolvedValue({ success: true });
    process.env = {
      ...originalEnv,
      JWT_SECRET: "test-jwt-secret-key-1234567890",
      APP_URL: "http://localhost:3000",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("POST /api/auth/forgot-password", () => {
    it("menolak permintaan bila format email tidak valid", async () => {
      const res = await request(buatApp())
        .post("/api/auth/forgot-password")
        .send({ email: "bukan-email" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Alamat email tidak valid");
    });

    /**
     * #451 — keputusan pemilik: email tidak terdaftar → 404 eksplisit
     * (membatalkan balasan netral #121 untuk alur sandi sementara).
     */
    it("menolak dengan pesan jelas bila email tidak terdaftar", async () => {
      mockKueri.mockResolvedValueOnce([[]]); // tidak ada pengguna

      const res = await request(buatApp())
        .post("/api/auth/forgot-password")
        .send({ email: "unknown@lanpro.my.id" });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("error");
      expect(res.body.code).toBe("srv.email_tidak_terdaftar_lupa_sandi");
      expect(res.body.message).toMatch(/tidak terdaftar/i);

      expect(kirimEmailResetPassword).not.toHaveBeenCalled();
      expect(kirimEmailPasswordBaru).not.toHaveBeenCalled();
    });

    /**
     * Item #262 — Mengirimkan kata sandi acak sementara ke email dan meng-hash ke database.
     */
    it("mengirimkan kata sandi sementara baru ke email pengguna terdaftar", async () => {
      const mockUser = {
        id: "usr-100",
        uid: "usr-100",
        email: "member@lanpro.my.id",
        username: "member1",
        displayName: "Member Satu",
      };

      const tokenLama = jwt.sign({ id: "usr-100", email: "member@lanpro.my.id" }, getJwtSecret(), {
        expiresIn: "1h",
      });

      mockKueri
        .mockResolvedValueOnce([[mockUser]]) // findUserByEmail
        .mockResolvedValueOnce([[{ id: "usr-100" }]]) // setTemporaryPassword RETURNING
        .mockResolvedValueOnce([[{ currentSessionToken: tokenLama }]]) // findSessionData
        .mockResolvedValueOnce([]) // addToTokenBlacklist INSERT
        .mockResolvedValueOnce([]); // clearSessionToken UPDATE

      const res = await request(buatApp())
        .post("/api/auth/forgot-password")
        .send({ email: "member@lanpro.my.id" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.code).toBe("srv.kata_sandi_sementara_dikirim");
      expect(res.body.message).toMatch(/Kata sandi sementara/i);

      // Jalur kata sandi sementara baru dipanggil
      expect(kirimEmailPasswordBaru).toHaveBeenCalledTimes(1);
      const arg = (kirimEmailPasswordBaru as jest.Mock).mock.calls[0][0];
      expect(arg.email).toBe("member@lanpro.my.id");
      expect(arg.username).toBe("member1");
      expect(arg.temporaryPassword).toBeDefined();
      expect(typeof arg.temporaryPassword).toBe("string");
      expect(arg.temporaryPassword.length).toBeGreaterThanOrEqual(8);

      // #448 — sesi DB dicabut + JWT lama masuk denylist
      const sqlSemua = mockKueri.mock.calls.map((c) => String(c[0]));
      expect(sqlSemua.some((s) => s.includes("TokenBlacklist"))).toBe(true);
      expect(sqlSemua.some((s) => /currentSessionToken\s*=\s*NULL/i.test(s))).toBe(true);
      // #451 — tidak menulis kolom password yang tidak ada di skema
      expect(sqlSemua.some((s) => /SET[\s\S]*\bpassword\s*=/i.test(s))).toBe(false);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("menolak permintaan bila kata sandi baru tidak memenuhi syarat kompleksitas", async () => {
      const token = jwt.sign(
        { id: "usr-100", email: "member@rajonet.com", type: "password_reset" },
        getJwtSecret(),
        { expiresIn: "15m" }
      );

      const res = await request(buatApp())
        .post("/api/auth/reset-password")
        .send({ token, newPassword: "simple" }); // Missing upper, number, special char, < 8 chars

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Password minimal 8 karakter");
    });

    it("menolak permintaan bila token reset sudah kedaluwarsa atau tidak valid", async () => {
      const expiredToken = jwt.sign(
        { id: "usr-100", email: "member@rajonet.com", type: "password_reset" },
        getJwtSecret(),
        { expiresIn: "-1s" } // Already expired
      );

      const res = await request(buatApp())
        .post("/api/auth/reset-password")
        .send({ token: expiredToken, newPassword: "Password123!" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("sudah kedaluwarsa atau tidak valid");
    });

    it("berhasil memperbarui kata sandi pengguna dengan token valid", async () => {
      const validToken = jwt.sign(
        { id: "usr-100", email: "member@rajonet.com", type: "password_reset" },
        getJwtSecret(),
        { expiresIn: "15m" }
      );

      mockKueri.mockResolvedValueOnce([[{ id: "usr-100" }]]); // UPDATE Users RETURNING id
      mockKueri.mockResolvedValueOnce([[]]); // findSessionData — tidak ada currentSessionToken
      mockKueri.mockResolvedValueOnce([[]]); // clearSessionToken

      const res = await request(buatApp())
        .post("/api/auth/reset-password")
        .send({ token: validToken, newPassword: "NewSecretPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toContain("Kata sandi Anda berhasil diperbarui");

      expect(mockKueri).toHaveBeenCalled();
      const updateCall = mockKueri.mock.calls.find((c) => String(c[0] || "").includes("UPDATE"));
      expect(updateCall).toBeDefined();
    });
  });
});
