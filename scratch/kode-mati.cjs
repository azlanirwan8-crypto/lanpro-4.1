/**
 * Mencari komponen .tsx yang namanya tidak pernah disebut dari berkas lain.
 *
 * Korpus pencariannya mencakup .ts DAN .tsx — versi pertama saya hanya membaca
 * .tsx, sehingga komponen yang diimpor lewat berkas barrel index.ts terbaca
 * sebagai mati padahal jelas dipakai (TodayTaskSummary, WikiEmptyState).
 *
 * Ini alat bantu, bukan bukti. Nama yang muncul di sini masih harus diperiksa
 * satu per satu: impor dinamis dan re-export bisa lolos dari pencocokan teks.
 */
const fs = require("fs");
const path = require("path");

const semuaBerkas = [];
(function telusuri(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!/node_modules|dist/.test(f.name)) telusuri(p);
    } else if (/\.tsx?$/.test(p)) {
      semuaBerkas.push(p);
    }
  }
})("src");

const isi = new Map(semuaBerkas.map((p) => [p, fs.readFileSync(p, "utf8")]));
const korpus = [...isi.values()].join("\n");

const komponen = semuaBerkas.filter((p) => /\.tsx$/.test(p) && !/\.test\./.test(p));

const mati = [];
for (const p of komponen) {
  const nama = path.basename(p, ".tsx");
  const diSendiri = isi.get(p).split(nama).length - 1;
  const total = korpus.split(nama).length - 1;
  if (total - diSendiri === 0) mati.push([p, isi.get(p).split("\n").length]);
}

console.log("komponen .tsx tanpa rujukan dari berkas lain:", mati.length);
for (const [p, n] of mati) console.log("  ", n + " baris", p);
