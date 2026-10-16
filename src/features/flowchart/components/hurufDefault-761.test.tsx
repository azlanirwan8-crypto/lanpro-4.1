/**
 * @jest-environment jsdom
 *
 * #761 — bawaan huruf papan adalah Helvetica, dan itu berlaku untuk LABEL GARIS
 * juga, bukan hanya label bentuk.
 *
 * SEBAB. Pemilik proyek menulis: "pada flowchart default font: helvetica".
 * draw.io memakai Helvetica sebagai `DEFAULT_FONT_FAMILY` untuk kedua hal itu.
 * Papan ini sudah punya Helvetica untuk label BENTUK sejak #654 — yang ternyata
 * tidak pernah memakainya adalah label GARIS: `foreignObject` label garis hanya
 * mengoper `fontSize` dan `fontColor`, tanpa kelas keluarga huruf apa pun, jadi
 * ia mewarisi font global aplikasi (`index.css` menyetel Inter untuk seluruh
 * dokumen).
 *
 * Ini kelas kerusakan yang diam-diam: label "Y" dan "N" pada garis keputusan di
 * papan mana pun tampil dengan huruf yang berbeda dari huruf di dalam kotaknya,
 * dan tidak ada satu pun gerbang yang melihatnya karena kelas Tailwind hanyalah
 * string bagi kompilator (§1.1 aturan 1).
 *
 * YANG DIKUNCI DI SINI:
 *  1. label garis benar-benar memakai kelas `huruf-sans` (perilaku, di DOM);
 *  2. label bentuk dan label garis memakai SUMBER YANG SAMA — kalau suatu hari
 *     salah satunya menyalin namanya sendiri, penjaga ini merah.
 */
import React from "react";
import { render } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import { KELAS_HURUF } from "../constants";
import type { FlowEdge, FlowNode } from "../types";

const bentuk = (id: string, x: number): FlowNode => ({
  id,
  type: "rect",
  x,
  y: 40,
  label: id,
  color: "indigo",
  width: 150,
  height: 70,
});

const NODES = [bentuk("r1", 60), bentuk("r2", 460)];

const garis = (patch: Partial<FlowEdge> = {}): FlowEdge => ({
  id: "e1",
  fromNodeId: "r1",
  toNodeId: "r2",
  connector: "straight",
  ...patch,
});

type Props = React.ComponentProps<typeof FlowchartEdges>;

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
  connectorType: "straight",
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

const labelGaris = (container: HTMLElement) =>
  container.querySelector("foreignObject div") as HTMLElement | null;

describe("#761 bawaan huruf Helvetica berlaku sampai label garis", () => {
  it("label garis memakai kelas sans yang sama dengan label bentuk", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ edges: [garis({ label: "Y" })] })} />
    );
    const label = labelGaris(container);
    expect(label).toBeTruthy();
    expect(label!.className).toContain(KELAS_HURUF.sans);
  });

  it("kelas sans itu memang Helvetica, bukan nama kelas kosong", () => {
    // Nama kelas dan nilai CSS-nya dijaga terpisah: yang pertama memastikan dua
    // jalur memakai sumber yang sama, yang kedua memastikan sumber itu masih
    // berarti Helvetica kalau suatu hari seseorang "merapikan" blok gayanya.
    expect(KELAS_HURUF.sans).toBe("huruf-sans");
    const gayaPapan = require("fs").readFileSync(
      "src/features/flowchart/FlowchartContainer.tsx",
      "utf8"
    ) as string;
    expect(gayaPapan).toMatch(/\.huruf-sans\s*\{[^}]*Helvetica/);
  });

  it("garis tanpa label tidak memasang kotak teks", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    expect(labelGaris(container)).toBeNull();
  });
});
