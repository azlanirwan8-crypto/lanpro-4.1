import { tabrakanVersi } from "./versiDokumen";

/**
 * #568 — keputusan "apakah penulis ini memegang versi basi".
 *
 * Aturan yang dikehendaki pemilik proyek: tab kedua yang tiba dengan stempel
 * lama HARUS ditolak, bukan menang karena datang terakhir. Aturan yang tidak
 * dikehendaki: menolak kerja orang hanya karena stempelnya tidak ada atau tidak
 * bisa dibaca — itu membuat jalur tulis mati untuk semua klien lama.
 */
describe("tabrakanVersi (#568)", () => {
  const v1 = "2026-10-04T01:00:00.000Z";
  const v2 = "2026-10-04T01:00:05.000Z";

  it("stempel yang sama bukan tabrakan", () => {
    expect(tabrakanVersi(v1, v1)).toBe(false);
    expect(tabrakanVersi(v1, new Date(v1))).toBe(false);
  });

  it("stempel yang berbeda ditolak", () => {
    expect(tabrakanVersi(v1, v2)).toBe(true);
    expect(tabrakanVersi(v2, new Date(v1))).toBe(true);
  });

  it("klien tanpa stempel tidak pernah dikunci", () => {
    expect(tabrakanVersi(undefined, v2)).toBe(false);
    expect(tabrakanVersi(null, v2)).toBe(false);
    expect(tabrakanVersi("", v2)).toBe(false);
  });

  it("stempel yang tidak terbaca tidak boleh menolak pekerjaan", () => {
    expect(tabrakanVersi("bukan tanggal", v2)).toBe(false);
    expect(tabrakanVersi(v1, "bukan tanggal")).toBe(false);
    expect(tabrakanVersi(v1, null)).toBe(false);
  });
});
