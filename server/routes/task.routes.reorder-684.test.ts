/**
 * Test perilaku untuk item #684: `PUT .../tasks/reorder` hanya boleh menggeser
 * task milik pemanggil.
 *
 * Kondisi sebelum perbaikan: `orderedIds` adalah daftar kiriman klien yang
 * seluruhnya diteruskan ke `reorderTasks`, dan di sana setiap id yang cocok
 * dengan akar proyek ditulis `orderIndex`-nya. Akibatnya seorang anggota biasa
 * bisa (a) mengubah urutan task milik orang lain, dan (b) menyimpulkan urutan
 * task orang lain dari selisih posisi sebelum/sesudah.
 *
 * Yang dikunci di sini: id yang bukan milik pemanggil TIDAK PERNAH sampai ke
 * `reorderTasks`, jadi slot yang mereka tempati tidak ikut ditata ulang.
 */

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

// Identitas pemanggil dipasang per test lewat `pemanggil.jwt`; nilainya dibaca
// saat permintaan jalan, bukan saat factory ini dieksekusi.
jest.mock("../middleware/auth", () => ({
  __esModule: true,
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = pemanggil.jwt;
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

jest.mock("../middleware/jagaProyek", () => ({
  __esModule: true,
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
  jagaHapusProyek: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../repositories/user.repository", () => ({
  __esModule: true,
  userRepository: { findByIdOrUid: jest.fn() },
}));

// `reorderTasks` dipalsukan supaya yang diuji adalah KEPUTUSAN rute: id mana
// yang diserahkan ke lapisan penyimpanan. Implementasi aslinya sudah dikunci
// `task.routes.reorder.test.ts` (#64).
jest.mock("../repositories/task.repository", () => ({
  __esModule: true,
  taskRepository: { findTasksByIds: jest.fn(), reorderTasks: jest.fn() },
}));

import express from "express";
import request from "supertest";
import taskRoutes from "./task.routes";
import { userRepository } from "../repositories/user.repository";
import { taskRepository } from "../repositories/task.repository";

const pemanggil: { jwt: any } = { jwt: null };

const barisUser = { id: "user-2", uid: "user-2", username: "budi", email: "budi@x.id" };

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.set("io", { to: () => ({ emit: jest.fn() }) });
  app.use(taskRoutes);
  return app;
};

const reorder = (app: any, body: any, header?: Record<string, string>) => {
  let req = request(app).put("/api/projects/proyek-A/tasks/reorder").send(body);
  if (header) req = req.set(header);
  return req;
};

describe("#684 tasks/reorder — hanya id milik pemanggil yang boleh bergeser", () => {
  beforeEach(() => {
    pemanggil.jwt = { id: "user-2", uid: "user-2", username: "budi", role: "user" };
    (userRepository.findByIdOrUid as jest.Mock).mockResolvedValue({
      ...barisUser,
      role: "user",
      permissions: null,
    });
    (taskRepository.reorderTasks as jest.Mock).mockResolvedValue(undefined);
    (taskRepository.findTasksByIds as jest.Mock).mockResolvedValue([
      { id: "t-milik", projectId: "proyek-A", reporterId: "user-9", assigneeId: "user-2" },
      { id: "t-orang", projectId: "proyek-A", reporterId: "user-9", assigneeId: null },
    ]);
  });

  it("menyaring keluar task orang lain dan id yang tidak dikenal", async () => {
    const app = buatApp();
    // "t-asing" tidak dikembalikan `findTasksByIds`: ia bukan akar proyek ini.
    const res = await reorder(app, { orderedIds: ["t-orang", "t-milik", "t-asing"] });

    expect(res.status).toBe(200);
    expect(taskRepository.findTasksByIds).toHaveBeenCalledWith(
      ["t-orang", "t-milik", "t-asing"],
      "proyek-A"
    );
    expect(taskRepository.reorderTasks).toHaveBeenCalledTimes(1);
    expect(taskRepository.reorderTasks).toHaveBeenCalledWith("proyek-A", ["t-milik"]);
  });

  it("menolak 403 bila tidak ada satu pun id milik pemanggil", async () => {
    (taskRepository.findTasksByIds as jest.Mock).mockResolvedValue([
      { id: "t-orang", projectId: "proyek-A", reporterId: "user-9", assigneeId: "user-8" },
    ]);

    const res = await reorder(buatApp(), { orderedIds: ["t-orang"] });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("srv.akses_ditolak");
    expect(taskRepository.reorderTasks).not.toHaveBeenCalled();
  });

  it("admin sistem tetap boleh menata seluruh daftar", async () => {
    (userRepository.findByIdOrUid as jest.Mock).mockResolvedValue({
      ...barisUser,
      role: "admin",
      permissions: null,
    });

    const res = await reorder(buatApp(), { orderedIds: ["t-orang", "t-milik"] });

    expect(res.status).toBe(200);
    // Jalur admin tidak perlu membaca baris task untuk memutuskan kepemilikan.
    expect(taskRepository.findTasksByIds).not.toHaveBeenCalled();
    expect(taskRepository.reorderTasks).toHaveBeenCalledWith("proyek-A", ["t-orang", "t-milik"]);
  });

  it("header x-user-id dan field body tidak bisa mengklaim task orang lain", async () => {
    const res = await reorder(
      buatApp(),
      { orderedIds: ["t-orang", "t-milik"], reporterId: "user-9", userId: "user-9" },
      { "x-user-id": "user-9" }
    );

    expect(res.status).toBe(200);
    expect(userRepository.findByIdOrUid).toHaveBeenCalledWith("user-2");
    expect(taskRepository.reorderTasks).toHaveBeenCalledWith("proyek-A", ["t-milik"]);
  });

  it("token tanpa identitas ditolak 401 sebelum menyentuh penyimpanan", async () => {
    pemanggil.jwt = null;

    const res = await reorder(buatApp(), { orderedIds: ["t-milik"] });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("srv.akses_ditolak_identitas");
    expect(taskRepository.findTasksByIds).not.toHaveBeenCalled();
    expect(taskRepository.reorderTasks).not.toHaveBeenCalled();
  });
});
