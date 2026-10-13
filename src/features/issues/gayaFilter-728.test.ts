/**
 * #728 O1 — pagar sumber untuk panel Advanced Filters.
 *
 * Sapuan bentuk ini (tinggi kontrol, bayangan, hex mentah, pill pelangi)
 * TIDAK terlihat oleh gerbang baca-teks mana pun: pola `audit:warna` hanya
 * menghitung white/black/slate/gray/zinc/neutral/stone, dan R1 `audit:label`
 * tidak memuat berkas ini di garis dasarnya (buta gerbang #719). Tanpa pagar
 * ini, `h-[32px]` dan `bg-rose-500/10` bisa tumbuh kembali senyap di panel
 * yang paling sering dibuka pemilik proyek.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const EXPANDED = "src/features/issues/components/list/IssueAdvancedFiltersExpanded.tsx";
const PANEL = "src/features/issues/components/list/IssueAdvancedFiltersPanel.tsx";

describe("Advanced Filters — tinggi & krom satu kit (#728 O1)", () => {
  const sumber = baca(EXPANDED);

  it("tidak ada tinggi keempat: h-[32px] punah dari panel", () => {
    expect(sumber).not.toMatch(/h-\[32px\]/);
    expect(sumber).toMatch(/h-9/);
  });

  it("bayangan memakai token rumah, bukan shadow-md", () => {
    expect(sumber).not.toMatch(/shadow-md\b/);
    expect(sumber).toMatch(/shadow-soft/);
  });

  it("hex mentah tidak ditulis tangan: warna ikon datang dari Master Data atau netral", () => {
    expect(sumber).not.toMatch(/#6366F1|#94a3b8/);
  });

  it("label dan judul kelompok memakai kit #721, bukan kelas tulisan tangan", () => {
    expect(sumber).toMatch(/JUDUL_SECTION/);
    expect(sumber).toMatch(/LABEL/);
  });

  it("empat kelompok semantik berjudul sendiri, tanpa baris yatim", () => {
    for (const kunci of [
      "filters.groupStatus",
      "filters.groupClassification",
      "filters.groupMasterColumns",
      "filters.groupDateRange",
    ]) {
      expect(sumber).toContain(kunci);
    }
  });

  it("Overdue dan Reset duduk di kaki panel, sesudah kelompok terakhir", () => {
    const akhir = sumber.indexOf("filters.groupDateRange");
    const overdue = sumber.indexOf("filters.overdueOnly");
    const reset = sumber.indexOf("filters.clearAllFields");
    expect(akhir).toBeGreaterThan(-1);
    expect(overdue).toBeGreaterThan(akhir);
    expect(reset).toBeGreaterThan(akhir);
  });
});

describe("Advanced Filters — pill aktif memakai token semantik (#728 O1)", () => {
  const sumber = baca(PANEL);

  it("pill pelangi palet keras punah", () => {
    expect(sumber).not.toMatch(
      /rose-500|emerald-500|sky-500|orange-500|teal-500|violet-500|amber-500/
    );
  });

  it("tombol buang tidak lagi hover:text-red-500", () => {
    expect(sumber).not.toMatch(/hover:text-red-500/);
    expect(sumber).toMatch(/hover:text-danger-text/);
  });

  it("pembeda pill tetap ada lewat token semantik, bukan satu warna netral semua", () => {
    for (const token of ["danger/10", "success/10", "info/10", "warning/10"]) {
      expect(sumber).toContain(token);
    }
  });
});
