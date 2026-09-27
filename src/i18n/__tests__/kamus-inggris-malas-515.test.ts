/**
 * @jest-environment jsdom
 */
import fs from "node:fs";

import { en } from "../locales/en";
import { id } from "../locales/id";

/**
 * #515 — kamus bahasa yang TIDAK aktif jangan ikut terkirim di potongan awal.
 *
 * `id` dan `en` dulu dua-duanya di-import statis (300 kB mentah) padahal setiap
 * pengunjung hanya membaca salah satunya. Yang ikut potongan awal adalah bahasa
 * BAWAAN; sejak 26 Sep 2026 bawaan itu Inggris (keputusan pemilik proyek, satu
 * paket dengan tema terang), jadi kini kamus Indonesia yang menjadi potongan
 * sendiri dan baru diambil saat diperlukan: lewat `siapBahasa` kalau bahasa
 * pilihan sudah tersimpan, lewat pembungkus `changeLanguage` kalau pengguna baru
 * saja menekan bendera.
 *
 * Penjaga di bawah tidak saling menggantikan:
 *  - Kalau `index.ts` mengimpor `./locales/id` secara statis lagi, 154 kB
 *    kembali ke potongan masuk dan tidak ada satu pun test yang memerah —
 *    hasilnya cuma unduhan pertama yang membengkak diam-diam.
 *  - Kalau pemuatan malasnya rusak, pengguna Indonesia yang me-reload halaman
 *    menerima kalimat INGGRIS tanpa gejala: `fallbackLng` = "en" membuat kunci
 *    yang hilang tetap terisi, cuma bukan dengan bahasa yang ia pilih.
 *  - Kalau bawaan bergeser diam-diam, seluruh pengunjung baru salah bahasa.
 */
describe("#515 kamus non-bawaan dimuat malas + bawaan Inggris", () => {
  afterEach(() => {
    window.localStorage.clear();
    jest.resetModules();
  });

  it("index.ts tidak lagi meng-import kamus Indonesia secara statis", () => {
    const sumber = fs.readFileSync(__dirname + "/../index.ts", "utf8");

    expect(sumber).not.toMatch(/^import\s+\{[^}]*\bid\b[^}]*\}\s+from\s+"\.\/locales\/id"/m);
    expect(sumber).toMatch(/import\("\.\/locales\/id"\)/);
  });

  it("tanpa pilihan tersimpan, bahasa bawaan adalah Inggris dan tidak ada yang ditunggu", async () => {
    jest.resetModules();
    const modul = await import("../index");
    await modul.siapBahasa;

    const i18n = modul.default;
    expect(i18n.language).toBe("en");
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
    expect(i18n.t("common.clearCacheReload")).toBe(en.common.clearCacheReload);
  });

  it("siapBahasa meninggalkan Indonesia yang benar-benar bisa dipakai", async () => {
    window.localStorage.setItem("bahasa", "id");
    jest.resetModules();

    const modul = await import("../index");
    await modul.siapBahasa;

    const i18n = modul.default;
    expect(i18n.hasResourceBundle("id", "translation")).toBe(true);
    expect(i18n.t("common.clearCacheReload")).toBe(id.common.clearCacheReload);
    expect(i18n.t("common.clearCacheReload")).not.toBe(en.common.clearCacheReload);
  });
});
