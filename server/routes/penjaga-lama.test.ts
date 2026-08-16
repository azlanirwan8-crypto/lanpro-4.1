/**
 * Mengunci sisa pemakai penjaga lama pada TIGA rute — dan menuntutnya menyusut.
 *
 * §19.8 tahap 4 memindahkan 51 dari 54 rute dari `verifyProjectAccess` ke
 * `jagaProyek`. Tiga sisanya bukan pekerjaan yang belum sempat, melainkan
 * pekerjaan yang MENUNGGU keputusan pemilik proyek (#89): ketiganya operasi
 * tingkat proyek, dan §19.5 belum punya modul untuk mereka.
 *
 * KENAPA DIKUNCI ANGKANYA.
 *
 * Yang paling mungkin terjadi pada penjaga lama bukan seseorang menghidupkannya
 * kembali dengan sengaja, melainkan seseorang menyalin baris rute yang sudah ada
 * ketika menambah rute baru. Penjaga lama itu izinkan-secara-bawaan; satu
 * salinan saja mengembalikan lubang yang baru saja ditutup, dan tidak akan ada
 * yang menyadarinya karena rutenya "bekerja".
 *
 * Test ini tidak melarang penjaga lama secara mutlak — melarang sesuatu yang
 * masih dipakai hanya akan membuat orang mematikan testnya. Ia mengunci daftar
 * pemakainya, sehingga pemakai keempat harus dibicarakan lebih dulu.
 *
 * ARAHNYA SATU: daftar ini boleh MENYUSUT, tidak boleh bertambah. Bila #89
 * dijawab dan ketiganya pindah, hapus test ini bersama `verifyProjectAccess`.
 */

import fs from "fs";
import path from "path";

const DIR = __dirname;

/** Rute yang masih sah memakai penjaga lama, beserta alasannya. */
const DIIZINKAN = [
  "PUT /api/projects/:projectId/dashboard-layout",
  "PUT /api/projects/:id",
  "POST /api/projects/:projectId/methodology",
].sort();

function pemakaiPenjagaLama(): string[] {
  const hasil: string[] = [];
  for (const berkas of fs.readdirSync(DIR).filter((f) => f.endsWith(".routes.ts"))) {
    const sumber = fs.readFileSync(path.join(DIR, berkas), "utf8");
    const pola =
      /(?:app|router)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']([\s\S]{0,900}?)(?:async\s*\(|\(req)/g;
    let m: RegExpExecArray | null;
    while ((m = pola.exec(sumber)) !== null) {
      // Komentar dibuang lebih dulu — berkas ini penuh catatan sejarah yang
      // menyebut nama penjaga lama, dan menghitungnya sebagai pemakaian
      // menghasilkan alarm palsu (§19.20).
      const penjaga = m[3].replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      if (/verifyProjectAccess\(/.test(penjaga)) {
        hasil.push(`${m[1].toUpperCase()} ${m[2]}`);
      }
    }
  }
  return hasil.sort();
}

describe("penjaga lama `verifyProjectAccess` — daftar pemakainya dikunci", () => {
  it("pengurainya menemukan rute — bukan lulus karena himpunan kosong", () => {
    const pola = /(?:app|router)\.(get|post|put|patch|delete)\(/g;
    const total = fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".routes.ts"))
      .reduce(
        (n, f) => n + (fs.readFileSync(path.join(DIR, f), "utf8").match(pola) || []).length,
        0
      );
    expect(total).toBeGreaterThan(50);
  });

  it("TEPAT tiga pemakai, dan persis yang menunggu #89", () => {
    // Bila ini merah karena BERTAMBAH: rute baru memakai penjaga lama. Pakai
    // `jagaProyek(modul, aksi)`.
    //
    // Bila merah karena BERKURANG: bagus — #89 terjawab sebagian. Perbarui
    // DIIZINKAN, dan bila jadi kosong, hapus `verifyProjectAccess` sekalian.
    expect(pemakaiPenjagaLama()).toEqual(DIIZINKAN);
  });

  it("ketiganya operasi tingkat proyek, bukan operasi pada sebuah modul", () => {
    // Yang membuat mereka belum bisa dipindahkan. Bila suatu saat ada rute
    // di bawah `/api/projects/:projectId/<modul>/...` masuk daftar ini, itu
    // tanda ia sebenarnya BISA dipetakan dan hanya terlewat.
    const berModul = DIIZINKAN.filter((r) =>
      /\/api\/projects\/:projectId\/(list|board|wiki|flowchart|meetingNotes|qa|sprints|timeline|notebooklm|access|documents|meetings|milestones|tasks)\b/.test(
        r
      )
    );
    expect(berModul).toEqual([]);
  });
});
