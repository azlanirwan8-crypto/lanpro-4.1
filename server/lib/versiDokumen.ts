/**
 * #568 — apakah penulis ini memegang versi yang sudah basi?
 *
 * Dijadikan fungsi terpisah supaya keputusannya bisa diuji tanpa mengangkat
 * express. Aturan yang sengaja dipilih: HANYA menolak kalau kedua sisi punya
 * stempel yang bisa dibaca dan isinya BERBEDA. Stempel yang hilang atau tidak
 * terbaca tidak boleh mengunci pekerjaan orang — kegagalan menolak lebih mahal
 * daripada satu tab yang menimpa, dan tab lain boleh menulis tanpa mengirim
 * versi (jalur non-papan hari ini begitu).
 */
export function tabrakanVersi(dibaca: unknown, kini: unknown): boolean {
  if (typeof dibaca !== "string" || !dibaca) return false;
  const a = Date.parse(dibaca);
  const b =
    kini instanceof Date ? kini.getTime() : typeof kini === "string" ? Date.parse(kini) : NaN;
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a !== b;
}
