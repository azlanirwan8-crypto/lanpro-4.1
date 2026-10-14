/**
 * @jest-environment jsdom
 *
 * #535 — target sentuh bilah kanvas seragam 44 px.
 *
 * Yang diukur 25 Sep dan diukur ulang 14 Okt: dari sembilan tombol di bilah
 * ini hanya snap kisi dan tiga tombol pola (#613) yang memakai `min-h-11`; lima
 * sisanya 26–32 px lewat `p-1.5` / `py-1.5` / `p-2`. Klaim #372 ("target
 * sentuh sudah 44 px") tidak mencakup bilah ini, jadi tidak ada yang menahan
 * tombol berikutnya agar tidak melenceng lagi — persis yang terjadi.
 *
 * RENDER, bukan baca sumber: yang diklaim adalah tombol yang benar-benar ada di
 * DOM, bukan string kelas yang mungkin tidak terpasang. Test ini juga menghitung
 * tombolnya, jadi tombol baru tanpa `min-h-11` membuat test merah dengan
 * menyebut tombol mana yang kurang.
 */
import React from "react";
import { render } from "@testing-library/react";
import { CanvasToolbar } from "./CanvasToolbar";

const pasang = () =>
  render(
    <CanvasToolbar
      isSnapToGrid={false}
      setIsSnapToGrid={() => {}}
      polaPapan="titik"
      setPolaPapan={() => {}}
      handleExportJPG={() => {}}
      handleExportJSON={() => {}}
      handleExportDrawIo={() => {}}
      isRightSidebarOpen={false}
      setIsRightSidebarOpen={() => {}}
      isFullscreen={false}
      onToggleFullscreen={() => {}}
    />
  );

describe("#535 — satu tinggi untuk semua kendali bilah kanvas", () => {
  it("sembilan tombolnya terhitung, jadi yang baru tidak bisa menyelinap", () => {
    const { container } = pasang();
    expect(container.querySelectorAll("button")).toHaveLength(9);
  });

  it("setiap tombol memakai min-h-11 (44 px)", () => {
    const { container } = pasang();
    const kurang = Array.from(container.querySelectorAll("button"))
      .filter((b) => !/\bmin-h-11\b/.test(b.className))
      .map((b) => b.getAttribute("title") || b.getAttribute("aria-label") || b.className);
    expect(kurang).toEqual([]);
  });

  it("tombol yang hanya berisi ikon juga lebarnya 44 px, jadi tidak jadi persegi panjang sempit", () => {
    const { container } = pasang();
    const tanpaTeks = Array.from(container.querySelectorAll("button")).filter(
      (b) => (b.textContent || "").trim() === ""
    );
    expect(tanpaTeks.length).toBeGreaterThan(0);
    const kurang = tanpaTeks
      .filter((b) => !/\bmin-w-11\b/.test(b.className))
      .map((b) => b.getAttribute("title") || b.getAttribute("aria-label"));
    expect(kurang).toEqual([]);
  });
});
