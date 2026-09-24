/**
 * @jest-environment jsdom
 */
import fs from "node:fs";

import { en } from "../locales/en";

/**
 * #515 — kamus bahasa yang tidak aktif jangan ikut terkirim di potongan awal.
 *
 * `id` dan `en` dulu dua-duanya di-import statis (300 kB mentah) padahal setiap
 * pengunjung hanya membaca salah satunya. Kamus Inggris sekarang potongan
 * sendiri yang baru diambil saat diperlukan: lewat `siapBahasa` kalau bahasa
 * pilihan sudah tersimpan, lewat pembungkus `changeLanguage` kalau pengguna
 * baru saja menekan bendera.
 *
 * Kedua penjaga di bawah tidak saling menggantikan:
 *  - Kalau `index.ts` mengimpor `./locales/en` secara statis lagi, 126 kB
 *    kembali ke potongan masuk dan tidak ada satu pun test yang memerah —
 *    hasilnya cuma unduhan pertama yang membengkak diam-diam.
 *  - Kalau pemuatan malasnya rusak, pengguna Inggris yang me-reload halaman
 *    menerima kalimat Indonesia TANPA gejala: `fallbackLng` = "id" membuat
 *    kunci yang hilang tetap terisi, cuma bukan dengan bahasa yang ia pilih.
 */
describe("#515 kamus Inggris dimuat malas", () => {
  afterEach(() => {
    window.localStorage.clear();
    jest.resetModules();
  });

  it("index.ts tidak lagi meng-import kamus Inggris secara statis", () => {
    const sumber = fs.readFileSync(__dirname + "/../index.ts", "utf8");

    expect(sumber).not.toMatch(/^import\s+\{[^}]*\ben\b[^}]*\}\s+from\s+"\.\/locales\/en"/m);
    expect(sumber).toMatch(/import\("\.\/locales\/en"\)/);
  });

  it("siapBahasa meninggalkan Inggris yang benar-benar bisa dipakai", async () => {
    window.localStorage.setItem("bahasa", "en");
    jest.resetModules();

    const modul = await import("../index");
    await modul.siapBahasa;

    const i18n = modul.default;
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
    expect(i18n.t("common.clearCacheReload")).toBe(en.common.clearCacheReload);
    expect(i18n.t("common.clearCacheReload")).not.toBe("Bersihkan Cache & Muat Ulang");
  });
});
