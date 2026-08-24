/**
 * Membaca SELURUH pasangan `code:` + `message:` yang sudah ada di server.
 *
 * Kamus tidak boleh dibangun dari catatan penyuntik: penyuntik melewati pesan
 * yang sudah berkode dari jalan sebelumnya, sehingga catatannya hanya memuat
 * yang disisipkan pada jalan TERAKHIR. Sumber kebenarannya adalah kode itu
 * sendiri.
 */
const fs = require("fs");
const path = require("path");

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

const kamus = {};
const bentrok = [];

for (const p of berkas) {
  const s = fs.readFileSync(p, "utf8");
  const re = /code:\s*"([^"]+)"\s*,\s*message:\s*(["'])((?:(?!\2)[^\n])*)\2/g;
  let m;
  while ((m = re.exec(s))) {
    const [, kode, , teks] = m;
    if (kamus[kode] && kamus[kode] !== teks) bentrok.push([kode, kamus[kode], teks]);
    kamus[kode] = teks;
  }
}

fs.writeFileSync("scratch/kode-server-nyata.json", JSON.stringify(kamus, null, 1));
console.log("kode terpasang di server:", Object.keys(kamus).length);
if (bentrok.length) {
  console.log("BENTROK — satu kode dipakai dua teks berbeda:", bentrok.length);
  for (const [k, a, b] of bentrok.slice(0, 5)) console.log("  " + k + "\n    " + a + "\n    " + b);
}
