/** Mendaftar SEMUA <select> tersisa beserta variabel yang dipetakan jadi <option>. */
const fs = require("fs");
const path = require("path");

const berkas = [];
(function telusuri(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!/node_modules|dist/.test(f.name)) telusuri(p);
    } else if (/\.tsx$/.test(p) && !/\.test\./.test(p)) {
      berkas.push(p);
    }
  }
})("src");

let n = 0;
for (const p of berkas) {
  const s = fs.readFileSync(p, "utf8");
  let i = 0;
  while ((i = s.indexOf("<select", i)) !== -1) {
    const j = s.indexOf("</select>", i);
    if (j === -1) break;
    const blok = s.slice(i, j);
    const baris = s.slice(0, i).split("\n").length;
    const m = blok.match(/([A-Za-z_$][\w$]*)\s*(?:\.\w+\([\s\S]{0,80}?\))?\s*\.map\(/);
    const sumber = m ? m[1] : "(literal)";
    const rel = path.relative(".", p).split(path.sep).join("/");
    console.log("  " + sumber.padEnd(18) + rel + ":" + baris);
    n++;
    i = j + 1;
  }
}
console.log("total <select> tersisa:", n);
