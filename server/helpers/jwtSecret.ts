/**
 * Pembaca JWT_SECRET.
 *
 * Dipisah dari `middleware/auth.ts` pada F5.3 karena berkas itu mengimpor
 * adapter database, sehingga apa pun yang hanya butuh rahasia JWT ikut
 * membuka koneksi Postgres. Akibatnya nyata: test unit yang sama sekali tidak
 * menyentuh database tetap membuka koneksi, lalu gagal saat lingkungan Jest
 * dibongkar — 22 test lulus tetapi prosesnya keluar dengan kode 1.
 *
 * Fungsi ini tidak punya ketergantungan apa pun selain environment.
 * `middleware/auth.ts` tetap me-re-export-nya, jadi seluruh pemanggil lama
 * tidak perlu berubah.
 */
export const getJwtSecret = (): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("[SECURITY] JWT_SECRET tidak ditemukan di environment.");
  }
  return process.env.JWT_SECRET;
};
