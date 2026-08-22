/**
 * Aturan tunggal penurunan `code` dari label MasterData — item #143.
 *
 * SATU BERKAS, DUA PEMAKAI. Penyemai (`scripts/db/seed-master-data.cjs`,
 * dijalankan `node`) dan rute pembuatan MasterData (`master-data.routes.ts`)
 * sama-sama memerlukannya. Kalau masing-masing menulis versinya sendiri,
 * keduanya akan menghasilkan kode berbeda untuk label yang sama begitu salah
 * satu disunting — dan tidak ada yang memberi tahu, persis seperti SIT/UAT/PTR
 * yang dulu kembar di dua berkas (#140).
 *
 * Ditulis CommonJS tanpa efek samping supaya bisa di-`require` dari keduanya.
 */

/**
 * Mengubah label menjadi kode: huruf kecil, non-alfanumerik jadi garis bawah.
 *
 * Label TIDAK ikut diubah di mana pun. Spasi di ujung label yang sudah
 * terlanjur tersimpan sengaja dibiarkan (aturan 1 penyemai: label yang dipakai
 * data hidup tidak disentuh); yang dirapikan hanya kode turunannya.
 *
 * Dipotong 50 karakter karena kolomnya VARCHAR(50).
 *
 * @param {unknown} label
 * @returns {string} kode, atau string kosong bila label tidak menghasilkan apa pun
 */
function kodeDariLabel(label) {
  return String(label == null ? "" : label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

/**
 * Memulangkan kode yang belum dipakai dalam satu tipe.
 *
 * Tidak ada batasan UNIQUE di tabel MasterData, jadi dua label berbeda yang
 * meluruh ke kode sama ("Won't Do" dan "Wont Do") akan diam-diam bertabrakan.
 * Di sini yang kedua diberi akhiran angka.
 *
 * @param {unknown} label
 * @param {Iterable<string>} kodeTerpakai kode yang sudah ada pada tipe yang sama
 * @returns {string}
 */
function kodeUnik(label, kodeTerpakai) {
  const dasar = kodeDariLabel(label);
  if (!dasar) return "";
  const terpakai = new Set(kodeTerpakai || []);
  if (!terpakai.has(dasar)) return dasar;
  for (let n = 2; n < 1000; n++) {
    const kandidat = `${dasar.slice(0, 46)}_${n}`;
    if (!terpakai.has(kandidat)) return kandidat;
  }
  return dasar;
}

module.exports = { kodeDariLabel, kodeUnik };
