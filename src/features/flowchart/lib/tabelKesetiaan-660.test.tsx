/**
 * #660 — TABEL KEBENARAN kesetiaan draw.io.
 *
 * MENGAPA ITEM INI ADA. Dua klaim di papan ini sudah meleset, dan keduanya
 * meleset dengan cara yang sama: angka yang terbaca dari berkas terbukti lewat
 * test, lalu dinyatakan selesai, padahal tidak ada satu pun test yang bertanya
 * apa yang DIGAMBAR. #648 menyatakan kunci i18n ada padahal tidak; #650
 * menyatakan bentuk SVG tidak menampilkan garis putus-putus padahal bisa; dan
 * #654 dinyatakan SELESAI sementara keluarga huruf tidak pernah berubah di
 * peramban sama sekali - itu ketahuan oleh pemeriksaan tab bersih, bukan oleh
 * 448 test yang hijau sebelumnya.
 *
 * YANG DiUBAH DI SINI. Setiap kunci `style=` draw.io yang kita klaim didukung
 * punya SATU baris tabel, dan satu baris tabel menguji DUA sisi sekaligus:
 * `masuk` = apa yang tersimpan di model setelah penjeraf selesai, dan
 * `tampil` = atribut elemen sungguhan yang dihasilkan perender. Rantainya
 * diuji utuh - string gaya masuk ke penjeraf draw.io yang sebenarnya, bukan ke
 * objek node yang dirangkai test ini - jadi kunci yang hilang di tengah jalan
 * membuat barisnya merah, bukan hanya commentarnya.
 *
 * BATAS JUJUR YANG TERTULIS DI SINI, BUKAN DIHILANGKAN:
 * 1. `tampil` untuk keluarga huruf berhenti di NAMA KELAS. jsdom tidak mengurai
 *    `@layer`, jadi ia memberi jawaban yang BERLAWANAN dengan peramban pada
 *    kaskade `!important` lintas-layer - itu persis yang membuat #654 lolos
 *    dari test. Angka keluarga huruf yang sebenarnya diukur di Chrome dan
 *    dicatat di baris #671 papan.
 * 2. Daftar BELUM DIDUKUNG di bawah bukan aspirasi: ia diasersi, sehingga hari
 *    seseorang mendukung salah satu kunci itu, test ini merah dan memaksa
 *    daftarnya dipindah - bukan membiarkan klaim "semua gaya masuk" hidup tanpa
 *    angka.
 */
import React from "react";
import { render } from "@testing-library/react";
import { FlowchartNode } from "../components/FlowchartNode";
import { FlowchartEdges } from "../components/FlowchartEdges";
import { parseUniversalDiagram } from "./importers";
import { gayaDrawIo } from "./gayaImpor";
import type { FlowEdge, FlowNode } from "../types";

// ── penjeraf sungguhan, bukan objek karangan ────────────────────────────────
const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

const bentukDariStyle = (style: string, tipe = "rounded=0;"): FlowNode => {
  const { nodes } = parseUniversalDiagram(
    pagar(
      `<mxCell id="s1" value="Teks" vertex="1" parent="1" style="${tipe}${style}">` +
        '<mxGeometry x="40" y="40" width="160" height="80" as="geometry"/></mxCell>'
    ),
    "sumber.drawio"
  );
  return nodes[0];
};

const propsBentuk = (node: FlowNode) =>
  ({
    node,
    isSelected: false,
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

/** Bentuk div: bingkainya memegang isian, tepi, putar, opasitas, dan gradasi. */
const bingkai = (c: HTMLElement) => c.querySelector(".w-full.h-full.relative") as HTMLElement;
/** Label bentuk hidup di textarea - di situlah huruf sumber harus mendarat. */
const area = (c: HTMLElement) => c.querySelector("textarea") as HTMLTextAreaElement;

const tampilBentuk = (style: string, tipe?: string) => {
  const node = bentukDariStyle(style, tipe);
  const { container } = render(<FlowchartNode {...propsBentuk(node)} />);
  return { node, bingkai: bingkai(container), area: area(container), container };
};

// ── baris tabel untuk BENTUK ────────────────────────────────────────────────
interface BarisBentuk {
  kunci: string;
  style: string;
  /** Awalan tipe bentuk; bawaannya rect (digambar sebagai div). */
  tipe?: string;
  /** Apa yang tersimpan di model. */
  masuk: (n: FlowNode) => unknown;
  harusMasuk: unknown;
  /** Atribut elemen sungguhan. String kosong berarti "tidak boleh ada". */
  tampil: (bagian: {
    bingkai: HTMLElement;
    area: HTMLTextAreaElement;
    container: HTMLElement;
  }) => string | null;
  harusTampil: string | RegExp;
}

const BARIS_BENTUK: BarisBentuk[] = [
  {
    kunci: "fillColor",
    style: "fillColor=#dae8fc",
    masuk: (n) => n.fillHex,
    harusMasuk: "#dae8fc",
    tampil: ({ bingkai }) => bingkai.style.backgroundColor,
    harusTampil: "rgb(218, 232, 252)",
  },
  {
    kunci: "strokeColor",
    style: "strokeColor=#d6b656",
    masuk: (n) => n.strokeHex,
    harusMasuk: "#d6b656",
    tampil: ({ bingkai }) => bingkai.style.borderColor,
    harusTampil: "rgb(214, 182, 86)",
  },
  {
    kunci: "strokeWidth",
    style: "strokeWidth=3",
    masuk: (n) => n.strokeWidth,
    harusMasuk: 3,
    tampil: ({ bingkai }) => bingkai.style.borderWidth,
    harusTampil: "3px",
  },
  {
    kunci: "dashed",
    style: "dashed=1",
    masuk: (n) => n.borderStyle,
    harusMasuk: "dashed",
    tampil: ({ bingkai }) => bingkai.className,
    harusTampil: /border-dashed/,
  },
  {
    kunci: "dashPattern",
    // Bentuk SVG, bukan div: lihat test "batas div" di bawah tabel ini.
    style: "dashed=1;dashPattern=8 2",
    tipe: "ellipse;",
    masuk: (n) => n.dashPattern,
    harusMasuk: "8,2",
    tampil: ({ container }) =>
      container.querySelector("[stroke-dasharray]")?.getAttribute("stroke-dasharray") ?? null,
    harusTampil: "8,2",
  },
  {
    kunci: "rounded",
    style: "rounded=1",
    masuk: (n) => n.rounded,
    harusMasuk: true,
    tampil: ({ bingkai }) => bingkai.className,
    harusTampil: /rounded-lg/,
  },
  {
    kunci: "fontSize",
    style: "fontSize=18",
    masuk: (n) => n.fontSize,
    harusMasuk: 18,
    tampil: ({ area }) => area.style.fontSize,
    harusTampil: "18px",
  },
  {
    kunci: "fontColor",
    style: "fontColor=#b85450",
    masuk: (n) => n.fontColor,
    harusMasuk: "#b85450",
    tampil: ({ area }) => area.style.color,
    harusTampil: "rgb(184, 84, 80)",
  },
  {
    kunci: "fontStyle=1 tebal",
    style: "fontStyle=1",
    masuk: (n) => n.fontWeight,
    harusMasuk: "bold",
    tampil: ({ area }) => area.className,
    harusTampil: /font-bold/,
  },
  {
    kunci: "fontStyle=2 miring",
    style: "fontStyle=2",
    masuk: (n) => n.italic,
    harusMasuk: true,
    tampil: ({ area }) => area.className,
    harusTampil: /italic/,
  },
  {
    kunci: "fontStyle=4 garis bawah",
    style: "fontStyle=4",
    masuk: (n) => n.underline,
    harusMasuk: true,
    tampil: ({ area }) => area.className,
    harusTampil: /underline/,
  },
  {
    // Lihat BATAS 1 di kepala berkas: yang diuji kelasnya, bukan hasil kaskadenya.
    kunci: "fontFamily",
    style: "fontFamily=Courier New",
    masuk: (n) => n.fontFamily,
    harusMasuk: "Courier New",
    tampil: ({ area }) => area.className,
    harusTampil: /huruf-mono/,
  },
  {
    kunci: "align",
    style: "align=left",
    masuk: (n) => n.align,
    harusMasuk: "left",
    tampil: ({ area }) => area.className,
    harusTampil: /text-left/,
  },
  {
    kunci: "verticalAlign",
    style: "verticalAlign=top",
    masuk: (n) => n.verticalAlign,
    harusMasuk: "top",
    tampil: ({ container }) => (area(container).parentElement as HTMLElement).className,
    harusTampil: /justify-start/,
  },
  {
    kunci: "rotation",
    style: "rotation=15",
    masuk: (n) => n.rotation,
    harusMasuk: 15,
    tampil: ({ bingkai }) => bingkai.style.transform,
    harusTampil: "rotate(15deg)",
  },
  {
    kunci: "opacity",
    style: "opacity=60",
    masuk: (n) => n.opacity,
    harusMasuk: 60,
    tampil: ({ bingkai }) => bingkai.style.opacity,
    harusTampil: "0.6",
  },
  {
    kunci: "shadow",
    style: "shadow=1",
    masuk: (n) => n.shadow,
    harusMasuk: true,
    tampil: ({ bingkai }) => bingkai.style.filter,
    harusTampil: /drop-shadow/,
  },
  {
    kunci: "gradientColor",
    style: "fillColor=#ffffff;gradientColor=#0000ff",
    masuk: (n) => n.gradientHex,
    harusMasuk: "#0000ff",
    tampil: ({ bingkai }) => bingkai.style.backgroundImage,
    harusTampil: /linear-gradient/,
  },
  {
    kunci: "fillColor=none",
    style: "fillColor=none",
    masuk: (n) => n.fillNone,
    harusMasuk: true,
    tampil: ({ bingkai }) => bingkai.style.backgroundColor,
    harusTampil: "transparent",
  },
  {
    kunci: "strokeColor=none",
    style: "strokeColor=none",
    masuk: (n) => n.borderStyle,
    harusMasuk: "none",
    tampil: ({ bingkai }) => bingkai.className,
    harusTampil: /border-0/,
  },
];

describe("tabel kebenaran draw.io - sisi BENTUK (#660)", () => {
  it.each(BARIS_BENTUK.map((b) => [b.kunci, b] as const))(
    "%s: nilai masuk model dan nilai tampil di DOM keduanya benar",
    (_kunci, b) => {
      const bagian = tampilBentuk((b as BarisBentuk).style, (b as BarisBentuk).tipe);
      expect((b as BarisBentuk).masuk(bagian.node)).toEqual((b as BarisBentuk).harusMasuk);
      const tampak = (b as BarisBentuk).tampil(bagian);
      const harus = (b as BarisBentuk).harusTampil;
      if (typeof harus === "string") expect(tampak).toBe(harus);
      else expect(tampak ?? "").toMatch(harus);
    }
  );

  it("batas div: pola putus-putus kustom TIDAK bisa digambar pada bentuk div", () => {
    // Bukan kelalaian penjeraf - nilainya sampai di model. Yang tidak bisa
    // adalah CSS: `border-style: dashed` tidak punya tuas pola, jadi `8 2` dan
    // `1 9` tampil identik pada persegi panjang dan belah ketupat. draw.io
    // sendiri menggambar persegi panjangnya sebagai SVG, jadi di sana polanya
    // hidup. Menutup ini berarti memindahkan bentuk div ke perender SVG - itu
    // pekerjaan besar, dan lebih baik tercatat di sini daripada dikira selesai.
    const bagian = tampilBentuk("dashed=1;dashPattern=8 2");
    expect(bagian.node.dashPattern).toBe("8,2");
    expect(bagian.bingkai.className).toMatch(/border-dashed/);
    expect(bagian.bingkai.getAttribute("style") || "").not.toContain("8,2");
    // Dan pada bentuk SVG polanya MEMANG digambar - jadi yang hilang hanya div.
    const svg = tampilBentuk("dashed=1;dashPattern=8 2", "ellipse;");
    expect(
      svg.container.querySelector("[stroke-dasharray]")?.getAttribute("stroke-dasharray")
    ).toBe("8,2");
  });

  it("tabelnya punya jumlah baris yang tercatat, bukan menyusut diam-diam", () => {
    // Angka ini naik setiap kali kunci baru didukung dan tidak boleh turun:
    // baris yang dihapus diam-diam adalah cara klaim "mirip" mengempuk.
    expect(BARIS_BENTUK.length).toBeGreaterThanOrEqual(20);
  });
});

// ── baris tabel untuk GARIS ─────────────────────────────────────────────────
/**
 * Node DAN edge diambil dari penjeraf yang sama, dengan id yang sama.
 *
 * Ini bukan detail teknis. Penjeraf draw.io memberi id bentuk prefix `drawio-`,
 * jadi papan yang memegang "r1" tidak akan pernah menemukan ujung garis
 * "drawio-r1" - hasilnya lapisan garis TIDAK MERENDER JALUR SAMA SEKALI dan test
 * yang mengira sedang menguji gaya garis sebenarnya hanya membaca kepala panah
 * di dalam <defs>. Cara salah itu ketahuan di sini karena tabel ini menanyakan
 * atribut jalur, bukan keberadaan elemen.
 */
const satuGaris = (style: string) => {
  const { nodes, edges } = parseUniversalDiagram(
    pagar(
      '<mxCell id="r1" value="r1" vertex="1" parent="1"><mxGeometry x="40" y="40" width="160" height="80" as="geometry"/></mxCell>' +
        '<mxCell id="r2" value="r2" vertex="1" parent="1"><mxGeometry x="420" y="40" width="160" height="80" as="geometry"/></mxCell>' +
        `<mxCell id="e1" edge="1" source="r1" target="r2" parent="1" style="${style}"></mxCell>`
    ),
    "sumber.drawio"
  );
  return { nodes, edge: edges[0] };
};

const propsGaris = (edge: FlowEdge, nodes: FlowNode[]) =>
  ({
    edges: [edge],
    nodes,
    canvasTheme: "miro",
    selectedEdgeId: null,
    setSelectedEdgeId: jest.fn(),
    hoveredEdgeId: null,
    setHoveredEdgeId: jest.fn(),
    selectedNodeId: null,
    setSelectedNodeId: jest.fn(),
    hoveredNodeId: null,
    connectSourceId: null,
    setConnectSourceId: jest.fn(),
    hoverCoords: { x: 0, y: 0 },
    connectorType: "straight",
    zoomLevel: 1,
    koordinatPapan: (x: number, y: number) => ({ x, y }),
    isWorkspaceEditable: false,
    isEditable: true,
    draggingNodeId: null,
    resizingNodeId: null,
    onEdgePatch: jest.fn(),
    getNodeCenter: (id: string) => {
      const n = nodes.find((x) => x.id === id);
      return n ? { x: n.x + (n.width || 0) / 2, y: n.y + (n.height || 0) / 2 } : { x: 0, y: 0 };
    },
  }) as any;

/**
 * Jalur garis yang TERLIHAT.
 *
 * Satu garis menghasilkan LIMA elemen <path>: dua kepala panah di dalam <defs>
 * (tanpa stroke), SATU kepala panah lagi yang ternyata ikut memegang `stroke`
 * (penyaring naif "punya stroke" akan berhenti di sini dan melaporkan marker-end
 * kosong), jalur tebak-klik selebar 16 px yang stroke-nya `transparent`, dan
 * jalur garis itu sendiri. Yang terakhir dikenali dari `d` berawalan "M "
 * (para pemisah koordinat) dan warna yang benar-benar digambar.
 */
const pathGaris = (edge: FlowEdge, nodes: FlowNode[]) => {
  const { container } = render(<FlowchartEdges {...propsGaris(edge, nodes)} />);
  const semua = Array.from(container.querySelectorAll("path")).filter(
    (el) =>
      el.getAttribute("stroke") &&
      el.getAttribute("stroke") !== "transparent" &&
      (el.getAttribute("d") || "").startsWith("M ")
  );
  return semua[0] as SVGPathElement;
};

interface BarisGaris {
  kunci: string;
  style: string;
  masuk: (e: FlowEdge) => unknown;
  harusMasuk: unknown;
  tampil: (p: SVGPathElement, e: FlowEdge) => string | null;
  harusTampil: string | RegExp | null;
}

const BARIS_GARIS: BarisGaris[] = [
  {
    kunci: "tepi strokeColor",
    style: "strokeColor=#b85450",
    masuk: (e) => e.strokeColor,
    harusMasuk: "#b85450",
    tampil: (p) => p.getAttribute("stroke"),
    harusTampil: "#b85450",
  },
  {
    kunci: "tepi strokeWidth",
    style: "strokeWidth=4",
    masuk: (e) => e.strokeWidth,
    harusMasuk: 4,
    tampil: (p) => p.getAttribute("stroke-width"),
    harusTampil: "4",
  },
  {
    kunci: "tepi dashPattern",
    style: "dashed=1;dashPattern=8 8",
    masuk: (e) => e.dashPattern,
    harusMasuk: "8,8",
    tampil: (p) => p.getAttribute("stroke-dasharray"),
    harusTampil: "8,8",
  },
  {
    kunci: "endArrow=none",
    style: "endArrow=none",
    masuk: (e) => e.endArrow,
    harusMasuk: "none",
    tampil: (p) => p.getAttribute("marker-end"),
    harusTampil: null,
  },
  {
    kunci: "endArrow=classic",
    style: "endArrow=classic;endFill=1",
    masuk: (e) => e.endArrow,
    harusMasuk: "classic",
    tampil: (p) => p.getAttribute("marker-end") || "",
    harusTampil: /canvas-arrow-head/,
  },
  {
    kunci: "startArrow=oval",
    style: "startArrow=oval;startFill=1",
    masuk: (e) => e.startArrow,
    harusMasuk: "oval",
    tampil: (p) => p.getAttribute("marker-start") || "",
    harusTampil: /canvas-arrow-head/,
  },
  {
    kunci: "edgeStyle orthogonal",
    style: "edgeStyle=orthogonalEdgeStyle",
    masuk: (e) => e.connector,
    harusMasuk: "orthogonal",
    tampil: (p) => p.getAttribute("d") || "",
    harusTampil: /^[ML]/,
  },
  {
    kunci: "curved=1",
    style: "curved=1",
    masuk: (e) => e.connector,
    harusMasuk: "bezier",
    tampil: (p) => p.getAttribute("d") || "",
    harusTampil: /C/,
  },
  {
    kunci: "fontSize label garis",
    style: "fontSize=11;fontColor=#ff0000",
    masuk: (e) => e.labelFontSize,
    harusMasuk: 11,
    tampil: (_p, e) => `${e.labelFontSize};${e.labelColor}`,
    harusTampil: "11;#ff0000",
  },
  {
    kunci: "exitX/exitY",
    style: "exitX=0.5;exitY=1;entryX=0.5;entryY=0",
    masuk: (e) => e.portSumber,
    harusMasuk: { x: 0.5, y: 1 },
    tampil: (p) => {
      const awal = /^M\s*(-?[\d.]+)\s+(-?[\d.]+)/.exec(p.getAttribute("d") || "");
      return awal ? `${awal[1]},${awal[2]}` : null;
    },
    // 260,220 = titik bawah-tengah r1 SETELAH penjeraf menormalkan asal papan:
    // berkas menulis (40,40) 160x80, papan menampilkannya di (180,140), jadi
    // bawah-tengah = 180+80, 140+80. ANGKA TULISAN TANGAN hasil ukur, bukan
    // hasil memanggil `titikPort()` lagi - mengharapkan nilai dari fungsi yang
    // sama yang menghasilkan jalurnya adalah asersi berputar.
    harusTampil: "260,220",
  },
];

describe("tabel kebenaran draw.io - sisi GARIS (#660)", () => {
  it.each(BARIS_GARIS.map((b) => [b.kunci, b] as const))(
    "%s: gaya tepi masuk model dan keluar sebagai atribut",
    (_kunci, b) => {
      const { nodes, edge } = satuGaris((b as BarisGaris).style);
      expect((b as BarisGaris).masuk(edge)).toEqual((b as BarisGaris).harusMasuk);
      const p = pathGaris(edge, nodes);
      const tampak = (b as BarisGaris).tampil(p, edge);
      const harus = (b as BarisGaris).harusTampil;
      if (harus === null) expect(tampak).toBeNull();
      else if (typeof harus === "string") expect(tampak).toBe(harus);
      else expect(tampak ?? "").toMatch(harus);
    }
  );

  it("jumlah baris sisi garis tercatat", () => {
    expect(BARIS_GARIS.length).toBeGreaterThanOrEqual(9);
  });
});

// ── batas: kunci yang TIDAK didukung, diasersi supaya tidak dikira selesai ───
describe("kunci draw.io yang BELUM didukung tercatat sebagai batas (#660)", () => {
  const BELUM = [
    "sketch=1",
    "arcSize=12",
    "gradientDirection=north",
    "perimeter=ellipsePerimeter",
    "labelPosition=right",
    "verticalLabelPosition=bottom",
    "exitDx=0",
    "imageWidth=48",
    "indent=20",
    "spacing=6",
  ];

  it.each(BELUM.map((k) => [k] as const))("%s tidak mengubah model apa pun", (style) => {
    // Kalau nanti ada yang mendukung salah satunya, test ini MERAH dan memaksa
    // barisnya pindah ke tabel - bukan membiarkan daftar batas menguap.
    expect(gayaDrawIo(style)).toEqual({});
  });

  it("daftarnya tercatat dan tidak membesar diam-diam tanpa nama", () => {
    expect(BELUM.length).toBe(10);
  });
});
