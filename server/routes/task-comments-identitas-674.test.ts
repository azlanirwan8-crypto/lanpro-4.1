/**
 * Test #674 — penulis komentar task hanya dari token.
 *
 * `Comments.userId` menentukan siapa yang boleh mengubah dan menghapus
 * komentarnya. Sebelum ini handler membaca `authorId` dari body lebih dulu,
 * lalu `x-user-id` dari header, lalu jatuh ke `"guest"` — jadi penulisnya
 * sepenuhnya pilihan pemanggil.
 */
import express from "express";
import request from "supertest";

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
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
  verifyGlobalAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../middleware/jagaProyek", () => ({
  __esModule: true,
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../repositories/task.repository", () => ({
  __esModule: true,
  taskRepository: {
    findTasksWithRelations: jest.fn(),
    findIssueListPage: jest.fn(),
    findTaskWithProjectCategory: jest.fn(),
    updateTaskWithVersionLock: jest.fn(),
    findTaskOwnership: jest.fn(),
    deleteTaskCascade: jest.fn(),
    findTasksByIds: jest.fn(),
    deleteTasksByIds: jest.fn(),
    addAttachment: jest.fn(),
    deleteAttachment: jest.fn(),
    createWorkLog: jest.fn(),
    listWorkLogs: jest.fn(),
    createComment: jest.fn(),
  },
}));

jest.mock("../repositories/user.repository", () => ({
  __esModule: true,
  userRepository: { findByIdOrUid: jest.fn() },
}));

jest.mock("../services/audit.service", () => ({
  __esModule: true,
  createAuditLog: jest.fn().mockResolvedValue(undefined),
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
  masterDataRepository: { findAll: jest.fn().mockResolvedValue([]) },
}));

import taskRoutes from "./task.routes";
import { taskRepository } from "../repositories/task.repository";

const PENULIS = "user-asli-1";

const buatApp = (user: any) => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = user;
    next();
  });
  app.use(taskRoutes);
  return app;
};

describe("identitas komentar task hanya dari token (#674)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (taskRepository.findTaskOwnership as jest.Mock).mockResolvedValue({
      id: "task-1",
      projectId: "proj-1",
      reporterId: PENULIS,
    });
    (taskRepository.createComment as jest.Mock).mockResolvedValue(undefined);
  });

  it("mengabaikan authorId palsu di body dan x-user-id palsu di header", async () => {
    const res = await request(buatApp({ id: PENULIS, uid: PENULIS, username: "asli" }))
      .post("/api/projects/proj-1/tasks/task-1/comments")
      .set("x-user-id", "palsu-header")
      .send({ text: "Komentar", authorId: "palsu-body" });

    expect(res.status).toBe(200);
    expect(taskRepository.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: PENULIS })
    );
    expect(res.body.data.authorId).toBe(PENULIS);
  });

  it("tidak pernah menyimpan 'guest' sebagai penulis", async () => {
    const res = await request(buatApp({ id: PENULIS, uid: PENULIS }))
      .post("/api/projects/proj-1/tasks/task-1/comments")
      .send({ text: "Komentar" });

    expect(res.status).toBe(200);
    const tersimpan = (taskRepository.createComment as jest.Mock).mock.calls[0][0];
    expect(tersimpan.userId).not.toBe("guest");
  });

  it("tetap menyimpan parentId utuh (#497)", async () => {
    const res = await request(buatApp({ id: PENULIS, uid: PENULIS }))
      .post("/api/projects/proj-1/tasks/task-1/comments")
      .send({ text: "Balasan", parentId: "komentar-induk" });

    expect(res.status).toBe(200);
    expect(taskRepository.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: "komentar-induk" })
    );
  });
});
