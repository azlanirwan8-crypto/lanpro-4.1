import jwt from "jsonwebtoken";

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

import { authenticateJWT } from "./auth";
import { createMockRequest, createMockResponse } from "../test/setup";
import db from "../../src/lib/db";

/** authenticateJWT menyelesaikan lewat promise berantai — tunggu next atau status. */
async function tungguSelesai(next: jest.Mock, res: { status: jest.Mock }) {
  for (let i = 0; i < 30; i++) {
    if (next.mock.calls.length > 0 || res.status.mock.calls.length > 0) return;
    await new Promise((r) => setImmediate(r));
  }
}

describe("authenticateJWT - Sinkronisasi Peran & Status Real-time (§19.28 / Item #92)", () => {
  const secret = "test-secret-for-jwt-role-sync";

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("menyinkronkan peran terkini dari database bila peran di DB berbeda dari token (pencabutan hak admin seketika)", async () => {
    // Token dibuat saat user masih 'admin'
    const token = jwt.sign(
      { id: "user-123", uid: "user-123", username: "budi", role: "admin" },
      secret,
      { expiresIn: "2h" }
    );

    // #347 denylist kosong, lalu sesi + peran dari DB
    (db.query as jest.Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ currentSessionToken: token, role: "user", status: "active" }]]);

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = jest.fn();

    authenticateJWT(req as any, res as any, next);
    await tungguSelesai(next, res as any);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("TokenBlacklist"), [
      token.slice(0, 512),
    ]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("currentSessionToken"), [
      "user-123",
      "user-123",
    ]);
    expect(next).toHaveBeenCalled();
    // req.user.role harus mengambil peran dari DB ('user'), bukan dari token ('admin')
    expect(req.user.role).toBe("user");
    expect(req.user.status).toBe("active");
  });

  it("menerima akses jika status akun di database adalah 'approved'", async () => {
    const token = jwt.sign(
      { id: "user-123", uid: "user-123", username: "admin", role: "admin" },
      secret,
      { expiresIn: "2h" }
    );

    (db.query as jest.Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ currentSessionToken: token, role: "admin", status: "approved" }]]);

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = jest.fn();

    authenticateJWT(req as any, res as any, next);
    await tungguSelesai(next, res as any);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe("admin");
    expect(req.user.status).toBe("approved");
  });

  it("menolak akses (HTTP 403) jika status akun di database tidak aktif / suspended", async () => {
    const token = jwt.sign(
      { id: "user-123", uid: "user-123", username: "budi", role: "user" },
      secret,
      { expiresIn: "2h" }
    );

    (db.query as jest.Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ currentSessionToken: token, role: "user", status: "suspended" }]]);

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = jest.fn();

    authenticateJWT(req as any, res as any, next);
    await tungguSelesai(next, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: expect.stringContaining("dinonaktifkan"),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("menolak akses (HTTP 401) jika user sudah tidak ada / dihapus dari database", async () => {
    const token = jwt.sign(
      { id: "user-999", uid: "user-999", username: "dihapus", role: "user" },
      secret,
      { expiresIn: "2h" }
    );

    (db.query as jest.Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = jest.fn();

    authenticateJWT(req as any, res as any, next);
    await tungguSelesai(next, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: expect.stringContaining("Pengguna tidak ditemukan"),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
