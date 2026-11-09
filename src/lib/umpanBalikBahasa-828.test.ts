import fs from "node:fs";
import path from "node:path";

/**
 * #828 — tombol ganti bahasa memberi umpan balik visual saat diklik.
 *
 * Sebelum #828, `ganti()` tidak memberi tanda bahwa klik sudah diterima.
 * Pengguna menekan tombol dan tidak melihat apa-apa selama 1–4 detik (waktu
 * muat kamus atau jeda sebelum muat ulang), sehingga mereka mengira tombolnya
 * mati — persis keluhan "sering terjadi".
 *
 * Penjaga ini memaku:
 *  1. `ganti()` memanggil `toast.info` di awal (sebelum `await tukarBahasa`);
 *  2. tombol memakai `opacity-50 cursor-wait` saat `sedangBertukar`;
 *  3. tombol menampilkan `Loader2` berputar saat `sedangBertukar`;
 *  4. kunci kamus `language.sedangMenukar` ada di kedua kamus (paritas).
 *
 * Yang diuji adalah sumber, bukan hasil render.
 */
const SRC = path.join(__dirname, "..", "..", "src");
const baca = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

describe("#828 umpan balik visual tombol ganti bahasa", () => {
  const isi = baca("i18n/LanguageSwitcher.tsx");

  test("ganti() memanggil toast.info di awal", () => {
    // toast.info harus dipanggil SEBELUM await tukarBahasa, bukan sesudah.
    const posisiToast = isi.indexOf('toast.info(t("language.sedangMenukar"');
    const posisiTukar = isi.indexOf("await tukarBahasa(tujuan)");
    expect(posisiToast).toBeGreaterThanOrEqual(0);
    expect(posisiTukar).toBeGreaterThanOrEqual(0);
    expect(posisiToast).toBeLessThan(posisiTukar);
  });

  test("tombol memakai opacity-50 cursor-wait saat sedangBertukar", () => {
    expect(isi).toContain("opacity-50 cursor-wait");
  });

  test("tombol menampilkan Loader2 saat sedangBertukar", () => {
    expect(isi).toContain("Loader2");
    expect(isi).toContain("animate-spin");
  });

  test("kunci language.sedangMenukar ada di kedua kamus", () => {
    const id = baca("i18n/locales/id.ts");
    const en = baca("i18n/locales/en.ts");
    expect(id).toContain('sedangMenukar: "Menukar bahasa..."');
    expect(en).toContain('sedangMenukar: "Switching language..."');
  });
});
