/**
 * #537 — penyaring chrome untuk ekspor JPG papan.
 *
 * Kegagalan di sini TIDAK terlihat oleh perkakas lain: filter yang menolak akar
 * yang dipotret menghasilkan JPG kosong, dan `npm test`, `vite build`, serta
 * kesepuluh gerbang audit semuanya tetap hijau. Satu-satunya cara mengetahui
 * adalah membuka berkasnya — yang tidak bisa dilakukan mesin kerja ini karena
 * `DATABASE_URL` berisi placeholder. Karena itu penyaringnya diuji di sini
 * terhadap DOM tiruan, termasuk dua sifat yang paling mudah rusak.
 *
 * Berekstensi .tsx supaya masuk proyek Jest "jsdom": `HTMLElement` dan
 * `document` tidak ada di lingkungan node.
 */
import { abaikanChromeEkspor, PENANDA_ABAI_EKSPOR } from "./abaikanEkspor";

describe("#537 abaikanChromeEkspor", () => {
  it("akar yang dipotret lolos, supaya ekspor tidak pernah kosong", () => {
    const akar = document.createElement("div");
    const bentuk = document.createElement("div");
    bentuk.textContent = "Mulai";
    akar.appendChild(bentuk);

    // Ini argumen yang diserahkan `toJpeg(canvasContainerRef.current, …)`.
    expect(abaikanChromeEkspor(akar)).toBe(true);
    expect(abaikanChromeEkspor(bentuk)).toBe(true);
  });

  it("simpul berpenanda ditolak, dan penanda itu yang dipakai komponennya", () => {
    const bilah = document.createElement("div");
    bilah.setAttribute(PENANDA_ABAI_EKSPOR, "");

    expect(PENANDA_ABAI_EKSPOR).toBe("data-abai-ekspor");
    expect(abaikanChromeEkspor(bilah)).toBe(false);
  });

  it("nilai atributnya tidak penting — keberadaannya yang menentukan", () => {
    const bilah = document.createElement("div");
    bilah.setAttribute(PENANDA_ABAI_EKSPOR, "true");

    expect(abaikanChromeEkspor(bilah)).toBe(false);
  });

  it("elemen SVG lolos, karena garis dan kepala panah papan digambar sebagai SVG", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const jalur = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(jalur);

    expect(abaikanChromeEkspor(svg)).toBe(true);
    expect(abaikanChromeEkspor(jalur)).toBe(true);
  });

  it("simpul non-HTML lain lolos, bukan ditolak diam-diam", () => {
    const teks = document.createTextNode("label bentuk");

    expect(abaikanChromeEkspor(teks)).toBe(true);
    expect(abaikanChromeEkspor(null)).toBe(true);
    expect(abaikanChromeEkspor(undefined)).toBe(true);
    expect(abaikanChromeEkspor({ nodeName: "DIV" })).toBe(true);
  });

  it("pada pohon nyata: bentuk dan garis tersisa, hanya bilah yang hilang", () => {
    const kanvas = document.createElement("div");
    const bentuk = document.createElement("div");
    bentuk.textContent = "Selesai";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const bilah = document.createElement("div");
    bilah.setAttribute(PENANDA_ABAI_EKSPOR, "");
    const tombol = document.createElement("button");
    bilah.appendChild(tombol);
    kanvas.append(bentuk, svg, bilah);

    const lolos = [...kanvas.children].filter((c) => abaikanChromeEkspor(c));

    expect(lolos).toEqual([bentuk, svg]);
    expect(lolos).not.toContain(bilah);
    // html-to-image membuang seluruh subtree simpul yang ditolak, jadi tombol di
    // dalam bilah ikut hilang tanpa perlu ditandai satu per satu.
    expect(abaikanChromeEkspor(tombol)).toBe(true);
  });
});
