/**
 * #771 — perilaku primitif nama berkas: SATU baris, elipsis di TENGAH, nama
 * penuh selalu bisa dibaca.
 *
 * Test ini ada karena gerbang warna/label TIDAK melihat pemotongan ini: pola R2
 * `audit:label` hanya mengenali `truncate` yang berpasangan `max-w-[NNpx]` pada
 * baris yang sama, sementara `NamaBerkas` memakai `max-w-full`. Jadi kalau tidak
 * ada yang menguji perilakunya, "tidak ada gerbang yang komplain" akan dibaca
 * sebagai "tidak ada pemotongan" — dan itu salah.
 */
import React from "react";
import { render } from "@testing-library/react";
import NamaBerkas, { bagiNamaBerkas } from "./NamaBerkas";

describe("pemisah pangkal/ekstensi (#771)", () => {
  it("memotong di titik TERAKHIR saat ekornya seperti ekstensi", () => {
    expect(bagiNamaBerkas("Quick_Alignment_12_Oktober_2026.xlsx")).toEqual({
      pangkal: "Quick_Alignment_12_Oktober_2026",
      ekstensi: ".xlsx",
    });
  });

  it("ekstensi panjang (docx/pptx/xlsx) ikut, dan arsip bertitik ganda tetap aman", () => {
    expect(bagiNamaBerkas("laporan-final.docx").ekstensi).toBe(".docx");
    expect(bagiNamaBerkas("bangkel.tar.gz")).toEqual({ pangkal: "bangkel.tar", ekstensi: ".gz" });
  });

  it("TIDAK memotong pada titik yang bukan ekstensi", () => {
    // "v1.2.3 rilis" — ekor "3 rilis" ber spasi; "Catatan. " — ekor kosong/spasi.
    expect(bagiNamaBerkas("Rapat v1.2.3").ekstensi).toBe("");
    expect(bagiNamaBerkas("Catatan.").ekstensi).toBe("");
    expect(bagiNamaBerkas(".gitignore")).toEqual({ pangkal: ".gitignore", ekstensi: "" });
    expect(bagiNamaBerkas("Tanpa ekstensi panjang sekali").ekstensi).toBe("");
  });
});

describe("render nama berkas (#771)", () => {
  it("nama penuh selalu ada di title — potongan tidak pernah menghilangkan data", () => {
    const nama = "Quick_Alignment_12_Oktober_2026.xlsx";
    const { container } = render(<NamaBerkas nama={nama} />);
    const pembungkus = container.firstElementChild as HTMLElement;
    expect(pembungkus.getAttribute("title")).toBe(nama);
  });

  it("ekstensi tidak ikut terpotong: ia anak yang tidak menyusut", () => {
    const { container } = render(<NamaBerkas nama="Laporan-Q4-2026-final.xlsx" />);
    const anak = Array.from(container.querySelectorAll("span"));
    const pangkal = anak.find((s) => (s.getAttribute("class") || "").includes("truncate"));
    const ekstensi = anak.find((s) => (s.getAttribute("class") || "").includes("shrink-0"));
    expect(pangkal?.textContent).toBe("Laporan-Q4-2026-final");
    expect(ekstensi?.textContent).toBe(".xlsx");
  });

  it("satu baris: tidak ada yang memaksa lipatan, dan pemotongnya ada", () => {
    const { container } = render(<NamaBerkas nama="a-b-c.pdf" />);
    const pembungkus = container.firstElementChild as HTMLElement;
    expect(pembungkus.className).toContain("inline-flex");
    expect(pembungkus.className).toContain("min-w-0");
    expect(pembungkus.className).not.toContain("break-all");
    expect(pembungkus.className).not.toContain("whitespace-normal");
  });

  it("nama tanpa ekstensi tetap tampil utuh, tanpa anak kedua", () => {
    const { container } = render(<NamaBerkas nama="Notulen rapat mingguan" />);
    const pembungkus = container.firstElementChild as HTMLElement;
    expect(pembungkus.children).toHaveLength(1);
    expect(pembungkus.textContent).toBe("Notulen rapat mingguan");
  });
});
