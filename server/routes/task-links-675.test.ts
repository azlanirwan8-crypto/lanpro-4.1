import express from "express";
import request from "supertest";

/**
 * #675 — batas "tidak boleh mengubah task orang lain" pada sub-sumber task.
 *
 * Rute utama (PUT/DELETE task, lampiran, work log) sudah dijaga pembuat/assignee.
 * File ini menjaga sisa jalur mutasi yang waktu itu belum diperiksa: tautan
 * task, komentar, dan daftar work log. Ketiganya menerima `:taskId` dari URL
 * tanpa pernah menguji task itu benar-benar milik `:projectId` di URL, sehingga
 * penjaga proyek (`jagaProyek`) bisa dilewati dengan memakai proyek lain yang
 * kita ikuti sebagai alamat.
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
    const id = String(req.headers["x-test-user"] || "outsider");
    req.user = { id, uid: id, username: `${id}-name`, role: "user" };
    next();
  },
  verifyGlobalAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../middleware/jagaProyek", () => ({
  __esModule: true,
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../repositories/task.repository", () => ({
  __esModule: true,
  taskRepository: {
    findTaskOwnership: jest.fn(),
    findLinkById: jest.fn(),
    createLink: jest.fn(),
    deleteLink: jest.fn(),
    hasCycle: jest.fn(),
    createComment: jest.fn(),
    findCommentsByTaskId: jest.fn(),
    listWorkLogs: jest.fn(),
    reorderTasks: jest.fn(),
  },
}));

jest.mock("../repositories/user.repository", () => ({
  __esModule: true,
  userRepository: { findByIdOrUid: jest.fn() },
}));

jest.mock("../services/audit.service", () => ({
  __esModule: true,
  createAuditLog: jest.fn(),
}));

jest.mock("../services/notification.service", () => ({
  __esModule: true,
  broadcastProjectNotification: () => Promise.resolve(undefined),
  sendProjectActivityNotification: () => Promise.resolve(undefined),
  checkUpcomingDueDates: () => Promise.resolve(undefined),
  createAutomatedNotification: () => Promise.resolve(undefined),
  createNotification: () => Promise.resolve(undefined),
}));

jest.mock("../repositories/master-data.repository", () => ({
  __esModule: true,
  masterDataRepository: { findAll: jest.fn() },
}));

import taskRoutes from "./task.routes";
import { taskRepository } from "../repositories/task.repository";
import { userRepository } from "../repositories/user.repository";
import { masterDataRepository } from "../repositories/master-data.repository";

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.use(taskRoutes);
  return app;
};

/** Dua task milik `creator`/`assignee` di dalam project-1. */
const MILIK_KITA = { reporterId: "creator", assigneeId: "assignee" };
/** Task orang lain yang tetap ada di project-1. */
const MILIK_ORANG = { reporterId: "orang-lain", assigneeId: "orang-lain" };

const tugasDalamProyek: Record<string, any> = {
  "task-a": MILIK_KITA,
  "task-b": MILIK_KITA,
  "task-c": MILIK_ORANG,
};

beforeEach(() => {
  jest.clearAllMocks();
  (userRepository.findByIdOrUid as jest.Mock).mockImplementation(async (id: string) => ({
    id,
    uid: id,
    username: `${id}-name`,
    email: `${id}@example.test`,
    role: id === "admin-system" ? "admin" : "user",
    permissions: { list: { read: true, update: true, delete: true } },
  }));
  (masterDataRepository.findAll as jest.Mock).mockResolvedValue([]);
  (taskRepository.findTaskOwnership as jest.Mock).mockImplementation(
    async (taskId: string, projectId: string) => {
      if (projectId !== "project-1") return null;
      const tugas = tugasDalamProyek[taskId];
      return tugas ? tugas : null;
    }
  );
  (taskRepository.hasCycle as jest.Mock).mockResolvedValue(false);
});

describe("tautan task (#675)", () => {
  const buatTautan = (app: express.Express, taskId: string, body: any, user: string) =>
    request(app)
      .post(`/api/projects/project-1/tasks/${taskId}/links`)
      .set("x-test-user", user)
      .send(body);

  it("menolak menautkan task yang tidak ada di proyek URL", async () => {
    const app = buatApp();

    const response = await buatTautan(
      app,
      "task-luar-proyek",
      { targetTaskId: "task-a", relationType: "relates_to" },
      "creator"
    );

    expect(response.status).toBe(404);
    expect(taskRepository.createLink).not.toHaveBeenCalled();
  });

  it("menolak menautkan ke task di luar proyek URL", async () => {
    const app = buatApp();

    const response = await buatTautan(
      app,
      "task-a",
      { targetTaskId: "task-luar-proyek", relationType: "relates_to" },
      "creator"
    );

    expect(response.status).toBe(400);
    expect(taskRepository.createLink).not.toHaveBeenCalled();
  });

  it("menolak menautkan ke task milik orang lain", async () => {
    const app = buatApp();

    const response = await buatTautan(
      app,
      "task-a",
      { targetTaskId: "task-c", relationType: "blocks" },
      "assignee"
    );

    expect(response.status).toBe(403);
    expect(taskRepository.createLink).not.toHaveBeenCalled();
  });

  it("menolak menautkan dari task yang bukan miliknya", async () => {
    const app = buatApp();

    const response = await buatTautan(
      app,
      "task-c",
      { targetTaskId: "task-a", relationType: "relates_to" },
      "creator"
    );

    expect(response.status).toBe(403);
    expect(taskRepository.createLink).not.toHaveBeenCalled();
  });

  it("mengizinkan reporter menautkan dua task miliknya", async () => {
    const app = buatApp();
    (taskRepository.createLink as jest.Mock).mockResolvedValue(undefined);

    const response = await buatTautan(
      app,
      "task-a",
      { targetTaskId: "task-b", relationType: "blocks" },
      "creator"
    );

    expect(response.status).toBe(200);
    expect(taskRepository.createLink).toHaveBeenCalledWith(
      expect.objectContaining({ sourceTaskId: "task-a", targetTaskId: "task-b" })
    );
  });

  it("menolak relasi tidak dikenal sebelum menyentuh basis data", async () => {
    const app = buatApp();

    const response = await buatTautan(
      app,
      "task-a",
      { targetTaskId: "task-b", relationType: "menghancurkan" },
      "creator"
    );

    expect(response.status).toBe(400);
    expect(taskRepository.findTaskOwnership).not.toHaveBeenCalled();
    expect(taskRepository.createLink).not.toHaveBeenCalled();
  });

  it("menolak menghapus tautan yang tidak terhubung ke task di URL", async () => {
    const app = buatApp();
    (taskRepository.findLinkById as jest.Mock).mockResolvedValue({
      id: "link-1",
      sourceTaskId: "task-x",
      targetTaskId: "task-y",
    });

    const response = await request(app)
      .delete("/api/projects/project-1/tasks/task-a/links/link-1")
      .set("x-test-user", "creator");

    expect(response.status).toBe(404);
    expect(taskRepository.deleteLink).not.toHaveBeenCalled();
  });

  it("menolak non-participant menghapus tautan task orang lain", async () => {
    const app = buatApp();
    (taskRepository.findLinkById as jest.Mock).mockResolvedValue({
      id: "link-1",
      sourceTaskId: "task-c",
      targetTaskId: "task-a",
    });

    const response = await request(app)
      .delete("/api/projects/project-1/tasks/task-c/links/link-1")
      .set("x-test-user", "outsider");

    expect(response.status).toBe(403);
    expect(taskRepository.deleteLink).not.toHaveBeenCalled();
  });

  it("mengizinkan participant menghapus tautan task-nya", async () => {
    const app = buatApp();
    (taskRepository.findLinkById as jest.Mock).mockResolvedValue({
      id: "link-1",
      sourceTaskId: "task-a",
      targetTaskId: "task-b",
    });
    (taskRepository.deleteLink as jest.Mock).mockResolvedValue(undefined);

    const response = await request(app)
      .delete("/api/projects/project-1/tasks/task-a/links/link-1")
      .set("x-test-user", "assignee");

    expect(response.status).toBe(200);
    expect(taskRepository.deleteLink).toHaveBeenCalledWith("link-1");
  });

  it("mempertahankan full access Administrator sistem atas tautan", async () => {
    const app = buatApp();
    (taskRepository.findLinkById as jest.Mock).mockResolvedValue({
      id: "link-1",
      sourceTaskId: "task-c",
      targetTaskId: "task-a",
    });
    (taskRepository.deleteLink as jest.Mock).mockResolvedValue(undefined);

    const response = await request(app)
      .delete("/api/projects/project-1/tasks/task-c/links/link-1")
      .set("x-test-user", "admin-system");

    expect(response.status).toBe(200);
    expect(taskRepository.deleteLink).toHaveBeenCalledWith("link-1");
  });
});

describe("komentar dan work log per task (#675)", () => {
  it("menolak membaca komentar task di luar proyek URL", async () => {
    const app = buatApp();

    const response = await request(app).get(
      "/api/projects/project-1/tasks/task-luar-proyek/comments"
    );

    expect(response.status).toBe(404);
    expect(taskRepository.findCommentsByTaskId).not.toHaveBeenCalled();
  });

  it("menolak menulis komentar pada task di luar proyek URL", async () => {
    const app = buatApp();

    const response = await request(app)
      .post("/api/projects/project-1/tasks/task-luar-proyek/comments")
      .set("x-test-user", "creator")
      .send({ text: "Halo" });

    expect(response.status).toBe(404);
    expect(taskRepository.createComment).not.toHaveBeenCalled();
  });

  it("tetap menerima komentar pada task yang ada di proyek", async () => {
    const app = buatApp();
    (taskRepository.createComment as jest.Mock).mockResolvedValue(undefined);

    const response = await request(app)
      .post("/api/projects/project-1/tasks/task-a/comments")
      .set("x-test-user", "creator")
      .send({ text: "Halo" });

    expect(response.status).toBe(200);
    expect(taskRepository.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "task-a", content: "Halo" })
    );
  });

  it("menolak membaca work log task di luar proyek URL", async () => {
    const app = buatApp();

    const response = await request(app).get(
      "/api/projects/project-1/tasks/task-luar-proyek/work-logs"
    );

    expect(response.status).toBe(404);
    expect(taskRepository.listWorkLogs).not.toHaveBeenCalled();
  });
});

describe("urutan backlog (/tasks/reorder) — karakterisasi #675", () => {
  it("selalu membatasi tulis pada proyek di URL", async () => {
    const app = buatApp();
    (taskRepository.reorderTasks as jest.Mock).mockResolvedValue(undefined);

    const response = await request(app)
      .put("/api/projects/project-1/tasks/reorder")
      .set("x-test-user", "outsider")
      .send({ orderedIds: ["task-a", "task-c"] });

    expect(response.status).toBe(200);
    expect(taskRepository.reorderTasks).toHaveBeenCalledWith("project-1", ["task-a", "task-c"]);
  });

  it("menolak daftar kosong sehingga tidak ada satu baris pun ditulis", async () => {
    const app = buatApp();

    const response = await request(app)
      .put("/api/projects/project-1/tasks/reorder")
      .set("x-test-user", "creator")
      .send({ orderedIds: [] });

    expect(response.status).toBe(400);
    expect(taskRepository.reorderTasks).not.toHaveBeenCalled();
  });
});
