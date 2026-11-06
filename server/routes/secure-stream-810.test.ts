/**
 * #810 — Bearer JWT tidak lagi mengalirkan berkas langsung.
 *
 * Dulu ada dua pintu masuk berkas privat — `/api/v1/files/secure-stream` dan
 * `/uploads/:filename` — dan keduanya punya lubang yang sama: setelah
 * presigned token gagal, JWT Bearer APA PUN yang login langsung dianggap
 * sah (`isAuthorized = true`), tanpa mengecek berkas itu milik siapa.
 * Nama berkas memang tak tertebak, tapi URL bocor lewat riwayat peramban,
 * screenshot, dan presignedUrl yang tampil apa adanya di respons API — dan
 * sekali nama diketahui, SELURUH sesi login menjadi kunci semua berkas.
 *
 * Perbaikannya: JWT kini hanya pembaru. Token kedaluwarsa + sesi sah →
 * server menerbitkan presigned URL segar (24 jam) dan mengalihkan (302).
 * Pengalihan diikuti <img>, fetch, dan unduhan, jadi tidak satu perender
 * klien pun berubah. Konsekuensi keamanannya yang dikunci di sini:
 *
 *   1. di kedua pintu, blok setelah `jwt.verify` berisi `res.redirect`,
 *      bukan `isAuthorized = true`;
 *   2. masa berlaku presigned baru adalah 1440 menit (24 jam), bukan
 *      525600 (1 tahun) — penjaga angkanya ada di file-stream-490.test.ts;
 *   3. pengecualian avatar/cover (#67/#208) tidak ikut berubah — keduanya
 *      memang sengaja publik dan itu keputusan pemilik proyek.
 */
import fs from "node:fs";
import path from "node:path";

const fileRoutes = fs.readFileSync(path.join(__dirname, "file.routes.ts"), "utf8");
const serverTs = fs.readFileSync(path.join(__dirname, "..", "..", "server.ts"), "utf8");

const potonganBearer = (sumber: string): string => {
  const i = sumber.indexOf("jwt.verify(jwtToken, getJwtSecret())");
  expect(i).toBeGreaterThan(-1);
  // Blok Bearer utuh: dari jwt.verify sampai return redirect. Delapan ratus
  // karakter cukup untuk memuat `catch {}` tanpa menyeret blok berikutnya.
  return sumber.slice(i, i + 800);
};

describe("#810 — Bearer JWT hanya memperbarui, tidak pernah mengalirkan", () => {
  it("secure-stream: blok Bearer mengandung redirect, bukan isAuthorized = true", () => {
    const blok = potonganBearer(fileRoutes);
    expect(blok).toContain("res.redirect(segar");
    expect(blok).not.toContain("isAuthorized = true");
    expect(blok).toContain("generatePresignedUrl(safeFilename, String(peminta), 1440)");
  });

  it("penjaga /uploads: blok Bearer mengandung redirect, bukan isAuthorized = true", () => {
    const blok = potonganBearer(serverTs);
    expect(blok).toContain("res.redirect(segar");
    expect(blok).not.toContain("isAuthorized = true");
    expect(blok).toContain("generatePresignedUrl(safeName, String(peminta), 1440)");
  });

  it("redirect presigned baru berumur 24 jam di kedua pintu", () => {
    // Situs terbit (unggah) 24 jam; situs segar (refresh Bearer) 24 jam.
    expect(fileRoutes).toContain("generatePresignedUrl(safeFilename, userId, 1440)");
    expect(fileRoutes).toContain("generatePresignedUrl(safeFilename, String(peminta), 1440)");
    expect(serverTs).toContain("generatePresignedUrl(safeName, String(peminta), 1440)");
  });

  it("pengecualian avatar/cover (#67/#208) tidak tersentuh", () => {
    expect(serverTs).toContain("safeName.startsWith('avatar-')");
    expect(serverTs).toContain("safeName.startsWith('cover-')");
  });
});
