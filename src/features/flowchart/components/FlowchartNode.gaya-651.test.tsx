/**
 * #651 — tebal huruf dan warna huruf benar-benar sampai ke DOM.
 *
 * Beratk biasa bentuk berubah pada #654: dari `font-medium` menjadi
 * `font-normal`, karena bawaan draw.io adalah berat normal. Test di bawah
 * mengunci keadaan TERBARU, bukan keadaan 08 Okt.
 *
 * MENGAPA DIUJI PADA RENDER, BUKAN PADA SUMBER. Yang dilaporkan pemilik proyek
 * adalah apa yang MATANYA lihat pada papan Miro-nya: semua hurufnya tebal, hasil
 * impor semuanya biasa. Test yang membaca string kelas bisa hijau sementara
 * `cn()` menghasilkan kelas yang berbeda — jadi yang diuji di sini adalah
 * elemen `<textarea>` sungguhan yang dipakai setiap bentuk di papan.
 *
 * DUA HAL YANG DIKUNCI DI SINI:
 * 1. gaya sumber tampil (tebal jadi `font-bold`, hex jadi warna inline);
 * 2. `fontColor` adalah nilai dari BERKAS YANG DIUNGGAH ORANG. Ia sudah
 *    disaring `warnaTeksAman()`, tapi penjaga itu dibuktikan di sini juga pada
 *    batas akhirnya: potongan CSS tidak boleh menemukan jalan ke `style`.
 */
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { render, fireEvent } from "@testing-library/react";
import { FlowchartNode } from "./FlowchartNode";
import type { FlowNode } from "../types";

const bentuk = (lebih: Partial<FlowNode> = {}): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Buka wondr merchant",
  color: "yellow",
  width: 150,
  height: 70,
  ...lebih,
});

const props = (node: FlowNode) =>
  ({
    node,
    isSelected: true,
    setSelectedNodeId: jest.fn(),
    setSelectedEdgeId: jest.fn(),
    isSourceOfConnect: false,
    adaSumberSambung: false,
    setConnectSourceId: jest.fn(),
    isHovered: false,
    setHoveredNodeId: jest.fn(),
    isDragging: false,
    isActiveSim: false,
    canvasTheme: "miro",
    isWorkspaceEditable: true,
    setActiveTool: jest.fn(),
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    setNodeContextMenu: jest.fn(),
    handleNodeMouseDown: jest.fn(),
    handleResizeMouseDown: jest.fn(),
    handleConnectPortClick: jest.fn(),
    handleUpdateActiveNode: jest.fn(),
    handleUpdateNode: jest.fn(),
    handleDuplicateNode: jest.fn(),
    handleDeleteSelected: jest.fn(),
    getLinkedTaskDetails: () => undefined,
    setSelectedTaskForDetail: jest.fn(),
    setIsTaskDetailModalOpen: jest.fn(),
  }) as any;

const textarea = (html: HTMLElement) => html.querySelector("textarea") as HTMLTextAreaElement;

describe("tebal dan warna huruf pada bentuk (#651)", () => {
  it("bentuk biasa memakai font-normal, bukan font-bold", () => {
    const { container } = render(<FlowchartNode {...props(bentuk())} />);
    const kelas = textarea(container).className;
    expect(kelas).toContain("font-normal");
    expect(kelas).not.toContain("font-bold");
  });

  it("fontWeight 'bold' dari impor menjadi font-bold di elemen sungguhan", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ fontWeight: "bold" }))} />);
    expect(textarea(container).className).toContain("font-bold");
  });

  it("hex dari berkas impor menjadi warna inline", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ fontColor: "#b85450" }))} />);
    expect(textarea(container).style.color).toBe("rgb(184, 84, 80)");
  });

  it("potongan CSS di fontColor TIDAK menemukan jalan ke style", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ fontColor: "#ffffff; position:fixed; top:0; left:0" }))} />
    );
    const el = textarea(container);
    expect(el.style.color).toBe("");
    expect(el.getAttribute("style")).not.toContain("position");
    expect(el.getAttribute("style")).not.toContain("fixed");
  });

  it("skrip dan nama warna yang bukan hex ditolak juga", () => {
    for (const jahat of ["javascript:alert(1)", "red", "url(#x)", "#12345", "#gggggg"]) {
      const { container, unmount } = render(
        <FlowchartNode {...props(bentuk({ fontColor: jahat }))} />
      );
      expect(textarea(container).style.color).toBe("");
      unmount();
    }
  });

  it("tombol Tebal di overlay menulis fontWeight pada bentuknya sendiri", () => {
    const p = props(bentuk());
    const { getByTitle } = render(<FlowchartNode {...p} />);
    fireEvent.click(getByTitle("Tebal"));
    expect(p.handleUpdateActiveNode).toHaveBeenCalledWith({ fontWeight: "bold" });
  });
});

/**
 * #652 — sisa jalan buntu yang benar-benar ada, dan yang ternyata tidak.
 *
 * Catatan lama saya di papan (#650) mengklaim bentuk SVG tidak menampilkan garis
 * putus-putus. Salah: `basicShapes` menyebar `elementProps` — yang sudah berisi
 * `strokeDasharray` dari `shapes.tsx:132` — ke oval, circle, dan diamond. Dua
 * test di bawah mengunci fakta itu pada DOM, lewat `<svg>` bentuknya SENDIRI,
 * bukan sembarang elemen: versi pertama test ini mencari `.border-dashed` di
 * seluruh container dan LULUS tanpa perbaikan apa pun, karena yang ketemu
 * ternyata ikon overlay (`lucide-square … border-dashed`). Kelas bentuknya
 * diuji terpisah di `nodeTheme.test.ts`, tempat string itu memang disusun.
 */
describe("garis putus-putus mencapai bentuk SVG (#652, koreksi catatan #650)", () => {
  /**
   * `<svg>` pertama di container adalah IKON overlay, jadi pencarian harus
   * menunjuk svg bentuknya sendiri — yang dipasang `absolute inset-0` oleh
   * `svgProps` di `shapes.tsx:122`. Versi pertama test ini memakai
   * `querySelector("svg")` dan gagal justru karena itu.
   */
  const svgBentuk = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("svg")).find((s) =>
      (s.getAttribute("class") || "").includes("inset-0")
    );

  it("oval: pola garis dipasang pada elemen yang digambar", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ type: "oval", borderStyle: "dashed" }))} />
    );
    const gambar = svgBentuk(container)!.querySelector("[stroke-dasharray]");
    expect(gambar?.getAttribute("stroke-dasharray")).toBe("5,5");
  });

  it("diamond: sama, lewat polygon", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ type: "diamond", borderStyle: "dashed" }))} />
    );
    const gambar = svgBentuk(container)!.querySelector("[stroke-dasharray]");
    expect(gambar?.tagName.toLowerCase()).toBe("polygon");
    expect(gambar?.getAttribute("stroke-dasharray")).toBe("5,5");
  });

  it("oval tanpa borderStyle tidak membawa pola garis", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ type: "oval" }))} />);
    expect(svgBentuk(container)!.querySelector("[stroke-dasharray]")).toBeNull();
  });
});

/**
 * #654 — tipografi papan mengikuti bawaan draw.io: Helvetica, 12 px, berat
 * normal, dan SATU ukuran untuk semua bentuk (catatan tempel panjang tidak lagi
 * dikecilkan ke 9 px).
 *
 * DIUJI DUA BAGIAN, dan bagiannya tidak boleh dicampur. Bagian perilaku memakai
 * `<textarea>` sungguhan. Bagian sumber membaca dua berkas: jsdom TIDAK MEMUAT
 * `src/index.css`, jadi kaskade `!important` - yaitu hal yang membuat tombol
 * serif/mono akhirnya benar-benar bekerja - TIDAK bisa dibuktikan dari sini. Yang
 * dibuktikan hanyalah bahwa aturan penjaganya masih berdiri di kedua berkas;
 * sisanya ditulis apa adanya sebagai belum terverifikasi di tab bersih.
 */
describe("tipografi bawaan draw.io (#654)", () => {
  const label = (lebih: Partial<FlowNode> = {}) => {
    const { container } = render(<FlowchartNode {...props(bentuk(lebih))} />);
    return textarea(container);
  };

  it("satu ukuran untuk semua bentuk: 12 px, termasuk catatan tempel panjang", () => {
    expect(label().style.fontSize).toBe("12px");
    expect(label({ type: "sticky" }).style.fontSize).toBe("12px");
    expect(label({ type: "sticky", label: "A".repeat(140) }).style.fontSize).toBe("12px");
  });

  it("ukuran dari berkas sumber tetap menang atas bawaan", () => {
    expect(label({ fontSize: 18 }).style.fontSize).toBe("18px");
  });

  it("tepat satu keluarga huruf terpasang, dan ketiganya bisa ditukar", () => {
    expect(label().className).toContain("huruf-sans");
    expect(label({ fontStyle: "serif" }).className).toContain("huruf-serif");
    expect(label({ fontStyle: "mono" }).className).toContain("huruf-mono");
    expect(label({ fontStyle: "mono" }).className).not.toContain("huruf-sans");
    expect(label({ fontStyle: "mono" }).className).not.toContain("huruf-serif");
  });

  it("letter-spacing rapat khas papan lain tidak dipakai lagi", () => {
    expect(label().className).not.toContain("tracking-tight");
  });

  it("ketiga keluarga huruf ditulis dengan !important di blok gaya papan", () => {
    const sumber = readFileSync(join(__dirname, "..", "FlowchartContainer.tsx"), "utf8");
    for (const kelas of ["huruf-sans", "huruf-serif", "huruf-mono"]) {
      const pola = new RegExp("\\." + kelas + "\\s*\\{[^}]*font-family:[^;]*!important", "");
      expect(pola.test(sumber)).toBe(true);
    }
    // Kelas lama dihapus, bukan ditinggal setengah.
    expect(sumber).not.toContain("sticky-handwriting");
  });

  it("index.css masih mengunci textarea - itu sebabnya kelas papan butuh !important", () => {
    const css = readFileSync(join(__dirname, "..", "..", "..", "index.css"), "utf8");
    expect(/textarea[\s\S]{0,400}font-family:[\s\S]{0,400}!important/.test(css)).toBe(true);
  });
});
