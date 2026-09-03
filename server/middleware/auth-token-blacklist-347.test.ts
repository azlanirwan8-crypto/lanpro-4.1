/**
 * #347 — TokenBlacklist dipakai di authenticateJWT (denylist setelah verify JWT).
 * Pola mirip auth.sinkron-peran.test.ts: mock db + jwt sungguhan.
 */

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

import jwt from "jsonwebtoken";
import { authenticateJWT } from "./auth";
import { createMockRequest, createMockResponse } from "../test/setup";
import db from "../../src/lib/db";

async function tungguSelesai(next: jest.Mock, res: { status: jest.Mock }) {
  for (let i = 0; i < 30; i++) {
    if (next.mock.calls.length > 0 || res.status.mock.calls.length > 0) return;
    await new Promise((r) => setImmediate(r));
  }
}

describe("#347 authenticateJWT TokenBlacklist", () => {
  const secret = "test-secret-for-token-blacklist-347";

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("menolak (401) bila token ada di TokenBlacklist", async () => {
    const token = jwt.sign(
      { id: "user-bl", uid: "user-bl", username: "bl", role: "user" },
      secret,
      { expiresIn: "2h" }
    );
    (db.query as jest.Mock).mockResolvedValueOnce([[{ hit: 1 }]]);

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
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        code: "srv.token_dicabut",
      })
    );
    expect(next).not.toHaveBeenCalled();
    // tidak lanjut ke cek currentSessionToken
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("tetap memeriksa currentSessionToken bila token tidak di denylist", async () => {
    const token = jwt.sign(
      { id: "user-ok", uid: "user-ok", username: "ok", role: "user" },
      secret,
      { expiresIn: "2h" }
    );
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
      "user-ok",
      "user-ok",
    ]);
    expect(next).toHaveBeenCalled();
  });
});
