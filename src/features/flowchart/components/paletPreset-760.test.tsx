/**
 * @jest-environment jsdom
 *
 * #760 — preset palet menurut maksud (flow sistem / flow bisnis / flow UI).
 *
 * Permintaan pemilik proyek: "flow sistem, flow bisnis, flow ui dan design".
 * Isinya sudah ada di palet — 16 grup — tapi grup itu dinamai menurut SUMBER
 * stensil draw.io, bukan menurut apa yang sedang orang coba gambar. Yang kurang
 * penyaringnya, bukan bentuknya.
 *
 * DUA hal yang diuji, dan yang kedua lebih penting dari yang pertama:
 *
 *  1. Preset benar-benar MASUK ke DOM: grup yang tidak dimaksud hilang dari
 *     daftar, bukan hanya terlihat redup.
 *  2. Peta kurasi di `presetPalet.ts` menyebut judul grup yang Sungguh Ada.
 *     Tabel itu ditulis tangan oleh saya, dan `constants.ts` boleh diganti
 *     namanya kapan pun. Tanpa penjaga ini, satu perubahan nama grup membuat
 *     sebuah preset diam-diam kehilangan separuh isinya dan tidak ada satu pun
 *     perkakas yang melihatnya — persis kelas kegagalan #752, hanya di sisi data
 *     yang lebih kecil.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DIAGRAM_SHAPE_GROUPS } from "../constants";
import { PRESET_PALET, URUT_PRESET, grupBoleh } from "../lib/presetPalet";
import { ShapePalette } from "./ShapePalette";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const props = {
  isShapeDropdownOpen: true,
  setIsShapeDropdownOpen: jest.fn(),
  selectedAddColor: "indigo",
  setSelectedAddColor: jest.fn(),
  shapeSearchQuery: "",
  setShapeSearchQuery: jest.fn(),
  expandedGroups: Object.fromEntries(DIAGRAM_SHAPE_GROUPS.map((g) => [g.title, true])),
  toggleGroupExpanded: jest.fn(),
  handleAddNewNode: jest.fn(),
};

const renderPalet = () => render(<ShapePalette {...props} />);

/** Judul grup yang benar-benar ter/render di panel. */
const judulTampil = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll("[data-testid='judul-grup-palet']")).map(
    (el) => el.textContent || ""
  );

describe("#760 preset palet", () => {
  it("semua nama grup di peta kurasi benar-benar ada di palet", () => {
    const sah = new Set(DIAGRAM_SHAPE_GROUPS.map((g) => g.title));
    const palsu = Object.entries(PRESET_PALET).flatMap(([preset, daftar]) =>
      daftar.filter((judul) => !sah.has(judul)).map((judul) => `${preset}: ${judul}`)
    );
    // Penjaga utama. Mengubah nama sebuah grup di constants.ts tanpa mengubah
    // presetPalet.ts membuat test ini merah, bukan membuat presetnya bolong.
    expect(palsu).toEqual([]);
  });

  it("tiap preset menyisakan bentuk yang bisa dipakai", () => {
    for (const p of URUT_PRESET) {
      const jumlah = DIAGRAM_SHAPE_GROUPS.filter((g) => grupBoleh(p, g.title)).reduce(
        (s, g) => s + g.items.length,
        0
      );
      expect(jumlah).toBeGreaterThan(20);
    }
  });

  it("`semua` menampilkan seluruh grup, preset membatasinya", () => {
    const { container } = renderPalet();

    expect(judulTampil(container).length).toBe(DIAGRAM_SHAPE_GROUPS.length);

    fireEvent.click(screen.getByTestId("tombol-preset-bisnis"));
    const bisnis = judulTampil(container);
    expect(bisnis).toContain("BPMN Diagram");
    expect(bisnis).not.toContain("Electrical & P&ID");
    expect(bisnis).not.toContain("AWS Active Cloud");

    fireEvent.click(screen.getByTestId("tombol-preset-ui"));
    const ui = judulTampil(container);
    expect(ui).toContain("Wireframe");
    expect(ui).not.toContain("BPMN Diagram");

    fireEvent.click(screen.getByTestId("tombol-preset-sistem"));
    const sistem = judulTampil(container);
    expect(sistem).toContain("Entity Relationship");
    expect(sistem).not.toContain("Wireframe");

    fireEvent.click(screen.getByTestId("tombol-preset-semua"));
    expect(judulTampil(container).length).toBe(DIAGRAM_SHAPE_GROUPS.length);
  });

  it("preset tidak menghapus grup apa pun secara permanen", () => {
    // Papan yang butuh `Electrical & P&ID` tidak boleh kehilangan aksesnya
    // karena palet kini punya tab. `semua` harus tetap 16 grup.
    const { container } = renderPalet();
    expect(DIAGRAM_SHAPE_GROUPS.length).toBe(16);
    expect(judulTampil(container)).toHaveLength(16);
  });
});
