/**
 * #765 — papan titik diskusi diurut di SERVER, jadi ada DUA daftar kolom yang
 * harus menyebut hal yang sama: `KolomSortir` di sisi layar dan peta kolom di
 * `server/lib/sortirDiskusi.ts`.
 *
 * Ini bukan test gaya. Kalau salah satu bertambah dan yang lain tidak, tidak ada
 * perkakas yang berteriak: `tsc` tidak tahu bahwa kepala kolom "keterangan"
 * menunjuk kunci URL yang boleh jadi ditolak 400, dan `vite build` hijau karena
 * kelas Tailwind hanyalah string bagi kompilator (§15.3). Yang terbaca di layar
 * hanyalah "urutannya tidak jalan".
 *
 * Membaca SUMBER, seperti `kepalaSelSejajar-715.test.ts` dan saudaranya: yang
 * dikunci di sini adalah KORESPONDENSI dua berkas, dan jsdom tidak akan pernah
 * membuktikan bahwa satu kunci tidak dikirim ke endpoint yang salah.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { paramSortir, SORTIR_AWAL } from "./lib/sortir";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const KLIEN = "src/features/meeting-notes/lib/sortir.ts";
const KEPALA = "src/features/meeting-notes/components/BagianPapan.tsx";
const SERVER = "server/lib/sortirDiskusi.ts";
const RUTE = "server/routes/discussion-points.routes.ts";
const REPO = "server/repositories/discussion-points.repository.ts";
const SERVICE = "src/services/meetingService.ts";
const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";

/** `export type KolomSortir = "a" | "b" ... ;` → ["a","b",...] */
const unionKlien = () => {
  const blok = /export type KolomSortir =([\s\S]*?);/.exec(baca(KLIEN));
  if (!blok) throw new Error(`${KLIEN}: ` + "`KolomSortir` tidak ditemukan");
  return [...blok[1].matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
};

/** Array literal `DAFTAR_KOLOM_SORTIR` di sisi server. */
const daftarServer = () => {
  const isi = baca(SERVER);
  const blok = /DAFTAR_KOLOM_SORTIR[^=]*= \[([\s\S]*?)\];/.exec(isi);
  if (!blok) throw new Error(`${SERVER}: ` + "`DAFTAR_KOLOM_SORTIR` tidak ditemukan");
  return [...blok[1].matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
};

describe("#765 — daftar kolom urut klien dan server satu daftar", () => {
  it("kunci yang bisa ditekan di layar semuanya dikenal server", () => {
    expect(unionKlien().sort()).toEqual(daftarServer().sort());
  });

  it("skema Zod memakai daftar server, bukan daftar yang diketik ulang", () => {
    const skema = baca("server/schemas/discussion-points.schema.ts");
    expect(skema).toContain("import { DAFTAR_KOLOM_SORTIR }");
    expect(skema).toContain("sort: z.enum(DAFTAR_KOLOM_SORTIR)");
    // `dir` dibatasi dua nilai; enum longgar berarti `?dir=;DROP` sampai ke
    // pembangun klausa dan urutan diam-diam berubah jadi bawaan.
    expect(skema).toContain('dir: z.enum(["asc", "desc"])');
  });
});

describe("#765 — kepala kolom: yang bisa diurut dan yang tidak", () => {
  const kepala = () => {
    const isi = baca(KEPALA);
    const i = isi.indexOf("<thead>");
    const j = isi.indexOf("</thead>", i);
    return isi.slice(i, j);
  };

  it("enam kepala menekan `onSortir` dengan kunci yang ada di daftar server", () => {
    const ditekan = [...kepala().matchAll(/onSortir\("([a-zA-Z]+)"\)/g)].map((m) => m[1]);
    expect(ditekan.sort()).toEqual(daftarServer().sort());
    for (const k of ditekan) expect(daftarServer()).toContain(k);
  });

  it("konteks/tag, PIC, dan lampiran TIDAK bisa diurut — dan kepala mereka mengatakannya", () => {
    /* Ketiga kolom ini datang dari `tags`/`links` JSONB dan tabel relasi
     * `discussion_point_assignees`: tidak ada SATU nilai di Database yang bisa
     * dipakai ORDER BY. Panah di sana akan menjanjikan urutan yang tidak bisa
     * ditunaikan server. */
    const isi = kepala();
    expect(isi).toContain('{t("discussion.thContextTags")}');
    expect(isi).toContain('{t("discussion.thPic")}');
    expect(isi).toContain('{t("discussion.thLampiran")}');
    expect(isi).not.toMatch(/onSortir\("(tags|links|assignees|assignTo|fitur)"\)/);
  });

  it("setiap kepala yang bisa diurut membawa `aria-sort` supaya pembaca layar tahu arahnya", () => {
    const jumlahTh = (kepala().match(/aria-sort=/g) || []).length;
    expect(jumlahTh).toBe(6);
  });
});

describe("#765 — nilai urutan yang dikirim ke URL", () => {
  it("bawaan TIDAK mengirim apa pun — papan lama tidak berubah sampai ditekan", () => {
    expect(SORTIR_AWAL).toEqual({ kolom: null, arah: "asc" });
    expect(paramSortir(SORTIR_AWAL)).toEqual({});
  });

  it("kolom aktif mengirim `sort` + `dir`, dan `createdAt` termasuk", () => {
    expect(paramSortir({ kolom: "keterangan", arah: "desc" })).toEqual({
      sort: "keterangan",
      dir: "desc",
    });
    expect(paramSortir({ kolom: "createdAt", arah: "asc" })).toEqual({
      sort: "createdAt",
      dir: "asc",
    });
  });

  it("layanan meneruskan keduanya ke query string", () => {
    const isi = baca(SERVICE);
    expect(isi).toContain('params.set("sort", options.sort)');
    expect(isi).toContain('params.set("dir", options.dir)');
  });

  it("rute dan repository memakainya, dan `ORDER BY` tidak lagi ditulis tangan", () => {
    const rute = baca(RUTE);
    expect(rute).toContain("findByMeetingId(id, search, urutan)");
    expect(rute).toContain("findByMeetingIdPaged(id, pagination, search, urutan)");
    const repo = baca(REPO);
    expect(repo).toContain("${susunUrutanDiskusi(urutan)}");
    // Dua-duanya (berpaginasi dan tanpa pagination) harus ikut — kalau salah satu
    // tertinggal, urutan terlihat benar di layar dan salah di ekspor.
    expect((repo.match(/susunUrutanDiskusi\(urutan\)/g) || []).length).toBe(2);
    // Penjaganya per kalimat daftar, bukan per berkas. `ORDER BY` lain di
    // repository ini (assignees :132, sub-titik :172, lampiran :410, komentar :503)
    // adalah query lama yang bukan jalur papan dan tidak boleh ikut kena — salah
    // satunya bahkan ditulis tanpa kutip dan tidak bisa diuji ke database dari
    // mesin ini, jadi ia dibiarkan apa adanya dan dicatat, bukan ditambal diam-diam.
    expect(
      (
        repo.match(/SELECT \* FROM DiscussionPoints WHERE \$\{where\} \$\{susunUrutanDiskusi/g) ||
        []
      ).length
    ).toBe(2);
  });

  it("papan mengirim `sortir` sebagai sumber muat ulang dan memulangkan halaman ke satu", () => {
    const isi = baca(TABEL);
    expect(isi).toContain("...paramSortir(sortir)");
    expect(isi).toContain("itemsPerPage, sortir]");
    expect(isi).toContain(
      "setCurrentPage(1); // halaman yang terbuka tidak berisi hasil urutan baru (#711)"
    );
  });
});
