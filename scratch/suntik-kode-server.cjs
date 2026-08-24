/**
 * Menyisipkan `code:` di samping setiap `message:` berbahasa di server — #150.
 *
 * Kodenya diturunkan dari teks Indonesianya sendiri supaya stabil dan bisa
 * ditebak, bukan nomor urut yang berubah setiap kali daftar disusun ulang.
 *
 * HANYA pesan POLOS yang disentuh di sini. Pesan berinterpolasi butuh daftar
 * parameter yang harus ditentukan satu per satu, jadi dikerjakan terpisah.
 */
const fs = require("fs");
const path = require("path");
const { teksUntukPengguna } = require("./saring.cjs");

const berkas = [];
(function telusuri(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!/node_modules|dist/.test(f.name)) telusuri(p);
    } else if (/\.ts$/.test(p) && !/\.test\./.test(p)) {
      berkas.push(p);
    }
  }
})("server");

/** Kode stabil dari teks: tiga kata pertama, huruf kecil, dipisah titik. */
const kodeDari = (teks) =>
  "srv." +
  teks
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("_")
    .slice(0, 44);

const kamus = {};
const dipakai = new Set();
let disisipkan = 0;

for (const p of berkas) {
  let s = fs.readFileSync(p, "utf8");
  let berubah = false;

  // `message: "teks"` yang BELUM punya `code:` di baris sebelumnya
  s = s.replace(
    // Menangkap DUA bentuk: `message:` di baris sendiri, maupun yang ditulis
    // sebaris di dalam `.json({ ... })`. Versi pertama hanya menangkap bentuk
    // pertama dan melewatkan lebih dari separuhnya.
    /(message:\s*)(["'])((?:(?!\2)[^\n])+)\2/g,
    (utuh, awal, kutip, teks, offset, penuh) => {
      if (teks.includes("${") || teks.includes("`")) return utuh; // interpolasi: nanti
      if (!teksUntukPengguna(teks)) return utuh;
      // sudah ada code: tepat di atasnya?
      const sebelum = penuh.slice(Math.max(0, offset - 120), offset);
      if (/code:\s*["'][^"']+["'],\s*$/.test(sebelum)) return utuh;

      let kode = kodeDari(teks);
      let n = 2;
      while (dipakai.has(kode) && kamus[kode] !== teks) kode = kodeDari(teks) + "_" + n++;
      dipakai.add(kode);
      kamus[kode] = teks;
      disisipkan++;
      berubah = true;
      return `code: "${kode}", ${awal}${kutip}${teks}${kutip}`;
    }
  );

  if (berubah) fs.writeFileSync(p, s);
}

fs.writeFileSync("scratch/kamus-server-id.json", JSON.stringify(kamus, null, 1));
console.log("kode disisipkan:", disisipkan, "| kode unik:", Object.keys(kamus).length);
