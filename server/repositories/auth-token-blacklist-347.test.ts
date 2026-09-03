/**
 * #347 — helper/repository TokenBlacklist (INSERT + SELECT memakai kolom pg-migrate).
 */

const mockKueri = jest.fn();
const mockRelease = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: (...a: any[]) => mockKueri(...a),
      release: () => mockRelease(),
    }),
  },
}));

import jwt from "jsonwebtoken";
import { AuthRepository, expiresAtDariJwt } from "./auth.repository";

describe("#347 AuthRepository TokenBlacklist", () => {
  const repo = new AuthRepository();

  beforeEach(() => {
    mockKueri.mockReset();
    mockRelease.mockReset();
    mockKueri.mockResolvedValue([[]]);
  });

  it('addToTokenBlacklist menulis ke "TokenBlacklist" dengan token + expiresAt', async () => {
    const token = jwt.sign({ id: "u1" }, "secret-uji-blacklist-347", { expiresIn: "1h" });
    await repo.addToTokenBlacklist(token);

    expect(mockKueri).toHaveBeenCalledTimes(1);
    const [sql, params] = mockKueri.mock.calls[0];
    expect(String(sql)).toContain('"TokenBlacklist"');
    expect(String(sql)).toContain('"expiresAt"');
    expect(params[0]).toBe(token.slice(0, 512));
    expect(params[1]).toBeInstanceOf(Date);
    expect((params[1] as Date).getTime()).toBe(expiresAtDariJwt(token).getTime());
    expect(mockRelease).toHaveBeenCalled();
  });

  it("isTokenBlacklisted true bila baris aktif ditemukan", async () => {
    mockKueri.mockResolvedValueOnce([[{ hit: 1 }]]);
    const ada = await repo.isTokenBlacklisted("jwt-dicabut");
    expect(ada).toBe(true);
    const [sql, params] = mockKueri.mock.calls[0];
    expect(String(sql)).toContain('"TokenBlacklist"');
    expect(String(sql)).toMatch(/"expiresAt"\s*>\s*NOW\(\)/i);
    expect(params[0]).toBe("jwt-dicabut");
  });

  it("isTokenBlacklisted false bila kosong", async () => {
    mockKueri.mockResolvedValueOnce([[]]);
    expect(await repo.isTokenBlacklisted("jwt-bersih")).toBe(false);
  });

  it("addToTokenBlacklist no-op untuk token kosong", async () => {
    await repo.addToTokenBlacklist("");
    expect(mockKueri).not.toHaveBeenCalled();
  });
});
