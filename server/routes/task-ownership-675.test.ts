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
  app.use((req: any, _res, next) => {
    const id = String(req.headers["x-test-user"] || "outsider");
    req.user = { id, uid: id, username: `${id}-name`, role: "user" };
    next();
  });
  app.use(taskRoutes);
  return app;
};

const taskDimiliki = { id: "task-1", reporterId: "creator", assigneeId: "assignee" };

describe("otorisasi dan visibilitas task (#675)", () => {
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
  });

  it("menampilkan semua task proyek kepada anggota yang memiliki akses baca", async () => {
    const tasks = [taskDimiliki, { id: "task-2", reporterId: "orang-lain" }];
    (taskRepository.findTasksWithRelations as jest.Mock).mockResolvedValue(tasks);

    const response = await request(buatApp()).get("/api/projects/project-1/tasks");

    expect(response.status).toBe(200);
    expect(response.body.data.map((task: any) => task.id)).toEqual(["task-1", "task-2"]);
    expect(taskRepository.findTasksWithRelations).toHaveBeenCalledWith("project-1", null);
  });

  it("menolak PUT task yang tidak dibuat atau ditugaskan kepada pemanggil", async () => {
    (taskRepository.findTaskWithProjectCategory as jest.Mock).mockResolvedValue(taskDimiliki);

    const response = await request(buatApp())
      .put("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "outsider")
      .send({ status: "In Progress" });

    expect(response.status).toBe(403);
  });

  it("menolak assignee mengalihkan task ke orang lain", async () => {
    (taskRepository.findTaskWithProjectCategory as jest.Mock).mockResolvedValue(taskDimiliki);

    const response = await request(buatApp())
      .put("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "assignee")
      .send({ assigneeId: "new-assignee" });

    expect(response.status).toBe(403);
  });

  it("mengizinkan assignee mengubah field umum task-nya", async () => {
    (taskRepository.findTaskWithProjectCategory as jest.Mock).mockResolvedValue({
      ...taskDimiliki,
      title: "Judul lama",
      status: "To Do",
      version: 1,
      projectCategory: "Scrum",
    });
    (taskRepository.updateTaskWithVersionLock as jest.Mock).mockResolvedValue(true);

    const response = await request(buatApp())
      .put("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "assignee")
      .send({ title: "Judul baru" });

    expect(response.status).toBe(200);
    expect(taskRepository.updateTaskWithVersionLock).toHaveBeenCalled();
  });

  it("mengizinkan reporter mengalihkan assignee", async () => {
    (taskRepository.findTaskWithProjectCategory as jest.Mock).mockResolvedValue({
      ...taskDimiliki,
      title: "Judul task",
      status: "To Do",
      version: 1,
      projectCategory: "Scrum",
    });
    (taskRepository.updateTaskWithVersionLock as jest.Mock).mockResolvedValue(true);

    const response = await request(buatApp())
      .put("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "creator")
      .send({ assigneeId: "new-assignee" });

    expect(response.status).toBe(200);
    expect(taskRepository.updateTaskWithVersionLock).toHaveBeenCalled();
  });

  it("menolak DELETE task orang lain walau checklist mengizinkan delete", async () => {
    (taskRepository.findTaskOwnership as jest.Mock).mockResolvedValue(taskDimiliki);

    const response = await request(buatApp())
      .delete("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "outsider");

    expect(response.status).toBe(403);
    expect(taskRepository.deleteTaskCascade).not.toHaveBeenCalled();
  });

  it("mengizinkan reporter menghapus task bila checklist mengizinkan", async () => {
    (taskRepository.findTaskOwnership as jest.Mock).mockResolvedValue(taskDimiliki);
    (taskRepository.deleteTaskCascade as jest.Mock).mockResolvedValue(undefined);

    const response = await request(buatApp())
      .delete("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "creator");

    expect(response.status).toBe(200);
    expect(taskRepository.deleteTaskCascade).toHaveBeenCalledWith("task-1", "project-1");
  });

  it("mengizinkan assignee menghapus bila checklist mengizinkan", async () => {
    (taskRepository.findTaskOwnership as jest.Mock).mockResolvedValue(taskDimiliki);
    (taskRepository.deleteTaskCascade as jest.Mock).mockResolvedValue(undefined);

    const response = await request(buatApp())
      .delete("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "assignee");

    expect(response.status).toBe(200);
    expect(taskRepository.deleteTaskCascade).toHaveBeenCalledWith("task-1", "project-1");
  });

  it("mempertahankan full access Administrator sistem", async () => {
    (taskRepository.findTaskOwnership as jest.Mock).mockResolvedValue(taskDimiliki);
    (taskRepository.deleteTaskCascade as jest.Mock).mockResolvedValue(undefined);

    const response = await request(buatApp())
      .delete("/api/projects/project-1/tasks/task-1")
      .set("x-test-user", "admin-system");

    expect(response.status).toBe(200);
    expect(taskRepository.deleteTaskCascade).toHaveBeenCalledWith("task-1", "project-1");
  });

  it("menolak bulk-delete seluruhnya jika pilihan mencakup task orang lain", async () => {
    (taskRepository.findTasksByIds as jest.Mock).mockResolvedValue([
      { id: "task-1", reporterId: "creator", assigneeId: "outsider" },
      { id: "task-2", reporterId: "another-user", assigneeId: "another-assignee" },
    ]);

    const response = await request(buatApp())
      .post("/api/projects/project-1/tasks/bulk-delete")
      .set("x-test-user", "outsider")
      .send({ taskIds: ["task-1", "task-2"] });

    expect(response.status).toBe(403);
    expect(taskRepository.deleteTasksByIds).not.toHaveBeenCalled();
  });

  it("menolak orang lain menambahkan atau menghapus lampiran task", async () => {
    (taskRepository.findTaskWithProjectCategory as jest.Mock).mockResolvedValue(taskDimiliki);

    const app = buatApp();
    const addResponse = await request(app)
      .post("/api/projects/project-1/tasks/task-1/attachments")
      .set("x-test-user", "outsider")
      .send({ filename: "a.txt", name: "a.txt", url: "/a.txt" });
    const deleteResponse = await request(app)
      .delete("/api/projects/project-1/tasks/task-1/attachments/file-1")
      .set("x-test-user", "outsider");

    expect(addResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(taskRepository.addAttachment).not.toHaveBeenCalled();
    expect(taskRepository.deleteAttachment).not.toHaveBeenCalled();
  });

  it("menolak orang lain mencatat work log pada task", async () => {
    (taskRepository.findTaskOwnership as jest.Mock).mockResolvedValue(taskDimiliki);

    const response = await request(buatApp())
      .post("/api/projects/project-1/tasks/task-1/work-logs")
      .set("x-test-user", "outsider")
      .send({ hours: 1 });

    expect(response.status).toBe(403);
    expect(taskRepository.createWorkLog).not.toHaveBeenCalled();
  });
});
