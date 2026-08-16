/**
 * Penjaga untuk item #66 (§13.9): operasi menghapus tidak boleh terbuka bagi
 * anggota proyek berperan apa pun.
 *
 * Sesudah #49, `verifyProjectAccess(['*'])` berarti "anggota proyek dengan peran
 * APA PUN" — termasuk `viewer`. Lima rute DELETE berada di bawah penjaga itu,
 * salah satunya menghapus berjenjang (suite QA membawa serta seluruh test case
 * di dalamnya). `milestones` dan `sprints` sudah dibatasi peran sejak awal, jadi
 * kelima rute ini yang tertinggal.
 *
 * CATATAN JUJUR SOAL BATAS TEST INI: ini pemeriksaan STATIS terhadap teks rute.
 * Ia menangkap penjaga yang dilonggarkan kembali atau rute hapus baru yang lupa
 * dijaga — dan itu memang kegagalan yang paling mungkin terjadi. Ia TIDAK
 * membuktikan bahwa seorang `viewer` sungguh-sungguh ditolak; pembuktian itu
 * ada di `rbac.test.ts`, yang menguji perilaku `verifyProjectAccess` sendiri.
 */

import fs from "fs";
import path from "path";

const BERKAS = [
  "qa.routes.ts",
  "documents.routes.ts",
  "meetings.routes.ts",
  "discussion-points.routes.ts",
  "milestones.routes.ts",
  "sprints.routes.ts",
  "task.routes.ts",
  "project.routes.ts",
];

/**
 * Mengambil penjaga yang menempel pada setiap pendaftaran rute DELETE.
 * Rute ditulis dalam dua gaya di repo ini — satu baris dan multi-baris — jadi
 * pencocokannya dilakukan pada potongan teks sesudah `delete(`.
 */
const penjagaRuteHapus = (isi: string): { rute: string; penjaga: string }[] => {
  const hasil: { rute: string; penjaga: string }[] = [];
  const re = /(?:app|router)\.delete\(\s*(["'])([^"']+)\1([\s\S]{0,900}?)async/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(isi)) !== null) {
    // Jendelanya sempat 400 karakter, dan itu DIAM-DIAM menjatuhkan dua rute
    // DELETE QA dari pemeriksaan begitu komentar penjelasnya diperpanjang:
    // rutenya tidak dilaporkan longgar, ia hilang sama sekali dari himpunan.
    // Test yang memeriksa himpunan wajib memastikan himpunannya utuh dulu.
    const rute = m[2];
    const sesudahnya = m[3];
    const penjaga = sesudahnya.match(/verifyProjectAccess\(\[[^\]]*\]\)/);
    // Penjaga matriks (§19.8 tahap 4) menggantikan daftar peran. Pengurai ini
    // wajib mengenalinya, kalau tidak rute yang SUDAH dijaga akan terbaca
    // "TANPA PENJAGA" — kebalikan dari yang seharusnya dilaporkan.
    const matriks = sesudahnya.match(/jaga(?:Proyek|HapusProyek)\([^)]*\)/);
    const global = /verifyGlobalAdmin/.test(sesudahnya);
    hasil.push({
      rute,
      penjaga: matriks
        ? matriks[0]
        : penjaga
          ? penjaga[0]
          : global
            ? "verifyGlobalAdmin"
            : "TANPA PENJAGA",
    });
  }
  return hasil;
};

const semuaRuteHapus = BERKAS.flatMap((nama) => {
  const isi = fs.readFileSync(path.resolve(__dirname, nama), "utf8");
  return penjagaRuteHapus(isi).map((r) => ({ ...r, berkas: nama }));
});

describe("#66 tidak ada rute DELETE yang terbuka bagi peran apa pun", () => {
  it("menemukan rute DELETE untuk diperiksa — kalau nol, regex-nya yang rusak", () => {
    // Tanpa penjaga ini, seluruh test di bawah akan lulus secara hampa bila
    // pola pencocokannya suatu saat berhenti cocok.
    expect(semuaRuteHapus.length).toBeGreaterThanOrEqual(5);
  });

  it("tak satu pun rute DELETE memakai penjaga wildcard ['*']", () => {
    const longgar = semuaRuteHapus.filter((r) => /\[\s*["']\*["']\s*\]/.test(r.penjaga));

    expect(longgar.map((r) => `${r.berkas}: DELETE ${r.rute}`)).toEqual([]);
  });

  it("tak satu pun rute DELETE mencantumkan '*' di dalam daftar perannya", () => {
    // project.routes.ts:199 pernah menyelipkan "*" di ujung daftar peran, yang
    // membuat penjaganya ikut korslet meski sekilas tampak dibatasi.
    const menyelipkan = semuaRuteHapus.filter((r) => /["']\*["']/.test(r.penjaga));

    expect(menyelipkan.map((r) => `${r.berkas}: DELETE ${r.rute}`)).toEqual([]);
  });

  it("tak satu pun rute DELETE tanpa penjaga sama sekali", () => {
    const telanjang = semuaRuteHapus.filter((r) => r.penjaga === "TANPA PENJAGA");

    expect(telanjang.map((r) => `${r.berkas}: DELETE ${r.rute}`)).toEqual([]);
  });

  it("rute yang dulu ditambal daftar peran kini dijaga MATRIKS", () => {
    // Versi pertama test ini mengunci bentuk penjaganya:
    //   verifyProjectAccess(["admin", "manager", "head"])
    // Itu tepat selama perbaikannya masih per rute. Sesudah §19.8 tahap 4,
    // rute tidak lagi menyebut peran sama sekali — ia menyebut modul + aksi,
    // dan matriks yang menjawab. Asersinya diperbarui ke MAKSUD yang sama:
    // rute-rute ini wajib dijaga, dan penjaganya bukan daftar peran karangan.
    const wajib = [
      "/api/projects/:projectId/documents/:id",
      "/api/projects/:projectId/meetings/:id",
      "/api/projects/:projectId/meetings/:id/discussionPoints/:pointId",
      "/api/projects/:projectId/qa-test-cases/:id",
      "/api/projects/:projectId/qa-test-suites/:id",
    ];

    for (const rute of wajib) {
      const ditemukan = semuaRuteHapus.find((r) => r.rute === rute);
      expect(ditemukan).toBeDefined();
      expect(ditemukan!.penjaga).toMatch(/^jagaProyek\(/);
      expect(ditemukan!.penjaga).toContain('"D"');
    }
  });
});
