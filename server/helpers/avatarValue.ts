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
  // Tolak upaya keluar direktori.
  if (v.includes("..")) return null;

  const publicUrl = (process.env.STORAGE_PUBLIC_URL || "").trim().replace(/\/$/, "");
  if (publicUrl && v.startsWith(publicUrl + "/")) {
    const filename = v.slice(publicUrl.length + 1);
    const cocok = /^avatar-[A-Za-z0-9._-]+\.([A-Za-z0-9]+)$/.exec(filename);
    if (!cocok) return null;
    if (!AVATAR_ALLOWED_EXT.has(cocok[1].toLowerCase())) return null;
    return v;
  }

  // Tolak URL absolut dan protokol apa pun selain STORAGE_PUBLIC_URL kita sendiri.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v) || v.startsWith("//")) return null;

  const cocok = /^\/uploads\/(avatar-[A-Za-z0-9._-]+)\.([A-Za-z0-9]+)$/.exec(v);
  if (!cocok) return null;
  if (!AVATAR_ALLOWED_EXT.has(cocok[2].toLowerCase())) return null;
  return v;
}

/**
 * Item #210 — MENGAPA fungsi ini dipisah dari `sanitizeAvatarValue`.
 *
 * `sanitizeAvatarValue` dipakai di DUA konteks yang butuh ketegasan BERBEDA:
 * (1) memvalidasi `avatar_url`/`photoURL` dari BODY REQUEST (input tak
 *     dipercaya) — di sinilah menolak URL absolut memang wajib, supaya
 *     pengguna tidak bisa menaruh URL berbahaya di profilnya sendiri;
 * (2) membersihkan berkas LAMA setelah unggahan baru berhasil
 *     (`hapusAvatarLama`) — nilainya BUKAN dari pengguna, tapi dari
 *     `simpanBerkas()` kita sendiri.
 *
 * Begitu `STORAGE_DRIVER=s3` aktif (item #30), `simpanBerkas()` mulai
 * mengembalikan URL ABSOLUT (`STORAGE_PUBLIC_URL` + nama berkas), bukan lagi
 * `/uploads/...`. Karena `sanitizeAvatarValue` menolak SEMUA URL absolut,
 * `hapusAvatarLama` diam-diam berhenti bekerja — berkas lama tidak PERNAH
 * dihapus lagi, menumpuk selamanya di bucket walau baris database sudah
 * menunjuk ke berkas yang baru.
 *
 * Fungsi ini AMAN menerima bentuk absolut karena hanya membandingkan
 * terhadap `STORAGE_PUBLIC_URL` yang KITA konfigurasi sendiri (bukan domain
 * sembarang dari input pengguna) — tetap tidak bisa dipakai menghapus
 * berkas di luar bucket kita.
 *
 * Turut memperbaiki celah kedua: regex lama HANYA mengenali prefiks
 * `avatar-`, jadi berkas `cover-*` (item #208) tidak pernah tersaring
 * bersih SEJAK AWAL, bahkan di driver lokal.
 */
export function extractStoredFilename(nilai: unknown): string | null {
  if (typeof nilai !== "string") return null;
  let v = nilai.trim();
  if (v === "") return null;
  if (v.includes("?") || v.includes("#")) return null;
  if (v.includes("..")) return null;

  const publicUrl = (process.env.STORAGE_PUBLIC_URL || "").trim().replace(/\/$/, "");
  if (publicUrl && v.startsWith(publicUrl + "/")) {
    v = v.slice(publicUrl.length + 1);
  } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v) || v.startsWith("//")) {
    // Bentuk absolut LAIN — bukan bucket publik kita sendiri. Tolak.
    return null;
  } else if (v.startsWith("/uploads/")) {
    v = v.slice("/uploads/".length);
  } else {
    return null;
  }

  const cocok = /^((?:avatar|cover)-[A-Za-z0-9._-]+)\.([A-Za-z0-9]+)$/.exec(v);
  if (!cocok) return null;
  if (!AVATAR_ALLOWED_EXT.has(cocok[2].toLowerCase())) return null;
  return cocok[0];
}
