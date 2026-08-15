/**
 * Penjaga regresi untuk item #52 (§13.5).
 *
 * `/api/auth/force-logout` memanggil `handleUserAuthentication(username, password)`
 * — pemeriksa password yang sama persis dengan `/api/auth/login`. Selama endpoint
 * itu berada di luar `loginLimiter`, pembatas anti-brute-force pada login bisa
 * dilewati hanya dengan menembak URL yang berbeda.
 *
 * CATATAN JUJUR SOAL BATAS TEST INI: ini pemeriksaan STATIS terhadap isi
 * `server.ts`, bukan pembuktian perilaku. Ia menangkap kasus yang memang paling
 * mungkin terjadi — baris pemasangan limiter terhapus saat refactor — tetapi ia
 * TIDAK membuktikan pembatas benar-benar menolak percobaan ke-11. Pembuktian
 * perilaku itu harus lewat menjalankan server sungguhan, dan belum dilakukan.
 *
 * Pemeriksaan statis dipilih karena `server.ts` membangun sekaligus menjalankan
 * server di satu berkas; mengimpornya di dalam Jest berarti membuka koneksi
 * Postgres dan mengikat port 3000 — persis pola yang sudah pernah membuat
 * 22 test lulus tapi exit code 1 (§0.3).
 */

import fs from "fs";
import path from "path";

const sumberServer = fs.readFileSync(path.resolve(__dirname, "../../server.ts"), "utf8");

describe("#52 pembatas laju pada endpoint yang memeriksa password", () => {
  it("memasang loginLimiter pada /api/auth/login", () => {
    expect(sumberServer).toMatch(/app\.use\(\s*["']\/api\/auth\/login["']\s*,\s*loginLimiter\s*\)/);
  });

  it("memasang loginLimiter pada /api/auth/force-logout", () => {
    expect(sumberServer).toMatch(
      /app\.use\(\s*["']\/api\/auth\/force-logout["']\s*,\s*loginLimiter\s*\)/
    );
  });

  it("memakai instance loginLimiter yang sama, bukan pembatas terpisah, agar jatahnya dibagi", () => {
    const pembuatanLimiter = sumberServer.match(/const\s+loginLimiter\s*=\s*rateLimit\(/g) || [];
    expect(pembuatanLimiter).toHaveLength(1);
  });

  it("loginLimiter TIDAK membebaskan localhost seperti globalLimiter", () => {
    const blokLimiter = sumberServer.slice(
      sumberServer.indexOf("const loginLimiter"),
      sumberServer.indexOf("app.use(\"/api/auth/login\"")
    );
    expect(blokLimiter).not.toMatch(/skip\s*:/);
  });
});
