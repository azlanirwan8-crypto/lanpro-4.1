/**
 * Pengenal kode galat PostgreSQL (item #62 & #63, §13.8).
 *
 * Basis kode ini pernah berjalan di atas MySQL, dan sisanya masih tertinggal:
 * beberapa `catch` memeriksa `ER_DUP_ENTRY`, `ER_NO_SUCH_TABLE`, atau
 * `errno === 1062`. PostgreSQL tidak pernah menerbitkan satu pun dari itu — ia
 * memakai SQLSTATE lima karakter — sehingga cabang-cabang tersebut adalah kode
 * mati yang menyamar sebagai penanganan galat.
 *
 * Yang berbahaya bukan kode matinya, melainkan bahwa ia terlihat seperti sudah
 * ditangani. Tidak ada yang gagal saat build maupun test; galatnya baru muncul
 * di jalur yang jarang dilewati, dalam bentuk 500 tanpa penjelasan.
 *
 * Daftar SQLSTATE: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

/** 23505 unique_violation — baris kembar pada indeks unik. */
export const KODE_DUPLIKAT = "23505";

/** 42P01 undefined_table — tabel yang dirujuk tidak ada. */
export const KODE_TABEL_TIDAK_ADA = "42P01";

const kodeDari = (error: any): string | null => {
  if (!error) return null;
  if (typeof error.code === "string") return error.code;
  return null;
};

/**
 * Benar bila galatnya pelanggaran keunikan — misalnya mendaftar dengan email
 * yang sudah terpakai.
 */
export const adalahDuplikat = (error: any): boolean => kodeDari(error) === KODE_DUPLIKAT;

/**
 * Benar bila tabel yang dirujuk tidak ada. Dipakai pada penghapusan berjenjang,
 * yang menyapu tabel-tabel opsional yang belum tentu terbentuk di setiap
 * lingkungan.
 */
export const adalahTabelTidakAda = (error: any): boolean =>
  kodeDari(error) === KODE_TABEL_TIDAK_ADA;
