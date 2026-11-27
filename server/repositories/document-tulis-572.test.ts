/**
 * #572 — sisi TULIS dari jaring perutean papan.
 *
 * `documents.routes.ts` memulangkan apa pun yang tiba terakhir: `update()`
 * menyusun SQL hanya dari kolom yang dikirim dan menutupnya dengan
 * `WHERE id = ?` — tanpa penjaga versi maupun perbandingan `updatedAt`. Itulah
 * #568 (dua tab yang menyimpan papan yang sama saling menimpa diam-diam).
 *
 * Test ini TIDAK memperbaiki apa pun. Ia mengunci bentuk kueri hari ini supaya
 * #568 (dan #571 yang menyentuh jalur simpan yang sama) punya jaring: bila
 * SQL-nya berubah, test ini yang lebih dulu berteriak, bukan papan pengguna.
 *
 * Adapter database di-mock — tidak ada koneksi Postgres sungguhan.
 */
const kueriPalsu = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: unknown[]) => kueriPalsu(...a),
    getConnection: async () => ({
      query: (...a: unknown[]) => kueriPalsu(...a),
      release: () => {},
    }),
  },
}));

import { DocumentRepository } from "./document.repository";

const repo = new DocumentRepository();

const kueri = () => String(kueriPalsu.mock.calls[0][0]);
const parameter = () => kueriPalsu.mock.calls[0][1] as unknown[];

beforeEach(() => jest.clearAllMocks());

describe("document.repository.update — kolom yang tidak dikirim tidak boleh dihapus (#572)", () => {
  it("hanya menulis kolom yang tiba", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.update("d-1", { canvasData: '{"nodes":[],"edges":[]}' });

    expect(kueri()).toBe(
      'UPDATE Documents SET canvasData = ?, "updatedAt" = NOW() WHERE id = ? RETURNING "updatedAt"'
    );
    expect(parameter()).toEqual(['{"nodes":[],"edges":[]}', "d-1"]);
  });

  it("menulis beberapa kolom sekaligus dalam urutan yang tetap", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.update("d-1", { title: "Alur", canvasData: "{}", category: "PRD" });

    expect(kueri()).toBe(
      'UPDATE Documents SET title = ?, canvasData = ?, category = ?, "updatedAt" = NOW() WHERE id = ? RETURNING "updatedAt"'
    );
    expect(parameter()).toEqual(["Alur", "{}", "PRD", "d-1"]);
  });

  it("null berarti kosongkan kolom itu, bukan lewati", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.update("d-1", { description: null });
    expect(kueri()).toContain("description = ?");
    expect(parameter()).toEqual([null, "d-1"]);
  });

  it("pembaruan kosong tidak mengirim kueri sama sekali", async () => {
    await repo.update("d-1", {});
    expect(kueriPalsu).not.toHaveBeenCalled();
  });
});

/**
 * Jalur kompatibilitas tanpa versi tetap mengembalikan stempel baru (#568).
 * Flowchart yang mengirim versi juga menegakkan versi pada UPDATE (#876).
 */
describe("document.repository.update — stempel baru ditulis dan dipulangkan (#568)", () => {
  it("baris diberi stempel waktu dan stempelnya ikut kembali", async () => {
    kueriPalsu.mockResolvedValue([[{ updatedAt: new Date("2026-10-04T01:00:05Z") }]]);
    const hasil = await repo.update("d-1", { canvasData: "{}" });

    expect(kueri()).toMatch(/"updatedAt" = NOW\(\)/);
    expect(kueri()).toMatch(/RETURNING "updatedAt"$/);
    expect(parameter()).toEqual(["{}", "d-1"]);
    expect(hasil).toBeInstanceOf(Date);
  });

  it("pembaruan kosong tidak mengarang stempel", async () => {
    expect(await repo.update("d-1", {})).toBeNull();
    expect(kueriPalsu).not.toHaveBeenCalled();
  });

  it("#876 memeriksa revisi di UPDATE dan membedakan versi yang sudah kalah", async () => {
    const versi = new Date("2026-11-27T12:00:00.010Z");
    kueriPalsu.mockResolvedValue([[]]);
    await expect(repo.update("d-1", { canvasData: "{}" }, versi)).resolves.toBeUndefined();
    expect(kueri()).toContain(`WHERE id = ? AND date_trunc('milliseconds', "updatedAt") = ?::timestamp`);
    expect(kueri()).toContain(`"updatedAt") + INTERVAL '1 millisecond'`);
    expect(parameter()).toEqual(["{}", "d-1", versi]);
  });
});
