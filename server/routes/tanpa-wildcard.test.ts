/**
 * Mengunci hasil #72: tidak ada lagi rute berlingkup proyek yang dijaga `["*"]`.
 *
 * `["*"]` berarti "anggota proyek dengan peran APA PUN" sejak #49. Diukur
 * 16 Agu 2026, 31 dari 54 penjaga (57%) berbunyi begitu — sehingga `viewer`
 * bisa membuat dan mengubah data di hampir seluruh modul.
 *
 * Sesudah §19.8 tahap 4 gelombang 2, ke-31 rute itu menyebut modul + aksi dan
 * matriks yang menjawab. Test ini menjaga agar tidak ada yang kembali.
 *
 * PENGURAINYA MENGABAIKAN KOMENTAR. Rute yang sudah diperbaiki justru paling
 * mungkin punya catatan sejarah yang menyebut `["*"]`; menilai teks komentar
 * sebagai penjaga menghasilkan alarm palsu, dan alarm palsu menumpulkan test
 * secepat lubang menumpulkannya. Ini bukan kehati-hatian teoretis — pendata
 * versi pertama benar-benar tersandung begitu (§19.20).
 *
 * BATASNYA: pemeriksaan STATIS terhadap teks rute. Pembuktian perilaku ada di
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
        penjaga: m[3].replace(/\/\/.*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""),
      });
    }
  }
  return hasil;
}

const berlingkupProyek = (r: Rute) => /^\/api\/projects\/:/.test(r.jalur);

describe("#72 tidak ada rute proyek yang dijaga wildcard", () => {
  it("pengurainya menemukan rute — bukan lulus karena himpunan kosong", () => {
    expect(semuaRute().length).toBeGreaterThan(50);
    expect(semuaRute().filter(berlingkupProyek).length).toBeGreaterThan(20);
  });

  it('TIDAK ADA yang memakai `verifyProjectAccess(["*"])`', () => {
    const longgar = semuaRute()
      .filter(berlingkupProyek)
      .filter((r) => /verifyProjectAccess\(\s*\[\s*["']\*["']\s*\]\s*\)/.test(r.penjaga))
      .map((r) => `${r.berkas} ${r.metode} ${r.jalur}`);
    expect(longgar).toEqual([]);
  });

  it("aksi yang dipasang masuk akal terhadap metode HTTP-nya", () => {
    // GET tidak boleh dijaga sebagai tulis, dan PUT/PATCH/DELETE tidak boleh
    // dijaga sebagai baca. Salah pasang di sini tidak akan terlihat sebagai
    // galat apa pun — ia hanya membuat penjaganya menjawab pertanyaan yang
    // salah, dan itu justru bentuk kegagalan yang paling sulit disadari.
    const sah: Record<string, string[]> = {
      GET: ["R"],
      // `POST` boleh `D` HANYA bila jalurnya memang operasi hapus — `bulk-delete`
      // adalah POST karena membawa daftar id di body, bukan karena ia lunak.
      POST: ["C", "U", "R", "D"],
      PUT: ["U"],
      PATCH: ["U"],
      DELETE: ["D"],
    };
    const janggal = semuaRute()
      .map((r) => ({ r, m: /jagaProyek\("([^"]+)",\s*"([A-Z])"\)/.exec(r.penjaga) }))
      .filter((x) => x.m !== null)
      .filter((x) => sah[x.r.metode].indexOf(x.m![2]) === -1)
      .concat(
        semuaRute()
          .map((r) => ({ r, m: /jagaProyek\("([^"]+)",\s*"([A-Z])"\)/.exec(r.penjaga) }))
          .filter((x) => x.m !== null)
          .filter((x) => x.m![2] === "D" && x.r.metode === "POST" && !/delete/i.test(x.r.jalur))
      )
      .map((x) => `${x.r.berkas} ${x.r.metode} ${x.r.jalur} -> ${x.m![2]}`);
    expect(janggal).toEqual([]);
  });

  it("setiap modul yang dipakai penjaga benar-benar ada di matriks", () => {
    // Modul yang salah eja tidak memicu galat TypeScript bila rutenya ditulis
    // lewat jalur yang longgar tipenya; ia hanya menghasilkan penolakan diam
    // untuk semua orang. Diperiksa terhadap matriks yang sesungguhnya.

    const { MATRIKS_PROYEK } = require("../../src/lib/matriksAkses");
    const dikenal = Object.keys(MATRIKS_PROYEK);
    const asing = semuaRute()
      .map((r) => /jagaProyek\("([^"]+)"/.exec(r.penjaga))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => m[1])
      .filter((modul) => dikenal.indexOf(modul) === -1);
    expect([...new Set(asing)]).toEqual([]);
  });
});
