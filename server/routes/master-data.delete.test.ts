/**
 * Unit test untuk DELETE /api/master-data/:id error codes dan penanganan data in-use (Item #249).
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

// Mock verifyGlobalAdmin middleware
jest.mock("../middleware/auth", () => ({
  verifyGlobalAdmin: (_req: any, _res: any, next: any) => next(),
}));

import { masterDataRepository } from "../repositories/master-data.repository";
import masterDataRouter from "./master-data.routes";

describe("DELETE /api/master-data/:id (Item #249)", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(masterDataRouter);
  });

  it("mengembalikan 400 dengan code srv.data_master_sedang_digunakan dan params count saat data masih digunakan Task aktif", async () => {
    jest.spyOn(masterDataRepository, "findById").mockResolvedValueOnce({
      id: "md-123",
      label: "In Progress",
      type: "status",
      is_system_default: false,
    } as any);

    jest.spyOn(masterDataRepository, "countTaskUsage").mockResolvedValueOnce(5);

    const res = await request(app).delete("/api/master-data/md-123");

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.data_master_sedang_digunakan");
    expect(res.body.params).toEqual({ count: 5 });
    expect(res.body.message).toContain("5 Task aktif");
  });

  it("mengembalikan 400 dengan code srv.data_master_bawaan_sistem saat data master adalah bawaan sistem", async () => {
    jest.spyOn(masterDataRepository, "findById").mockResolvedValueOnce({
      id: "md-sys",
      label: "Open",
      type: "status",
      is_system_default: true,
    } as any);

    const res = await request(app).delete("/api/master-data/md-sys");

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.data_master_bawaan_sistem");
  });

  it("mengembalikan 404 dengan code srv.master_data_tidak_ditemukan saat ID tidak ada", async () => {
    jest.spyOn(masterDataRepository, "findById").mockResolvedValueOnce(null);

    const res = await request(app).delete("/api/master-data/md-notfound");

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("error");
    expect(res.body.code).toBe("srv.master_data_tidak_ditemukan");
  });
});
