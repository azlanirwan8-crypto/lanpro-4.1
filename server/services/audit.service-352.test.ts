/**
 * #352 — createAuditLog tidak boleh atribusi ke user acak via LIMIT 1.
 */
import fs from "node:fs";
import path from "node:path";

const queryMock = jest.fn();
const releaseMock = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: jest.fn(async () => ({
      query: queryMock,
      release: releaseMock,
    })),
  },
}));

describe("#352 createAuditLog — tanpa fallback LIMIT 1", () => {
  beforeEach(() => {
    queryMock.mockReset();
    releaseMock.mockReset();
  });

  it("sumber tidak mengandung SELECT id FROM Users LIMIT 1", () => {
    const isi = fs.readFileSync(path.resolve(__dirname, "audit.service.ts"), "utf8");
    expect(isi).not.toMatch(/SELECT id FROM Users LIMIT 1/i);
  });

  it("melewati INSERT bila userId tidak ter-resolve", async () => {
    queryMock.mockResolvedValueOnce([[]]); // Users lookup kosong

    const { createAuditLog } = await import("./audit.service");
    await createAuditLog({
      userId: "user-tidak-ada",
      projectId: null,
      actionType: "UPDATE",
      entityName: "Tasks",
      entityId: "t1",
      oldValues: null,
      newValues: { status: "done" },
    });

    // setImmediate — tunggu antrian mikrotask + immediate
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    const sql = queryMock.mock.calls.map((c) => String(c[0]));
    expect(sql.some((s) => /INSERT INTO AuditLogs/i.test(s))).toBe(false);
    expect(sql.some((s) => /LIMIT 1/i.test(s))).toBe(false);
  });
});
