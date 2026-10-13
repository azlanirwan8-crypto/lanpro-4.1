/**
 * #724 — KEDUA pemilih jenis isu harus membaca level dari Master Data.
 *
 * KENAPA TEST INI ADA. Akar keluhan pemilik proyek ("saya buat bug, terus ada
 * sub bug, tapi di issue type kenapa sub bug tidak ada ya") bukan rumus
 * hierarkinya, melainkan FAKTA BAHWA TIDAK ADA KODE yang membaca pilihan
 * *Hierarchy level* itu kembali. Rumusnya sudah diuji di `hierarkiTipe.test.ts`
 * dan tetap hijau sepanjang waktu itu — yang putus adalah sambungannya ke
 * komponen. Test inilah yang menjaga sambungan itu, karena sambungan tidak
 * terlihat dari test rumus.
 *
 * Dua komponen, bukan satu: `IssueQuickCreateBar` (baris puncak) dan
 * `IssueTableInlineAddRow` (baris tambah anak) adalah pasangan yang oleh #604
 * memang harus selalu setuju. #564 adalah preseden biayanya bila tidak.
 *
 * Test ini MEMBACA SUMBER. Yang dikunci adalah panggilan fungsinya.
 */
import { readFileSync } from "fs";
import { join } from "path";

const isi = (relatif: string) => readFileSync(join(__dirname, relatif), "utf8");

const BAR = "components/list/IssueQuickCreateBar.tsx";
const BARIS = "components/list/IssueTableInlineAddRow.tsx";
const PEMILIH = [BAR, BARIS];

describe("sambungan level Master Data ke pemilih jenis (#724)", () => {
  it.each(PEMILIH)("%s membangun peta level dari baris Master Data", (berkas) => {
    const s = isi(berkas);
    expect(s).toMatch(/import\s*\{[^}]*\bpetaTingkat\b[^}]*\}\s*from\s*"[^"]*lib\/tingkatIsu"/);
    expect(s).toMatch(/petaTingkat\(barisTipe\)/);
  });

  it.each(PEMILIH)("%s tidak lagi menyaring Master Data hanya dengan label", (berkas) => {
    const s = isi(berkas);
    // Pola lama: `.filter((m) => m.type === "issue_type").map((m) => m.label)`
    // — baris Master Data dibuang jadi string, jadi `description` (tempat
    // level itu tinggal) tidak pernah sampai ke penyaring.
    expect(s).not.toMatch(/issue_type"\)\s*\n?\s*\.map\(\(m\)\s*=>\s*m\.label\)/);
    expect(s).toMatch(/barisTipe\.map\(\(m\)\s*=>\s*m\.label\)/);
  });

  it("setiap panggilan penyaring membawa peta levelnya", () => {
    for (const berkas of PEMILIH) {
      const s = isi(berkas);
      const panggilan = s.match(/\btipe(?:BoleDitawarkan|Bawaan)\([^)]*\)/g) || [];
      expect(panggilan.length).toBeGreaterThan(0);
      for (const p of panggilan) expect(p).toMatch(/,\s*tingkat\s*\)$/);
    }
  });

  it("peta level ikut menjadi dependensi memo, jadi sunting Master Data terasa", () => {
    const s = isi(BARIS);
    expect(s).toMatch(/\[tipeInduk,\s*labelTipe,\s*tingkat\]/);
  });
});

describe("layar Master Data menulis level ke tempat yang dibaca (#724)", () => {
  const PAPAN = "../master/MasterDataPanel.tsx";

  it("form sunting memuat level yang sudah tersimpan, bukan mulai dari kosong", () => {
    const s = isi(PAPAN);
    expect(s).toMatch(/tingkatDariDeskripsi\(editingMaster\.description\)/);
    expect(s).toMatch(/tuliskanTingkat\(\s*editingMaster\.description/);
  });

  it("kedua sisi memakai kosakata yang sama", () => {
    const s = isi(PAPAN);
    expect(s).toMatch(/from\s*"\.\.\/\.\.\/lib\/tingkatIsu"/);
    // Pembaca dan penulis harus satu modul; bila tidak, dropdown bisa menulis
    // ejaan yang tidak dikenali pembacanya dan kontrol itu jadi hiasan lagi.
    const kamus = isi("../../lib/tingkatIsu.ts");
    expect(kamus).toMatch(/export const tuliskanTingkat/);
    expect(kamus).toMatch(/export const tingkatDariDeskripsi/);
  });
});
