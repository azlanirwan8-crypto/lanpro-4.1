/**
 * Unit test untuk skema validasi rute mutasi meetings & discussion points (Item #247).
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

// Mock jagaProyek
jest.mock("../middleware/jagaProyek", () => ({
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
}));

import { meetingRepository } from "../repositories/meeting.repository";
import { discussionPointsRepository } from "../repositories/discussion-points.repository";
import meetingsRouter from "./meetings.routes";
import discussionPointsRouter from "./discussion-points.routes";

describe("Validation on Meetings & Discussion Points Mutation Routes (Item #247)", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    // Simulasi user
    app.use((req: any, _res, next) => {
      req.user = { id: "user-1", uid: "user-1", username: "tester", role: "ADMIN" };
      next();
    });
    app.use(meetingsRouter);
    app.use(discussionPointsRouter);
  });

  describe("POST /api/projects/:projectId/meetings", () => {
    it("menolak dengan 400 jika judul rapat kosong / tidak ada", async () => {
      const res = await request(app).post("/api/projects/proj-1/meetings").send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Data permintaan tidak valid");
    });

    it("menerima dan memproses pembuatan rapat jika payload valid", async () => {
      jest.spyOn(meetingRepository, "create").mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post("/api/projects/proj-1/meetings")
        .send({ title: "Sprint Kickoff Meeting", description: "Agenda pembahasan backlog" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.title).toBe("Sprint Kickoff Meeting");
    });
  });

  describe("PUT /api/projects/:projectId/meetings/:id", () => {
    it("menolak dengan 400 jika judul diisi string kosong", async () => {
      jest.spyOn(meetingRepository, "findById").mockResolvedValueOnce({
        id: "m-1",
        projectId: "proj-1",
        authorId: "user-1",
        title: "Old Title",
      } as any);

      const res = await request(app).put("/api/projects/proj-1/meetings/m-1").send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Data permintaan tidak valid");
    });
  });

  describe("POST /api/projects/:projectId/meetings/:id/analyze-transcript", () => {
    it("menolak dengan 400 jika transkrip kosong", async () => {
      const res = await request(app)
        .post("/api/projects/proj-1/meetings/m-1/analyze-transcript")
        .send({ transcript: "" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Data permintaan tidak valid");
    });
  });

  describe("POST /api/discussion-points/:pointId/comments", () => {
    it("menolak dengan 400 jika commentText kosong", async () => {
      const res = await request(app)
        .post("/api/discussion-points/pt-1/comments")
        .send({ commentText: "" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Data permintaan tidak valid");
    });

    it("menerima pembuatan komentar bila teks valid", async () => {
      jest.spyOn(discussionPointsRepository, "createComment").mockResolvedValueOnce({
        id: "cmt-1",
        pointId: "pt-1",
        userId: "user-1",
        userName: "tester",
        commentText: "Diskusi valid",
        createdAt: new Date().toISOString(),
      } as any);

      const res = await request(app)
        .post("/api/discussion-points/pt-1/comments")
        .send({ commentText: "Diskusi valid" });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.commentText).toBe("Diskusi valid");
    });
  });

  describe("PUT /api/discussion-points/:pointId/comments/:commentId", () => {
    it("menolak dengan 400 jika commentText revisi kosong", async () => {
      const res = await request(app)
        .put("/api/discussion-points/pt-1/comments/cmt-1")
        .send({ commentText: "" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toContain("Data permintaan tidak valid");
    });
  });
});
