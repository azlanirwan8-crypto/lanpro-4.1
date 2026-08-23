/**
 * Mencari teks UI yang DIRAKIT dari potongan, bukan literal utuh.
 *
 * Pemindai sebelumnya hanya melihat pola `>teks<` dalam satu baris, sehingga
 * bentuk seperti `Add{" "}` atau `{n} entri` lolos seluruhnya — dan itulah
 * yang ditemukan pemilik proyek di panel Master Data.
 *
 * Di sini setiap teks di posisi anak JSX diambil, termasuk yang bersebelahan
 * dengan ekspresi `{...}`.
 */
const fs = require("fs");
const path = require("path");

const ABAI = /^(?:[\s\d.,:;%/+\-–—•·|()[\]{}]*|To Do|In Progress|Done|Blocked|Backlog|ID|EN|OK|QA|API|URL|UI|AI|PDF|CSV|JSON|SVG|PNG|JPG|SIT|UAT|PTR|DEV|PROD|STG|BRD|FSD|TSD|PRD|WA|HP|CSS|HTML|LANPRO|LAN PRO|Miro|Neon|PostgreSQL|Resend|WhatsApp|Google|Figma|Excel|Word)$/i;

const berkas = [];
(function w(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (!/node_modules|dist/.test(f.name)) w(p); }
    else if (/\.tsx$/.test(p) && !/\.test\./.test(p)) berkas.push(p);
  }
})("src");

const hasil = [];
for (const p of berkas) {
  const s = fs.readFileSync(p, "utf8");
  const L = s.split("\n");
  L.forEach((ln, i) => {
    const tr = ln.trim();
    if (/^(\/\/|\*|\/\*|import |export )/.test(tr)) return;
    // teks di posisi anak JSX: setelah '>' atau '}' , sebelum '<' atau '{'
    const re = /(?:^|>|\})([^<>{}\n]+?)(?=<|\{|$)/g;
    let m;
    while ((m = re.exec(ln))) {
      const teks = m[1].trim();
      if (!teks || ABAI.test(teks)) continue;
      if (!/[A-Za-zÀ-ÿ]{3,}/.test(teks)) continue;
      // buang yang jelas kode
      if (/[=;()]|=>|\breturn\b|className|const |let |props\.|\.map|\.filter/.test(teks)) continue;
      if (teks.length > 90) continue;
      hasil.push({ berkas: p.split(path.sep).join("/"), baris: i + 1, teks });
    }
  });
}
const perBerkas = {};
for (const h of hasil) (perBerkas[h.berkas] = perBerkas[h.berkas] || []).push(h);
console.log("kandidat teks dirakit:", hasil.length, "di", Object.keys(perBerkas).length, "berkas");
fs.writeFileSync("scratch/rakit.json", JSON.stringify(hasil, null, 1));
for (const [b, v] of Object.entries(perBerkas).sort((a, c) => c[1].length - a[1].length).slice(0, 12))
  console.log("  " + String(v.length).padStart(3) + "  " + b);
