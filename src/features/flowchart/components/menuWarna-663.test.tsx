/**
 * @jest-environment jsdom
 *
 * #663 — petak warna menu konteks bentuk membaca palet yang sama dengan
 * bentuknya, bukan daftar salinan sendiri.
 *
 * Yang diukur sebelum ditambal: `NodeContextMenu.tsx` menyimpan 11 entri
 * `bg-*-500` sementara `colorPaletteHex` hasil #638 punya 12, jadi `amber`
 * tidak bisa dipilih dari menu sama sekali, dan sebelas petak yang tampil
 * warnanya TIDAK sama dengan warna bentuk yang akan dihasilkan — menu
 * menjanjikan biru tua pekat dan bentuknya lahir pastel. Keduanya gejala dari
 * satu sebab: dua sumber kebenaran untuk satu data.
 *
 * RENDER, bukan baca sumber: yang diklaim di sini adalah warna yang benar-benar
 * terpasang di DOM dan nama yang benar-benar dikirim ke `onChangeColor`.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { colorPaletteHex } from "../constants";
import { NodeContextMenu } from "./NodeContextMenu";

const NAMA = Object.keys(colorPaletteHex);

const pasang = (lebih: Partial<React.ComponentProps<typeof NodeContextMenu>> = {}) => {
  const onChangeColor = jest.fn();
  const view = render(
    <NodeContextMenu
      x={10}
      y={10}
      nodeId="n1"
      nodeColor="blue"
      onClose={() => {}}
      onDelete={() => {}}
      onEditProperties={() => {}}
      onChangeColor={onChangeColor}
      onDuplicate={() => {}}
      onCopy={() => {}}
      onZOrder={() => {}}
      {...lebih}
    />
  );
  return { ...view, onChangeColor };
};

/** Petak warna = tombol yang isian latarnya dipasang inline dari palet. */
const petak = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button")).filter(
    (b) => b.style.backgroundColor !== ""
  );

const hexKeRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const petakWarna = (container: HTMLElement, nama: string) =>
  petak(container).find((b) => b.style.backgroundColor === hexKeRgb(colorPaletteHex[nama].bg));

describe("#663 — satu palet untuk menu dan bentuk", () => {
  it("setiap warna palet punya petak, termasuk amber yang dulu hilang", () => {
    const { container } = pasang();
    const tampil = petak(container)
      .map((b) => b.style.backgroundColor)
      .sort();
    expect(tampil).toEqual(NAMA.map((n) => hexKeRgb(colorPaletteHex[n].bg)).sort());
    expect(petakWarna(container, "amber")).toBeDefined();
  });

  it("warna petak persis hex bentuknya, bukan kelas Tailwind perkiraan", () => {
    const { container } = pasang();
    for (const nama of NAMA) {
      const el = petakWarna(container, nama)!;
      expect(el.style.borderColor).toBe(hexKeRgb(colorPaletteHex[nama].stroke));
    }
  });

  it("klik petak mengirim NAMA warna yang dikenal palet", () => {
    const { container, onChangeColor } = pasang();
    fireEvent.click(petakWarna(container, "amber")!);
    expect(onChangeColor).toHaveBeenCalledWith("n1", "amber");
  });

  it("menu tidak lagi menyimpan daftar warnanya sendiri", () => {
    const sumber = require("fs").readFileSync(__dirname + "/NodeContextMenu.tsx", "utf8");
    expect(sumber).toContain("Object.keys(colorPaletteHex)");
    expect(sumber).not.toContain("bg-indigo-500");
    expect(sumber).not.toMatch(/bg-(blue|sky|emerald|amber|orange|pink|rose|violet|purple)-\d/);
  });
});
