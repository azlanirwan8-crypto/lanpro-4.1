/**
 * #645 — catatan rapat harus tampil penuh.
 *
 * MENGAPA TEST INI ADA. Pemilik proyek 06 Okt mengirim tangkapan layar
 * "Discussion Points & Decisions" dan bertanya "ini notes nya kepotong kah?
 * coba cek lagi ini pastikan lengkap ya". Terukur: kolom NOTES/REMARKS di tabel
 * desktop memakai `line-clamp-2 max-w-sm`, jadi teks sepanjang "- Posisi Jingle
 * BNI: ... - Benchmark Payment: Analisis…" kehilangan sisanya di layar. Datanya
 * TIDAK hilang: kolomnya `keterangan TEXT` (src/lib/pg-migrate.ts:465) dan
 * repository tidak memotong apa pun — jadi ini murni tampilan. Buktinya
 * strongest: kartu MOBILE di berkas yang sama sudah merendernya penuh lewat
 * `whitespace-pre-wrap`, jadi tabel desktop yang menyimpang, bukan desainnya.
 *
 * Test ini MEMBACA SUMBER karena yang dikunci adalah kelas tata letak dan
 * batas kolom basis data — dua hal yang bisa kembali bocor tanpa terlihat:
 * `line-clamp` tidak error, hanya membuat orang mengira datanya hilang.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const KARTU = "src/features/meeting-notes/components/DiscussionPointMobileCardView.tsx";

/** Isi sel keterangan: baris tempat `p.keterangan` dirender, beserta pembungkusnya. */
const selKeterangan = (isi: string) => {
  const i = isi.indexOf("{p.keterangan");
  if (i < 0) throw new Error("sel keterangan tidak ditemukan");
  return isi.slice(i - 400, i);
};

describe("catatan rapat tampil penuh (#645)", () => {
  it("tabel desktop tidak memotong dan tidak memangkas lebar catatan", () => {
    const sel = selKeterangan(baca(TABEL));
    expect(sel).not.toContain("line-clamp");
    expect(sel).not.toContain("truncate");
    expect(sel).not.toMatch(/max-w-\s*\[?\w+\]/);
    // Baris baru dari pengguna harus tetap terlihat, sama seperti di kartu.
    expect(sel).toContain("whitespace-pre-wrap");
  });

  it("kartu mobile tetap tampil penuh — dua tampilan, satu perilaku", () => {
    expect(baca(KARTU)).toContain("whitespace-pre-wrap");
  });

  it("nama PIC tidak dipotong di kedua tampilan", () => {
    for (const berkas of [TABEL, KARTU]) {
      const isi = baca(berkas);
      const i = isi.indexOf("{assigneeName}");
      if (i < 0) throw new Error(`${berkas}: nama PIC tidak ditemukan`);
      const tag = isi.slice(i - 220, i);
      expect(tag).not.toContain("truncate");
    }
  });

  it("basis data menyimpan catatan sebagai TEXT, bukan varchar berbates", () => {
    const migrasi = baca("src/lib/pg-migrate.ts");
    expect(migrasi).toMatch(/keterangan\s+TEXT/);
    expect(migrasi).toMatch(/concern\s+TEXT/);
    expect(migrasi).not.toMatch(/keterangan\s+VARCHAR/i);
  });

  it("repository tidak memotong nilai saat membaca maupun menyimpan", () => {
    const repo = baca("server/repositories/discussion-points.repository.ts");
    expect(repo).not.toMatch(/\.(slice|substring|substr)\(/);
  });
});
