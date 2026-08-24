/**
 * Satu kode tidak boleh mewakili dua teks berbeda: penerjemahan akan memilih
 * salah satu dan menampilkan kalimat yang keliru untuk kasus lainnya.
 * Teks kedua dan seterusnya diberi akhiran urut.
 */
const fs = require("fs"), path = require("path");
const berkas = [];
(function t(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|dist/.test(f.name))t(p);}else if(/\.ts$/.test(p)&&!/\.test\./.test(p))berkas.push(p);}})("server");

const teksUtama = {};   // kode -> teks pertama yang ditemui
const dipakai = new Set();
let ubah = 0;

for (const p of berkas) {
  let s = fs.readFileSync(p, "utf8"), berubah = false;
  s = s.replace(/code:\s*"([^"]+)"(\s*,\s*message:\s*)(["'])((?:(?!\3)[^\n])*)\3/g,
    (utuh, kode, tengah, kutip, teks) => {
      if (!(kode in teksUtama)) { teksUtama[kode] = teks; dipakai.add(kode); return utuh; }
      if (teksUtama[kode] === teks) return utuh;
      let n = 2, baru = kode + "_" + n;
      while (dipakai.has(baru) && teksUtama[baru] !== teks) baru = kode + "_" + ++n;
      teksUtama[baru] = teks; dipakai.add(baru); ubah++; berubah = true;
      return `code: "${baru}"${tengah}${kutip}${teks}${kutip}`;
    });
  if (berubah) fs.writeFileSync(p, s);
}
console.log("kode bentrok diuraikan:", ubah);
