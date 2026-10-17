/**
 * #779 — avatar dan chip tanggal harus satu standar.
 *
 * Pemilik proyek, 17 Okt (layar pohon perencanaan): "wah ini masih ketemu icon
 * user, button nya masih belum standar coba cek lagi semua nya". Dua cacat nyata:
 *
 * 1. `UserAvatar` dibungkus piringan abu-abu SEUKURAN dirinya
 *    (`w-5 h-5 rounded-full bg-surface-muted`), jadi tint #770 duduk di atas
 *    lingkaran lain dan tepinya terbaca sebagai "icon user" yang beda sendiri.
 *    Tanda "belum ada PIC" juga ditulis ulang per layar dengan gaya beda
 *    (abu keras + uppercase di kanban, garis putus-putus 9px di pemilih).
 * 2. Chip tenggat memakai geometri sendiri (`px-1.5 text-xs sm:text-[10px]`)
 *    sementara chip label di baris yang sama memakai `px-2 text-[10px]`, jadi
 *    dua chip sejajar tingginya beda.
 *
 * Yang dikunci di sini: (a) TIDAK ADA lagi call site `UserAvatar` yang mengirim
 * kelas ukuran teks — sejak #776 kelas itu dibuang komponen, jadi menulisnya
 * hanya menciptakan Illusi "hidup padahal mati"; (b) tidak ada lagi lingkaran
 * "?" tulisan tangan; (c) chip tanggal memakai geometri yang SAMA dengan chip
 * label lewat satu konstanta; (d) render keduanya benar.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";
import { ChipTanggal } from "./CommonComponents";
import { AvatarKosong } from "./UserAvatar";

const AKAR = join(__dirname, "..", "..");
const TSX: string[] = [];
const jalan = (dir: string) => {
  for (const nama of readdirSync(dir)) {
    if (nama === "node_modules" || nama === "dist" || nama === ".git") continue;
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) jalan(p);
    else if (/\.tsx?$/.test(nama)) TSX.push(p);
  }
};
jalan(AKAR);

const baca = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const POLA_TEKS = /\btext-(?:2xs|3xs|4xs|xsm|xs|sm|md|base|lg|xl|[2-9]xl|\[[^\]]*\])\b/;

describe("avatar dan chip standar (#779)", () => {
  it("tidak ada call site UserAvatar yang mengirim kelas ukuran teks", () => {
    const pelanggar: string[] = [];
    for (const f of TSX) {
      const isi = baca(f);
      let i = isi.indexOf("<UserAvatar");
      while (i >= 0) {
        const potongan = isi.slice(i, isi.indexOf("/>", i) + 2);
        if (POLA_TEKS.test(potongan)) pelanggar.push(`${f}:${isi.slice(0, i).split("\n").length}`);
        i = isi.indexOf("<UserAvatar", i + 1);
      }
    }
    expect(pelanggar).toEqual([]);
  });

  it("tidak ada lagi lingkaran '?' tulisan tangan di luar AvatarKosong", () => {
    const pelanggar: string[] = [];
    for (const f of TSX) {
      if (f.endsWith("UserAvatar.tsx")) continue;
      const isi = baca(f);
      if (/rounded-full[^>]*bg-surface-muted[\s\S]{0,160}>\s*\?\s*</.test(isi)) pelanggar.push(f);
    }
    expect(pelanggar).toEqual([]);
  });

  it("empat bekas lingkaran '?' pindah ke AvatarKosong", () => {
    expect(
      baca(join(AKAR, "features", "planning", "index.tsx")).match(/<AvatarKosong/g)
    ).toHaveLength(2);
    expect(baca(join(AKAR, "features", "kanban", "index.tsx"))).toContain("<AvatarKosong");
    expect(baca(join(AKAR, "components", "ui", "CommonComponents.tsx"))).toContain("<AvatarKosong");
  });

  it("ritme vertikal chip tanggal dan chip label berasal dari SATU konstanta", () => {
    const isi = baca(join(AKAR, "components", "ui", "CommonComponents.tsx"));
    const tinggi = /const CHIP_TINGGI = "([^"]+)";/.exec(isi);
    expect(tinggi).not.toBeNull();
    for (const kelas of ["py-0.5", "rounded-md", "text-[10px]", "border"]) {
      expect(tinggi![1]).toContain(kelas);
    }
    expect(isi).toContain("const CHIP_DASAR = `px-2 ${CHIP_TINGGI}`");
    const blokChip = isi.slice(isi.indexOf("export const ChipTanggal"));
    expect(blokChip.slice(0, 900)).toContain("CHIP_TINGGI,");
    // #779 putaran 2: px-2 pada chip tanggal membuat baris meluber keluar kartu
    // sempit — tingginya yang harus sama, lebarnya tidak.
    expect(blokChip.slice(0, 900)).toContain('"px-1.5",');
    expect(blokChip.slice(0, 900)).not.toContain("CHIP_DASAR,");
  });

  it("pohon perencanaan tidak menulis chip tanggalnya sendiri lagi", () => {
    const isi = baca(join(AKAR, "features", "planning", "index.tsx"));
    expect(isi.match(/<ChipTanggal /g)).toHaveLength(2);
    expect(isi).not.toMatch(/format\(ensureDate\(task\.dueDate\)/);
    expect(isi).not.toMatch(/border border-danger\/30/);
    // Baris chip kartu boleh melipat — pada kartu sempit ia tidak lagi bertautan.
    expect(isi).toMatch(/flex flex-wrap items-center justify-between/);
  });

  it("ChipTanggal: null tanpa tanggal, danger saat lewat, netral saat belum", () => {
    expect(render(<ChipTanggal tanggal={null} />).container.firstChild).toBeNull();
    const lewat = render(<ChipTanggal tanggal="2000-01-01" />);
    expect(lewat.container.textContent).toBe("Jan 1");
    expect(lewat.container.firstElementChild!.className).toContain("px-1.5");
    expect(lewat.container.firstElementChild!.className).toContain("text-[10px]");
    expect(lewat.container.firstElementChild!.className).toContain("py-0.5");
    expect(lewat.container.firstElementChild!.className).toContain("text-danger-text");
    const akan = render(<ChipTanggal tanggal="2999-12-31" />);
    expect(akan.container.firstElementChild!.className).toContain("text-content-muted");
    expect(akan.container.firstElementChild!.className).not.toContain("text-danger-text");
  });

  it("AvatarKosong menghormati diameter caller dan membuang kelas teks caller", () => {
    const kecil = render(<AvatarKosong className="w-5 h-5 text-xs" />).container
      .firstElementChild as HTMLElement;
    expect(kecil.textContent).toBe("?");
    expect(kecil.className).toContain("w-5 h-5");
    expect(kecil.className).not.toMatch(/\btext-xs\b/);
    expect(kecil.className).toContain("text-[11px]");
    const bawaan = render(<AvatarKosong />).container.firstElementChild as HTMLElement;
    expect(bawaan.className).toContain("w-6 h-6");
  });
});
