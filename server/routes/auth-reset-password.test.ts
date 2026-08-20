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
}));

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import authRoutes from "./auth.routes";
import { getJwtSecret } from "../helpers/jwtSecret";
import { kirimEmailPasswordBaru } from "../services/email.service";

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

    it("mengembalikan error 404 bila email tidak terdaftar dalam sistem", async () => {
      mockKueri.mockResolvedValueOnce([[]]); // No user found

      const res = await request(buatApp())
        .post("/api/auth/forgot-password")
        .send({ email: "unknown@rajonet.com" });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Alamat email tidak terdaftar dalam sistem");
      expect(kirimEmailPasswordBaru).not.toHaveBeenCalled();
    });

    it("membuat kata sandi baru, mengupdate database, dan mengirimkan email kata sandi baru bila email terdaftar", async () => {
      const mockUser = {
        id: "usr-100",
        uid: "usr-100",
        email: "member@rajonet.com",
        username: "member1",
        displayName: "Member Satu",
      };

      mockKueri
        .mockResolvedValueOnce([[mockUser]]) // findUserByEmail
        .mockResolvedValueOnce([[{ id: "usr-100" }]]); // updateUserPassword

      const res = await request(buatApp())
        .post("/api/auth/forgot-password")
        .send({ email: "member@rajonet.com" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toContain("Kata sandi baru telah berhasil dibuat");

      expect(kirimEmailPasswordBaru).toHaveBeenCalledTimes(1);
      const callArg = (kirimEmailPasswordBaru as jest.Mock).mock.calls[0][0];
      expect(callArg.email).toBe("member@rajonet.com");
      expect(callArg.username).toBe("member1");
      expect(callArg.temporaryPassword).toBeDefined();
      expect(callArg.temporaryPassword.length).toBeGreaterThanOrEqual(8);
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
