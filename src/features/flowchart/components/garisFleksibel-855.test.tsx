/**
 * @jest-environment jsdom
 *
 * #855 — tiga bentuk sambungan yang sah di flow chart tetapi selama ini
 * ditolak: balik arah, garis ke diri sendiri, dan garis kedua pada pasangan
 * bentuk yang sama.
 *
 * Balik arah diuji lewat keadaan papan yang sungguhan (bukan hanya argumen
 * mock): sesudah diklik, label, waypoint, dan gaya harus UTUH sementara kedua
 * ujung dan kedua port bertukar. Self-loop dan garis kembar diuji dari `d`
 * jalur yang benar-benar digambar.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EdgeStyleBar } from "./EdgeStyleBar";
import { FlowchartEdges } from "./FlowchartEdges";
import { ruteLingkarSendiri } from "../lib/ruteOrtogonal";
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

const R1 = bentuk("r1", 60, 40);
const R2 = bentuk("r2", 520, 40);
const NODES = [R1, R2];

type Props = React.ComponentProps<typeof FlowchartEdges>;

const propsGaris = (edges: FlowEdge[]): Props => ({
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
});

describe("#855 balik arah", () => {
  const awal: FlowEdge = {
    id: "e1",
    fromNodeId: "r1",
    toNodeId: "r2",
    label: "awal",
    connector: "orthogonal",
    strokeWidth: 2,
    portSumber: { x: 0.2, y: 0.3 },
    portTujuan: { x: 0.8, y: 0.6 },
    waypoints: [{ x: 300, y: 140 }],
  };

  const Papan: React.FC<{ onPatch: (patch: Partial<FlowEdge>) => void }> = ({ onPatch }) => {
    const [edge, setEdge] = React.useState<FlowEdge>(awal);
    return (
      <>
        <FlowchartEdges {...propsGaris([edge])} />
        <pre data-testid="kondisi-garis">{JSON.stringify(edge)}</pre>
        <EdgeStyleBar
          edge={edge}
          bentukBawaan="orthogonal"
          zoom={1}
          titik={{ x: 0, y: 0 }}
          onPatch={(patch) => {
            onPatch(patch);
            setEdge((e) => ({ ...e, ...patch }));
          }}
        />
      </>
    );
  };

  it("menukar kedua ujung dan kedua port lewat satu patch", () => {
    const onPatch = jest.fn();
    render(<Papan onPatch={onPatch} />);

    fireEvent.click(screen.getByTestId("tombol-balik-arah"));

    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({
      fromNodeId: "r2",
      toNodeId: "r1",
      portSumber: { x: 0.8, y: 0.6 },
      portTujuan: { x: 0.2, y: 0.3 },
    });
  });

  it("label, waypoint, dan gaya tidak tersentuh oleh pembalikan", () => {
    render(<Papan onPatch={jest.fn()} />);
    fireEvent.click(screen.getByTestId("tombol-balik-arah"));

    const sesudah = JSON.parse(screen.getByTestId("kondisi-garis").textContent || "{}");
    expect(sesudah.fromNodeId).toBe("r2");
    expect(sesudah.toNodeId).toBe("r1");
    expect(sesudah.label).toBe("awal");
    expect(sesudah.waypoints).toEqual([{ x: 300, y: 140 }]);
    expect(sesudah.connector).toBe("orthogonal");
    expect(sesudah.strokeWidth).toBe(2);
  });

  it("sisi penerima tanpa port tetap kosong sesudah dibalik", () => {
    const onPatch = jest.fn();
    render(
      <EdgeStyleBar
        edge={{
          id: "e1",
          fromNodeId: "r1",
          toNodeId: "r2",
          portSumber: { x: 0.5, y: 0 },
        }}
        bentukBawaan="orthogonal"
        zoom={1}
        titik={{ x: 0, y: 0 }}
        onPatch={onPatch}
      />
    );

    fireEvent.click(screen.getByTestId("tombol-balik-arah"));

    expect(onPatch).toHaveBeenCalledWith({
      fromNodeId: "r2",
      toNodeId: "r1",
      portSumber: undefined,
      portTujuan: { x: 0.5, y: 0 },
    });
  });
});

describe("#855 garis ke diri sendiri", () => {
  it("rute putaran keluar dari sisi kanan, masuk dari atas, dan seluruh belokannya di luar bentuk", () => {
    const jalur = ruteLingkarSendiri(R1);
    // r1: x 60..210, y 40..110 — keluar kanan (210,75), masuk atas (135,40).
    expect(jalur[0]).toEqual({ x: 210, y: 75 });
    expect(jalur[jalur.length - 1]).toEqual({ x: 135, y: 40 });
    expect(jalur.length).toBeGreaterThan(2);
    for (const p of jalur.slice(1, -1)) {
      const diLuar = p.x >= 210 || p.y <= 40;
      expect(diLuar).toBe(true);
    }
    for (let i = 1; i < jalur.length; i++) {
      const a = jalur[i - 1];
      const b = jalur[i];
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });

  it("garis r1 ke r1 digambar sebagai putaran, bukan jalur nol panjang", () => {
    const { container } = render(
      <FlowchartEdges {...propsGaris([{ id: "e1", fromNodeId: "r1", toNodeId: "r1" }])} />
    );

    const d = container.querySelector('[data-testid="garis-e1"]')?.getAttribute("d") || "";
    expect(d).not.toBe("");
    expect(d).not.toBe("M 210 75");
    // Belokan luar: x 250 (kanan + 40) dan y 0 (atas - 40).
    expect(d).toContain("250");
    expect(d).toContain("M 210 75");
  });
});

describe("#855 garis kembar pada pasangan yang sama", () => {
  it("dua garis r1 ke r2 sama-sama tergambar dengan jalur berbeda", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsGaris([
          { id: "e1", fromNodeId: "r1", toNodeId: "r2", label: "Ya" },
          { id: "e2", fromNodeId: "r1", toNodeId: "r2", label: "Tidak" },
        ])}
      />
    );

    const d1 = container.querySelector('[data-testid="garis-e1"]')?.getAttribute("d");
    const d2 = container.querySelector('[data-testid="garis-e2"]')?.getAttribute("d");
    expect(d1).toBeTruthy();
    expect(d2).toBeTruthy();
    expect(d1).not.toBe(d2);
    expect(screen.getByText("Ya")).toBeTruthy();
    expect(screen.getByText("Tidak")).toBeTruthy();
  });
});
