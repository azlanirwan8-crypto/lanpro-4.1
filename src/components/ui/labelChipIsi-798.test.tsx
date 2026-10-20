/**
 * #798 — warna chip boleh datang dari satu nilai, teksnya dari nilai lain.
 *
 * Pemilik proyek 20 Okt: "label nya warna harus ikut warna priorty nya cek
 * lagi". Chip linked issue hari itu memakai `bg-primary/10 text-primary
 * border-primary/30` yang ditulis keras di layar flowchart — jadi isu kritikal
 * dan isu rendah berdiri dengan biru yang sama, dan kartu HP-nya berdiri abu-
 * abu. Dua permukaan, dua rona, nol hubungan dengan prioritas.
 *
 * Kenapa tidak menulis chip sendiri di flowchart: `warnaLabel.ts` + `.label-chip`
 * adalah SATU-SATUNYA sumber rona label di repo ini (#590), dan aturan itu
 * dilanggar persis dengan cara "nanggung, tulis lokal saja" (`KanbanCard.tsx`,
 * `FlowchartNode.tsx`). Jadi primitifnya yang diperluas, bukan pemanggilnya yang
 * cabut.
 *
 * Yang dikunci di bawah: `isi` mengganti APA YANG DIBACA dan tidak boleh
 * menyentuh APA YANG MENENTUKAN WARNA.
 */
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { LabelChip } from "./CommonComponents";
import type { MasterData } from "../../types";

const MASTER = [
  { id: "m1", type: "priority", code: "high", label: "High", color: "#EF4444" },
  { id: "m2", type: "priority", code: "low", label: "Low", color: "#10B981" },
] as unknown as MasterData[];

const lbr = (el: Element | null) => (el as HTMLElement).style.getPropertyValue("--lbr");
const elemen = (x: { container: HTMLElement }) => x.container.firstChild as Element | null;

describe("LabelChip dengan isi sendiri (#798)", () => {
  const chip = (isi: React.ReactNode, lebih: Record<string, unknown> = {}) =>
    render(<LabelChip kelompok="priority" masterData={MASTER} isi={isi} {...(lebih as object)} />)
      .container.firstChild as Element | null;

  it("warnanya tetap milik baris MasterData yang mewarnai, bukan milik teksnya", () => {
    const el = chip("Report Settlement", { nilai: "high" });
    expect(el?.getAttribute("class")).toContain("label-chip");
    expect(lbr(el)).toBe("#EF4444");
  });

  it("dua judul yang sama bisa berona beda karena nilainya beda", () => {
    expect(lbr(chip("Report Settlement", { nilai: "high" }))).toBe("#EF4444");
    expect(lbr(chip("Report Settlement", { nilai: "low" }))).toBe("#10B981");
  });

  it("teksnya yang dibacakan, bukan label prioritasnya", () => {
    const el = chip("Report Settlement", { nilai: "high" });
    expect(el?.textContent).toBe("Report Settlement");
    expect(el?.textContent).not.toContain("High");
  });

  it("nilai kosong tidak menghapus chip: yang hilang hanya warnanya", () => {
    // Guard `kosong` dulu menelan chip apa pun yang labelnya kosong. Dengan
    // `isi`, yang kosong itu BUKAN teksnya — jadi chip harus tetap ada dan
    // jatuh ke rona netral `warnaLabel`, bukan lenyap diam-diam.
    const el = chip("Report Settlement", { nilai: null });
    expect(el).toBeTruthy();
    expect(el?.textContent).toBe("Report Settlement");
    expect(lbr(el)).toBe("#64748B");
  });

  it("judul panjang tidak di-UPPERCASE-kan: bentuknya CHIP_DASAR, bukan CHIP_KECIL", () => {
    const denganIsi = chip("Report Settlement", { nilai: "high" });
    const tanpaIsi = render(<LabelChip kelompok="priority" masterData={MASTER} nilai="high" />)
      .container.firstChild as Element | null;
    expect(denganIsi?.getAttribute("class")).not.toContain("uppercase");
    expect(tanpaIsi?.getAttribute("class")).toContain("uppercase");
  });
});

describe("kontrak lama LabelChip tidak bergeser (#782/#590)", () => {
  it("tanpa `isi`, label MasterData tetap yang tampil dan ritme chip tetap CHIP_KECIL", () => {
    const el = render(<LabelChip kelompok="priority" masterData={MASTER} nilai="low" />).container
      .firstChild as Element | null;
    expect(el?.textContent).toBe("Low");
    expect(lbr(el)).toBe("#10B981");
  });
});

describe("rona linked issue tidak lagi ditulis di layar flowchart (#798)", () => {
  const baca = (relatif: string) =>
    readFileSync(join(__dirname, "../../features/flowchart", relatif), "utf8");

  /**
   * Dipersempit ke wilayah chip, BUKAN seluruh berkas. `FlowchartDashboard` dan
   * `FlowchartMobileCardView` masih punya `bg-primary/10` yang sah di tempat
   * lain (lingkaran ikon keadaan kosong), dan melarang seisi berkas akan
   * memaksa guard ini berbohong tentang apa yang sebenarnya ia jaga.
   */
  const wilayahChip = (isi: string, penanda: string) => {
    const panggilan = isi.indexOf(penanda);
    expect(panggilan).toBeGreaterThanOrEqual(0);
    const mulai = isi.lastIndexOf("<button", panggilan);
    const akhir = isi.indexOf("</button>", panggilan);
    return isi.slice(mulai, akhir);
  };

  const PERMUKAAN: [string, string, string, string][] = [
    ["tabel", "components/FlowchartDashboard.tsx", "bukaRincianIsu(linkedIsu)", "linkedIsu"],
    ["kartu HP", "components/FlowchartMobileCardView.tsx", "bukaRincianIsu(isu)", "isu"],
    // Permukaan KEEMPAT, ditemukan lewat penyapuan `epicTaskId` — kepala layar
    // editor. Ia tidak ada di tangkapan layar mana pun hari itu.
    ["kepala editor", "FlowchartContainer.tsx", "bukaRincianIsu(linkedIsu)", "linkedIsu"],
  ];

  for (const [nama, berkas, penanda, variabel] of PERMUKAAN) {
    it(`${nama}: warna keras milik layar dibuang, rona diambil dari MasterData priority`, () => {
      const isi = baca(berkas);
      const chip = wilayahChip(isi, penanda);
      expect(chip).toContain("<LabelChip");
      expect(chip).toContain('kelompok="priority"');
      expect(chip).toContain(`nilai={${variabel}.priority}`);
      expect(chip).not.toMatch(/bg-primary\/10|border-primary\/30|bg-surface-sunken/);
      // Titik gelap tema: `.label-chip` menurunkan teksnya lewat color-mix,
      // jadi satu `dark:` pun di sini adalah pelanggaran gerbang §22.
      expect(isi).not.toMatch(/\bdark:/);
    });
  }

  it("kepala editor ikut menjadi pintu, bukan hanya dua permukaan daftar", () => {
    const isi = baca("FlowchartContainer.tsx");
    const chip = wilayahChip(isi, "bukaRincianIsu(linkedIsu)");
    expect(chip).toContain('type="button"');
    // `truncate` pada judul isu adalah persis yang dilarang #647, dan chip
    // kepala editor ini membawanya sebelum #798.
    expect(chip).not.toContain("truncate");
  });
});
