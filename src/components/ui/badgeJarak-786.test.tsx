/**
 * #786 — badge tidak boleh bisa bertabrakan, dan kelas yang tidak pernah
 * menghasilkan CSS tidak boleh dibiarkan mengira dirinya hidup.
 *
 * Pemilik proyek, 18 Okt: "masih tabrakan". #782 sudah membereskan kolom chip
 * Roadmap dengan menaikkan lebarnya dan memotong chip di dalam kolomnya. Ini
 * sisa pemindaian seluruh menu: SEL ISU masih bisa mendorong badge-nya sendiri
 * keluar kolom 450 px, dan badge penghitung epik di papan kanban memakai
 * `py-0.2` — bukan langkah skala Tailwind, jadi ia NO-OP (kembaran `w-5.5` yang
 * ditemukan #776 dan `tracking-normalr` yang masih tersisa).
 *
 * Yang TIDAK diubah dan alasannya dicatat di sini: `SidebarWidgetsStack.tsx:97`
 * dan `KanbanCard.tsx:203` dilaporkan sebagai risiko tabrakan, tetapi setelah
 * dibuka keduanya sudah benar — yang pertama memakai `justify-between` dengan
 * grup dalam `gap-1.5`, yang kedua sudah `flex-wrap` + `gap-1.5`. Menambah
 * "perbaikan" di sana hanya akan menggeser piksel tanpa sebab.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..");
const TSX: string[] = [];
const jalan = (d: string) => {
  for (const n of readdirSync(d)) {
    if (["node_modules", "dist", ".git"].includes(n)) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) jalan(p);
    else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) TSX.push(p);
  }
};
jalan(AKAR);
const baca = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** Langkah skala Tailwind: 0, px, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, ... — 0.2 dan 5.5 TIDAK ada. */
const LANGKAH_HILANG =
  /(?:^|\s)-?(?:p|m|inset|w|h|gap|space)(?:-[trblxyse])?-\d+\.(?:2|4|6|7|8|9)\b/;

describe("badge dan kelas mati (#786)", () => {
  it("tidak ada lagi kelas padding/ukuran dengan langkah yang tidak ada di skala Tailwind", () => {
    const pelanggar: string[] = [];
    for (const f of TSX) {
      const isi = baca(f);
      isi.split("\n").forEach((b, i) => {
        if (!/className=/.test(b) && !/["'`][^"'`]*\b(?:p|m|w|h)-\d+\.\d/.test(b)) return;
        const m = LANGKAH_HILANG.exec(b);
        if (m) pelanggar.push(`${f}:${i + 1} ${m[0].trim()}`);
      });
    }
    expect(pelanggar).toEqual([]);
  });

  it("sel judul isu memotong di dalam kolomnya, bukan mendorong badge keluar", () => {
    const isi = baca(join(AKAR, "features", "issues", "components", "list", "IssueTableRow.tsx"));
    expect(isi).toMatch(/className="flex items-center gap-2 min-w-0"/);
    expect(isi).toMatch(/whitespace-nowrap block truncate/);
    expect(isi).toMatch(/title=\{`\$\{task\.title/); // teks utuh tetap terbaca lewat tooltip
  });

  it("badge penghitung epik kanban memakai padding yang benar-benar ada", () => {
    const isi = baca(join(AKAR, "features", "kanban", "index.tsx"));
    expect(isi).not.toContain("py-0.2");
    expect(isi).toContain("px-1.5 py-0.5 rounded text-[10px] leading-none");
  });

  it("Roadmap (#782) tetap terkunci: kolom lebar, chip memotong di dalam kolom", () => {
    const isi = baca(join(AKAR, "features", "timeline", "TimelinePanel.tsx"));
    expect(isi).toMatch(/status: "w-28 shrink-0/);
    expect(isi).not.toMatch(/label-chip shrink-0/);
  });
});
