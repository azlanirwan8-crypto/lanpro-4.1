/**
 * #782 — tiga akar "kasar, berat, memaksakan keadaan".
 *
 * Pemilik proyek, 18 Okt, mengirim enam layar: "masih tidak clean, masih
 * tabrakan, coba analisa ui nya benchmark ke app serupa ... ini masih kasar dan
 * berat serta seperti memaksakan keadaan". Tiga akarnya:
 *
 * 1. KONTROL FORM DICAT NILAINYA. `StyledDropdown` memakai `CHIP_KECIL` +
 *    `.label-chip` pada tombolnya, jadi field yang nilainya punya warna
 *    MasterData (status/prioritas) tampil sebagai blok berwarna sementara field
 *    tetangganya putih — badge yang menyamar jadi tombol. Titik/ikon warna di
 *    kiri nilai SUDAH ada sejak lama dan itulah yang dipakai Jira/Linear; yang
 *    dicabut hanya catnya.
 * 2. DUA BADGE BISE BERTABRAKAN. Kolom status Roadmap `w-20` (80 px) memuat chip
 *    `shrink-0` yang butuh ±92 px untuk "IN PROGRESS", jadi chip meluber,
 *    `gap-2` antar kolom termakan, dan badge status menyentuh badge prioritas.
 * 3. AVATAR BERCINCIN GANDA. `UserAvatar` menempel `border` + `shadow-2xs`
 *    sendiri, dan sembilan call site menambah border/ring/shadow lagi dari luar;
 *    karena `cn()` hanya merangkai string, `border` caller justru MENIMPA garis
 *    tint komponen. Avatar sekarang datar; `ring-*` tetap boleh untuk tumpukan.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";
import { StyledDropdown } from "./CommonComponents";
import UserAvatar from "./UserAvatar";

const AKAR = join(__dirname, "..", "..");
const BERKAS_UI = join(__dirname, "CommonComponents.tsx");
const BERKAS_PAPAN = join(AKAR, "features", "timeline", "TimelinePanel.tsx");
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

const OPSI_STATUS = [
  { id: "In Progress", label: "In Progress" },
  { id: "To Do", label: "To Do" },
];

describe("ui bersih (#782)", () => {
  it("trigger dropdown tidak lagi memakai kelas chip berwarna", () => {
    const isi = baca(BERKAS_UI);
    expect(isi).not.toContain('"label-chip transition-colors"');
    for (const k of ["KONTROL_KECIL", "KONTROL_NETRAL", "KONTROL_BENING"]) {
      expect(isi).toContain(`const ${k} =`);
      expect(isi.split(k).length).toBeGreaterThanOrEqual(3); // definisi + pemakaian
    }
    // LabelChip (badge) tetap boleh dan memang harus tetap berwarna.
    expect(isi).toContain('cn(CHIP_KECIL, "label-chip inline-flex');
  });

  it("kontrol status/prioritas netral, warnanya dibawa titik/ikon di kiri nilai", () => {
    const { container } = render(
      <StyledDropdown
        value="In Progress"
        onChange={() => {}}
        options={OPSI_STATUS}
        type="status"
        masterData={[] as any}
      />
    );
    const tombol = container.querySelector("button")!;
    expect(tombol.className).toContain("bg-surface");
    expect(tombol.className).toContain("border-border-subtle");
    expect(tombol.className).not.toContain("label-chip");
    const titik = tombol.querySelector("[style*='background-color']");
    expect(titik).not.toBeNull();
  });

  it("Roadmap: kolom chip cukup lebar dan chip memotong di dalam kolomnya", () => {
    const isi = baca(BERKAS_PAPAN);
    expect(isi).toMatch(/status: "w-28 shrink-0/);
    expect(isi).toMatch(/prioritas: "w-20 shrink-0/);
    expect(isi).not.toMatch(/label-chip shrink-0/);
    expect((isi.match(/label-chip min-w-0 max-w-full/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("UserAvatar tidak menempelkan border/shadow sendiri", () => {
    const el = render(<UserAvatar uid="u-1" name="Mohamad Rifky" />).container
      .firstElementChild as HTMLElement;
    expect(el.className).toContain("avatar-tint");
    const token = el.className.split(/\s+/);
    expect(token.filter((k) => /^border(-|$)/.test(k))).toEqual([]);
    expect(token.filter((k) => /^shadow(-|$)/.test(k))).toEqual([]);
  });

  it("tidak ada call site UserAvatar yang menambah border/shadow dari luar", () => {
    const pelanggar: string[] = [];
    for (const f of TSX) {
      const isi = baca(f);
      let i = isi.indexOf("<UserAvatar");
      while (i >= 0) {
        const potongan = isi.slice(i, isi.indexOf("/>", i) + 2);
        const kelas = /className=(["'`])([\s\S]*?)\1/.exec(potongan);
        if (kelas && /(^|\s)(border|border-\S+|shadow|shadow-\S+)($|\s)/.test(kelas[2])) {
          pelanggar.push(`${f}:${isi.slice(0, i).split("\n").length}`);
        }
        i = isi.indexOf("<UserAvatar", i + 1);
      }
    }
    expect(pelanggar).toEqual([]);
  });
});
