/**
 * #602 — tidak boleh ada lagi teks layar yang dirakit di luar kamus.
 *
 * KENAPA TEST INI ADA. #536 mencatat empat teks chrome papan gambar berbahasa
 * Indonesia permanen, #590 menyapu warna + bahasa di seluruh layar, #559
 * menemukan kalimat Indonesia muncul di mode English — dan tidak satu pun
 * meninggalkan penjaga, jadi pola itu tumbuh lagi sampai 03 Okt: sapuan ini
 * menemukan 149 string yang sampai ke layar tanpa lewat `t()`.
 *
 * CARA KERJA. Test ini hanya MEMBACA hasil pemindai
 * `scripts/validate/sapu-teks-ui.cjs` (exit 0 = tidak ada string BARU di luar
 * garis dasar). Jadi ia ratchet: memindah satu kalimat ke kamus mengecilkan
 * garis dasar, menambah satu kalimat keras membuat `npm test` merah.
 *
 * `testPathIgnorePatterns` di jest.config.cjs menyaring `/test/` — berkas ini
 * ada di `__tests__/` dan tetap dihitung, jadi tidak ada pengecualian yang perlu
 * diperhatikan. Eksekusi pemindai sengaja `spawnSync`, bukan menyalin logikanya:
 * dua salinan parser akan berhenti setuju pada minggu kedua.
 */
import { spawnSync } from "child_process";
import * as path from "path";

const SKRIP = path.resolve(__dirname, "..", "..", "..", "scripts", "validate", "sapu-teks-ui.cjs");

describe("sapuan teks UI di luar kamus (#602)", () => {
  it("tidak ada kalimat layar baru yang dirakit tanpa t()", () => {
    const jalan = spawnSync("node", [SKRIP], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    const keluar = `${jalan.stdout || ""}${jalan.stderr || ""}`;
    expect(jalan.status).toBe(0);
    // Garis dasar harus benar-benar terbaca — "LULUS" tanpa itu berarti test buta.
    expect(keluar).toMatch(/garis dasar \d+/);
  }, 120000);
});
