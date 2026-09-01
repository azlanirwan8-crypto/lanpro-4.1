/**
 * Pemeriksaan kepemilikan flowchart (Item #268).
 *
 * Dulu logika ini tertanam di dalam `FlowchartContainer` dan mencocokkan SATU
 * nilai tersimpan (`createdBy`) ke ENAM field identitas sekaligus — id, uid,
 * username, email, name, displayName. Selama backend menimpa nama yang dikirim
 * klien dengan id sesi, nilai yang tersimpan berubah bentuk tergantung jalur
 * mana yang dilewati, dan tebakan itu gagal secara TIDAK KONSISTEN: kadang
 * cocok lewat `displayName`, kadang lewat `id`, kadang tidak sama sekali.
 *
 * Ketika gagal, tombol Edit dan Hapus di daftar flowchart hilang tanpa pesan
 * apa pun dan kanvasnya terbuka baca-saja. Pemilik proyek membacanya sebagai
 * "klik ikon edit malah ke detail" — padahal ikon Eye dan Edit3 memang
 * memanggil fungsi yang sama; yang berbeda hanya hasil pemeriksaan ini.
 *
 * Sejak #268 backend menyimpan id dan nama di kolom terpisah, jadi pemeriksaan
 * bisa memakai id sebagai sumber kebenaran. Pencocokan lewat nama DIPERTAHANKAN
 * khusus untuk baris lama yang terlanjur menyimpan nama di kolom `createdBy` —
 * membuangnya akan membuat seluruh flowchart yang dibuat sebelum #268 mendadak
 * tidak bisa diedit pembuatnya sendiri.
 */

/** Bentuk sesi pengguna yang dibutuhkan pemeriksaan ini. */
export interface IdentitasPengguna {
  id?: string | null;
  uid?: string | null;
  userId?: string | null;
  username?: string | null;
  email?: string | null;
  name?: string | null;
  displayName?: string | null;
}

/** Bagian dokumen flowchart yang menyimpan jejak pembuatnya. */
export interface JejakPembuat {
  /** Id pembuat. Sejak #268 inilah yang menentukan otorisasi. */
  createdBy?: string | null;
  /** Nama tampilan pembuat. Sejak #268 hanya untuk ditampilkan. */
  createdByName?: string | null;
}

const rapikan = (nilai: unknown): string =>
  typeof nilai === "string" ? nilai.trim().toLowerCase() : "";

/**
 * Apakah string ini tampak seperti id otorisasi (bukan nama tampilan)?
 * Dipakai agar UI tidak menampilkan UUID / token id di kolom Pembuat (#319).
 */
export function terlihatSepertiIdAuth(nilai: string | null | undefined): boolean {
  const s = typeof nilai === "string" ? nilai.trim() : "";
  if (!s) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return true;
  }
  if (/^u(id)?-[a-z0-9_-]+$/i.test(s)) return true;
  // Id sesi panjang tanpa spasi (bukan nama orang).
  if (s.length >= 20 && !/\s/.test(s) && /^[a-z0-9_-]+$/i.test(s)) return true;
  return false;
}

/**
 * Nama yang aman ditampilkan di UI untuk pembuat flowchart (#319).
 * Urutan: createdByName → createdBy legacy (bila bukan id) → cadangan → em dash.
 */
export function tampilanNamaPembuat(
  dokumen: JejakPembuat | null | undefined,
  cadangan?: string | null
): string {
  const nama = typeof dokumen?.createdByName === "string" ? dokumen.createdByName.trim() : "";
  if (nama) return nama;
  const raw = typeof dokumen?.createdBy === "string" ? dokumen.createdBy.trim() : "";
  if (raw && !terlihatSepertiIdAuth(raw)) return raw;
  const fallback = typeof cadangan === "string" ? cadangan.trim() : "";
  if (fallback && !terlihatSepertiIdAuth(fallback)) return fallback;
  return "—";
}

/** Seluruh id yang sah mewakili satu pengguna di sesi ini. */
const idPengguna = (pengguna: IdentitasPengguna): string[] =>
  [pengguna.id, pengguna.uid, pengguna.userId].map(rapikan).filter((v) => v !== "");

/** Seluruh nama yang sah mewakili satu pengguna di sesi ini. */
const namaPengguna = (pengguna: IdentitasPengguna): string[] =>
  [pengguna.username, pengguna.email, pengguna.name, pengguna.displayName]
    .map(rapikan)
    .filter((v) => v !== "");

/**
 * Benarkah pengguna ini yang membuat dokumen tersebut?
 *
 * Urutan pemeriksaannya disengaja: id lebih dulu (sumber kebenaran sejak #268),
 * baru nama. Pencocokan nama dibatasi pada dua hal supaya tidak jadi lubang
 * baru: `createdByName` yang memang kolom nama, dan `createdBy` yang berisi
 * nama karena ditulis sebelum #268.
 */
export function apakahPembuat(
  dokumen: JejakPembuat | null | undefined,
  pengguna: IdentitasPengguna | null | undefined
): boolean {
  if (!dokumen || !pengguna) return false;

  const pembuatId = rapikan(dokumen.createdBy);
  const pembuatNama = rapikan(dokumen.createdByName);

  if (pembuatId === "" && pembuatNama === "") return false;

  const daftarId = idPengguna(pengguna);
  if (pembuatId !== "" && daftarId.includes(pembuatId)) return true;

  const daftarNama = namaPengguna(pengguna);
  if (pembuatNama !== "" && daftarNama.includes(pembuatNama)) return true;

  // Baris lama (sebelum #268): kolom id justru berisi nama.
  if (pembuatId !== "" && daftarNama.includes(pembuatId)) return true;

  return false;
}
