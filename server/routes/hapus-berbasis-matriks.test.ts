/**
 * Mengunci hasil #66: setiap rute DELETE berlingkup proyek dijaga matriks.
 *
 * §13.9 menemukan 5 rute DELETE yang hanya dijaga `['*']`, sehingga anggota
 * berperan `viewer` bisa menghapus data. Tambalannya waktu itu adalah mengganti
 * daftar perannya — perbaikan per rute, yang berarti rute DELETE berikutnya
 * boleh salah lagi.
 *
 * §19.8 tahap 4 menutup akarnya: rute tidak lagi menyebut peran, ia menyebut
 * modul + aksi, dan `src/lib/matriksAkses.ts` yang menjawab. Test ini menjaga
 * agar keadaan itu tidak berbalik.
 *
 * KENAPA BERBENTUK HIMPUNAN, BUKAN DAFTAR PERIKSA. §0.6 mewajibkan perbandingan
 * HIMPUNAN RUTE, dan #80 lahir persis karena sebuah rute ada di daftar lalu
 * digugurkan tanpa dibaca. Test ini tidak memeriksa enam rute yang sudah
 * diketahui; ia menuntut agar TIDAK ADA rute DELETE berlingkup proyek yang
 * memakai penjaga lama. Rute DELETE baru otomatis terjaring.
 *
 * BATASNYA, dinyatakan jujur: ini pemeriksaan STATIS terhadap teks rute, sama
 * seperti `hak-hapus.test.ts`. Ia menangkap penjaga yang dikembalikan ke bentuk
 * lama dan rute DELETE baru yang lupa dijaga. Pembuktian bahwa `viewer`
 * sungguh-sungguh ditolak ada di `jagaProyek.test.ts`.
 */

import fs from "fs";
import path from "path";

const DIR = __dirname;

const BERKAS_RUTE = fs.readdirSync(DIR).filter((f) => f.endsWith(".routes.ts"));

interface RuteHapus {
  berkas: string;
  jalur: string;
  penjaga: string;
}

/** Semua `router.delete(...)` beserta middleware sampai handler-nya. */
function ruteHapus(): RuteHapus[] {
  const hasil: RuteHapus[] = [];
  for (const berkas of BERKAS_RUTE) {
    const sumber = fs.readFileSync(path.join(DIR, berkas), "utf8");
    // `app.delete` DAN `router.delete` — qa.routes.ts memakai bentuk pertama, dan
    // pendata versi pertama melewatkannya sehingga dua rute DELETE QA lolos dari
    // pemeriksaan tanpa jejak.
    // Penutupnya menerima TIGA bentuk: handler inline `async (`, `(req`, dan
    // HANDLER BERNAMA seperti `getCommentsHandler);`. Bentuk ketiga sempat
    // terlewat, dan dua dari empat rute komentar #94 karena itu tidak terdata
    // sama sekali — pengurai yang buta sebagian lebih berbahaya daripada tidak
    // ada pengurai.
    const pola =
      /(?:app|router)\.delete\(\s*["']([^"']+)["']([\s\S]*?)(?:async\s*\(|\(req|\w+\s*\)\s*;)/g;
    let m: RegExpExecArray | null;
    while ((m = pola.exec(sumber)) !== null) {
      // Komentar DIBUANG sebelum penjaganya dinilai. Tanpa ini, catatan
      // sejarah yang menyebut `["*"]` — dan rute yang sudah benar justru
      // paling mungkin punya catatan begitu — akan terbaca sebagai penjaga
      // yang longgar. Alarm palsu menumpulkan test secepat lubang menumpulkannya.
      const tanpaKomentar = m[2].replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      hasil.push({ berkas, jalur: m[1], penjaga: tanpaKomentar });
    }
  }
  return hasil;
}

/**
 * Rute berlingkup proyek = jalurnya menyebut parameter proyek.
 *
 * Rute seperti `DELETE /api/users/:id` dan `DELETE /api/master-data/:id` bukan
 * urusan matriks proyek — keduanya operasi SISTEM, dijaga `verifyGlobalAdmin`
 * sesuai §19.4.
 */
const berlingkupProyek = (r: RuteHapus) =>
  /\/api\/projects\/:projectId/.test(r.jalur) || r.jalur === "/api/projects/:projectId";

describe("#66 rute DELETE berlingkup proyek dijaga matriks", () => {
  it("pengurainya menemukan rute — bukan lulus karena himpunan kosong", () => {
    expect(ruteHapus().length).toBeGreaterThan(5);
    expect(ruteHapus().filter(berlingkupProyek).length).toBeGreaterThan(0);
  });

  it("TIDAK ADA yang memakai `verifyProjectAccess` lagi", () => {
    const tertinggal = ruteHapus()
      .filter(berlingkupProyek)
      .filter((r) => r.penjaga.includes("verifyProjectAccess"))
      .map((r) => `${r.berkas} ${r.jalur}`);
    expect(tertinggal).toEqual([]);
  });

  it("TIDAK ADA yang dijaga `['*']` — kondisi asli #66", () => {
    const bintang = ruteHapus()
      .filter(berlingkupProyek)
      .filter((r) => /["']\*["']/.test(r.penjaga))
      .map((r) => `${r.berkas} ${r.jalur}`);
    expect(bintang).toEqual([]);
  });

  it("setiap satunya memakai `jagaProyek` atau `jagaHapusProyek`", () => {
    const tanpaPenjagaMatriks = ruteHapus()
      .filter(berlingkupProyek)
      .filter((r) => !/jagaProyek\(|jagaHapusProyek\(/.test(r.penjaga))
      .map((r) => `${r.berkas} ${r.jalur}`);
    expect(tanpaPenjagaMatriks).toEqual([]);
  });

  it("aksinya selalu `D` — rute DELETE tidak boleh dijaga sebagai baca/ubah", () => {
    const aksiSalah = ruteHapus()
      .filter(berlingkupProyek)
      .filter((r) => /jagaProyek\(/.test(r.penjaga))
      .filter((r) => !/jagaProyek\(\s*"[^"]+"\s*,\s*"D"\s*\)/.test(r.penjaga))
      .map((r) => `${r.berkas} ${r.jalur}`);
    expect(aksiSalah).toEqual([]);
  });

  it("penghapusan PROYEK memakai penjaga khususnya sendiri — §19.5, hanya Owner", () => {
    const hapusProyek = ruteHapus().find((r) => r.jalur === "/api/projects/:projectId");
    expect(hapusProyek).toBeDefined();
    expect(hapusProyek!.penjaga).toContain("jagaHapusProyek");
  });
});
