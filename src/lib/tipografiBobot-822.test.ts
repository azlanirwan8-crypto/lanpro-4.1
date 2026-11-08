import fs from "node:fs";
import path from "node:path";

/**
 * #822 — bobot huruf dibatasi pada Poppins 300–700 yang BENAR-BENAR dimuat.
 *
 * Poppins yang dimuat #820 hanya 300–700. `font-extrabold` (800) dan
 * `font-black` (900) tidak punya berkas huruf; peramban menyintesisnya, jadi
 * bentuknya menyimpang dari desain keluarga huruf itu. Penjaga ini:
 *
 *  1. menolak kelas bobot 800–999 di seluruh `src` (berkas test dilewati karena
 *     justru memuat nama kelas terlarang sebagai data);
 *  2. memaku bobot judul yang sudah sesuai peran Velzon: h1 600, h2 500, h3 500
 *     (`--vz-headings-font-weight: 500`, h1 lebih tebal sebagai hierarki);
 *  3. memaku line-height h1/h2 1,35. h3 sengaja tidak dideklarasikan dan
 *     mewarisi 1,5, jadi tidak dipaku di sini.
 *
 * Yang diuji adalah sumber, bukan hasil render: lolos berarti tidak ada kelas
 * bobot yang akan disintesis, bukan berarti seluruh layar sudah diperiksa.
 */
const AKAR = path.join(__dirname, "..", "..");
const css = fs.readFileSync(path.join(AKAR, "src", "index.css"), "utf8");
const html = fs.readFileSync(path.join(AKAR, "index.html"), "utf8");

/** Berkas `.ts`/`.tsx` di `src`, tanpa berkas test. */
function berkasSumber(direktori: string): string[] {
  const hasil: string[] = [];
  for (const entri of fs.readdirSync(direktori, { withFileTypes: true })) {
    const jalur = path.join(direktori, entri.name);
    if (entri.isDirectory()) hasil.push(...berkasSumber(jalur));
    else if (/\.tsx?$/.test(entri.name) && !/\.test\.tsx?$/.test(entri.name)) hasil.push(jalur);
  }
  return hasil;
}

/** Isi blok CSS untuk pasangan selektor `hN, .hN`. */
function blokHeading(tingkat: 1 | 2 | 3): string {
  const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const pola = new RegExp("h" + tingkat + "\\s*,\\s*\\.h" + tingkat + "\\s*\\{([\\s\\S]*?)\\}");
  const cocok = pola.exec(bersih);
  if (!cocok) throw new Error("blok h" + tingkat + " tidak ditemukan di index.css");
  return cocok[1];
}

function nilai(blok: string, properti: string): string {
  const cocok = new RegExp(properti + ":\\s*([^;]+);").exec(blok);
  if (!cocok) throw new Error("properti tidak ada: " + properti);
  return cocok[1].trim();
}

describe("#822 tidak ada bobot di luar Poppins 300–700", () => {
  it("Poppins yang dimuat memang berhenti di 700", () => {
    const tautan = /family=Poppins:wght@([^&"]+)/.exec(html);
    if (!tautan) throw new Error("tautan Poppins tidak ditemukan di index.html");
    expect(tautan[1]).toBe("300;400;500;600;700");
  });

  it("src tidak memakai font-extrabold, font-black, atau bobot arbitrer 800–999", () => {
    const pelanggaran: string[] = [];
    for (const berkas of berkasSumber(path.join(AKAR, "src"))) {
      const isi = fs.readFileSync(berkas, "utf8");
      const relatif = path.relative(AKAR, berkas);
      for (const pola of [/font-extrabold/g, /font-black/g, /font-\[[89]\d{2}\]/g]) {
        for (const cocok of isi.matchAll(pola)) {
          pelanggaran.push(relatif + " — " + cocok[0]);
        }
      }
    }
    expect(pelanggaran).toEqual([]);
  });
});

describe("#822 bobot dan line-height judul tetap sesuai peran Velzon", () => {
  it("h1 600, h2 500, h3 500", () => {
    expect(nilai(blokHeading(1), "font-weight")).toBe("600");
    expect(nilai(blokHeading(2), "font-weight")).toBe("500");
    expect(nilai(blokHeading(3), "font-weight")).toBe("500");
  });

  it("h1 dan h2 memakai line-height 1,35", () => {
    expect(nilai(blokHeading(1), "line-height")).toBe("1.35");
    expect(nilai(blokHeading(2), "line-height")).toBe("1.35");
  });
});
