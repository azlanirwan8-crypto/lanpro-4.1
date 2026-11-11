/**
 * @jest-environment jsdom
 *
 * #838 — "duh sulit ini mau luruskan, harusnya bisa".
 *
 * Dua perbaikan, dua jalur uji:
 *  1. Toleransi saringan waypoint dinaikkan 2 → 4 px DI PEMANGGIL (bukan di
 *     bawaan fungsi): sisa snap kisi 5 px dari seretan menyimpang sampai
 *     ±3,5 px dan selama ini lolos sebagai tekukan palsu yang mengunci garis
 *     berundak. Angka 4 px sengaja di bawah seretan segmen nyata (#790).
 *  2. Tombol "Luruskan Garis" tidak pernah mati: waypoint kosong + undakan
 *     berarti penyebabnya rute otomatis itu sendiri (dua jangkar tidak sama
 *     y persis, #833), dan klik mengubah garis jadi satu segmen lurus.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import { EdgeStyleBar } from "./EdgeStyleBar";
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

// Kedua bentuk SEJAJAR: rute otomatisnya satu segmen lurus y=75, jadi jarak
// waypoint ke rute terukur bersih tanpa belokan router.
const NODES = [bentuk("r1", 60, 40), bentuk("r2", 520, 40)];

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

describe("#838 sisa snap kisi dibuang sebagai tekukan palsu", () => {
  it("waypoint 3 px di luar rute lurus tidak digambar (dulu: jadi undakan)", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ edges: [garis({ waypoints: [{ x: 300, y: 78 }] })] })} />
    );
    expect(titikUngu(container)).toHaveLength(0);
  });

  it("waypoint 5 px di luar rute tetap dipertahankan: seretan kecil nyata tidak dimakan", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ edges: [garis({ waypoints: [{ x: 300, y: 80 }] })] })} />
    );
    expect(titikUngu(container)).toHaveLength(1);
  });
});

describe("#838 tombol Luruskan Garis garis polos", () => {
  const dasar = {
    bentukBawaan: "orthogonal" as const,
    zoom: 1,
    titik: { x: 0, y: 0 },
    onPatch: jest.fn(),
    onDelete: jest.fn(),
  };

  it("klik pada garis tanpa waypoint mengubahnya jadi satu segmen lurus", () => {
    // Jangkar tidak sama y memang mewajibkan undakan pada mode ortogonal;
    // satu segmen lurus (connector "straight") adalah satu-satunya jalan
    // geometris menghilangkannya, dan itulah yang diminta pemilik proyek.
    const onPatch = jest.fn();
    render(<EdgeStyleBar {...dasar} onPatch={onPatch} edge={garis()} />);

    fireEvent.click(screen.getByTestId("tombol-luruskan-garis"));
    expect(onPatch).toHaveBeenCalledWith({ connector: "straight" });
  });

  it("klik pada garis BERTEKUK tetap mengosongkan waypoint dulu (#835)", () => {
    const onPatch = jest.fn();
    render(
      <EdgeStyleBar
        {...dasar}
        onPatch={onPatch}
        edge={garis({ waypoints: [{ x: 300, y: 300 }] })}
      />
    );

    fireEvent.click(screen.getByTestId("tombol-luruskan-garis"));
    expect(onPatch).toHaveBeenCalledWith({ waypoints: [] });
  });
});
