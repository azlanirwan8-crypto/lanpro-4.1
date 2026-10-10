/**
 * #92 — dari mana peran berasal, dan apa yang terjadi saat jawabannya "token".
 *
 * `auth.sinkron-peran.test.ts` sudah mengunci jalur yang BAIK: peran dibaca ulang
 * dari database tiap permintaan, jadi pencabutan hak admin berlaku seketika.
 * File ini menguji sisi yang belum dikunci sama sekali, dan justru sisi itu yang
 * membuat tiket ini dibuka lagi:
 *
 *   1. `authenticateJWT` punya jalur cadangan (`auth.ts:131-148`) yang berjalan
 *      kalau kueri Users gagal — Neon memang putus-putus di lingkungan ini
 *      (AUDIT.md §0.8). Jalur itu menulis `req.user = user`, yaitu isi TOKEN,
 *      dan token berumur 2 jam (`auth.ts:31`). Peran yang sudah dicabut bisa
 *      hidup lagi sampai dua jam, dan tidak ada satu pun konsumen yang bisa
 *      membedakan "peran dari DB" dengan "peran dari token berusia 2 jam".
 *   2. `jagaProyek` punya jalan pintas #317 (`jagaProyek.ts:199-201`): selama
 *      `req.user.role` ada, kueri Users DILEWAT. Jadi peran basi dari poin 1
 *      langsung menyala sebagai God Mode §19.6 langkah 3b.
 *   3. `verifyGlobalAdmin` membanding `req.user?.role === "admin"` tanpa
 *      `normalkanPeran`, padahal `src/types/roles.ts` mewajibkan semua pembanding
 *      melewatinya karena data lama menyimpan `Admin`/`ADMIN`.
 *
 * Yang diuji di sini adalah SUMBER dan NORMALISASI peran, bukan isi matriks.
 */

import jwt from "jsonwebtoken";

const mockQuery = jest.fn();
const mockKueri = jest.fn();
const mockLepas = jest.fn();

// `getConnection` sengaja fungsi biasa, BUKAN `jest.fn` — pelajaran dari
// `jagaProyek.test.ts`: reset Jest menghapus implementasi di dalam factory.
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...args: any[]) => mockQuery(...args),
    getConnection: async () => ({ query: mockKueri, release: mockLepas }),
  },
}));

// Pencatatan audit dijalankan di `setImmediate` -> berisik setelah test selesai.
jest.mock("../services/audit.service", () => ({
  __esModule: true,
  createAuditLog: async () => undefined,
}));

import { authenticateJWT, verifyGlobalAdmin, activeUserSessions } from "./auth";
import { jagaProyek } from "./jagaProyek";
import { createMockRequest, createMockResponse } from "../test/setup";

const SEKRET = "test-secret-role-sumber-92";

/** authenticateJWT menyelesaikan lewat promise berantai. */
async function tungguSelesai(next: jest.Mock, res: any) {
  for (let i = 0; i < 30; i++) {
    if (next.mock.calls.length > 0 || res.status.mock.calls.length > 0) return;
    await new Promise((r) => setImmediate(r));
  }
}

const tokenUntuk = (isi: any) => jwt.sign(isi, SEKRET, { expiresIn: "2h" });

describe("#92 — asal peran di authenticateJWT", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SEKRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    activeUserSessions.clear();
  });

  it("menyatakan peran hasil baca database sebagai peran yang tersinkron", async () => {
    const token = tokenUntuk({ id: "u-1", uid: "u-1", username: "budi", role: "admin" });
    mockQuery
      .mockResolvedValueOnce([[]]) // TokenBlacklist kosong
      .mockResolvedValueOnce([[{ currentSessionToken: token, role: "user", status: "active" }]]); // DB sudah menurunkan jadi user

    const req: any = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockResponse();
    const next = jest.fn();

    authenticateJWT(req, res as any, next);
    await tungguSelesai(next, res);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe("user");
    expect(req.user.peranDariDatabase).toBe(true);
  });

  it("menyatakan peran dari token berusia dua jam sebagai TIDAK tersinkron saat database gagal", async () => {
    const token = tokenUntuk({ id: "u-2", uid: "u-2", username: "sinta", role: "admin" });

    // Sesi in-memory cocok, sehingga jalur cadangan LOLOS autentikasi —
    // yang dipersoalkan di sini bukan masuk/tidaknya, tapi asal perannya.
    activeUserSessions.set("u-2", {
      token,
      ip: "127.0.0.1",
      browser: "jest",
      device: "jest",
      lastActiveAt: Date.now(),
    });

    mockQuery.mockResolvedValueOnce([[]]); // denylist terbaca
    mockQuery.mockRejectedValueOnce(new Error("read ECONNRESET")); // kueri Users gagal

    const req: any = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockResponse();
    const next = jest.fn();

    authenticateJWT(req, res as any, next);
    await tungguSelesai(next, res);

    expect(next).toHaveBeenCalled();
    // Peran yang tersisa di sini berasal dari token, bukan dari keadaan sekarang.
    expect(req.user.role).toBe("admin");
    expect(req.user.peranDariDatabase).toBe(false);
  });
});

describe("#92 — verifyGlobalAdmin menolak peran yang asal-usulnya tidak jelas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("menolak saat peran hanya datang dari token", () => {
    const req: any = { user: { id: "u-3", role: "admin", peranDariDatabase: false } };
    const res = createMockResponse();
    const next = jest.fn();

    verifyGlobalAdmin(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("menerima Administrator yang perannya terbaca dari database", () => {
    const req: any = { user: { id: "u-4", role: "admin", peranDariDatabase: true } };
    const res = createMockResponse();
    const next = jest.fn();

    verifyGlobalAdmin(req, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("memakai normalkanPeran sehingga nilai 'Admin' dari data lama tetap dikenali", () => {
    // `src/types/roles.ts`: data lama menyimpan campuran besar-kecil, dan
    // "semua pembanding peran wajib lewat normalkanPeran lebih dulu".
    const req: any = { user: { id: "u-5", role: "Admin", peranDariDatabase: true } };
    const res = createMockResponse();
    const next = jest.fn();

    verifyGlobalAdmin(req, res as any, next);

    expect(next).toHaveBeenCalled();
  });
});

describe("#92 — jagaProyek tidak mengambil jalan pintas #317 untuk peran basi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("menolak God Mode dan tetap membaca Users ketika peran belum tersinkron", async () => {
    // Token bilang admin; keadaan sebenarnya di database sudah diturunkan.
    const req: any = {
      params: { projectId: "P1" },
      body: {},
      headers: {},
      user: { id: "U1", uid: "U1", role: "admin", peranDariDatabase: false },
    };
    const res: any = {
      kode: 0,
      badan: null,
      status(k: number) {
        this.kode = k;
        return this;
      },
      json(b: any) {
        this.badan = b;
        return this;
      },
    };
    const next = jest.fn();

    // Users ->Projects -> ProjectMembers: peran asli `user`, bukan pemilik,
    // dan bukan anggota berperan tinggi.
    mockKueri
      .mockResolvedValueOnce([[{ id: "U1", role: "user" }]])
      .mockResolvedValueOnce([[{ ownerId: "ORANG-LAIN" }]])
      .mockResolvedValueOnce([[{ role: "viewer" }]]);

    await jagaProyek("list", "U")(req, res, next);

    expect(mockKueri).toHaveBeenCalledWith(expect.stringContaining("SELECT id, role FROM Users"), [
      "U1",
      "U1",
    ]);
    expect(next).not.toHaveBeenCalled();
    expect(res.kode).toBe(403);
  });

  it("tetap memakai jalan pintas #317 ketika peran memang terbaca dari database", async () => {
    const req: any = {
      params: { projectId: "P1" },
      body: {},
      headers: {},
      user: { id: "U1", uid: "U1", role: "admin", peranDariDatabase: true },
    };
    const res: any = {
      kode: 0,
      badan: null,
      status(k: number) {
        this.kode = k;
        return this;
      },
      json(b: any) {
        this.badan = b;
        return this;
      },
    };
    const next = jest.fn();

    await jagaProyek("list", "U")(req, res, next);

    // God Mode dari peran sistem yang SAH: kueri Users tidak perlu diulang (#317).
    expect(mockKueri).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
