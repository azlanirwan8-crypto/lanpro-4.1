/**
 * Unit test untuk penegakan token authorId pada titik diskusi (Item #251).
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

// Mock jagaProyek middleware to pass through in unit test
jest.mock("../middleware/jagaProyek", () => ({
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
}));

import { discussionPointsRepository } from "../repositories/discussion-points.repository";
import discussionPointsRouter from "./discussion-points.routes";

describe("POST /api/projects/:projectId/meetings/:id/discussionPoints authorId (Item #251)", () => {
  let app: express.Express;
  let pointTersimpan: any = null;

  beforeEach(() => {
    pointTersimpan = null;
    jest.clearAllMocks();
    jest.spyOn(discussionPointsRepository, "createPoint").mockImplementation(async (data: any) => {
      pointTersimpan = data;
      return data;
    });

    app = express();
    app.use(express.json());
    // Simulate authenticated user from JWT
    app.use((req: any, _res, next) => {
      req.user = { id: "user-real-999", uid: "user-real-999", username: "charlie" };
      next();
    });
    app.use(discussionPointsRouter);
  });

  it("mengambil authorId dari token JWT dan mengabaikan authorId dari payload body", async () => {
    const res = await request(app)
      .post("/api/projects/proj-1/meetings/meet-1/discussionPoints")
      .send({
        authorId: "spoofed-user-hacker",
        concern: "Bug pada login",
        status: "pending",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(pointTersimpan).not.toBeNull();
    // authorId harus dari token user-real-999, BUKAN spoofed-user-hacker
    expect(pointTersimpan.authorId).toBe("user-real-999");
    expect(pointTersimpan.concern).toBe("Bug pada login");
  });

  it("mengabaikan header x-user-id tiruan dan tetap memprioritaskan identitas token JWT", async () => {
    const res = await request(app)
      .post("/api/projects/proj-1/meetings/meet-1/discussionPoints")
      .set("x-user-id", "header-impostor")
      .send({
        concern: "Performa kueri lambat",
        status: "in_progress",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(pointTersimpan).not.toBeNull();
    expect(pointTersimpan.authorId).toBe("user-real-999");
  });
});
