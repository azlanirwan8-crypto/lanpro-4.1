import fs from "node:fs";
import path from "node:path";

/**
 * #820 — keluarga huruf primer LanPro: Inter, pengganti terdekat HK Grotesk.
 *
 * Velzon 4.3.0 tema default memakai `--vz-font-family-primary: "hkgrotesk"`;
 * Poppins hanya `--vz-font-family-secondary`. Percobaan #820 memakai Poppins
 * sebagai font primer karena premis itu keliru dan membuat UI terasa gemuk,
 * jadi keluarga huruf dikembalikan ke Inter atas keputusan pemilik 08 Nov 2026.
 *
 * Penjaga ini mengunci sumber tunggal keluarga huruf di TIGA tempat yang harus
 * bergerak bersama: tautan Google Fonts, `--font-sans`, dan blok global
 * `@layer base`. Bila salah satunya tertinggal, sebagian layar memakai keluarga
 * berbeda tanpa galat build. Yang diuji adalah berkas sumber, bukan hasil render.
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

describe("#820 Inter menjadi keluarga huruf primer", () => {
  it("index.html memuat Inter 400–700 dan tidak memuat Poppins", () => {
    expect(html).toContain(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    );
    expect(html).not.toContain("family=Poppins");
  });

  it("--font-sans menunjuk Inter", () => {
    const cocok = /--font-sans:\s*([^;]+);/.exec(css);
    if (!cocok) throw new Error("--font-sans tidak ada di index.css");
    expect(cocok[1].trim().startsWith('"Inter"')).toBe(true);
  });

  it("blok font global memaksa Inter dan mempertahankan fallback", () => {
    const blok = blokFontGlobal();
    expect(blok).toContain('"Inter"');
    expect(blok).toContain("ui-sans-serif");
    expect(blok).toContain("sans-serif !important");
    expect(blok).not.toContain('"Poppins"');
  });

  it("tidak ada deklarasi font-family yang memakai Poppins", () => {
    const deklarasi = [...css.matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1]);
    expect(deklarasi.length).toBeGreaterThan(0);
    expect(deklarasi.filter((nilai) => nilai.includes("Poppins"))).toEqual([]);
  });
});
