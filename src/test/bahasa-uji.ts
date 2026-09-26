/**
 * Suite jsdom ditulis dalam bahasa Indonesia (warisan #135): ratusan assertion
 * membaca teks layar seperti "Diagram Alur" atau "Bersihkan Cache".
 *
 * Bawaan aplikasi bertukar menjadi Inggris pada 26 Sep 2026, jadi tanpa berkas
 * ini SELURUH suite jsdom akan menuntut teks Indonesia pada layar Inggris.
 * Pilihan preferensi dipasang sebelum `../i18n` dimuat — itu satu-satunya
 * urutan yang mungkin, karena `import` naik ke atas berkas (hoisting) dan
 * `init()` i18next membaca localStorage pada saat modulnya dimuat.
 *
 * Ini BUKAN penutup celah: cakupan bahasa Inggris dijaga oleh
 * `src/i18n/__tests__/paritas-kamus.test.ts` (kunci wajib sama di kedua kamus)
 * dan `kamus-inggris-malas-*.test.ts` (bawaan + pemuatan malas kamus lain).
 */
try {
  window.localStorage.setItem("bahasa", "id");
} catch {
  /* lingkungan tanpa storage: biarkan bawaan berlaku */
}
