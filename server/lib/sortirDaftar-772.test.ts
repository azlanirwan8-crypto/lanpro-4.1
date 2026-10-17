/**
 * #772 — tiga daftar (rapat, dokumentasi, diagram alur) bisa diurut dari
 * kepalanya. Dua di antaranya di-page di SERVER, jadi ada TIGA daftar kolom yang
 * harus menyebut hal yang sama: kunci `kolom=` di layar, `?sort=` yang dikirim
 * `buildListQuery`, dan peta allow-list di `sortirDaftar.ts`.
 *
 * Ini bukan test gaya. Kalau salah satu bertambah dan yang lain tidak, tidak ada
 * perkakas yang berteriak: `tsc` tidak tahu bahwa kepala kolom mengirim kunci
 * yang tidak dikenal server, dan `vite build` hijau karena kelas Tailwind
 * hanyalah string (§15.3). Yang terbaca di layar hanyalah "urutannya tidak jalan"
 * — persis kelas kesalahan yang sudah dicatat #765.
 *
 * Yang dijaga runtime, bukan hanya teks: `ORDER BY` tidak menerima bind
 * parameter, jadi satu-satunya pertahanan terhadap injeksi adalah bahwa nilai
 * dari klien hanya pernah dipakai SEBAGAI KUNCI ke peta. Itu hanya terbukti bila
 * pembangunnya dijalankan dengan masukan buruk.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  buatJuruSortir,
  PETA_DOCUMENT,
  PETA_MEETING,
  sortirDocument,
  sortirMeeting,
} from "./sortirDaftar";

const AKAR = join(__dirname, "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const MEETINGS = "src/features/meeting-notes/MeetingNotes.tsx";
const WIKI = "src/features/wiki/WikiView.tsx";
const PAGINATION = "src/lib/pagination.ts";
const CACHE = "src/lib/moduleDataCache.ts";
const SKEMA = "server/schemas/pagination.schema.ts";

/** `kolom="..."` pada setiap kepala sortir di satu berkas layar. */
const kunciKepala = (relatif: string) =>
  [...baca(relatif).matchAll(/<ThSortir[\s\S]{0,200}?kolom="([a-zA-Z]+)"/g)].map((m) => m[1]);

describe("#772 — kolom yang bisa ditekan semuanya dikenal server", () => {
  it("kepala sortir daftar rapat ada di PETA_MEETING", () => {
    const kunci = [...new Set(kunciKepala(MEETINGS))];
    expect(kunci.length).toBeGreaterThanOrEqual(5);
    for (const k of kunci) expect(PETA_MEETING).toHaveProperty(k);
  });

  it("kepala sortir daftar dokumentasi ada di PETA_DOCUMENT", () => {
    const kunci = [...new Set(kunciKepala(WIKI))];
    expect(kunci.length).toBeGreaterThanOrEqual(5);
    for (const k of kunci) expect(PETA_DOCUMENT).toHaveProperty(k);
  });

  it("kedua peta hanya menyebut kolom yang benar-benar ada di tabelnya", () => {
    // Identifier ditulis TANPA kutip: `db.ts` melipatnya ke huruf kecil dan
    // kolom ini memang tersimpan lowercase. Mengutipnya = "column does not exist".
    const repoMeeting = baca("server/repositories/meeting.repository.ts");
    const repoDocument = baca("server/repositories/document.repository.ts");
    for (const k of Object.keys(PETA_MEETING)) expect(repoMeeting).toContain(k);
    for (const k of Object.keys(PETA_DOCUMENT)) expect(repoDocument).toContain(k);
  });
});

describe("#772 — pembangun ORDER BY tidak pernah menerima teks klien", () => {
  it("arah HANYA dua nilai, apa pun yang dikirim klien", () => {
    expect(sortirMeeting({ sortir: "title", arah: "desc" })).toContain("title DESC NULLS LAST");
    expect(sortirMeeting({ sortir: "title", arah: "asc" })).toContain("title ASC NULLS LAST");
    // Apa pun di luar "desc" menjadi ASC — bukan disisipkan apa adanya. Skema
    // Zod sudah lebih dulu menolak nilai asing dengan 400; pembangun ini adalah
    // LAYER KEDUA, karena ia yang menulis SQL.
    expect(sortirMeeting({ sortir: "title", arah: "DESC; DROP TABLE Meetings" })).toContain(
      "title ASC NULLS LAST"
    );
    expect(sortirMeeting({ sortir: "title", arah: "' OR 1=1 --" })).toContain(
      "title ASC NULLS LAST"
    );
  });

  it("kunci asing jatuh ke urutan bawaan, bukan disisipkan ke SQL", () => {
    const asing = "createdAt; DELETE FROM Meetings WHERE 1=1";
    const hasil = sortirMeeting({ sortir: asing, arah: "asc" });
    expect(hasil).toBe("ORDER BY createdAt DESC NULLS LAST, id ASC");
    expect(hasil).not.toContain("DELETE");
    expect(hasil).not.toContain(";");
  });

  it("bawaan kedua daftar tetap terbaru-lebih-dulu, seperti sebelum #772", () => {
    expect(sortirMeeting()).toBe("ORDER BY createdAt DESC NULLS LAST, id ASC");
    expect(sortirDocument()).toBe("ORDER BY createdAt DESC NULLS LAST, id ASC");
  });

  it("kolom lain selalu diikuti penyeimbang stabil supaya halaman tidak berubah isi", () => {
    const hasil = sortirDocument({ sortir: "title", arah: "asc" });
    expect(hasil).toContain(", createdAt DESC");
    expect(hasil.endsWith(", id ASC")).toBe(true);
  });

  it("peta kosong menghasilkan klausa yang hanya berisi isi peta", () => {
    const juru = buatJuruSortir({ aman: "safeColumn" }, "aman", "asc");
    expect(juru({ sortir: "bahaya", arah: "desc" })).toBe(
      "ORDER BY safeColumn ASC NULLS LAST, id ASC"
    );
  });
});

describe("#772 — kunci sortir ikut ke URL dan ke cache", () => {
  it("buildListQuery mengirim sort dan dir", () => {
    const isi = baca(PAGINATION);
    expect(isi).toContain('params.set("sort"');
    expect(isi).toContain('params.set("dir"');
  });

  it("skema menolak arah di luar asc/desc tetapi tidak menolak kunci asing", () => {
    const isi = baca(SKEMA);
    expect(isi).toContain('dir: z.enum(["asc", "desc"])');
    // `sort` sengaja longgar: kunci asing = urutan bawaan, bukan 400. Daftar
    // yang sudah ada tidak boleh pecah hanya karena satu parameter baru.
    expect(isi).toContain("sort: z.string()");
  });

  it("cacheKey memuat sort dan dir, bila tidak hasil sortir disajikan dari cache lama", () => {
    const isi = baca(CACHE);
    expect(isi).toContain("options?.sort");
    expect(isi).toContain("options?.dir");
  });
});
