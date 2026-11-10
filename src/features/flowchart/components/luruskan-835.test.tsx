/**
 * @jest-environment jsdom
 *
 * #835 — garis lama bisa diluruskan lagi.
 *
 * Dua jalur diuji:
 *  1. Waypoint yang hanya salinan rute (#833) tidak digambar sebagai titik ungu
 *     dan tidak mengunci bentuk garis; tekukan yang benar-benar membelokkan
 *     garis tetap tampil.
 *  2. Bilah gaya garis menyediakan satu aksi "Luruskan Garis" yang mengosongkan
 *     waypoint — setara "Reset Waypoints" draw.io.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import { EdgeStyleBar } from "./EdgeStyleBar";
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

/** Rute otomatis untuk kedua bentuk ini (port kanan -> kiri). */
const rute = () =>
  ruteOrtogonal(
    { x: 210, y: 75, dir: { x: 1, y: 0 } },
    { x: 520, y: 335, dir: { x: -1, y: 0 } },
    "r1",
    "r2",
    NODES
  );

const titikUngu = (container: HTMLElement) =>
  container.querySelectorAll('[data-testid^="tekukan-"]');

describe("#835 waypoint salinan rute lama", () => {
  it("salinan seluruh rute tidak lagi tampil sebagai titik ungu", () => {
    const salinan = rute().slice(1, -1);
    expect(salinan.length).toBeGreaterThan(1);

    const { container } = render(
      <FlowchartEdges {...propsUntuk({ edges: [garis({ waypoints: salinan })] })} />
    );

    // Inti keluhan: dulu setiap titik salinan menjadi satu lingkaran ungu.
    expect(titikUngu(container)).toHaveLength(0);
    // Gagang sisip tetap ada — garis tetap bisa dibentuk.
    expect(container.querySelectorAll('[data-testid^="gagang-tekuk-"]')).toHaveLength(1);
  });

  it("mode bezier tidak dibersihkan: titik manual tetap menentukan lengkung", () => {
    // Pada bezier, titik yang kebetulan segaris masih memengaruhi bentuk kurva,
    // jadi ia bukan salinan yang boleh dibuang.
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          connectorType: "bezier",
          edges: [garis({ waypoints: [{ x: 365, y: 205 }] })],
        })}
      />
    );
    expect(titikUngu(container)).toHaveLength(1);
  });

  it("tekukan yang benar-benar membelokkan garis tetap dipertahankan", () => {
    const salinan = rute().slice(1, -1);
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          edges: [garis({ waypoints: [...salinan, { x: 300, y: 600 }] })],
        })}
      />
    );

    const titik = Array.from(titikUngu(container)) as SVGCircleElement[];
    expect(titik).toHaveLength(1);
    expect(titik[0].getAttribute("cx")).toBe("300");
    expect(titik[0].getAttribute("cy")).toBe("600");
  });
});

describe("#835 aksi Luruskan Garis", () => {
  const dasar = {
    bentukBawaan: "orthogonal" as const,
    zoom: 1,
    titik: { x: 0, y: 0 },
    onPatch: jest.fn(),
    onDelete: jest.fn(),
  };

  it("mengosongkan waypoint garis terpilih", () => {
    const onPatch = jest.fn();
    render(
      <EdgeStyleBar {...dasar} onPatch={onPatch} edge={garis({ waypoints: [{ x: 100, y: 0 }] })} />
    );

    fireEvent.click(screen.getByTestId("tombol-luruskan-garis"));
    expect(onPatch).toHaveBeenCalledWith({ waypoints: [] });
  });

  it("tidak menampilkan aksi pada garis yang belum punya tekukan", () => {
    render(<EdgeStyleBar {...dasar} edge={garis()} />);
    expect(screen.queryByTestId("tombol-luruskan-garis")).toBeNull();
  });
});
