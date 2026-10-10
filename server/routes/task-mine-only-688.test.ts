import express from "express";
import request from "supertest";

/**
 * #688 — "My Tasks" pada daftar isu yang di-page server.
 *
 * KNAPA DI SINI. Modul lain menerima seluruh proyek di memori jadi bisa disaring
 * di klien. Issue List TIDAK: `findIssueListPage` membalik SATU HALAMAN root
 * beserta `total`-nya. Kalau "mine" disaring di klien, daftarnya terpotong tetapi
 * jumlah barisnya tetap milik semua orang — angka yang salah, dan halaman yang
 * tampak kosong. Jadi filternya harus ikut ke SQL.
 *
 * ATURAN KEAMANAN YANG DIKUNCI DI SINI. Identitas yang dipakai untuk menyaring
 * datang dari JWT yang sudah diverifikasi + baris Users, BUKAN dari query/body.
 * Kalau tidak, "My Tasks" berubah menjadi alat untuk membaca task orang lain:
 * tinggal ganti `?assigneeId=...`. Pelajaran #674.
 */

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn().mockResolvedValue([[], []]),
    getConnection: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue([[], []]),
      release: jest.fn(),
    }),
  },
}));

jest.mock("../middleware/auth", () => ({
  __esModule: true,
  authenticateJWT: (req: any, _res: any, next: any) => {
    const id = String(req.headers["x-test-user"] || "orang-lain");
    req.user = { id, uid: id, username: `${id}-name`, email: `${id}@example.test`, role: "user" };
    next();
  },
  verifyGlobalAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../middleware/jagaProyek", () => ({
  __esModule: true,
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
}));

const mockFindIssueListPage = jest.fn();

jest.mock("../repositories/task.repository", () => ({
  __esModule: true,
  taskRepository: {
    findTasksWithRelations: jest.fn().mockResolvedValue([]),
    findIssueListPage: (...args: any[]) => mockFindIssueListPage(...args),
  },
}));

jest.mock("../repositories/user.repository", () => ({
  __esModule: true,
  userRepository: {
    findByIdOrUid: jest.fn().mockResolvedValue({
      id: "rina-row",
      uid: "rina-uid",
      username: "rina",
      email: "rina@example.test",
      role: "user",
    }),
  },
}));

jest.mock("../services/notification.service", () => ({
  __esModule: true,
  broadcastProjectNotification: () => Promise.resolve(undefined),
  sendProjectActivityNotification: () => Promise.resolve(undefined),
  checkUpcomingDueDates: () => Promise.resolve(undefined),
  createAutomatedNotification: () => Promise.resolve(undefined),
  createNotification: () => Promise.resolve(undefined),
}));

jest.mock("../services/audit.service", () => ({
  __esModule: true,
  createAuditLog: jest.fn(),
}));

jest.mock("../repositories/master-data.repository", () => ({
  __esModule: true,
  masterDataRepository: { findAll: jest.fn() },
}));

import taskRoutes from "./task.routes";
import { masterDataRepository } from "../repositories/master-data.repository";
import { userRepository } from "../repositories/user.repository";

const buatApp = () => {
  const app = express();
  app.use(express.json());
  // Di server sungguhan `req.user` diisi oleh gerbang `/api/*` global
  // (server.ts:541) yang memanggil authenticateJWT. Rute GET daftar tugas tidak
  // memasang authenticateJWT sendiri, jadi test ini harus meniru gerbang itu —
  // kalau tidak, `kunciPenugasanPemanggil` tidak punya JWT untuk dibaca dan
  // hasilnya kosong karena alasan yang salah.
  app.use((req: any, _res, next) => {
    const id = String(req.headers["x-test-user"] || "orang-lain");
    req.user = { id, uid: id, username: `${id}-name`, email: `${id}@example.test`, role: "user" };
    next();
  });
  app.use(taskRoutes);
  return app;
};

const ambilKunci = (panggilan: any[] | undefined) => {
  const kunci = panggilan?.[3];
  return Array.isArray(kunci) ? kunci.map(String).sort() : kunci;
};

describe("mineOnly di daftar isu yang di-page server (#688)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (masterDataRepository.findAll as jest.Mock).mockResolvedValue([]);
    mockFindIssueListPage.mockResolvedValue({ items: [], total: 0 });
    // Konfigurasi Jest repo ini me-reset mock sebelum tiap test, dan reset itu
    // menghapus implementasi yang dipasang di dalam factory `jest.mock` — kalau
    // tidak dipasang ulang, `findByIdOrUid` mengembalikan undefined dan test ini
    // gagal dengan pesan yang menyesatkan (melihat pelajaran jagaProyek.test.ts).
    (userRepository.findByIdOrUid as jest.Mock).mockResolvedValue({
      id: "rina-row",
      uid: "rina-uid",
      username: "rina",
      email: "rina@example.test",
      displayName: "Rina Contoh",
      role: "user",
    });
  });

  it("menyaring berdasar identitas dari token, bukan dari query", async () => {
    const app = buatApp();

    await request(app)
      .get("/api/projects/project-1/tasks?rootsOnly=1&page=1&limit=25&mineOnly=1")
      .set("x-test-user", "rina");

    expect(mockFindIssueListPage).toHaveBeenCalledTimes(1);
    const [, , , penugasan] = mockFindIssueListPage.mock.calls[0];
    // Baris Users yang diambil lewat `findByIdOrUid` ikut dipakai, supaya akun
    // lama yang menuliskan uid berbeda tidak kehilangan task-nya.
    expect(penugasan).toEqual(
      expect.arrayContaining(["rina-uid", "rina-row", "rina@example.test"])
    );
  });

  it("tidak pernah memakai identitas yang dikirim klien", async () => {
    const app = buatApp();

    await request(app)
      .get(
        "/api/projects/project-1/tasks?rootsOnly=1&page=1&limit=25&mineOnly=1" +
          "&assigneeId=orang-lain&penugasanKepada=orang-lain&email=orang-lain%40contoh.test"
      )
      .set("x-test-user", "rina");

    const penugasan = mockFindIssueListPage.mock.calls[0][3];
    expect(penugasan).not.toContain("orang-lain");
    expect(penugasan).not.toContain("orang-lain@contoh.test");
    // Label tampilan dan username BUKAN kunci (#688): dua orang boleh bernama
    // sama, dan nama bisa berubah sementara tugasnya tidak.
    expect(penugasan).not.toContain("Rina Contoh");
    expect(penugasan).not.toContain("rina-name");
  });

  it("tanpa mineOnly tidak menyaring sama sekali", async () => {
    const app = buatApp();

    await request(app).get("/api/projects/project-1/tasks?rootsOnly=1&page=1&limit=25");

    const penugasan = mockFindIssueListPage.mock.calls[0][3];
    expect(penugasan === undefined || penugasan === null || penugasan.length === 0).toBe(true);
  });

  it("mode mine selalu membawa kunci, tidak pernah balik ke seluruh proyek", async () => {
    const app = buatApp();

    const response = await request(app)
      .get("/api/projects/project-1/tasks?rootsOnly=1&page=1&limit=25&mineOnly=1")
      .set("x-test-user", "tidak-ada-di-db");

    // Baris Users tidak ditemukan (mock mengembalikan milik `rina`), jadi kunci
    // tetap ada dari token. Yang dijamin di sini: respons tidak membocorkan
    // seluruh proyek saat mode "mine".
    expect(response.status).toBe(200);
    expect(mockFindIssueListPage).toHaveBeenCalled();
    const penugasan = mockFindIssueListPage.mock.calls[0][3];
    expect(Array.isArray(penugasan)).toBe(true);
    expect(penugasan.length).toBeGreaterThan(0);
  });

  it("menolak nilai mineOnly yang bukan boolean", async () => {
    const app = buatApp();

    const response = await request(app)
      .get("/api/projects/project-1/tasks?rootsOnly=1&page=1&limit=25&mineOnly=semua")
      .set("x-test-user", "rina");

    expect(response.status).toBe(400);
    expect(mockFindIssueListPage).not.toHaveBeenCalled();
  });
});
