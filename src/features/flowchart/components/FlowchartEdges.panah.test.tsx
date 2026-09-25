/**
 * Test kepala panah dan gaya garis — item #522 (butir e) dan #529.
 *
 * MENGAPA TEST INI ADA. Dua keluhan pengguna pada papan:
 *   1. "panah nya tidak di ujung, seperti tidak rapi" — penanda kepala panah
 *      memakai refX="14" padahal ujung panah ada di x=6 dan satuannya
 *      strokeWidth. Ujung panah lalu duduk 8 × tebal-garis SEBELUM akhir garis
 *      (16 px pada garis biasa, 24 px saat dipilih) sehingga ujung garis selalu
 *      tampak bolong.
 *   2. garis tidak bisa dibuat putus-putus atau diluruskan seperti di Miro,
 *      karena FlowEdge tidak punya field gaya DAN strokeDasharray sudah dipakai
 *      sebagai penanda "sedang dipilih".
 *
 * Yang dikunci di sini adalah GEOMETRI dan SUMBER NILAI, bukan tampilan:
 * refX = ujung panah, satuan bukan tebal-garis, garis berakhir tepat di tepi
 * bentuk, dan goresan datang dari garis itu sendiri.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import i18n from "../../../i18n";
import { FlowchartEdges } from "./FlowchartEdges";
import type { FlowEdge, FlowNode } from "../types";

const bentuk = (id: string, x: number): FlowNode => ({
  id,
  type: "rect",
  x,
  y: 40,
  label: id,
  color: "indigo",
  width: 155,
  height: 70,
});

const NODES = [bentuk("r1", 60), bentuk("r2", 400)];

// Ujung kanan r1 = (215, 75); tepi kiri r2 = (400, 75).
const GARIS_AWAL = "215 75";
const GARIS_AKHIR = "400 75";
const TENGAH_GARIS = { x: (215 + 400) / 2, y: 75 };

type Props = React.ComponentProps<typeof FlowchartEdges>;

const garis = (patch: Partial<FlowEdge> = {}): FlowEdge => ({
  id: "e1",
  fromNodeId: "r1",
  toNodeId: "r2",
  ...patch,
});

const propsUntuk = (partial: Partial<Props> = {}): Props => ({
  edges: [garis()],
  nodes: NODES,
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
  connectorType: "orthogonal",
  zoomLevel: 1,
  isEditable: true,
  onEdgePatch: jest.fn(),
  onDeleteEdge: jest.fn(),
  getNodeCenter: (id: string) => {
    const n = NODES.find((x) => x.id === id);
    return n ? { x: n.x + n.width! / 2, y: n.y + n.height! / 2 } : { x: 0, y: 0 };
  },
  draggingNodeId: null,
  ...partial,
});

/** Jalur yang benar-benar terlihat: hanya ia yang membawa kepala panah. */
const jalurTerlihat = (el: HTMLElement) => el.querySelector("path[marker-end]") as SVGPathElement;

/** Ujung panah = koordinat x terbesar pada path penanda (d selalu x,y bergantian). */
const ujungPanah = (m: Element) => {
  const d = m.querySelector("path")!.getAttribute("d")!;
  const angka = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  return Math.max(...angka.filter((_, i) => i % 2 === 0));
};

const marker = (el: HTMLElement, id: string) => el.querySelector(`marker#${id}`)!;

const tombolDi = (el: HTMLElement, kunci: string) =>
  Array.from(el.querySelectorAll("button")).find(
    (b) => b.getAttribute("title") === String(i18n.t(kunci))
  );

describe("FlowchartEdges — kepala panah di ujung garis (#522 e)", () => {
  it("ujung panah duduk tepat di akhir garis, bukan 8×tebal garis sebelumnya", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    const m = marker(container as HTMLElement, "canvas-arrow-head");

    expect(m.getAttribute("refX")).toBe(String(ujungPanah(m)));
    expect(m.getAttribute("markerUnits")).toBe("userSpaceOnUse");
  });

  it("garis berakhir tepat di tepi bentuk tujuan", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    const d = jalurTerlihat(container as HTMLElement)
      .getAttribute("d")!
      .trim();

    expect(d.startsWith(`M ${GARIS_AWAL}`)).toBe(true);
    expect(d.endsWith(GARIS_AKHIR)).toBe(true);
  });

  it("penanda terpilih punya geometri yang sama dengan penanda biasa", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1" })} />);
    const el = container as HTMLElement;
    const biasa = marker(el, "canvas-arrow-head");
    const terpilih = marker(el, "canvas-arrow-head-selected");

    expect(terpilih.getAttribute("refX")).toBe(biasa.getAttribute("refX"));
    expect(terpilih.getAttribute("markerUnits")).toBe(biasa.getAttribute("markerUnits"));
  });
});

describe("FlowchartEdges — gaya garis per garis (#529)", () => {
  it("goresan diambil dari garisnya, bukan dari status terpilih", () => {
    const biasa = render(<FlowchartEdges {...propsUntuk()} />).container as HTMLElement;
    expect(jalurTerlihat(biasa).getAttribute("stroke-dasharray")).toBe(null);

    const dashed = render(
      <FlowchartEdges {...propsUntuk({ edges: [garis({ strokeStyle: "dashed" })] })} />
    ).container as HTMLElement;
    expect(jalurTerlihat(dashed).getAttribute("stroke-dasharray")).toBe("9, 6");

    // Inilah aturan yang dulu dilanggar: garis terpilih selalu jadi putus-putus.
    const terpilih = render(<FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1" })} />)
      .container as HTMLElement;
    expect(jalurTerlihat(terpilih).getAttribute("stroke-dasharray")).toBe(null);
  });

  it("garis titik-titik memakai ujung bulat", () => {
    const dotted = render(
      <FlowchartEdges {...propsUntuk({ edges: [garis({ strokeStyle: "dotted" })] })} />
    ).container as HTMLElement;
    expect(jalurTerlihat(dotted).getAttribute("stroke-linecap")).toBe("round");
  });

  it("bentuk jalur satu garis mengalahkan bawaan papan", () => {
    const melengkung = render(
      <FlowchartEdges {...propsUntuk({ edges: [garis({ connector: "bezier" })] })} />
    ).container as HTMLElement;
    expect(jalurTerlihat(melengkung).getAttribute("d")).toMatch(/[QC]/);

    const bawaan = render(<FlowchartEdges {...propsUntuk()} />).container as HTMLElement;
    expect(jalurTerlihat(bawaan).getAttribute("d")).not.toMatch(/[QC]/);
  });
});

describe("FlowchartEdges — bilah gaya saat garis diklik (#529)", () => {
  it("muncul hanya untuk garis terpilih, tersangkur di tengah garis", () => {
    const tanpa = render(<FlowchartEdges {...propsUntuk()} />).container as HTMLElement;
    expect(tanpa.querySelector("button")).toBe(null);

    const terpilih = render(<FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1" })} />)
      .container as HTMLElement;

    const sangkura = terpilih.querySelector("button")!.closest("div[style]")!;
    expect(sangkura.getAttribute("style")).toContain(`left: ${TENGAH_GARIS.x}px`);
    expect(sangkura.getAttribute("style")).toContain(`top: ${TENGAH_GARIS.y}px`);
    expect(tombolDi(terpilih, "flowchart.lineStraight")).toBeTruthy();
    expect(tombolDi(terpilih, "flowchart.lineDashed")).toBeTruthy();
  });

  it("papan baca-saja tidak menampilkan bilah gaya sama sekali", () => {
    const tanpa = render(
      <FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1", isEditable: false })} />
    ).container as HTMLElement;
    expect(tanpa.querySelector("button")).toBe(null);
    // garisnya tetap digambar seperti biasa; hanya alat ubahnya yang hilang
    expect(jalurTerlihat(tanpa).getAttribute("marker-end")).toContain("canvas-arrow-head");
  });

  it("tanpa aksi putuskan, tombol hapus tidak ikut muncul", () => {
    const el = render(
      <FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1", onDeleteEdge: undefined })} />
    ).container as HTMLElement;
    expect(tombolDi(el, "flowchart.lineDashed")).toBeTruthy();
    expect(tombolDi(el, "flowchart.disconnectFlow")).toBe(undefined);
  });

  it("klik pilihan gaya mengirim patch ke garis yang benar", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1", onEdgePatch })} />
    );
    const el = container as HTMLElement;

    fireEvent.click(tombolDi(el, "flowchart.lineDashed")!);
    expect(onEdgePatch).toHaveBeenCalledWith("e1", { strokeStyle: "dashed" });

    fireEvent.click(tombolDi(el, "flowchart.lineElbow")!);
    expect(onEdgePatch).toHaveBeenCalledWith("e1", { connector: "orthogonal" });

    expect(onEdgePatch).not.toHaveBeenCalledWith("e1", { label: expect.anything() });
  });
});
