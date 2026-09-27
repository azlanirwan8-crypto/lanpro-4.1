/**
 * #178 — username & email harus unik LINTAS pengguna, dan pemeriksaan itu
 * harus mengecualikan baris milik id yang sedang diedit sendiri (supaya
 * submit tanpa mengubah username/email sendiri tidak salah ditolak sebagai
 * "sudah dipakai").
 *
 * Adapter database di-mock — tidak ada koneksi Postgres sungguhan.
 */
const kueriPalsu = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: any[]) => kueriPalsu(...a),
    getConnection: async () => ({
      query: (...a: any[]) => kueriPalsu(...a),
      release: () => {},
    }),
  },
}));

import { UserRepository } from "./user.repository";

const repo = new UserRepository();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isUsernameTaken", () => {
  it("TRUE bila username dipakai user LAIN", async () => {
    kueriPalsu.mockResolvedValue([[{ id: "lain" }]]);
    expect(await repo.isUsernameTaken("budi", "u1")).toBe(true);
  });

  it("FALSE bila belum dipakai siapa pun", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    expect(await repo.isUsernameTaken("budi", "u1")).toBe(false);
  });

  it("mengecualikan baris milik id yang sedang diedit sendiri — WHERE ikut id != ?", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.isUsernameTaken("budi", "u1");
    const [sql, params] = kueriPalsu.mock.calls[0];
    expect(String(sql)).toContain("id != ?");
    expect(params).toEqual(["budi", "u1"]);
  });
});

describe("isEmailTaken", () => {
  it("TRUE bila email dipakai user LAIN", async () => {
    kueriPalsu.mockResolvedValue([[{ id: "lain" }]]);
    expect(await repo.isEmailTaken("budi@x.com", "u1")).toBe(true);
  });

  it("FALSE bila belum dipakai siapa pun", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    expect(await repo.isEmailTaken("budi@x.com", "u1")).toBe(false);
  });

  it("case-insensitive — LOWER(email) di kedua sisi", async () => {
    kueriPalsu.mockResolvedValue([[{ id: "lain" }]]);
    await repo.isEmailTaken("BUDI@X.com", "u1");
    const [sql] = kueriPalsu.mock.calls[0];
    expect(String(sql)).toContain("LOWER(email)");
    expect(String(sql)).toContain("LOWER(?)");
  });

  it("mengecualikan baris milik id yang sedang diedit sendiri", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.isEmailTaken("budi@x.com", "u1");
    const [sql, params] = kueriPalsu.mock.calls[0];
    expect(String(sql)).toContain("id != ?");
    expect(params).toEqual(["budi@x.com", "u1"]);
  });
});
