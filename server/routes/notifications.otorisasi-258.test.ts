/**
 * Regresi Item #258 — sisa #244 yang belum tertutup: otorisasi & batas laju.
 *
 * #244 menutup validasi payload (penerima ada, aktif, panjang teks) tetapi
 * temuan awalnya menyebut TIGA hal, dan hanya satu yang tertutup. Test ini
 * mengunci dua sisanya:
 *
 *   - PERAN: pengirim non-admin yang menotifikasi pengguna LAIN kini dibatasi
 *     ke tipe aman (`mention`, `bug_retest`) — satu-satunya dua tipe yang
 *     benar-benar dipakai pemanggil sah di `src/`. Ini juga menutup default
 *     lama `type` -> `"system"` saat tidak dikirim: default itu sendiri
 *     bukan anggota daftar aman, jadi tidak bisa lagi dipakai menyamar.
 *   - BATAS LAJU: 30 permintaan / 15 menit per PENGIRIM terautentikasi
 *     (bukan per IP — lihat catatan di `notifications.routes.ts`).
 *
 * Sengaja memakai `req.user` berbeda-beda per kasus (`sender-*`), bukan satu
 * ID yang dipakai ulang: pembatas laju terikat pada modul yang sama sepanjang
 * berkas test ini, jadi ID yang dipakai ulang di banyak `it()` akan
 * mengonsumsi jatah 30 milik kasus lain dan membuat kasus SETELAHNYA gagal
 * karena alasan yang salah.
 */

import express from "express";
import request from "supertest";

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(async () => [[]]),
    getConnection: jest.fn(async () => ({
      query: jest.fn(async () => [[]]),
      release: jest.fn(),
    })),
  },
  query: jest.fn(async () => [[]]),
}));

import { userRepository } from "../repositories/user.repository";
import { notificationRepository } from "../repositories/notification.repository";
import notificationsRouter from "./notifications.routes";

function pasangApp(user: { id: string; role?: string } | null) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (user) req.user = { id: user.id, uid: user.id, role: user.role };
    next();
  });
  app.use(notificationsRouter);
  return app;
}

const penerimaAktif = (id: string) => ({
  id,
  uid: id,
  username: id,
  displayName: id,
  role: "user",
  status: "active",
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Item #258 — peran: non-admin lintas-pengguna dibatasi tipe aman", () => {
  it("menolak tipe di luar daftar aman dengan 403", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce(penerimaAktif("target-a"));
    const app = pasangApp({ id: "pengirim-258-a" });

    const res = await request(app)
      .post("/api/users/target-a/notifications")
      .send({ title: "Halo", message: "tes", type: "security_alert" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("srv.tipe_notifikasi_tidak_diizinkan");
  });

  it('menolak saat type tidak dikirim sama sekali (dulu diam-diam jatuh ke "system")', async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce(penerimaAktif("target-b"));
    const app = pasangApp({ id: "pengirim-258-b" });

    const res = await request(app)
      .post("/api/users/target-b/notifications")
      .send({ title: "Halo", message: "tes" });

    expect(res.status).toBe(403);
  });

  it('mengizinkan type "mention" — satu dari dua pemanggil sah di src/', async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce(penerimaAktif("target-c"));
    jest.spyOn(notificationRepository, "create").mockResolvedValueOnce();
    const app = pasangApp({ id: "pengirim-258-c" });

    const res = await request(app)
      .post("/api/users/target-c/notifications")
      .send({ title: "Disebut", message: "Anda disebut", type: "mention" });

    expect(res.status).toBe(200);
  });

  it('mengizinkan type "bug_retest" — pemanggil sah kedua di src/', async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce(penerimaAktif("target-d"));
    jest.spyOn(notificationRepository, "create").mockResolvedValueOnce();
    const app = pasangApp({ id: "pengirim-258-d" });

    const res = await request(app)
      .post("/api/users/target-d/notifications")
      .send({ title: "Uji ulang", message: "Bug siap diuji ulang", type: "bug_retest" });

    expect(res.status).toBe(200);
  });

  it("mengizinkan pengguna menotifikasi DIRI SENDIRI dengan tipe apa pun", async () => {
    jest
      .spyOn(userRepository, "findByIdOrUid")
      .mockResolvedValueOnce(penerimaAktif("pengirim-258-e"));
    jest.spyOn(notificationRepository, "create").mockResolvedValueOnce();
    const app = pasangApp({ id: "pengirim-258-e" });

    const res = await request(app)
      .post("/api/users/pengirim-258-e/notifications")
      .send({ title: "Pengingat pribadi", message: "catatan saya", type: "reminder_apa_saja" });

    expect(res.status).toBe(200);
  });

  it("admin TIDAK dibatasi daftar tipe aman saat menotifikasi pengguna lain", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce(penerimaAktif("target-f"));
    jest.spyOn(notificationRepository, "create").mockResolvedValueOnce();
    const app = pasangApp({ id: "admin-258", role: "admin" });

    const res = await request(app)
      .post("/api/users/target-f/notifications")
      .send({ title: "Pengumuman", message: "broadcast admin", type: "announcement" });

    expect(res.status).toBe(200);
  });

  it("menolak tanpa sesi terautentikasi dengan 401 (dulu senderId boleh null)", async () => {
    const app = pasangApp(null);

    const res = await request(app)
      .post("/api/users/target-g/notifications")
      .send({ title: "Halo", message: "tes", type: "mention" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("srv.akses_tidak_sah_sesi");
  });
});

describe("Item #258 — batas laju: 30 per 15 menit per pengirim", () => {
  it("mengembalikan 429 pada percobaan ke-31 dari pengirim yang sama", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValue(penerimaAktif("target-rl"));
    jest.spyOn(notificationRepository, "create").mockResolvedValue();
    const app = pasangApp({ id: "pengirim-258-batas-laju" });

    let terakhir;
    for (let i = 0; i < 31; i++) {
      terakhir = await request(app)
        .post("/api/users/target-rl/notifications")
        .send({ title: "spam", message: "spam", type: "mention" });
    }

    expect(terakhir!.status).toBe(429);
  }, 20000);
});
