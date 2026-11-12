/**
 * @jest-environment jsdom
 *
 * #854 — warna dan tebal garis dari bilah gaya.
 *
 * Empat jalur yang dikunci:
 *  1. Warna yang dipilih adalah hex yang DIBACA dari token `src/index.css`
 *     saat klik — bukan daftar hex bebas yang bisa menyimpang dari palet.
 *  2. Tombol "Ikuti warna tema" mengosongkan `strokeColor`, sehingga garis
 *     kembali memakai warna papan.
 *  3. Tebal menulis `strokeWidth` dan garis yang digambar benar-benar
 *     memakai angka itu.
 *  4. Nilai token yang tidak lolos `warnaTeksAman()` tidak pernah sampai ke
 *     `onPatch` maupun ke DOM.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EdgeStyleBar } from "./EdgeStyleBar";
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

const NODES = [bentuk("r1", 60, 40), bentuk("r2", 520, 40)];

const TOKEN: Record<string, string> = {
  "--color-primary": "#405189",
  "--color-success": "#0ab39c",
  "--color-warning": "#f7b84b",
  "--color-danger": "#f06548",
  "--color-info": "#299cdb",
  "--color-content-strong": "#343a40",
};

beforeEach(() => {
  for (const [nama, nilai] of Object.entries(TOKEN)) {
    document.documentElement.style.setProperty(nama, nilai);
  }
});

afterEach(() => {
  for (const nama of Object.keys(TOKEN)) {
    document.documentElement.style.removeProperty(nama);
  }
});

type PropsGaris = React.ComponentProps<typeof FlowchartEdges>;

/**
 * Papan kecil yang sungguhan: bilah menulis lewat `onPatch`, dan jalur garis
 * yang dirender ikut berubah — jadi test membaca hasilnya di DOM, bukan cuma
 * argumen mock.
 */
const Papan: React.FC<{
  awal?: Partial<FlowEdge>;
  onPatch?: (patch: Partial<FlowEdge>) => void;
}> = ({ awal, onPatch }) => {
  const [edge, setEdge] = React.useState<FlowEdge>({
    id: "e1",
    fromNodeId: "r1",
    toNodeId: "r2",
    ...awal,
  });
  const props: PropsGaris = {
    edges: [edge],
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
  };
  return (
    <>
      <FlowchartEdges {...props} />
      <EdgeStyleBar
        edge={edge}
        bentukBawaan="orthogonal"
        zoom={1}
        titik={{ x: 0, y: 0 }}
        onPatch={(patch) => {
          onPatch?.(patch);
          setEdge((e) => ({ ...e, ...patch }));
        }}
      />
    </>
  );
};

const bukaWarna = () => fireEvent.click(screen.getByTestId("tombol-warna-garis"));

describe("#854 warna garis", () => {
  it("memilih warna menulis hex yang dibaca dari token", () => {
    const onPatch = jest.fn();
    render(<Papan onPatch={onPatch} />);
    bukaWarna();

    fireEvent.click(screen.getByTestId("warna-garis-success"));

    expect(onPatch).toHaveBeenCalledWith({ strokeColor: "#0ab39c" });
    expect(screen.getByTestId("garis-e1").getAttribute("stroke")).toBe("#0ab39c");
  });

  it("tombol warna tema mengosongkan strokeColor dan garis kembali ke warna papan", () => {
    const onPatch = jest.fn();
    render(<Papan awal={{ strokeColor: "#f06548" }} onPatch={onPatch} />);
    expect(screen.getByTestId("garis-e1").getAttribute("stroke")).toBe("#f06548");

    bukaWarna();
    fireEvent.click(screen.getByTestId("warna-garis-tema"));

    expect(onPatch).toHaveBeenCalledWith({ strokeColor: undefined });
    expect(screen.getByTestId("garis-e1").getAttribute("stroke")).not.toBe("#f06548");
  });

  it("token yang tidak lolos warnaTeksAman tidak pernah masuk onPatch maupun DOM", () => {
    document.documentElement.style.setProperty("--color-primary", "rgb(255, 0, 0)");
    const onPatch = jest.fn();
    const { container } = render(<Papan onPatch={onPatch} />);
    bukaWarna();

    fireEvent.click(screen.getByTestId("warna-garis-primary"));

    expect(onPatch).not.toHaveBeenCalled();
    expect(container.innerHTML).not.toContain("rgb(255, 0, 0)");
    expect(screen.getByTestId("garis-e1").getAttribute("stroke")).not.toContain("rgb");
  });
});

describe("#854 tebal garis", () => {
  it("memilih tebal menulis strokeWidth dan garis yang digambar memakainya", () => {
    const onPatch = jest.fn();
    render(<Papan onPatch={onPatch} />);
    expect(screen.getByTestId("garis-e1").getAttribute("stroke-width")).toBe("1");

    fireEvent.click(screen.getByTestId("tebal-garis-4"));

    expect(onPatch).toHaveBeenCalledWith({ strokeWidth: 4 });
    expect(screen.getByTestId("garis-e1").getAttribute("stroke-width")).toBe("4");
  });

  it("tebal bawaan 1 ditandai aktif, dan pilihan lain menandai dirinya", () => {
    render(<Papan />);
    expect(screen.getByTestId("tebal-garis-1").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByTestId("tebal-garis-2"));

    expect(screen.getByTestId("tebal-garis-2").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("tebal-garis-1").getAttribute("aria-pressed")).toBe("false");
  });
});
