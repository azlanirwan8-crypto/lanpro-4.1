import fs from "node:fs";
import path from "node:path";

/**
 * #820 — keluarga huruf kembali ke Poppins, standar Velzon 4.3.0.
 *
 * Velzon memuat `family=Poppins:wght@300;400;500;600;700`; repo ini memuat
 * Inter 400–900 dan komentar #402 sempat menyebut Inter sebagai standar Velzon.
 * Penjaga ini mengunci sumber tunggal keluarga huruf di TIGA tempat yang harus
 * bergerak bersama: tautan Google Fonts, `--font-sans`, dan blok global
 * `@layer base` yang memaksa seluruh elemen. Bila salah satunya tertinggal,
 * sebagian layar akan memakai keluarga berbeda tanpa galat build.
 *
 * Yang diuji adalah berkas sumber, bukan hasil render. Batas jujurnya sama
 * dengan #682: lolos di sini berarti jalur font konsisten, bukan berarti
 * tampilannya sudah diperiksa di peramban.
 */
const AKAR = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(AKAR, "index.html"), "utf8");
const css = fs.readFileSync(path.join(AKAR, "src", "index.css"), "utf8");

/** Blok `font-family` di dalam `@layer base` yang dipaksa dengan `!important`. */
function blokFontGlobal(): string {
  const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selektor = /\*\s*,\s*::before[\s\S]*?\{/.exec(bersih);
  if (!selektor) throw new Error("blok selektor font global tidak ditemukan");
  const awal = selektor.index + selektor[0].length;
  const akhir = bersih.indexOf("}", awal);
  return bersih.slice(awal, akhir);
}

describe("#820 Poppins menjadi satu-satunya keluarga huruf", () => {
  it("index.html memuat Poppins 300–700 dan tidak lagi memuat Inter", () => {
    expect(html).toContain(
      "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
    );
    expect(html).not.toContain("family=Inter");
  });

  it("--font-sans menunjuk Poppins", () => {
    const cocok = /--font-sans:\s*([^;]+);/.exec(css);
    if (!cocok) throw new Error("--font-sans tidak ada di index.css");
    expect(cocok[1].trim().startsWith('"Poppins"')).toBe(true);
  });

  it("blok font global memaksa Poppins dan mempertahankan fallback", () => {
    const blok = blokFontGlobal();
    expect(blok).toContain('"Poppins"');
    expect(blok).toContain("ui-sans-serif");
    expect(blok).toContain("sans-serif !important");
    expect(blok).not.toContain('"Inter"');
  });

  it("tidak ada sisa keluarga Inter sebagai nilai font", () => {
    expect(css).not.toContain('"Inter"');
  });
});
