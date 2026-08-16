/**
 * Test perilaku untuk item #65 (§13.9): optimistic locking pada
 * `PUT /api/projects/:projectId/tasks/:id` harus benar-benar menolak konflik.
 *
 * Kondisi sebelum perbaikan: penjaganya berbunyi
 * `updateResult.affectedRows === 0`. `affectedRows` adalah properti MySQL, dan
 * adapter mengembalikan `[result.rows, result.fields]` sambil MEMBUANG
 * `result.rowCount` — jadi ekspresi itu selalu `undefined === 0`, alias false.
 *
 * PENTING, supaya cakupannya tidak dilebih-lebihkan: rute ini punya DUA
 * pemeriksaan konflik, dan hanya satu yang rusak.
 *
 *  1. `oldTask.version !== version` (baris 773) — membandingkan di memori.
 *     Ini SUDAH benar sejak dulu dan menangkap kasus yang paling lumrah:
 *     klien membawa versi usang.
 *  2. `AND version = ?` pada UPDATE, yang hasilnya diperiksa di baris 959 —
 *     ini yang mati. Ia menjaga jendela balapan sesungguhnya: penulis lain
 *     menyelesaikan UPDATE-nya di antara SELECT dan UPDATE permintaan ini.
 *
 * Jadi yang hilang bukan seluruh optimistic locking, melainkan penjaga jendela
 * balapan itu. Di sana UPDATE tidak menulis apa pun, tetapi API tetap menjawab
 * 200 dan memancarkan `task_updated` — suntingan yang kalah HILANG tanpa pesan.
 * Kedua jalur dikunci di bawah supaya yang sehat tidak ikut tergeser.
 */

const koneksiTiruan = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

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

import express from "express";
import request from "supertest";
import taskRoutes from "./task.routes";
import db from "../../src/lib/db";

const TASK_LAMA = {
  id: "task-1",
  projectId: "proyek-A",
  title: "Judul lama",
  status: "To Do",
  version: 7,
  reporterId: "user-1",
  assigneeId: "user-1",
};

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.set("io", { to: () => ({ emit: () => undefined }) });
  app.use(taskRoutes);
  return app;
};

/**
 * `updateMengenai` menentukan berapa baris yang dikembalikan `RETURNING id` —
 * inilah yang membedakan "tersimpan" dari "kalah adu versi".
 */
const jawabQuery = (opsi: { updateMengenai: number }) => {
  koneksiTiruan.query.mockImplementation(async (sql: string) => {
    if (/^UPDATE Tasks SET/i.test(sql.trim())) {
      return [opsi.updateMengenai > 0 ? [{ id: "task-1" }] : []];
    }
    if (/FROM Tasks/i.test(sql)) return [[TASK_LAMA]];
    if (/FROM Users/i.test(sql)) return [[{ id: "user-1", uid: "user-1", role: "admin" }]];
    if (/FROM Projects/i.test(sql)) return [[{ id: "proyek-A", ownerId: "user-1" }]];
    return [[]];
  });
};

describe("#65 optimistic locking benar-benar menolak konflik", () => {
  beforeEach(() => {
    koneksiTiruan.beginTransaction.mockResolvedValue(undefined);
    koneksiTiruan.commit.mockResolvedValue(undefined);
    koneksiTiruan.rollback.mockResolvedValue(undefined);
    koneksiTiruan.release.mockImplementation(() => undefined);
    (db as any).getConnection.mockResolvedValue(koneksiTiruan);
    (db as any).query.mockResolvedValue([[], []]);
  });

  it("pemeriksaan versi AWAL tetap bekerja — versi usang dari klien ditolak", async () => {
    // Ini jalur yang SUDAH benar sebelum #65: `oldTask.version !== version`
    // dibandingkan di memori, jauh sebelum UPDATE. Dikunci di sini supaya
    // perbaikan #65 tidak diam-diam menggeser perilaku yang sudah betul.
    jawabQuery({ updateMengenai: 0 });

    const res = await request(buatApp())
      .put("/api/projects/proyek-A/tasks/task-1")
      .send({ title: "Judul baru", version: 3 });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/konflik versi/i);
  });

  it("menjawab 409 saat KALAH BALAPAN — versi klien masih cocok tapi UPDATE tak mengenai baris", async () => {
    // Inilah lubang #65 yang sebenarnya, dan satu-satunya yang tidak tertangkap
    // pemeriksaan awal: penulis lain menyelesaikan UPDATE-nya di antara SELECT
    // dan UPDATE milik permintaan ini. Versi yang dibawa klien masih cocok
    // dengan yang dibaca (7 == 7), sehingga penjaga awal meloloskannya, tetapi
    // `AND version = ?` di SQL tidak lagi menemukan barisnya.
    //
    // Dulu jawabannya 200 dan suntingan pengguna hilang tanpa pesan.
    jawabQuery({ updateMengenai: 0 });

    const res = await request(buatApp())
      .put("/api/projects/proyek-A/tasks/task-1")
      .send({ title: "Judul baru", version: 7 });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/sudah berubah/i);
  });

  it("TIDAK memancarkan task_updated saat kalah balapan", async () => {
    jawabQuery({ updateMengenai: 0 });
    const dipancarkan: string[] = [];
    const app = express();
    app.use(express.json());
    app.set("io", {
      to: () => ({
        emit: (nama: string) => {
          dipancarkan.push(nama);
        },
      }),
    });
    app.use(taskRoutes);

    await request(app)
      .put("/api/projects/proyek-A/tasks/task-1")
      .send({ title: "Judul baru", version: 7 });

    expect(dipancarkan).not.toContain("task_updated");
  });

  it("menyertakan RETURNING pada UPDATE agar jumlah baris terbaca", async () => {
    jawabQuery({ updateMengenai: 1 });

    await request(buatApp())
      .put("/api/projects/proyek-A/tasks/task-1")
      .send({ title: "Judul baru", version: 7 });

    const sqlUpdate = koneksiTiruan.query.mock.calls
      .map((c: any[]) => String(c[0]))
      .find((sql: string) => /^UPDATE Tasks SET/i.test(sql.trim()));

    expect(sqlUpdate).toBeDefined();
    expect(sqlUpdate).toMatch(/RETURNING id\s*$/i);
  });

  it("versi cocok: perubahan tersimpan dan dijawab sukses", async () => {
    jawabQuery({ updateMengenai: 1 });

    const res = await request(buatApp())
      .put("/api/projects/proyek-A/tasks/task-1")
      .send({ title: "Judul baru", version: 7 });

    expect(res.status).toBe(200);
  });

  it("tanpa kolom version di body, penyuntingan biasa tetap jalan", async () => {
    jawabQuery({ updateMengenai: 1 });

    const res = await request(buatApp())
      .put("/api/projects/proyek-A/tasks/task-1")
      .send({ title: "Judul baru" });

    expect(res.status).toBe(200);
  });
});
