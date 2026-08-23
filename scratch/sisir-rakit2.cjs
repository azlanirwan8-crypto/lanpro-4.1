/**
 * Mencari kata telanjang di posisi anak JSX yang menempel pada ekspresi —
 * bentuk `Add{" "}` atau `{n} entri`. Inilah yang lolos dari semua pemindai
 * literal sebelumnya, karena teksnya tidak pernah utuh dalam satu string.
 */
const fs = require("fs");
const path = require("path");

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
  s.split("\n").forEach((ln, i) => {
    const tr = ln.trim();
    if (/^(\/\/|\*|\/\*|import |export )/.test(tr)) return;
    // A. kata lalu {" "} atau {expr}   →  `Add{" "}` / `Total {n}`
    // B. } lalu kata                   →  `{n} entri`
    const pola = [
      /(?:^|>)\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ '/&-]{1,40}?)\s*\{/g,
      /\}\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ '/&-]{1,40}?)\s*(?:<|\{|$)/g,
    ];
    for (const re of pola) {
      let m;
      while ((m = re.exec(ln))) {
        const teks = m[1].trim();
        if (teks.length < 2) continue;
        if (/^(className|style|key|value|type|id|href|src|alt|title|onClick|const|let|return|if|else|props|data|item|row|col)$/i.test(teks)) continue;
        hasil.push({ berkas: p.split(path.sep).join("/"), baris: i + 1, teks, ln: tr.slice(0, 70) });
      }
    }
  });
}
const perBerkas = {};
for (const h of hasil) (perBerkas[h.berkas] = perBerkas[h.berkas] || []).push(h);
console.log("kandidat:", hasil.length, "di", Object.keys(perBerkas).length, "berkas");
fs.writeFileSync("scratch/rakit2.json", JSON.stringify(hasil, null, 1));
for (const [b, v] of Object.entries(perBerkas).sort((a, c) => c[1].length - a[1].length).slice(0, 12))
  console.log("  " + String(v.length).padStart(3) + "  " + b);
