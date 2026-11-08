/**
 * #817 — skala huruf dasar tidak boleh menyusut diam-diam oleh akar 13 px.
 *
 * Pemilik proyek, 08 Nov: "font nya seperti tidak belum sama ? cek laig ukuran
 * font dan jenis nya". Jenis hurufnya sudah sama (Inter dipaksa `!important`),
 * yang berbeda skalanya: `th` tertulis `0.625rem` dan `td` `0.75rem`, sementara
 * `html { font-size: 81.25% }` membuat keduanya terhitung 8,125 px dan 9,75 px —
 * bukan 10 px dan 12 px seperti niat komentar. Penjaga ini mengunci dua hal yang
 * membuat perbaikannya tidak bisa diam-diam kembali: ukuran dasar ditulis px
 * absolut, dan satu-satunya pengecualian (status/prioritas 10 px kapital) tetap
 * satu ukuran per elemen.
 */
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { StyledDropdown } from "./CommonComponents";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (p: string) => readFileSync(join(AKAR, p), "utf8").replace(/\r\n/g, "\n");

const blok = (css: string, selektor: string) => {
  const m = new RegExp(`\\n\\s*${selektor} \\{([\\s\\S]*?)\\}`).exec(css);
  expect(m).not.toBeNull();
  return m![1];
};

const kelasUkuran = (konstanta: string) =>
  konstanta.split(/\s+/).filter((k) => /(?:^|[a-z0-9_-]+:)text-(?:xs|sm|base|lg|xl|\[)/.test(k));

describe("skala huruf dasar (#817)", () => {
  it("th 11 px dan td 12 px absolut — bukan rem yang menyusut oleh akar 13 px", () => {
    const css = baca("src/index.css");
    // #824 — th naik 10px → 11px agar satu ritme dengan label tabel.
    expect(blok(css, "th")).toMatch(/font-size:\s*11px;/);
    expect(blok(css, "th")).not.toMatch(/font-size:\s*[\d.]+rem/);
    expect(blok(css, "td")).toMatch(/font-size:\s*12px;/);
    expect(blok(css, "td")).not.toMatch(/font-size:\s*[\d.]+rem/);
    // Akar tata letak tidak ikut diubah demi mengejar skala huruf.
    expect(css).toMatch(/font-size:\s*81\.25%/);
  });

  it("pemicu non-status 12 px; status/prioritas tetap 10 px kapital", () => {
    const anggota = render(
      <StyledDropdown
        value="u1"
        onChange={() => {}}
        options={[{ id: "u1", label: "Mohamad Rifky" }]}
        type="member"
        members={[{ uid: "u1", displayName: "Mohamad Rifky" }] as any}
      />
    ).container.querySelector("button")!;
    expect(anggota.className).toContain("text-[12px]");
    expect(anggota.className).not.toMatch(/\btext-xs\b/);

    const status = render(
      <StyledDropdown
        value="todo"
        onChange={() => {}}
        options={[{ id: "todo", label: "To Do" }]}
        type="status"
        masterData={[] as any}
      />
    ).container.querySelector("button")!;
    expect(status.className).toContain("text-[10px]");
    expect(status.className).toContain("uppercase");
    expect(status.className).not.toContain("text-[12px]");
  });

  it("isi panel 12 px: kotak cari, opsi, dan dua keadaan kosong", () => {
    const sumber = baca("src/components/ui/CommonComponents.tsx").replace(/\s+/g, " ");
    expect(sumber).toContain(
      "bg-surface text-[12px] font-normal text-content-body placeholder:text-content-subtle"
    );
    expect(sumber).toContain(
      '<span className="text-[12px] font-normal whitespace-nowrap text-content-body tracking-tight">'
    );
    expect(
      sumber.match(/p-4 text-center text-\[12px\] text-content-subtle italic font-normal/g)
    ).toHaveLength(2);
  });

  it("tiap kulit kontrol membawa tepat satu ukuran teks", () => {
    const sumber = baca("src/components/ui/CommonComponents.tsx");
    const ambil = (nama: string) => {
      const m = new RegExp(`const ${nama} =\\s*"([^"]+)"`).exec(sumber);
      expect(m).not.toBeNull();
      return m![1];
    };
    expect(kelasUkuran(ambil("KONTROL_NETRAL"))).toEqual(["text-[12px]"]);
    expect(kelasUkuran(ambil("KONTROL_BENING"))).toEqual(["text-[12px]"]);
    expect(kelasUkuran(ambil("KONTROL_KECIL"))).toEqual(["text-[10px]"]);
    expect(kelasUkuran(ambil("KONTROL_KECIL_BENING"))).toEqual(["text-[10px]"]);
  });
});
