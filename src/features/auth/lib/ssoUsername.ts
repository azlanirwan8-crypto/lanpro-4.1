/**
 * Usulan username dari alamat email.
 *
 * Google dan Microsoft tidak memberi username — hanya email dan nama.
 * Sementara LanPro mewajibkan username yang unik, hanya huruf, maksimal 10
 * karakter. Fungsi ini menyiapkan usulan supaya pengguna tidak perlu mengetik
 * dari nol, TETAPI usulan itu tetap bisa diubah (ketetapan F5.1 opsi C).
 *
 * KENAPA TIDAK DIKUNCI. Username bersifat unik di database. Bila usulan
 * ternyata sudah dipakai orang lain dan kolomnya dikunci, pengguna mentok tanpa
 * jalan keluar. Kasus itu tidak jarang: pemotongan 10 karakter membuat
 * "budisantoso" dan "budisantosa" sama-sama menjadi "budisantos".
 *
 * Fungsi murni: teks masuk, teks keluar. Tanpa DOM, tanpa jaringan.
 */

/** Panjang minimum agar sebuah usulan layak ditampilkan. */
const MINIMUM_LAYAK = 3;

/** Batas panjang username, mengikuti aturan lama yang tidak berubah. */
const MAKSIMUM = 10;

/**
 * Mengubah email menjadi usulan username.
 *
 * Mengembalikan string kosong bila hasilnya tidak layak — misalnya
 * `ab@perusahaan.com` yang hanya menghasilkan dua huruf. Dalam keadaan itu
 * kolom dibiarkan kosong agar pengguna mengisi sendiri; usulan sependek itu
 * lebih mungkin keliru daripada disengaja, dan menampilkannya justru terkesan
 * aplikasi salah.
 */
export function usulkanUsername(email: string): string {
  if (!email) return "";

  const [bagianLokal] = String(email).split("@");
  if (!bagianLokal) return "";

  // Angka, titik, garis bawah, dan tanda hubung dibuang — aturan lama hanya
  // mengizinkan huruf, dan aturan itu sengaja TIDAK dilonggarkan.
  const hanyaHuruf = bagianLokal.replace(/[^a-zA-Z]/g, "").toLowerCase();

  if (hanyaHuruf.length < MINIMUM_LAYAK) return "";

  return hanyaHuruf.slice(0, MAKSIMUM);
}
