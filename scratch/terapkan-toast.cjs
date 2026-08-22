// Mengganti literal toast/alert dengan pemanggilan t(...) berdasarkan kamus.
const fs = require("fs");
const kamus = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const berkas = process.argv[3];
const blok = process.argv[4] || "toast";
const asli = fs.readFileSync(berkas, "utf8");
let s = asli;

// Peta teks-Indonesia-lama -> kunci. Nilai [id, en]; teks di kode bisa salah
// satunya, jadi keduanya dicocokkan.
const peta = [];
for (const [kunci, [id, en]] of Object.entries(kamus)) {
  peta.push([id, kunci]);
  if (en !== id) peta.push([en, kunci]);
}
// Yang terpanjang dulu agar "Gagal menghapus tugas: " tidak termakan pola pendek.
peta.sort((a, b) => b[0].length - a[0].length);

let ganti = 0;
const lewat = [];
for (const [teks, kunci] of peta) {
  for (const q of ['"', "'", "`"]) {
    const target = q + teks + q;
    if (!s.includes(target)) continue;
    const n = s.split(target).length - 1;
    s = s.split(target).join(`t("${blok}.${kunci}")`);
    ganti += n;
  }
}
for (const [kunci, [id]] of Object.entries(kamus)) {
  if (!s.includes(`${blok}.${kunci}`)) lewat.push([kunci, id.slice(0, 45)]);
}
fs.writeFileSync(berkas, s);
console.log(`ganti ${ganti} literal di ${berkas}`);
if (lewat.length) {
  console.log("BELUM TERPAKAI (teks di kode mungkin berbeda):");
  for (const [k, v] of lewat) console.log("  -", k, "|", v);
}
