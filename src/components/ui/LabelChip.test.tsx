/**
 * #590 — warna sebuah label adalah warna yang dipilih di Master Data.
 *
 * Pemilik proyek menemukan kolom KATEGORI berisi "TEST PLAN" dan "FLOWCHART"
 * dengan warna yang SAMA, padahal master data menyimpan `#F59E0B` dan
 * `#6366F1` untuk keduanya. Yang diuji di sini karena itu bukan "ada warna",
 * tapi "dua label berbeda mendapat dua warna berbeda, dan warna itu ikut kalau
 * master datanya diubah".
 */
import React from "react";
import { render } from "@testing-library/react";
import { LabelChip } from "./CommonComponents";
import { useAppStore } from "../../store/useAppStore";
import { WARNA_NETRAL } from "../../lib/warnaLabel";

const MASTER = [
  {
    id: "1",
    type: "jenis_dokumen",
    code: "test_plan",
    label: "Test Plan",
    color: "#F59E0B",
    icon: "ClipboardCheck",
  },
  {
    id: "2",
    type: "jenis_dokumen",
    code: "flowchart",
    label: "Flowchart",
    color: "#6366F1",
    icon: "Workflow",
  },
];

const pasangMaster = (rows: unknown[]) => useAppStore.setState({ masterData: rows as never });

const hex = (el: HTMLElement) => el.style.getPropertyValue("--lbr").toUpperCase();

beforeEach(() => pasangMaster(MASTER));

describe("LabelChip — satu label, satu warna dari master data (#590)", () => {
  const chip = (nilai: string, props: Record<string, unknown> = {}) => {
    const { container } = render(<LabelChip kelompok="jenis_dokumen" nilai={nilai} {...props} />);
    return container.querySelector("span") as HTMLElement;
  };

  it("dua kategori berbeda tidak lagi sewarna", () => {
    expect(hex(chip("Test Plan"))).toBe("#F59E0B");
    expect(hex(chip("Flowchart"))).toBe("#6366F1");
  });

  it("mengikuti master data, bukan hard-code: ubah warnanya, ikut chipnya", () => {
    pasangMaster([{ ...MASTER[1], color: "#123456" }]);
    expect(hex(chip("Flowchart"))).toBe("#123456");
  });

  it("menyimpan kode, bukan hanya label — nilai 'flowchart' dikenali barisnya", () => {
    // Kolom kategori bisa berisi code (`flowchart`) alih-alih label ("Flowchart").
    const el = chip("flowchart");
    expect(hex(el)).toBe("#6366F1");
    expect(el.textContent).toBe("Flowchart");
  });

  it("label yang tidak ada di master data jadi netral, bukan warna merek yang menyamar", () => {
    expect(hex(chip("Kategori Karangan Sendiri"))).toBe(WARNA_NETRAL);
  });

  it("nilai kosong berkata kosong", () => {
    const { container } = render(
      <LabelChip kelompok="jenis_dokumen" nilai="" kosong="Tanpa Kategori" />
    );
    expect(container.textContent).toBe("Tanpa Kategori");
    expect(container.querySelector(".label-chip")).toBeNull();
  });

  it("ikon ikut dari master data hanya saat diminta", () => {
    expect(chip("Flowchart").querySelector("svg")).toBeNull();
    expect(chip("Flowchart", { ikon: true }).querySelector("svg")).toBeTruthy();
  });
});
