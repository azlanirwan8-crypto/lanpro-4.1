/**
 * Test otorisasi GET /api/audit-logs (Item #314, #316).
 *
 * Wajib: JWT anggota proyek A + projectId=B → 403, bukan 200.
 */

import fs from "fs";
import path from "path";

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockGetConnection = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: mockQuery,
    getConnection: mockGetConnection,
  },
  query: mockQuery,
}));

import { verifyGlobalAdmin } from "../middleware/auth";
import { auditLogsQuerySchema } from "../schemas/audit.schema";

const SUMBER_AUDIT = fs.readFileSync(path.join(__dirname, "audit.routes.ts"), "utf8");
const SUMBER_JAGA = fs.readFileSync(path.join(__dirname, "../middleware/jagaAuditLog.ts"), "utf8");

function mockRes() {
  let status = 0;
  let body: any = null;
  const res: any = {
    status: (code: number) => {
      status = code;
      return {
        json: (payload: any) => {
          body = payload;
        },
      };
    },
  };
  return {
    res,
    get status() {
      return status;
    },
    get body() {
      return body;
    },
  };
}

describe("Audit Logs Route — Otorisasi (Item #314)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnection.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
  });

  it("memastikan GET /api/audit-logs memakai authenticateJWT dan jagaAuditLogBaca", () => {
    expect(SUMBER_AUDIT).toMatch(/authenticateJWT/);
    expect(SUMBER_AUDIT).toMatch(/jagaAuditLogBaca/);
    expect(SUMBER_AUDIT).toMatch(/validasiQuery\(auditLogsQuerySchema\)/);
  });

  it("skema menerima projectId gaya LanPro (bukan hanya UUID)", () => {
    const ok = auditLogsQuerySchema.safeParse({
      projectId: "2SGXiPUTwHnF8D576hfO",
      limit: "20",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.projectId).toBe("2SGXiPUTwHnF8D576hfO");
      expect(ok.data.limit).toBe(20);
    }
  });

  it("skema menolak projectId kosong dan limit di luar batas", () => {
    expect(auditLogsQuerySchema.safeParse({ projectId: "" }).success).toBe(false);
    expect(auditLogsQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it("menolak non-admin tanpa projectId dengan 403", async () => {
    const { jagaAuditLogBaca } = await import("../middleware/jagaAuditLog");
    const out = mockRes();
    const req: any = { user: { id: "u1", role: "developer" }, query: {} };
    let nextCalled = false;
    await jagaAuditLogBaca(req, out.res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(out.status).toBe(403);
    expect(out.body?.code).toBe("srv.akses_ditolak_project_id_wajib");
  });

  it("mengizinkan admin lewat jagaAuditLogBaca tanpa projectId", async () => {
    const { jagaAuditLogBaca } = await import("../middleware/jagaAuditLog");
    const req: any = { user: { id: "a1", role: "admin" }, query: {} };
    let nextCalled = false;
    await jagaAuditLogBaca(req, mockRes().res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it("mengizinkan head (auditLog:R sistem) tanpa projectId", async () => {
    const { jagaAuditLogBaca } = await import("../middleware/jagaAuditLog");
    const req: any = { user: { id: "h1", role: "head" }, query: {} };
    let nextCalled = false;
    await jagaAuditLogBaca(req, mockRes().res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it("JWT anggota proyek A + projectId=B memulangkan 403", async () => {
    const { jagaAuditLogBaca } = await import("../middleware/jagaAuditLog");
    // Users resolve → Projects owner lain → ProjectMembers kosong
    mockQuery
      .mockResolvedValueOnce([[{ id: "user-a" }]])
      .mockResolvedValueOnce([[{ ownerId: "owner-b" }]])
      .mockResolvedValueOnce([[]]);

    const out = mockRes();
    const req: any = {
      user: { id: "user-a", role: "developer" },
      query: { projectId: "project-B-id" },
    };
    let nextCalled = false;
    await jagaAuditLogBaca(req, out.res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(out.status).toBe(403);
    expect(out.body?.code).toBe("srv.akses_ditolak_bukan_anggota");
    expect(mockRelease).toHaveBeenCalled();
  });

  it("JWT anggota proyek A + projectId=A mengizinkan next", async () => {
    const { jagaAuditLogBaca } = await import("../middleware/jagaAuditLog");
    mockQuery
      .mockResolvedValueOnce([[{ id: "user-a" }]])
      .mockResolvedValueOnce([[{ ownerId: "owner-x" }]])
      .mockResolvedValueOnce([[{ role: "developer" }]]);

    const out = mockRes();
    const req: any = {
      user: { id: "user-a", role: "developer" },
      query: { projectId: "project-A-id" },
    };
    let nextCalled = false;
    await jagaAuditLogBaca(req, out.res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(out.status).toBe(0);
  });

  it("verifyGlobalAdmin menolak developer", () => {
    let status = 0;
    const req: any = { user: { role: "developer" } };
    const res: any = {
      status: (c: number) => {
        status = c;
        return { json: () => {} };
      },
    };
    let nextCalled = false;
    verifyGlobalAdmin(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(status).toBe(403);
  });

  it("jagaAuditLogBaca memeriksa keanggotaan proyek bila bukan admin/head", () => {
    expect(SUMBER_JAGA).toMatch(/ProjectMembers/);
    expect(SUMBER_JAGA).toMatch(/bolehDiSistem/);
  });
});
