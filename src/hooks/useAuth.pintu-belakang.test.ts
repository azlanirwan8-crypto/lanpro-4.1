/**
 * Mengunci dua pintu belakang yang dicabut pada item #91.
 *
 * Keduanya ditemukan bukan dari membaca daftar temuan, melainkan saat
 * menelusuri #87 — dan #87 sendiri ternyata salah rumus (§19.27). Menelusuri
 * satu klaim yang keliru justru membuka dua lubang yang jauh lebih serius.
 *
 * KENAPA TEST INI MEMBACA BERKAS, BUKAN MENJALANKAN `useAuth`.
 *
 * `useAuth` menarik seluruh lapisan API, penyimpanan peramban, dan soket;
 * merendernya di dalam test berarti membangun setengah aplikasi hanya untuk
 * membuktikan sebuah baris TIDAK ADA. Yang dijaga di sini memang keberadaan
 * pola berbahayanya, dan itu paling jujur diperiksa pada teks sumbernya.
 *
 * Batasnya jelas dan disebutkan: ini tidak membuktikan alur masuk aman secara
 * menyeluruh. Ia membuktikan dua pola spesifik tidak kembali — dan keduanya
 * kembali paling mungkin lewat penyalinan kode lama, bukan lewat keputusan.
 */

import fs from "fs";
import path from "path";

const SUMBER = fs.readFileSync(path.join(__dirname, "useAuth.ts"), "utf8");

/** Teks tanpa komentar — catatan sejarah menyebut pola yang dilarang. */
const KODE = SUMBER.replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

describe("#91 kredensial admin ter-hardcode", () => {
  it("pengurainya melihat berkas yang benar — bukan lulus karena kosong", () => {
    expect(KODE.length).toBeGreaterThan(1000);
    expect(KODE).toContain("useAuth");
  });

  it("tidak ada perbandingan password terhadap nilai literal", () => {
    // Bentuk aslinya: password === "admin" || password === "admin123".
    // Kredensial di berkas ini ikut terkirim ke SETIAP pengunjung lewat bundel.
    const cocok = KODE.match(/password\s*===\s*["'][^"']+["']/g) || [];
    expect(cocok).toEqual([]);
  });

  it("tidak ada id pengguna tetap yang ditanam dari sisi klien", () => {
    expect(KODE).not.toContain("admin-fixed-id");
  });
});

describe("#91 hak admin dari NAMA, bukan peran", () => {
  it("peran efektif tidak pernah ditentukan oleh username", () => {
    // Bentuk aslinya: usernameLower === "admin" -> return "admin".
    // Siapa pun yang berhasil mendaftar dengan username `admin` mendapat
    // seluruh antarmuka admin, apa pun peran sebenarnya di database.
    const cocok = KODE.match(/username\w*\s*===\s*["']admin["']/gi) || [];
    expect(cocok).toEqual([]);
  });

  it("peran efektif masih ditentukan oleh PERAN — bukan dihapus seluruhnya", () => {
    // Menghapus pintu belakang tidak boleh sekalian mematikan jalur yang sah.
    expect(KODE).toMatch(/roleLower\s*===\s*["']admin["']/);
  });
});
