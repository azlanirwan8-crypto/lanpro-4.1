/**
 * Mengunci #94: setiap rute berlingkup proyek WAJIB punya penjaga.
 *
 * KENAPA TEST INI HARUS ADA, padahal sudah ada dua test himpunan lain.
 *
 * §19.20–§19.22 memindahkan 54 penjaga ke matriks dan menguncinya dengan
 * `penjaga-lama.test.ts` (pemakai `verifyProjectAccess` = nol) dan
 * `tanpa-wildcard.test.ts` (ketiadaan `["*"]`). Keduanya hijau, dan keduanya
 * melewatkan #94 sepenuhnya.
 *
 * Sebabnya struktural: **keduanya berangkat dari DAFTAR PENJAGA.** Mereka
 * mendata penjaga yang ada lalu memeriksa bentuknya benar. Rute yang tidak
 * punya penjaga sama sekali tidak muncul di himpunan mana pun — ia tak terlihat
 * oleh alat yang mencari penjaga yang salah.
 *
 *   Sapuan yang mendata "penjaga yang SALAH" tidak akan pernah menemukan
 *   "penjaga yang TIDAK ADA".
 *
 * Test ini berangkat dari arah sebaliknya: **daftar RUTE**. Ia mendata setiap
 * rute berlingkup proyek dan menuntut masing-masing punya penjaga, apa pun
 * bentuknya. Empat rute komentar discussion point lolos bertahun-tahun justru
 * karena tidak ada yang pernah bertanya dari arah ini.
 *
 * BATASNYA, disebutkan jujur: ini pemeriksaan STATIS terhadap teks rute. Ia
 * menangkap rute yang lupa dijaga — kegagalan yang paling mungkin terjadi saat
 * menambah rute baru. Pembuktian bahwa penjaganya menolak dengan benar ada di
 * `jagaProyek.test.ts`.
 */

import fs from "fs";
import path from "path";

const DIR = __dirname;

interface Rute {
  berkas: string;
  metode: string;
  jalur: string;
  penjaga: string;
}

function semuaRute(): Rute[] {
  const hasil: Rute[] = [];
  for (const berkas of fs.readdirSync(DIR).filter((f) => f.endsWith(".routes.ts"))) {
    const sumber = fs.readFileSync(path.join(DIR, berkas), "utf8");
    // Penutupnya menerima TIGA bentuk: handler inline `async (`, `(req`, dan
    // HANDLER BERNAMA seperti `getCommentsHandler);`. Bentuk ketiga sempat
    // terlewat, dan dua dari empat rute komentar #94 karena itu tidak terdata
    // sama sekali — pengurai yang buta sebagian lebih berbahaya daripada tidak
    // ada pengurai.
    const pola =
      /(?:app|router)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']([\s\S]{0,900}?)(?:async\s*\(|\(req|\w+\s*\)\s*;)/g;
    let m: RegExpExecArray | null;
    while ((m = pola.exec(sumber)) !== null) {
      hasil.push({
        berkas,
        metode: m[1].toUpperCase(),
        jalur: m[2],
        // Komentar dibuang: berkas rute penuh catatan sejarah yang menyebut
        // nama penjaga, dan menghitungnya sebagai penjaga menghasilkan rute
        // telanjang yang terbaca "sudah dijaga" (§19.20).
        penjaga: m[3].replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""),
      });
    }
  }
  return hasil;
}

/**
 * Rute yang menyentuh isi sebuah proyek.
 *
 * Selain jalur `/api/projects/:...`, ikut dihitung jalur yang beralamat ke
 * ENTITAS milik proyek — persis bentuk yang membuat #70 dan #94 luput: tanpa
 * `:projectId` di jalurnya, rute itu tidak terlihat sebagai urusan proyek.
 */
const POLA_ENTITAS = [/^\/api\/discussion-points\//, /^\/api\/v1\/meetings\//];

const berlingkupProyek = (r: Rute) =>
  /^\/api\/projects\/:/.test(r.jalur) || POLA_ENTITAS.some((p) => p.test(r.jalur));

const PENJAGA =
  /jagaProyek\(|jagaHapusProyek\(|jagaSetelanProyek\(|verifyGlobalAdmin|verifyProjectAccess\(/;

describe("#94 setiap rute berlingkup proyek punya penjaga", () => {
  it("pengurainya menemukan rute — bukan lulus karena himpunan kosong", () => {
    expect(semuaRute().length).toBeGreaterThan(50);
    expect(semuaRute().filter(berlingkupProyek).length).toBeGreaterThan(30);
  });

  it("rute beralamat ENTITAS ikut terdata — inilah yang dulu tak terlihat", () => {
    // Tanpa baris ini, `POLA_ENTITAS` bisa dikosongkan suatu saat dan seluruh
    // test di bawah tetap hijau sambil berhenti memeriksa apa pun.
    const entitas = semuaRute().filter((r) => POLA_ENTITAS.some((p) => p.test(r.jalur)));
    expect(entitas.length).toBeGreaterThan(0);
  });

  it("TIDAK ADA rute berlingkup proyek yang telanjang", () => {
    const telanjang = semuaRute()
      .filter(berlingkupProyek)
      .filter((r) => !PENJAGA.test(r.penjaga))
      .map((r) => `${r.berkas} ${r.metode} ${r.jalur}`);
    expect(telanjang).toEqual([]);
  });

  it("keempat rute komentar discussion point dijaga — kondisi asli #94", () => {
    // Disaring ke komentar DISCUSSION POINT saja. `/comments` juga dipakai
    // komentar TASK (2 rute di task.routes.ts); menghitung keenamnya membuat
    // angka yang dikunci di sini kehilangan arti.
    const komentar = semuaRute().filter((r) =>
      /(discussion-points|discussionPoints)\/:pointId\/comments$/.test(r.jalur)
    );
    expect(komentar.length).toBe(4);
    for (const r of komentar) {
      expect(r.penjaga).toMatch(/jagaProyek\(/);
    }
  });
});
