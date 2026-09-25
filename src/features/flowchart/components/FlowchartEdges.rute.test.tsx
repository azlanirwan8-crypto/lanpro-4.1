/**
 * Test cache rute garis — item #521.
 *
 * MENGAPA TEST INI ADA. Biaya terbesar kanvas flowchart adalah perhitungan rute
 * (`findSmartRoute`): terukur 105 ms untuk satu lintasan penuh 25 bentuk /
 * 35 garis, enam kali anggaran satu frame (16,7 ms). Sebelumnya itu dibayar pada
 * SETIAP render, jadi menggeser satu node menghitung ulang seluruh garis di
 * kanvas. Test ini mengunci aturannya lewat JUMLAH PANGGILAN, bukan lewat
 * tampilan — kalau perhitungan penuh kembali terjadi per frame, angka inilah
 * yang naik lebih dulu.
 *
 * `findSmartRoute` di-spy tetapi implementasinya tetap asli, jadi yang diuji
 * adalah KAPAN ia dipanggil. Keluaran rute itu sendiri dijaga terpisah:
 * perbandingan 7 layout deterministik sebelum vs sesudah optimasi `routing.ts`
 * menghasilkan 7 sama, 0 beda.
 */
import React from "react";
import { render } from "@testing-library/react";

jest.mock("../lib/routing", () => ({
  ...jest.requireActual("../lib/routing"),
  findSmartRoute: jest.fn(),
}));

import { findSmartRoute } from "../lib/routing";
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

// e1 menempel ke r1 dan r2; e2 tidak menyentuh r1 sama sekali.
const EDGES: FlowEdge[] = [
  { id: "e1", fromNodeId: "r1", toNodeId: "r2" },
  { id: "e2", fromNodeId: "r2", toNodeId: "r3" },
];

const propsUntuk = (nodes: FlowNode[], draggingNodeId: string | null) => ({
  edges: EDGES,
  nodes,
  canvasTheme: "miro" as const,
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
  connectorType: "orthogonal" as const,
  zoomLevel: 1,
  isEditable: true,
  onEdgePatch: jest.fn(),
  onDeleteEdge: jest.fn(),
  getNodeCenter: (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? { x: n.x + n.width! / 2, y: n.y + n.height! / 2 } : { x: 0, y: 0 };
  },
  draggingNodeId,
});

const AWAL = [bentuk("r1", 60), bentuk("r2", 400), bentuk("r3", 700)];

describe("FlowchartEdges — cache rute (#521)", () => {
  // jest.config.cjs memasang resetMocks, jadi implementasi asli dipasang ulang
  // sebelum tiap test; tanpa ini spy memulangkan undefined dan tidak ada rute.
  beforeEach(() => {
    (findSmartRoute as jest.Mock).mockImplementation(
      jest.requireActual("../lib/routing").findSmartRoute
    );
  });

  it("menghitung setiap garis sekali pada render pertama", () => {
    render(<FlowchartEdges {...propsUntuk(AWAL, null)} />);
    expect(findSmartRoute).toHaveBeenCalledTimes(2);
  });

  it("hanya menghitung garis yang ujungnya bergerak selama node diseret", () => {
    const { rerender } = render(<FlowchartEdges {...propsUntuk(AWAL, null)} />);
    (findSmartRoute as jest.Mock).mockClear();

    // r1 digeser; e2 (r2 -> r3) tidak punya ujung di r1 jadi tidak boleh dihitung.
    const bergeser = [bentuk("r1", 200), bentuk("r2", 400), bentuk("r3", 700)];
    rerender(<FlowchartEdges {...propsUntuk(bergeser, "r1")} />);
    expect(findSmartRoute).toHaveBeenCalledTimes(1);

    // Frame kedua seretan dengan posisi yang sama sekali berubah lagi.
    rerender(<FlowchartEdges {...propsUntuk([bentuk("r1", 260), ...bergeser.slice(1)], "r1")} />);
    expect(findSmartRoute).toHaveBeenCalledTimes(2); // +1, tetap hanya e1
  });

  it("mengoreksi seluruh garis sekali saat seretan dilepas", () => {
    const { rerender } = render(<FlowchartEdges {...propsUntuk(AWAL, null)} />);
    const bergeser = [bentuk("r1", 200), bentuk("r2", 400), bentuk("r3", 700)];
    rerender(<FlowchartEdges {...propsUntuk(bergeser, "r1")} />);
    (findSmartRoute as jest.Mock).mockClear();

    // Melepas: r1 yang baru pindah bisa saja membuat rute e2 perlu mengitarinya,
    // jadi seluruh garis dihitung sekali pada frame ini.
    rerender(<FlowchartEdges {...propsUntuk(bergeser, null)} />);
    expect(findSmartRoute).toHaveBeenCalledTimes(2);

    // Setelah koreksi itu, render ulang tanpa perubahan geometri tidak boleh
    // menghitung apa pun.
    (findSmartRoute as jest.Mock).mockClear();
    rerender(<FlowchartEdges {...propsUntuk(bergeser, null)} />);
    expect(findSmartRoute).not.toHaveBeenCalled();
  });
});
