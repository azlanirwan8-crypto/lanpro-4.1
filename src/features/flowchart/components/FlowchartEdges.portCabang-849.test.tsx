import React from "react";
import { render } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import type { FlowEdge, FlowNode } from "../types";

/**
 * #849 — dua cabang satu keputusan tidak lagi berangkat dari titik yang sama.
 *
 * Test `portCabang-849.test.ts` mengunci ANGKA geserannya. Yang dikunci di sini
 * adalah bahwa lapisan gambar MEMAKAINYA: `d` tiap garis di DOM benar-benar
 * mulai 18 px lebih tinggi/lebih rendah, dan papan tanpa cabang tetap mulai di
 * titik tengah sisi seperti sebelumnya.
 */

const NODES = [
  {
    id: "fds",
    type: "diamond",
    x: 560,
    y: 187,
    width: 140,
    height: 70,
    label: "fds",
    color: "indigo",
  },
  { id: "go", type: "rect", x: 860, y: 100, width: 155, height: 70, label: "go", color: "emerald" },
  {
    id: "nogo",
    type: "rect",
    x: 860,
    y: 300,
    width: 155,
    height: 70,
    label: "nogo",
    color: "rose",
  },
] as unknown as FlowNode[];

type Props = React.ComponentProps<typeof FlowchartEdges>;

const propsUntuk = (edges: FlowEdge[], extra: Partial<Props> = {}): Props => ({
  edges,
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
  onEdgePatch: jest.fn(),
  koordinatPapan: (x: number, y: number) => ({ x, y }),
  isEditable: true,
  getNodeCenter: (id: string) => {
    const n = NODES.find((x) => x.id === id);
    return { x: (n?.x || 0) + (n?.width || 0) / 2, y: (n?.y || 0) + (n?.height || 0) / 2 };
  },
  draggingNodeId: null,
  resizingNodeId: null,
  ...extra,
});

const mulai = (container: HTMLElement, id: string) => {
  const d = container.querySelector(`[data-testid="garis-${id}"]`)?.getAttribute("d") || "";
  const m = /^M\s+([\d.-]+)\s+([\d.-]+)/.exec(d);
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};

describe("FlowchartEdges — cabang satu keputusan tidak bertindih (#849)", () => {
  const CABANG: FlowEdge[] = [
    { id: "e5", fromNodeId: "fds", toNodeId: "go" },
    { id: "e6", fromNodeId: "fds", toNodeId: "nogo" },
  ];

  it("titik berangkat kedua cabang berjarak 18 px, tidak lagi di titik yang sama", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk(CABANG)} />);
    const a = mulai(container, "e5");
    const b = mulai(container, "e6");
    expect(a.x).toBe(b.x);
    expect(b.y - a.y).toBeCloseTo(18, 1);
    expect(a.y).toBeLessThan(222);
    expect(b.y).toBeGreaterThan(222);
  });

  it("rute yang digambar berbeda sepanjang koridor awalnya", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk(CABANG)} />);
    const d = CABANG.map((e) =>
      container.querySelector(`[data-testid="garis-${e.id}"]`)?.getAttribute("d")
    );
    expect(d[0]).toBeTruthy();
    expect(d[0]).not.toBe(d[1]);
  });

  it("papan tanpa saudara tidak digeser sedikit pun", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk([CABANG[0]!])} />);
    expect(mulai(container, "e5")).toEqual({ x: 700, y: 222 });
  });
});
