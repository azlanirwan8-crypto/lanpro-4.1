/**
 * @jest-environment jsdom
 *
 * #834 — garis tidak boleh tampil penuh lingkaran.
 *
 * Satu garis dipilih hanya menampilkan SATU gagang tambah-tekukan; titik ungu
 * hanya milik waypoint yang benar-benar disimpan manusia. Kursor di atas salah
 * satu ruas memindahkan gagang itu ke ruas tersebut.
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
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

const titikUngu = (container: HTMLElement) =>
  container.querySelectorAll('[data-testid^="tekukan-"]');
const gagang = (container: HTMLElement) =>
  container.querySelectorAll('[data-testid^="gagang-tekuk-"]');

describe("#834 tampilan gagang", () => {
  it("rute otomatis: nol titik ungu dan tepat satu gagang", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    expect(titikUngu(container)).toHaveLength(0);
    expect(gagang(container)).toHaveLength(1);
  });

  it("dua waypoint tersimpan: dua titik ungu dan tetap satu gagang", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          edges: [
            garis({
              waypoints: [
                { x: 300, y: 75 },
                { x: 300, y: 300 },
              ],
            }),
          ],
        })}
      />
    );
    expect(titikUngu(container)).toHaveLength(2);
    expect(gagang(container)).toHaveLength(1);
  });

  it("kursor di atas ruas lain memindahkan gagang ke ruas itu", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    const sentuh = container.querySelector('path[stroke="transparent"]') as SVGPathElement;
    // Tanpa kursor, gagang duduk di tengah SELURUH jalur. Rute dua bentuk ini
    // panjangnya 155 + 260 + 155, jadi titik tengahnya jatuh di ruas kedua.
    expect(gagang(container)[0].getAttribute("data-testid")).toBe("gagang-tekuk-1");

    act(() => {
      const ev = new Event("pointermove", { bubbles: true });
      Object.assign(ev, { clientX: 250, clientY: 75 });
      sentuh.dispatchEvent(ev);
    });

    const kini = gagang(container);
    expect(kini).toHaveLength(1);
    expect(kini[0].getAttribute("data-testid")).toBe("gagang-tekuk-0");
    expect(parseFloat(kini[0].getAttribute("cy") || "0")).toBe(75);
  });
});
