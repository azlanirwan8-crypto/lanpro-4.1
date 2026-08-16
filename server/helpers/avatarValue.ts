/**
 * Pemeriksa nilai avatar — fungsi MURNI, sengaja terpisah dari berkas rute.
 *
 * KENAPA DIPISAH (item #56). `user.routes.avatar.test.ts` hanya menguji fungsi
 * ini, tetapi meng-import-nya dari `user.routes.ts` ikut menarik adaptor DB —
 * dan adaptor itu membuka koneksi Postgres sungguhan. Koneksinya masih
 * menyambung ketika Jest membongkar environment, sehingga tiap `npm test`
 * berakhir dengan:
 *
 *   ReferenceError: You are trying to `require` a file after the Jest
 *   environment has been torn down.
 *   TypeError: Cannot read properties of undefined (reading 'isIP')
 *
 * Exit code-nya tetap 0, jadi crash itu tidak pernah menggagalkan apa pun — ia
 * hanya mengotori keluaran dan melatih orang mengabaikan galat di akhir test.
 * Itu yang berbahaya: peringatan sungguhan berikutnya akan ikut terabaikan.
 *
 * Pemisahan ini mengulang penyelesaian yang sama seperti `getJwtSecret` (§0.3),
 * dan alasannya sama: fungsi murni tidak boleh menyeret koneksi database.
 */

/** Ekstensi yang diizinkan. Diekspor karena rute unggah memakainya juga. */
export const AVATAR_ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export function sanitizeAvatarValue(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai !== "string") return null;
  const v = nilai.trim();
  if (v === "") return null;

  // Tolak query string: di situlah presigned token menumpang.
  if (v.includes("?") || v.includes("#")) return null;
  // Tolak URL absolut dan protokol apa pun (termasuk data: dan javascript:).
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v) || v.startsWith("//")) return null;
  // Tolak upaya keluar direktori.
  if (v.includes("..")) return null;

  const cocok = /^\/uploads\/(avatar-[A-Za-z0-9._-]+)\.([A-Za-z0-9]+)$/.exec(v);
  if (!cocok) return null;
  if (!AVATAR_ALLOWED_EXT.has(cocok[2].toLowerCase())) return null;
  return v;
}
