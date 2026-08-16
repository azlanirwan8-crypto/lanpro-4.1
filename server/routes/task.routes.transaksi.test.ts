/**
 * Test perilaku untuk item #60 (§13.8): transaksi pada
 * `POST /api/projects/:projectId/tasks` wajib ditutup walau terjadi galat.
 *
 * Kenapa ini penting dan bukan sekadar kerapian: `src/lib/db.ts:255` melepas
 * koneksi lewat `client.release()` saja — tanpa reset, tanpa rollback. Jadi bila
 * sebuah galat terjadi setelah `beginTransaction()`, koneksi kembali ke pool
 * DENGAN transaksi masih terbuka, berikut kunci baris `Projects` yang dipegang
 * `SELECT … FOR UPDATE`. Permintaan berikutnya mewarisi semuanya.
 *
 * Test ini menjalankan rutenya sungguhan lewat supertest dengan adapter database
 * tiruan, lalu memaksa galat di tengah transaksi.
 */

const koneksiTiruan = {
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

// Catatan: `jest.config.cjs` menyalakan `resetMocks: true`, yang MENGHAPUS
// implementasi mock sebelum tiap test. Karena itu seluruh implementasi dipasang
// ulang di `beforeEach`, bukan di sini.
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: jest.fn(),
    query: jest.fn(),
  },
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

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.use(taskRoutes);
  return app;
};

/** Menjawab query berdasarkan isi SQL-nya, bukan urutan panggilan. */
const jawabQuery = (opsi: { gagalPada?: RegExp } = {}) => {
  koneksiTiruan.query.mockImplementation(async (sql: string) => {
    if (opsi.gagalPada && opsi.gagalPada.test(sql)) {
      throw new Error("kegagalan disengaja untuk menguji rollback");
    }
    if (/FROM Projects/i.test(sql)) {
      return [[{ id: "proyek-A", projectKey: "PRJ", taskCounter: 4, ownerId: "user-1" }]];
    }
    if (/FROM Users/i.test(sql)) {
      return [[{ id: "user-1", uid: "user-1" }]];
    }
    return [[]];
  });
};

describe("#60 POST tasks — transaksi tidak boleh terbawa ke pool", () => {
  beforeEach(() => {
    koneksiTiruan.beginTransaction.mockResolvedValue(undefined);
    koneksiTiruan.commit.mockResolvedValue(undefined);
    koneksiTiruan.rollback.mockResolvedValue(undefined);
    koneksiTiruan.release.mockImplementation(() => undefined);
    (db as any).getConnection.mockResolvedValue(koneksiTiruan);
    (db as any).query.mockResolvedValue([[], []]);
  });

  it("me-ROLLBACK bila galat terjadi di tengah transaksi", async () => {
    // Gagal tepat pada UPDATE penghitung, yaitu SETELAH beginTransaction dan
    // SEBELUM commit — persis jendela yang dulu membocorkan transaksi.
    jawabQuery({ gagalPada: /UPDATE Projects SET taskCounter/i });

    const res = await request(buatApp())
      .post("/api/projects/proyek-A/tasks")
      .send({ title: "Task uji" });

    expect(res.status).toBe(500);
    expect(koneksiTiruan.beginTransaction).toHaveBeenCalled();
    expect(koneksiTiruan.rollback).toHaveBeenCalled();
    expect(koneksiTiruan.commit).not.toHaveBeenCalled();
  });

  it("melepas koneksi ke pool walau terjadi galat", async () => {
    jawabQuery({ gagalPada: /UPDATE Projects SET taskCounter/i });

    await request(buatApp()).post("/api/projects/proyek-A/tasks").send({ title: "Task uji" });

    expect(koneksiTiruan.release).toHaveBeenCalled();
  });

  it("rollback terjadi SEBELUM koneksi dilepas, bukan sesudah", async () => {
    jawabQuery({ gagalPada: /UPDATE Projects SET taskCounter/i });
    const urutan: string[] = [];
    koneksiTiruan.rollback.mockImplementation(async () => {
      urutan.push("rollback");
    });
    koneksiTiruan.release.mockImplementation(() => {
      urutan.push("release");
    });

    await request(buatApp()).post("/api/projects/proyek-A/tasks").send({ title: "Task uji" });

    expect(urutan).toEqual(["rollback", "release"]);
  });

  it("pada jalur sukses: commit dipanggil dan rollback TIDAK", async () => {
    jawabQuery();

    const res = await request(buatApp())
      .post("/api/projects/proyek-A/tasks")
      .send({ title: "Task uji" });

    expect(res.status).toBe(200);
    expect(koneksiTiruan.commit).toHaveBeenCalled();
    expect(koneksiTiruan.rollback).not.toHaveBeenCalled();
    expect(koneksiTiruan.release).toHaveBeenCalled();
  });

  it("tidak me-rollback koneksi yang transaksinya sudah ditutup", async () => {
    // Galat pada pengambilan data reporter, yang berlangsung SETELAH commit.
    // Tidak ada transaksi terbuka pada saat itu, jadi rollback tidak boleh
    // dipanggil: koneksinya bisa jadi sudah dipakai permintaan lain.
    jawabQuery({ gagalPada: /SELECT id, uid, displayName/i });

    const res = await request(buatApp())
      .post("/api/projects/proyek-A/tasks")
      .send({ title: "Task uji" });

    expect(res.status).toBe(500);
    expect(koneksiTiruan.commit).toHaveBeenCalled();
    expect(koneksiTiruan.rollback).not.toHaveBeenCalled();
    expect(koneksiTiruan.release).toHaveBeenCalled();
  });
});

describe("#61 batas transaksi — penghitung dan task adalah satu kesatuan", () => {
  beforeEach(() => {
    koneksiTiruan.beginTransaction.mockResolvedValue(undefined);
    koneksiTiruan.commit.mockResolvedValue(undefined);
    koneksiTiruan.rollback.mockResolvedValue(undefined);
    koneksiTiruan.release.mockImplementation(() => undefined);
    (db as any).getConnection.mockResolvedValue(koneksiTiruan);
    (db as any).query.mockResolvedValue([[], []]);
  });

  it("mengembalikan nomor task bila INSERT gagal — penghitung tidak boleh termakan", async () => {
    // Ini yang DULU tidak terjadi: commit sudah berlangsung sebelum INSERT,
    // sehingga taskCounter bertambah permanen untuk task yang tak pernah ada
    // dan penomoran PROJECTKEY-n berlubang.
    jawabQuery({ gagalPada: /INSERT INTO Tasks/i });

    const res = await request(buatApp())
      .post("/api/projects/proyek-A/tasks")
      .send({ title: "Task uji" });

    expect(res.status).toBe(500);
    expect(koneksiTiruan.rollback).toHaveBeenCalled();
    expect(koneksiTiruan.commit).not.toHaveBeenCalled();
  });

  it("mengembalikan nomor task bila penyimpanan lampiran gagal", async () => {
    jawabQuery({ gagalPada: /INSERT INTO Attachments/i });

    const res = await request(buatApp())
      .post("/api/projects/proyek-A/tasks")
      .send({
        title: "Task uji",
        attachments: [{ name: "berkas.pdf", url: "/uploads/berkas.pdf" }],
      });

    expect(res.status).toBe(500);
    expect(koneksiTiruan.rollback).toHaveBeenCalled();
    expect(koneksiTiruan.commit).not.toHaveBeenCalled();
  });

  it("#78 menulis lampiran ke tabel Attachments, bukan TaskAttachments", async () => {
    // `TaskAttachments` tidak pernah ada di database — setiap pembuatan task
    // berlampiran gagal dengan 42P01. Test ini mengunci nama tabel yang benar.
    jawabQuery({});

    await request(buatApp())
      .post("/api/projects/proyek-A/tasks")
      .send({
        title: "Task uji",
        attachments: [{ name: "laporan.pdf", url: "/uploads/laporan_123_abc.pdf" }],
      });

    const sqlLampiran = koneksiTiruan.query.mock.calls
      .map((c: any[]) => String(c[0]))
      .find((sql: string) => /INSERT INTO \w*Attachments/i.test(sql));

    expect(sqlLampiran).toBeDefined();
    expect(sqlLampiran).toMatch(/INSERT INTO Attachments\b/i);
    expect(sqlLampiran).not.toMatch(/TaskAttachments/i);
  });

  it("#78 mengisi kolom filename yang NOT NULL, diambil dari nama berkas di URL", async () => {
    // Tanpa ini kegagalannya hanya berpindah dari 42P01 ke 23502: `filename`
    // NOT NULL tanpa default.
    jawabQuery({});

    await request(buatApp())
      .post("/api/projects/proyek-A/tasks")
      .send({
        title: "Task uji",
        attachments: [{ name: "laporan.pdf", url: "/uploads/laporan_123_abc.pdf?token=xyz" }],
      });

    const panggilan = koneksiTiruan.query.mock.calls.find((c: any[]) =>
      /INSERT INTO Attachments/i.test(String(c[0]))
    );

    expect(panggilan).toBeDefined();
    expect(String(panggilan![0])).toMatch(/\bfilename\b/);
    // Nama berkas diambil dari URL, tanpa query string, bukan dari att.name.
    expect(panggilan![1]).toContain("laporan_123_abc.pdf");
  });

  it("commit terjadi SESUDAH INSERT task, bukan sebelumnya", async () => {
    const urutan: string[] = [];
    koneksiTiruan.commit.mockImplementation(async () => {
      urutan.push("commit");
    });
    koneksiTiruan.query.mockImplementation(async (sql: string) => {
      if (/INSERT INTO Tasks/i.test(sql)) urutan.push("insert-task");
      if (/UPDATE Projects SET taskCounter/i.test(sql)) urutan.push("naikkan-penghitung");
      if (/FROM Projects/i.test(sql)) {
        return [[{ id: "proyek-A", projectKey: "PRJ", taskCounter: 4, ownerId: "user-1" }]];
      }
      if (/FROM Users/i.test(sql)) return [[{ id: "user-1", uid: "user-1" }]];
      return [[]];
    });

    await request(buatApp()).post("/api/projects/proyek-A/tasks").send({ title: "Task uji" });

    expect(urutan).toEqual(["naikkan-penghitung", "insert-task", "commit"]);
  });
});
