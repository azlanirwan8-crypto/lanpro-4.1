/**
 * Mengganti teks anak JSX — termasuk yang terpotong beberapa baris — dengan
 * pemanggilan t(). Item #149.
 *
 * Penggantian lintas baris tidak bisa dilakukan dengan pencocokan string biasa:
 * yang tersimpan di kamus adalah bentuk yang sudah dirapikan spasinya, sedangkan
 * di berkas teksnya masih terpecah dan berindentasi. Di sini rentang aslinya
 * dicari lewat posisi, lalu diganti utuh.
 *
 * Pemakaian: node scratch/ganti-jsx.cjs <berkas> <peta.json>
 *   peta.json: { "teks yang sudah dirapikan": "kunci.kamus", ... }
 */
const fs = require("fs");

const berkas = process.argv[2];
const peta = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const pakaiI18n = process.argv[4] === "i18n";

let s = fs.readFileSync(berkas, "utf8");
let ganti = 0;
const lewat = [];

for (const [teks, kunci] of Object.entries(peta)) {
  let ketemu = false;
  // cari setiap rentang '>' … '<' atau '{' lalu bandingkan bentuk rapinya
  const re = />([^<>{}]+)(?=<|\{)/g;
  let m;
  const tepi = [];
  while ((m = re.exec(s))) {
    if (m[1].replace(/\s+/g, " ").trim() === teks) {
      tepi.push([m.index + 1, m.index + 1 + m[1].length]);
    }
  }
  // ganti dari belakang supaya indeks di depannya tidak bergeser
  for (const [a, b] of tepi.reverse()) {
    const asli = s.slice(a, b);
    const indentasi = (asli.match(/^\s*/) || [""])[0];
    const ekor = (asli.match(/\s*$/) || [""])[0];
    const fn = pakaiI18n ? "i18n.t" : "t";
    s = s.slice(0, a) + indentasi + `{${fn}("${kunci}")}` + ekor + s.slice(b);
    ganti++;
    ketemu = true;
  }
  if (!ketemu) lewat.push(teks.slice(0, 50));
}

fs.writeFileSync(berkas, s);
console.log(`  ${berkas.split("/").pop()}: ${ganti} diganti`);
for (const l of lewat) console.log("     LEWAT: " + JSON.stringify(l));
