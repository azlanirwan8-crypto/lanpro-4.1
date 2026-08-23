/**
 * Item #146 — dropdown bersumber MasterData harus bisa menampilkan ikon.
 *
 * Ini penjaga STRUKTURAL, bukan penjaga tampilan. Sebabnya: `<option>` HTML
 * tidak bisa memuat ikon sama sekali. Jadi begitu sebuah dropdown mengambil
 * pilihannya dari MasterData tetapi dirender sebagai `<select>` asli, ikonnya
 * MUSTAHIL muncul — sebanyak apa pun kolom `icon` diisi di basis data.
 *
 * Test ini membaca sumber karena yang dijaga adalah bentuk render yang
 * dipilih, bukan perilaku runtime-nya.
 *
 * Yang SENGAJA tidak dijaga: `<select>` yang pilihannya bukan dari MasterData
 * (daftar sprint, label, atau nilai yang diturunkan dari data tugas), dan dua
 * select di panel Master Data yang memuat metadata tentang struktur MasterData
 * itu sendiri — lihat item #140.
 */
import fs from "fs";
import path from "path";

const AKAR = path.join(__dirname, "..");

const berkasTsx: string[] = [];
(function telusuri(d: string) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!/node_modules|dist/.test(f.name)) telusuri(p);
    } else if (/\.tsx$/.test(p) && !/\.test\./.test(p)) {
      berkasTsx.push(p);
    }
  }
})(AKAR);

/** Blok `<select>` yang opsinya jelas-jelas berasal dari MasterData. */
const selectBersumberMaster = () => {
  const temuan: string[] = [];
  for (const p of berkasTsx) {
    const s = fs.readFileSync(p, "utf8");
    let i = 0;
    while ((i = s.indexOf("<select", i)) !== -1) {
      const j = s.indexOf("</select>", i);
      if (j === -1) break;
      const blok = s.slice(i, j);
      if (/(masterData|mArr)[\s\S]{0,80}\.filter\([\s\S]{0,80}type ===/.test(blok)) {
        const baris = s.slice(0, i).split("\n").length;
        temuan.push(path.relative(AKAR, p).split(path.sep).join("/") + ":" + baris);
      }
      i = j + 1;
    }
  }
  return temuan;
};

describe("dropdown MasterData bisa menampilkan ikon (#146)", () => {
  it("penjaganya benar-benar memindai sesuatu", () => {
    // Tanpa ini, pemindai yang rusak akan lolos sebagai 'nol temuan'.
    expect(berkasTsx.length).toBeGreaterThan(50);
    expect(berkasTsx.some((p) => /CommonComponents/.test(p))).toBe(true);
  });

  it("tidak ada <select> HTML yang mengambil pilihannya dari MasterData", () => {
    expect(selectBersumberMaster()).toEqual([]);
  });
});
