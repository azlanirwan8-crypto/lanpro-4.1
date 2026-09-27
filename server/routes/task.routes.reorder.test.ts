/**
 * Test perilaku untuk item #64 (§13.8): `PUT .../tasks/reorder` tidak boleh
 * melepas koneksi dua kali, dan tidak boleh me-rollback transaksi yang bukan
 * miliknya lagi.
 *
 * Kondisi sebelum perbaikan: jalur sukses memanggil `release()` tepat setelah
 * `commit()`, sementara `catch` memanggil `rollback()` DAN `release()` tanpa
 * syarat. Bila ada yang gagal SESUDAH commit — pemancaran socket, misalnya —
 * koneksi yang sudah kembali ke pool ikut di-rollback, dan rollback itu bisa
 * mengenai transaksi milik permintaan lain yang sedang memakainya.
 */

const koneksiTiruan = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

// `jest.config.cjs` memakai `resetMocks: true`, jadi implementasi dipasang di
// beforeEach, bukan di dalam factory ini.
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

jest.mock("../middleware/auth", () => ({
  __esModule: true,
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = { id: "user-1", uid: "user-1", role: "admin" };
    next();
  },
  activeUserSessions: new Map(),
  generateToken: () => "token",
  verifyGlobalAdmin: (_req: any, _res: any, next: any) => next(),
  getJwtSecret: () => "rahasia-test",
}));

jest.mock("../middleware/rbac", () => ({
  __esModule: true,
  verifyProjectAccess: () => (_req: any, _res: any, next: any) => next(),
}));

// Rute-rute ini kini dijaga `jagaProyek` (§19.8 tahap 4), bukan lagi
// `verifyProjectAccess`. Tanpa mock ini penjaga sungguhan ikut jalan dan
// seluruh test menjawab 403 — kegagalan yang menunjuk ke logika rute, padahal
// sebabnya penjaga yang tidak dipalsukan.
jest.mock("../middleware/jagaProyek", () => ({
  __esModule: true,
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
  jagaHapusProyek: () => (_req: any, _res: any, next: any) => next(),
}));

import express from "express";
import request from "supertest";
import taskRoutes from "./task.routes";
import db from "../../src/lib/db";

/**
 * `io` yang MELEDAK saat memancarkan event. Ini mensimulasikan kegagalan
 * sesudah commit — satu-satunya jalur yang memicu pelepasan ganda.
 */
const buatApp = (opsi: { ioMeledak?: boolean } = {}) => {
  const app = express();
  app.use(express.json());
  app.set("io", {
    to: () => ({
      emit: () => {
        if (opsi.ioMeledak) throw new Error("pemancaran socket gagal");
      },
    }),
  });
  app.use(taskRoutes);
  return app;
};

describe("#64 tasks/reorder — koneksi dilepas tepat sekali", () => {
  beforeEach(() => {
    koneksiTiruan.query.mockResolvedValue([[]]);
    koneksiTiruan.beginTransaction.mockResolvedValue(undefined);
    koneksiTiruan.commit.mockResolvedValue(undefined);
    koneksiTiruan.rollback.mockResolvedValue(undefined);
    koneksiTiruan.release.mockImplementation(() => undefined);
    (db as any).getConnection.mockResolvedValue(koneksiTiruan);
  });

  it("melepas koneksi TEPAT SEKALI pada jalur sukses", async () => {
    const res = await request(buatApp())
      .put("/api/projects/proyek-A/tasks/reorder")
      .send({ orderedIds: ["t1", "t2"] });

    expect(res.status).toBe(200);
    expect(koneksiTiruan.commit).toHaveBeenCalledTimes(1);
    expect(koneksiTiruan.release).toHaveBeenCalledTimes(1);
    expect(koneksiTiruan.rollback).not.toHaveBeenCalled();
  });

  it("galat SESUDAH commit: tidak melepas dua kali dan tidak me-rollback", async () => {
    const res = await request(buatApp({ ioMeledak: true }))
      .put("/api/projects/proyek-A/tasks/reorder")
      .send({ orderedIds: ["t1", "t2"] });

    expect(res.status).toBe(500);
    expect(koneksiTiruan.commit).toHaveBeenCalledTimes(1);
    // Inti temuannya: transaksinya sudah ditutup, jadi rollback di sini akan
    // mengenai transaksi milik pemakai koneksi berikutnya.
    expect(koneksiTiruan.rollback).not.toHaveBeenCalled();
    expect(koneksiTiruan.release).toHaveBeenCalledTimes(1);
  });

  it("galat SEBELUM commit: me-rollback dan tetap melepas tepat sekali", async () => {
    koneksiTiruan.query.mockRejectedValue(new Error("UPDATE gagal"));

    const res = await request(buatApp())
      .put("/api/projects/proyek-A/tasks/reorder")
      .send({ orderedIds: ["t1", "t2"] });

    expect(res.status).toBe(500);
    expect(koneksiTiruan.rollback).toHaveBeenCalledTimes(1);
    expect(koneksiTiruan.commit).not.toHaveBeenCalled();
    expect(koneksiTiruan.release).toHaveBeenCalledTimes(1);
  });

  it("orderedIds bukan array ditolak 400 tanpa menyentuh koneksi", async () => {
    const res = await request(buatApp())
      .put("/api/projects/proyek-A/tasks/reorder")
      .send({ orderedIds: "bukan-array" });

    expect(res.status).toBe(400);
    expect(koneksiTiruan.beginTransaction).not.toHaveBeenCalled();
    expect(koneksiTiruan.release).not.toHaveBeenCalled();
  });
});
