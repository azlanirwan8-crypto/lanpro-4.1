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
    expect(gambar?.getAttribute("stroke-dasharray")).toBe("3,3");
  });

  it("diamond: sama, lewat polygon", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ type: "diamond", borderStyle: "dashed" }))} />
    );
    const gambar = svgBentuk(container)!.querySelector("[stroke-dasharray]");
    expect(gambar?.tagName.toLowerCase()).toBe("polygon");
    expect(gambar?.getAttribute("stroke-dasharray")).toBe("3,3");
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
 * `src/index.css` dan juga TIDAK MENGURAI `@layer`, jadi kaskade aslinya tidak
 * bisa dibuktikan dari test mana pun di berkas ini. Yang terbukti di sini hanya
 * BENTUK EMITAN - keluarga huruf harus berdiri di dalam `@layer base`, sebab
 * `!important` saja kalah oleh kunci berlapis (#671, diukur di Chrome). Angka
 * keluarga huruf yang sebenarnya datang dari probe peramban atas CSS build,
 * tercatat di baris #671 papan, bukan dari test ini.
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

  it("ketiga keluarga huruf berada di dalam @layer base, bukan sekadar !important (#654/#671)", () => {
    const sumber = readFileSync(join(__dirname, "..", "FlowchartContainer.tsx"), "utf8");
    // `!important` SAJA tidak cukup, dan itu bukan teori. Diukur di Chrome atas CSS
    // hasil build: kelas tanpa-layer yang memakai !important tetap kalah oleh kunci
    // textarea, karena kunci itu tinggal di dalam @layer base dan urutan layer
    // dibalik untuk deklarasi !important. Jadi yang dikunci di sini adalah
    // KEANGGOTAAN LAYER, bukan penanda !important.
    const lapisan = /@layer base\s*\{([\s\S]*?)\n\s*\}\s*\n\s*\.custom-scrollbar/.exec(sumber);
    expect(lapisan).not.toBeNull();
    const isi = lapisan ? lapisan[1] : "";
    for (const kelas of ["huruf-sans", "huruf-serif", "huruf-mono"]) {
      const pola = new RegExp("\\." + kelas + "\\s*\\{[^}]*font-family:[^;]*!important", "");
      expect(pola.test(isi)).toBe(true);
    }
    // Di LUAR lapisan tidak boleh ada salinan kelas mana pun - aturan yang berdiri
    // sendiri itulah yang kalah, dan meninggalkannya berarti meninggalkan dua
    // sumber kebenaran untuk satu kelas.
    const sisa = sumber.replace(lapisan ? lapisan[0] : "", "");
    for (const kelas of ["huruf-sans", "huruf-serif", "huruf-mono"]) {
      expect(new RegExp("\\." + kelas + "\\s*\\{").test(sisa)).toBe(false);
    }
    // Kelas lama dihapus, bukan ditinggal setengah.
    expect(sumber).not.toContain("sticky-handwriting");
  });

  it("kunci textarea memang hidup di dalam @layer base - itu sebabnya #654 salah obat (#671)", () => {
    const css = readFileSync(join(__dirname, "..", "..", "..", "index.css"), "utf8");
    const base = /@layer base\s*\{/.exec(css);
    expect(base).not.toBeNull();
    const mulai = base ? base.index : -1;
    const kunci = /[\s\S]*?textarea[\s\S]*?\{[^}]*font-family:[^}]*!important[^}]*\}/.exec(
      css.slice(mulai, mulai + 1400)
    );
    expect(kunci).not.toBeNull();
  });
});

/**
 * #655 — geometri tepi bentuk mengikuti draw.io.
 *
 * TIGA JALUR YANG BERBEDA DIUJI TERPISAH, karena bentuk di papan ini digambar
 * dengan tiga cara: div ber-border (`rect`), SVG dengan `stroke` (oval, diamond,
 * dan sebangsanya), dan catatan tempel yang tepinya cuma satu garis bawah.
 * Mengunci salah satu tidak membuktikan dua lainnya.
 */
describe("geometri tepi bentuk mengikuti draw.io (#655)", () => {
  const svgBentuk = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("svg")).find((s) =>
      (s.getAttribute("class") || "").includes("inset-0")
    );

  /** Div bentuk: satu-satunya div yang diberi warna TEPI lewat gaya inline. */
  const divBentuk = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("div")).find((d) => !!d.style.borderColor);

  it("tebal tepi SVG dibaca dari bentuknya, bukan dipatok konstanta", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ type: "oval", strokeWidth: 4 }))} />
    );
    const gambar = svgBentuk(container)!.querySelector("[stroke]") as SVGElement;
    expect(gambar.getAttribute("stroke-width")).toBe("4");
  });

  it("tanpa nilai di bentuk, tepinya 1 px seperti bawaan draw.io", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ type: "oval" }))} />);
    const gambar = svgBentuk(container)!.querySelector("[stroke]") as SVGElement;
    expect(gambar.getAttribute("stroke-width")).toBe("1");
  });

  it("pola putus-putus mengikuti draw.io: 3,3 bukan 5,5", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ type: "circle", borderStyle: "dashed" }))} />
    );
    const gambar = svgBentuk(container)!.querySelector("[stroke-dasharray]");
    expect(gambar?.tagName.toLowerCase()).toBe("circle");
    expect(gambar?.getAttribute("stroke-dasharray")).toBe("3,3");
  });

  it("rect tidak lagi bersudut lengkung", () => {
    const { container } = render(<FlowchartNode {...props(bentuk())} />);
    const div = divBentuk(container)!;
    expect(div.className).not.toMatch(/rounded/);
    expect(div.style.borderWidth).toBe("1px");
  });

  it("tebal tepi ikut sampai ke bentuk div", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ strokeWidth: 5 }))} />);
    expect(divBentuk(container)!.style.borderWidth).toBe("5px");
  });

  it("catatan tempel tidak mendapat tepi baru - tepinya tetap satu garis bawah (#652)", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ type: "sticky" }))} />);
    const tepiBawah = Array.from(container.querySelectorAll("div")).filter((d) =>
      /border-b-\[3px\]/.test(d.className)
    );
    expect(tepiBawah.length).toBeGreaterThan(0);
    // Gaya inline tidak boleh menimpa garis bawah 3 px itu dengan empat sisi.
    for (const d of tepiBawah) expect(d.style.borderWidth).toBe("");
  });

  it("bentuk tanpa tepi tidak kebagian lebar garis", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ borderStyle: "none", strokeWidth: 3 }))} />
    );
    expect(divBentuk(container)!.style.borderWidth).toBe("");
  });
});

/**
 * #666 — dua kunci sumber yang harus terlihat di DOM, bukan hanya di data:
 * pola putus-putus yang ditulis berkas dan letak label tegak lurus.
 */
describe("dashPattern dan verticalAlign sumber sampai ke layar (#666)", () => {
  const svgBentuk = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("svg")).find((x) =>
      (x.getAttribute("class") || "").includes("inset-0")
    );

  const polaDash = (lebih: Partial<FlowNode>) => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ type: "oval", borderStyle: "dashed", ...lebih }))} />
    );
    return svgBentuk(container)!
      .querySelector("[stroke-dasharray]")
      ?.getAttribute("stroke-dasharray");
  };

  it("pola dari berkas sumber dipakai apa adanya", () => {
    expect(polaDash({ dashPattern: "6,3" })).toBe("6,3");
  });

  it("tanpa pola dari sumber, papan memakai bawaan draw.io 3,3", () => {
    expect(polaDash({})).toBe("3,3");
  });

  it("verticalAlign menggeser label, dan tengah tetap bawaannya", () => {
    const kelas = (lebih: Partial<FlowNode>) => {
      const { container } = render(<FlowchartNode {...props(bentuk(lebih))} />);
      return (container.querySelector("textarea")!.parentElement as HTMLElement).className;
    };
    expect(kelas({ verticalAlign: "top" })).toContain("justify-start");
    expect(kelas({ verticalAlign: "bottom" })).toContain("justify-end");
    expect(kelas({})).toContain("justify-center");
  });
});

/**
 * #657 - dan hex itu benar-benar DIKATAM pada elemen, bukan berhenti di model.
 * Ini bagian yang dulu selalu meleset di papan ini (#650 dan #651): kolomnya
 * terisi, perenderya tidak pernah membacanya.
 */
describe("hex sumber benar-benar digambar (#657)", () => {
  const divBentuk = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("div")).find((d) => !!d.style.borderColor);

  const svgBentuk = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("svg")).find((x) =>
      (x.getAttribute("class") || "").includes("inset-0")
    );

  it("rect: isian dan tepi dari berkas sumber mengalahkan palet", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ fillHex: "#fad992", strokeHex: "#d79b00" }))} />
    );
    const div = divBentuk(container)!;
    expect(div.style.backgroundColor).toBe("rgb(250, 217, 146)");
    expect(div.style.borderColor).toBe("rgb(215, 155, 0)");
  });

  it("kotak PUTIH draw.io datang putih, bukan ungu palet", () => {
    const { container } = render(
      <FlowchartNode
        {...props(bentuk({ color: "indigo", fillHex: "#ffffff", strokeHex: "#666666" }))}
      />
    );
    const div = divBentuk(container)!;
    expect(div.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(div.style.borderColor).toBe("rgb(102, 102, 102)");
  });

  it("oval: tepi SVG memakai hex sumber", () => {
    // `isSelected: false` - seleksi SENGAJA tetap di atas hex sumber (#657),
    // karena itu penanda papan, bukan warna bentuk. Harness bawaan memilih
    // bentuknya, jadi keadaan itu ditutup di sini, bukan di perender.
    const { container } = render(
      <FlowchartNode
        {...{ ...props(bentuk({ type: "oval", strokeHex: "#82b366" })), isSelected: false }}
      />
    );
    const gambar = svgBentuk(container)!.querySelector("[stroke]") as SVGElement;
    expect(gambar.getAttribute("stroke")).toBe("#82b366");
  });

  it("hex yang tidak sah tidak pernah sampai ke elemen", () => {
    const { container } = render(
      <FlowchartNode
        {...props(bentuk({ fillHex: "red; position:fixed", strokeHex: "javascript:1" }))}
      />
    );
    const div = divBentuk(container)!;
    expect(div.style.backgroundColor).toBe("rgb(255, 242, 204)");
    expect(div.getAttribute("style")).not.toContain("position");
  });
});
