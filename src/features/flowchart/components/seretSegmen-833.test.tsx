/**
 * #833 — seret SELURUH segmen, seperti draw.io.
 *
 * SEBAB TEST INI ADA. #653 memberi garis satu titik yang bisa diseret, dan #766
 * memindahkannya menjadi satu gagang per segmen. Dua-duanya menyisipkan SUDUT
 * baru: yang bisa dibentuk hanya patahan garisnya. draw.io juga memperlakukan
 * segmen sebagai benda — menyeret ruas mendatar menggeser seluruh ruas itu
 * beserta kedua ujungnya, sementara sambungan ke bentuk tetap di portnya.
 *
 * Yang dikunci: hasil geseran berupa waypoints (bukan sekadar bentuk layar),
 * ujung port tidak ikut berpindah, dan klik-pilih tidak dianggap geseran.
 */
import React from "react";
import { render } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import { ruteOrtogonal } from "../lib/ruteOrtogonal";
import type { FlowEdge, FlowNode } from "../types";

const bentuk = (id: string, x: number, y: number): FlowNode => ({
  id,
  type: "rect",
  x,
  y,
  label: id,
  color: "indigo",
  width: 150,
  height: 70,
});

// Sama dengan #766: dua bentuk tidak segaris, jadi rutenya berbelok dan punya
// lebih dari satu segmen.
const NODES = [bentuk("r1", 60, 40), bentuk("r2", 520, 300)];

const garis = (patch: Partial<FlowEdge> = {}): FlowEdge => ({
  id: "e1",
  fromNodeId: "r1",
  toNodeId: "r2",
  ...patch,
});

type Props = React.ComponentProps<typeof FlowchartEdges>;

const propsUntuk = (partial: Partial<Props> = {}): Props => ({
  edges: [garis()],
  nodes: NODES,
  canvasTheme: "miro",
  selectedEdgeId: "e1",
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
  koordinatPapan: (x: number, y: number) => ({ x, y }),
  onDeleteEdge: jest.fn(),
  getNodeCenter: (id: string) => {
    const n = NODES.find((x) => x.id === id);
    return n ? { x: n.x + n.width! / 2, y: n.y + n.height! / 2 } : { x: 0, y: 0 };
  },
  draggingNodeId: null,
  resizingNodeId: null,
  ...partial,
});

/** Rute yang dihitung komponen untuk kedua bentuk ini (port kanan -> kiri). */
const jalur = () =>
  ruteOrtogonal(
    { x: 210, y: 75, dir: { x: 1, y: 0 } },
    { x: 520, y: 335, dir: { x: -1, y: 0 } },
    "r1",
    "r2",
    NODES
  );

const sentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

/**
 * jsdom tidak memberi `clientX`/`clientY` pada `fireEvent.pointerDown`, dan
 * handler segmen membaca koordinat TEPAT di pointerdown (untuk tahu ruas mana
 * yang digenggam). Peristiwanya dirakit tangan — sama seperti #653.
 */
const tekan = (el: Element, x: number, y: number) => {
  const ev = new Event("pointerdown", { bubbles: true });
  Object.assign(ev, { clientX: x, clientY: y, button: 0 });
  el.dispatchEvent(ev);
};

const gerak = (x: number, y: number) => {
  const ev = new Event("pointermove", { bubbles: true });
  Object.assign(ev, { clientX: x, clientY: y });
  window.dispatchEvent(ev);
};

const lepas = () => window.dispatchEvent(new Event("pointerup", { bubbles: true }));

describe("#833 seret seluruh segmen", () => {
  it("ruas mendatar bergeser tegak dan ujung port tetap", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(<FlowchartEdges {...propsUntuk({ onEdgePatch })} />);
    const [start, a, b] = jalur();
    // Segmen pertama: start -> a (mendatar pada y=start.y).
    const tengah = { x: (start.x + a.x) / 2, y: start.y };

    tekan(sentuh(container), tengah.x, tengah.y);
    gerak(tengah.x, tengah.y + 40);
    lepas();

    const wp = onEdgePatch.mock.calls.at(-1)![1].waypoints as { x: number; y: number }[];
    // Ujung `a` ikut turun; `b` tidak bergeser. Start (port) tidak ada di dalam
    // waypoints — ia jangkar bentuk.
    expect(wp[0]).toEqual({ x: a.x, y: a.y + 40 });
    expect(wp[1]).toEqual(b);
  });

  it("ruas tegak bergeser mendatar", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(<FlowchartEdges {...propsUntuk({ onEdgePatch })} />);
    const [, a, b] = jalur();
    const tengah = { x: a.x, y: (a.y + b.y) / 2 };

    tekan(sentuh(container), tengah.x, tengah.y);
    gerak(tengah.x + 25, tengah.y);
    lepas();

    const wp = onEdgePatch.mock.calls.at(-1)![1].waypoints as { x: number; y: number }[];
    // Kedua ujung ruas tegak adalah titik dalam, jadi dua-duanya ikut bergeser.
    expect(wp[0]).toEqual({ x: a.x + 25, y: a.y });
    expect(wp[1]).toEqual({ x: b.x + 25, y: b.y });
  });

  it("klik-pilih (di bawah ambang 3 px) tidak menulis apa pun", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(<FlowchartEdges {...propsUntuk({ onEdgePatch })} />);
    const [start, a] = jalur();
    const tengah = { x: (start.x + a.x) / 2, y: start.y };

    tekan(sentuh(container), tengah.x, tengah.y);
    gerak(tengah.x, tengah.y + 2);
    lepas();

    expect(onEdgePatch).not.toHaveBeenCalled();
  });

  it("garis yang belum dipilih tidak ikut bergeser saat disentuh", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ onEdgePatch, selectedEdgeId: null, hoveredEdgeId: "e1" })} />
    );
    const [start, a] = jalur();
    const tengah = { x: (start.x + a.x) / 2, y: start.y };

    tekan(sentuh(container), tengah.x, tengah.y);
    gerak(tengah.x, tengah.y + 40);
    lepas();

    expect(onEdgePatch).not.toHaveBeenCalled();
  });
});
