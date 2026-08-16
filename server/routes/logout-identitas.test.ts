/**
 * Test perilaku untuk #53: logout tidak boleh mengakhiri sesi orang lain.
 *
 * `POST /api/auth/logout` berada di prefix PUBLIK — ia harus bisa dipanggil
 * tanpa token, sebab pengguna yang tokennya sudah kedaluwarsa tetap perlu
 * keluar. Justru karena itu ia sempat menerima `userId` dari body: terlihat
 * seperti satu-satunya cara mengetahui siapa yang keluar.
 *
 * Akibatnya siapa pun, **tanpa kredensial apa pun**, bisa memanggilnya dengan
 * id orang lain dan meng-`NULL`-kan `currentSessionToken` korban — memaksanya
 * keluar dari aplikasi berulang kali. §18 memberinya 🔴 dengan alasan yang
 * eksplisit: dapat dieksploitasi tanpa kredensial sah.
 *
 * Yang diuji di sini bukan "apakah logout berhasil", melainkan **siapa yang
 * sesinya tersentuh**. Karena itu assertion-nya pada parameter kueri `UPDATE`,
 * bukan pada kode status — rutenya memang selalu menjawab `success`, dan
 * memeriksa status saja akan lulus baik lubangnya ada maupun tidak.
 */

const mockKueri = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: any[]) => mockKueri(...a),
    getConnection: async () => ({ query: mockKueri, release: () => undefined }),
  },
}));

jest.mock("../middleware/socketAuth", () => ({
  __esModule: true,
  roomPengguna: () => "room",
  sidikToken: () => "sidik",
}));

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import authRoutes from "./auth.routes";
import { getJwtSecret } from "../helpers/jwtSecret";

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authRoutes);
  return app;
};

/** Id-id yang sesinya benar-benar di-NULL-kan oleh permintaan barusan. */
function sesiYangDihapus(): string[] {
  return mockKueri.mock.calls
    .filter((c) => /UPDATE Users SET currentSessionToken = NULL/i.test(String(c[0])))
    .map((c) => String((c[1] as any[])[0]));
}

const RAHASIA_ASLI = process.env.JWT_SECRET;

beforeAll(() => {
  // `getJwtSecret` sengaja MELEMPAR bila JWT_SECRET kosong (§0.3) — itu
  // perilaku yang benar dan tidak boleh dilonggarkan demi test. Jadi rahasianya
  // disediakan di sini, lalu dikembalikan seperti semula.
  process.env.JWT_SECRET = "rahasia-uji-yang-cukup-panjang-untuk-hmac";
});

afterAll(() => {
  if (RAHASIA_ASLI === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = RAHASIA_ASLI;
});

beforeEach(() => {
  mockKueri.mockReset();
  mockKueri.mockResolvedValue([[]]);
});

describe("#53 logout hanya mengakhiri sesi PEMANGGIL", () => {
  it("tanpa token, `userId` di body DIABAIKAN — nol sesi tersentuh", async () => {
    const res = await request(buatApp()).post("/api/auth/logout").send({ userId: "korban-123" });

    expect(sesiYangDihapus()).toEqual([]);
    // Tetap `success`: logout tidak boleh pernah gagal dari sisi pengguna.
    expect(res.body.status).toBe("success");
  });

  it("token SAH hanya mengakhiri sesi pemilik token itu", async () => {
    const token = jwt.sign({ id: "pemanggil-1" }, getJwtSecret());

    await request(buatApp())
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: "korban-123" });

    // `userId` di body menyebut korban, tetapi yang tersentuh pemilik token.
    expect(sesiYangDihapus()).toEqual(["pemanggil-1"]);
  });

  it("token SAMPAH tidak menyentuh sesi siapa pun", async () => {
    await request(buatApp())
      .post("/api/auth/logout")
      .set("Authorization", "Bearer bukan-token")
      .send({ userId: "korban-123" });

    expect(sesiYangDihapus()).toEqual([]);
  });

  it("token kedaluwarsa tidak menyentuh sesi siapa pun", async () => {
    const kadaluarsa = jwt.sign({ id: "pemanggil-1" }, getJwtSecret(), { expiresIn: "-1h" });

    const res = await request(buatApp())
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${kadaluarsa}`)
      .send({ userId: "korban-123" });

    // Sesinya memang sudah tidak berlaku; tidak ada yang perlu dibersihkan.
    expect(sesiYangDihapus()).toEqual([]);
    expect(res.body.status).toBe("success");
  });
});
