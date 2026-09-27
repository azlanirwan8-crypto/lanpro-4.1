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
import type { FlowEdge, FlowNode, Point } from "../types";

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

const propsUntuk = (
  nodes: FlowNode[],
  draggingNodeId: string | null,
  resizingNodeId: string | null = null,
  edges: FlowEdge[] = EDGES
) => ({
  edges,
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
  resizingNodeId,
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

  it("saat seretan dilepas hanya garis yang tersentuh bentuk yang bergerak yang dikoreksi", () => {
    const { rerender } = render(<FlowchartEdges {...propsUntuk(AWAL, null)} />);
    const bergeser = [bentuk("r1", 200), bentuk("r2", 400), bentuk("r3", 700)];
    rerender(<FlowchartEdges {...propsUntuk(bergeser, "r1")} />);
    (findSmartRoute as jest.Mock).mockClear();

    // Item #543. Dulu frame ini menghitung ulang SEMUA garis (terukur 230 ms
    // rata-rata pada papan 200 bentuk). e2 (r2 -> r3, x 477..777) tidak
    // tersentuh kotak lama maupun baru milik r1 (x 34..381), dan e1 sudah
    // dikoreksi pada frame seretan tadi — jadi tidak ada satu pun yang perlu
    // dihitung ulang sekarang. Garis yang benar-benar terhalang ditangani test
    // terakhir di bawah.
    rerender(<FlowchartEdges {...propsUntuk(bergeser, null)} />);
    expect(findSmartRoute).not.toHaveBeenCalled();

    // Render ulang tanpa perubahan geometri juga tetap diam.
    rerender(<FlowchartEdges {...propsUntuk(bergeser, null)} />);
    expect(findSmartRoute).not.toHaveBeenCalled();
  });

  // Item #542 — memperbesar bentuk juga mengubah geometri, jadi ia punya hak
  // yang sama untuk membekukan tanda tangan global. Tanpa ini setiap frame
  // resize dianggap "geometri semua node berubah" dan SELURUH garis di kanvas
  // dihitung ulang: terukur 17,6 ms per frame pada 50 bentuk, 489 ms pada 200.
  it("frame resize hanya menghitung garis yang menempel pada bentuk yang diperbesar", () => {
    const { rerender } = render(<FlowchartEdges {...propsUntuk(AWAL, null)} />);
    (findSmartRoute as jest.Mock).mockClear();

    const melebar = [{ ...AWAL[0], width: 260 }, AWAL[1], AWAL[2]];
    rerender(<FlowchartEdges {...propsUntuk(melebar, null, "r1")} />);
    expect(findSmartRoute).toHaveBeenCalledTimes(1); // hanya e1

    const makinLebar = [{ ...AWAL[0], width: 340 }, AWAL[1], AWAL[2]];
    rerender(<FlowchartEdges {...propsUntuk(makinLebar, null, "r1")} />);
    expect(findSmartRoute).toHaveBeenCalledTimes(2); // +1, tetap hanya e1
  });

  it("melepas gagang resize tidak menghitung ulang garis yang tidak tersentuh", () => {
    const { rerender } = render(<FlowchartEdges {...propsUntuk(AWAL, null)} />);
    const melebar = [{ ...AWAL[0], width: 260 }, AWAL[1], AWAL[2]];
    rerender(<FlowchartEdges {...propsUntuk(melebar, null, "r1")} />);
    (findSmartRoute as jest.Mock).mockClear();

    // Kotak lama dan baru milik r1 berhenti di x=346; jalur e2 mulai di
    // x=477, dan e1 sudah dibetulkan saat gagang masih ditarik (#543).
    rerender(<FlowchartEdges {...propsUntuk(melebar, null, null)} />);
    expect(findSmartRoute).not.toHaveBeenCalled();

    rerender(<FlowchartEdges {...propsUntuk(melebar, null, null)} />);
    expect(findSmartRoute).not.toHaveBeenCalled();
  });

  // Inti #543: koreksi berbasis jalur. r3 dijatuhkan TEPAT DI ATAS jalur e1,
  // jadi e1 wajib dibelokkan — dan hanya e1. e3 (r3 -> r4) ikut karena salah
  // satu ujungnya bergerak; garis lain tidak boleh tersentuh.
  const SEREI = [bentuk("r1", 60), bentuk("r2", 620), bentuk("r3", 1200), bentuk("r4", 1200)];
  const TIGA_GARIS: FlowEdge[] = [
    { id: "e1", fromNodeId: "r1", toNodeId: "r2" },
    { id: "e2", fromNodeId: "r2", toNodeId: "r3" },
    { id: "e3", fromNodeId: "r3", toNodeId: "r4" },
  ];

  it("bentuk yang dilepas di atas garis memaksa garis itu mengitari, bukan seluruh papan", () => {
    const { rerender, container } = render(
      <FlowchartEdges {...propsUntuk(SEREI, null, null, TIGA_GARIS)} />
    );
    const jalurLayar = () =>
      (container.querySelector("path[marker-end]") as SVGPathElement).getAttribute("d");
    const dSebelum = jalurLayar();
    const ruteSebelumE1 = (findSmartRoute as jest.Mock).mock.results[0].value as Point[];
    (findSmartRoute as jest.Mock).mockClear();

    // r3 diseret dari x=1200 ke x=300, tepat di antara r1 dan r2 pada y yang
    // sama: jalur lama e1 (r1 -> r2) sekarang memotong badannya.
    const dijatuhkan = [SEREI[0], SEREI[1], bentuk("r3", 300), SEREI[3]];
    rerender(<FlowchartEdges {...propsUntuk(dijatuhkan, "r3", null, TIGA_GARIS)} />);
    // Tengah seretan: hanya garis yang ujungnya bergerak (e2, e3).
    expect(findSmartRoute).toHaveBeenCalledTimes(2);
    (findSmartRoute as jest.Mock).mockClear();

    rerender(<FlowchartEdges {...propsUntuk(dijatuhkan, null, null, TIGA_GARIS)} />);
    const dipasangi = (findSmartRoute as jest.Mock).mock.calls.map((c) => `${c[2]}>${c[3]}`);
    // Hanya e1 yang benar-benar terhalang. e2 dan e3 sudah dikoreksi selama
    // seretan (keduanya menyentuh r3) dan tidak dibayar ulang di sini.
    expect(dipasangi).toEqual(["r1>r2"]);

    // Koreksi itu benar-benar sampai ke layar. (Kualitas belokannya bukan
    // tanggapan test ini: `findSmartRoute` sendiri masih sering menyerah dan
    // memulangkan garis lurus — itu tercatat terpisah di papan.)
    expect((findSmartRoute as jest.Mock).mock.results[0].value).not.toEqual(ruteSebelumE1);
    expect(jalurLayar()).not.toBe(dSebelum);
  });
});
