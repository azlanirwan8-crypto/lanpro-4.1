/**
 * Unit test untuk validasi penerima dan payload POST /api/users/:userId/notifications (Item #244).
 */

import express from "express";
import request from "supertest";

// Mock DB
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

describe("POST /api/users/:userId/notifications (Item #244)", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    // Simulasi pengguna terotentikasi
    app.use((req: any, _res, next) => {
      req.user = { id: "sender-1", uid: "sender-1", username: "sender_user" };
      next();
    });
    app.use(notificationsRouter);
  });

  it("menolak jika penerima tidak ditemukan di database dengan 404", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/users/user-hantu/notifications")
      .send({ title: "Halo", message: "Tes notifikasi" });

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.pengguna_tidak_ditemukan");
  });

  it("menolak jika akun penerima berstatus inactive dengan 400", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce({
      id: "user-nonaktif",
      username: "budi",
      displayName: "Budi",
      role: "user",
      status: "inactive",
    });

    const res = await request(app)
      .post("/api/users/user-nonaktif/notifications")
      .send({ title: "Halo", message: "Tes notifikasi" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.pengguna_tidak_aktif");
  });

  it("menolak jika akun penerima berstatus suspended dengan 400", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce({
      id: "user-suspend",
      username: "cici",
      displayName: "Cici",
      role: "user",
      status: "suspended",
    });

    const res = await request(app)
      .post("/api/users/user-suspend/notifications")
      .send({ title: "Halo", message: "Tes notifikasi" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.pengguna_tidak_aktif");
  });

  it("menolak jika judul melebihi 200 karakter dengan 400", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce({
      id: "user-aktif",
      username: "dani",
      displayName: "Dani",
      role: "user",
      status: "active",
    });

    const judulPanjang = "a".repeat(201);
    const res = await request(app)
      .post("/api/users/user-aktif/notifications")
      .send({ title: judulPanjang, message: "Pesan valid" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.judul_terlalu_panjang");
  });

  it("menolak jika pesan melebihi 2000 karakter dengan 400", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce({
      id: "user-aktif",
      username: "dani",
      displayName: "Dani",
      role: "user",
      status: "active",
    });

    const pesanPanjang = "b".repeat(2001);
    const res = await request(app)
      .post("/api/users/user-aktif/notifications")
      .send({ title: "Judul", message: pesanPanjang });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.pesan_notifikasi_terlalu_panjang");
  });

  it("berhasil membuat notifikasi jika penerima valid dan aktif", async () => {
    jest.spyOn(userRepository, "findByIdOrUid").mockResolvedValueOnce({
      id: "db-user-aktif",
      uid: "uid-dani",
      username: "dani",
      displayName: "Dani",
      role: "user",
      status: "active",
    });
    const createSpy = jest.spyOn(notificationRepository, "create").mockResolvedValueOnce();

    // Item #258 — `type` diganti dari "task" (bebas, tak pernah dipakai
    // pemanggil sungguhan) ke "mention" (satu dari dua tipe yang benar-benar
    // dipakai di src/). "task" kini ditolak 403 untuk pengirim non-admin yang
    // menotifikasi pengguna lain — persis celah yang ditutup #258, dan test
    // ini SENGAJA tidak lagi menjadi contoh cara mengeksploitasinya. Lihat
    // notifications.otorisasi-258.test.ts untuk pembatasan tipenya sendiri.
    const res = await request(app).post("/api/users/uid-dani/notifications").send({
      title: "Tugas Baru",
      message: "Anda ditugaskan pada tugas X",
      type: "mention",
      relatedId: "task-123",
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.senderId).toBe("sender-1");
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "db-user-aktif",
        senderId: "sender-1",
        title: "Tugas Baru",
        message: "Anda ditugaskan pada tugas X",
        type: "mention",
        relatedId: "task-123",
      })
    );
  });
});
