import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import type { FlowEdge, FlowNode } from "../types";

/**
 * #533 — dua garis antara pasangan bentuk yang sama.
 *
 * GEJALA. Papan dengan `A ⇄ B` (termasuk hasil impor Draw.io/Miro #508)
 * menggambar kedua ruas TEPAT di atas satu sama lain: yang terlihat hanya satu
 * kepala panah, cahaya hover menyala pada keduanya, dan yang bisa diklik hanya
 * garis yang terakhir digambar. Sebabnya `getClosestPortsPoint` memilih port
 * terdekat tanpa tahu port itu sudah dipakai garis kembarannya.
 *
 * Yang dikunci di sini: `d` kedua ruas BERBEDA, keduanya punya jalur klik
 * sendiri, dan simpanan rute #521 tidak bertabrakan untuk dua garis searah.
 */

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
  connectorType: "straight",
  zoomLevel: 1,
  onEdgePatch: jest.fn(),
  koordinatPapan: (x: number, y: number) => ({ x, y }),
  isEditable: true,
  getNodeCenter: (id: string) => {
    const n = NODES.find((x) => x.id === id);
    return { x: (n?.x || 0) + 77, y: (n?.y || 0) + 35 };
  },
  draggingNodeId: null,
  resizingNodeId: null,
  ...extra,
});

const ruas = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("path[marker-end]")) as SVGPathElement[];

describe("FlowchartEdges — garis kembar pada pasangan yang sama (#533)", () => {
  it("dua garis dua arah tidak lagi digambar di atas satu sama lain", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([
          { id: "e1", fromNodeId: "r1", toNodeId: "r2" },
          { id: "e2", fromNodeId: "r2", toNodeId: "r1" },
        ])}
      />
    );

    const [satu, dua] = ruas(container).map((p) => p.getAttribute("d"));
    expect(ruas(container)).toHaveLength(2);
    expect(satu).toBeTruthy();
    expect(dua).toBeTruthy();
    expect(satu).not.toBe(dua);
  });

  it("garis kembar sejajar, bukan bersilang di tengah", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([
          { id: "e1", fromNodeId: "r1", toNodeId: "r2" },
          { id: "e2", fromNodeId: "r1", toNodeId: "r2" },
        ])}
      />
    );

    // Titik awal kedua ruas bergeser ke sisi yang BERLAWANAN dari garis tengah
    // bentuk (y=75): satu di atas, satu di bawah.
    const titikAwal = ruas(container).map((p) => {
      const m = /^M\s+[\d.-]+\s+([\d.-]+)/.exec(p.getAttribute("d") || "");
      return Number(m?.[1]);
    });
    expect(titikAwal[0]).not.toBe(titikAwal[1]);
    expect(Math.abs(titikAwal[0]! - 75)).toBeCloseTo(Math.abs(titikAwal[1]! - 75), 5);
  });

  it("tiap ruas punya jalur klik sendiri — yanglama tidak lagi menutupi yang baru", () => {
    const setSelectedEdgeId = jest.fn();
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk(
          [
            { id: "e1", fromNodeId: "r1", toNodeId: "r2" },
            { id: "e2", fromNodeId: "r2", toNodeId: "r1" },
          ],
          { setSelectedEdgeId }
        )}
      />
    );

    // Ruas klik adalah path lebar pertama di dalam tiap <g>; keduanya harus
    // memanggil dengan id masing-masing.
    const jalurKlik = Array.from(container.querySelectorAll("g > path")).filter(
      (p) => !p.getAttribute("marker-end")
    );
    expect(jalurKlik.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(jalurKlik[0]);
    fireEvent.click(jalurKlik[1]);

    const dipilih = setSelectedEdgeId.mock.calls.map((c) => c[0]);
    expect(new Set(dipilih).size).toBe(2);
  });
});
