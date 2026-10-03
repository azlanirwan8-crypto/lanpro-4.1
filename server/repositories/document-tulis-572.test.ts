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

    expect(kueri()).toBe("UPDATE Documents SET canvasData = ? WHERE id = ?");
    expect(parameter()).toEqual(['{"nodes":[],"edges":[]}', "d-1"]);
  });

  it("menulis beberapa kolom sekaligus dalam urutan yang tetap", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.update("d-1", { title: "Alur", canvasData: "{}", category: "PRD" });

    expect(kueri()).toBe(
      "UPDATE Documents SET title = ?, canvasData = ?, category = ? WHERE id = ?"
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
 * KUNCI ATAS KEHILANGAN. `WHERE id = ?` saja berarti penulis kedua selalu
 * menang walau ia memegang versi yang lebih lama. #568 akan menambah penjaga
 * (nomor versi atau perbandingan updatedAt) — dan test inilah yang akan
 * memaksa perubahan itu disadari, bukan diselipkan.
 */
describe("document.repository.update — tidak ada penjaga tab ganda hari ini (#568)", () => {
  it("klausul WHERE hanya id: tanpa versi, tanpa updatedAt", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.update("d-1", { canvasData: "{}" });

    expect(kueri()).toMatch(/WHERE id = \?$/);
    expect(kueri()).not.toMatch(/updatedAt/i);
    expect(kueri()).not.toMatch(/version/i);
    expect(parameter()).toHaveLength(2);
  });
});
