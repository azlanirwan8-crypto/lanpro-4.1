import express from "express";
import request from "supertest";

// Mock middleware & db
const kueriPalsu = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: any[]) => kueriPalsu(...a),
    getConnection: async () => ({
      query: (...a: any[]) => kueriPalsu(...a),
      release: jest.fn(),
    }),
  },
  query: (...a: any[]) => kueriPalsu(...a),
}));

jest.mock("../middleware/auth", () => ({
  verifyGlobalAdmin: (req: any, _res: any, next: any) => {
    req.user = { id: 1, username: "admin", role: "admin" };
    next();
  },
}));

import dbAdminRoutes from "./db-admin.routes";

describe("POST /api/db-query Read-Only Enforcement (Item #19)", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(dbAdminRoutes);
  });

  it("mengizinkan query SELECT read-only", async () => {
    kueriPalsu.mockResolvedValueOnce([[{ id: 1, name: "Project A" }]]);

    const res = await request(app)
      .post("/api/db-query")
      .send({ query: "SELECT * FROM \"Projects\"" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toEqual([{ id: 1, name: "Project A" }]);
  });

  it("mengizinkan query SHOW atau DESCRIBE read-only", async () => {
    kueriPalsu.mockResolvedValueOnce([[{ table_name: "Projects" }]]);

    const res = await request(app)
      .post("/api/db-query")
      .send({ query: "SHOW TABLES" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });

  it("menolak query UPDATE", async () => {
    const res = await request(app)
      .post("/api/db-query")
      .send({ query: "UPDATE \"Users\" SET role = 'admin' WHERE id = 2" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toContain("read-only");
  });

  it("menolak query DELETE", async () => {
    const res = await request(app)
      .post("/api/db-query")
      .send({ query: "DELETE FROM \"Projects\" WHERE id = 1" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toContain("read-only");
  });

  it("menolak query DROP TABLE atau TRUNCATE", async () => {
    const res = await request(app)
      .post("/api/db-query")
      .send({ query: "DROP TABLE \"Users\"" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toContain("read-only");
  });

  it("menolak chaining statement (titik koma berganda)", async () => {
    const res = await request(app)
      .post("/api/db-query")
      .send({ query: "SELECT 1; DROP TABLE \"Users\";" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toContain("read-only");
  });
});
