/**
 * @jest-environment jsdom
 */
/* #631 — (a) satu sumber angka ukuran bentuk, (b) garis tidak boleh hilang
   karena bentuknya kebetulan duduk di x=0. */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn().mockResolvedValue(null),
  deleteFlowchart: jest.fn(),
}));
jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const papan = (nodes: unknown[], edges: unknown[]) => [
  {
    id: "fw1",
    name: "Alur Ujung",
    description: "",
    category: "Panduan",
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
    nodes,
    edges,
  },
];

const renderView = () =>
  render(
    <FlowchartView
      selectedProject={project}
      tasks={[] as Task[]}
      projectMembers={[]}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
      currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
    />
  );

async function bukaPapan(nama = "Alur Ujung") {
  fireEvent.click((await screen.findAllByText(nama))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
}

/** Titik awal jalur garis pertama yang menggantung kepala panah. */
const awalJalur = (container: HTMLElement) => {
  const inti = container.querySelector(
    'path[marker-end^="url(#canvas-arrow-head"]'
  ) as SVGPathElement;
  if (!inti) return null;
  const m = /^\s*M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/.exec(inti.getAttribute("d") || "");
  return m ? { x: +m[1], y: +m[2] } : null;
};

const lebarTergambar = (container: HTMLElement) => {
  const kotak = container.querySelector('[id^="val-node-"]') as HTMLElement;
  return { w: parseFloat(kotak.style.width), h: parseFloat(kotak.style.height) };
};

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset();
});

describe("bentuk di x=0 tidak boleh menghapus garisnya (#631)", () => {
  it("satu bentuk duduk tepat di tepi kiri papan (x=0) — garisnya TETAP ada", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue(
      papan(
        [
          {
            id: "n1",
            type: "rect",
            x: 0,
            y: 120,
            label: "Mulai",
            color: "blue",
            width: 140,
            height: 60,
          },
          {
            id: "n2",
            type: "rect",
            x: 420,
            y: 120,
            label: "Selesai",
            color: "amber",
            width: 140,
            height: 60,
          },
        ],
        [{ id: "e1", fromNodeId: "n1", toNodeId: "n2" }]
      )
    );
    const { container } = renderView();
    await bukaPapan();

    // Bentuknya dua, garisnya satu. SEBELUM #631: `startCenter.x === 0` dianggap
    // "bentuk tidak ditemukan", jadi jalur ini tidak pernah di-render dan papan
    // terlihat punya bentuk tanpa satu garis pun — gejala #625.
    expect(container.querySelectorAll('[id^="val-node-"]')).toHaveLength(2);
    expect(container.querySelectorAll('path[marker-end^="url(#canvas-arrow-head"]')).toHaveLength(
      1
    );
    // Diukur, bukan disimpulkan: `getNodeCenter` mengembalikan `x + lebar/2`, jadi
    // bentuk di x=0 menghasilkan 70 — TIDAK pernah kena penjaga `=== 0`. Artinya
    // dugaan "bentuk di tepi kiri menghapus garis" untuk #625 TERBANTAHKAN.
    const kotak = container.querySelector('[id^="val-node-"]') as HTMLElement;
    expect(kotak.style.left).toBe("0px");
  });

  it("bentuk yang benar-benar hilang tetap tidak menggambar garis tanpa pesan", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue(
      papan(
        [
          {
            id: "n1",
            type: "rect",
            x: 100,
            y: 120,
            label: "Satu",
            color: "blue",
            width: 140,
            height: 60,
          },
        ],
        [{ id: "e1", fromNodeId: "n1", toNodeId: "tidak-ada" }]
      )
    );
    const { container } = renderView();
    await bukaPapan();

    // Ujung yatim sungguhan: tetap tidak digambar (perilaku lama yang benar).
    expect(container.querySelectorAll('[id^="val-node-"]')).toHaveLength(1);
    expect(container.querySelectorAll('path[marker-end^="url(#canvas-arrow-head"]')).toHaveLength(
      0
    );
  });
});

describe("satu sumber angka ukuran bentuk (#631)", () => {
  it("bentuk tanpa lebar eksplisit: ujung garis memakai lebar yang TERGAMBAR, bukan angka lain", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue(
      papan(
        [
          { id: "n1", type: "rect", x: 100, y: 100, label: "Satu", color: "blue" },
          { id: "n2", type: "rect", x: 500, y: 100, label: "Dua", color: "amber" },
        ],
        [{ id: "e1", fromNodeId: "n1", toNodeId: "n2" }]
      )
    );
    const { container } = renderView();
    await bukaPapan();

    const { w } = lebarTergambar(container);
    const awal = awalJalur(container)!;
    // Garis keluar dari sisi KANAN kotak yang tergambar. Kalau ada tempat yang
    // memakai angka cadangan lain (140 dulu, 120 di minimap), titik ini melompat.
    expect(awal.x).toBeCloseTo(100 + w, 6);
    expect(awal.y).toBeCloseTo(100 + lebarTergambar(container).h / 2, 6);
  });

  it("minimap menggambar miniatur selebar bentuk aslinya (#631)", async () => {
    // Dua bentuk identik: satu menyimpan lebar 130 secara eksplisit, satu lagi
    // tidak punya `width` sama sekali. Kalau minimap memakai angka cadangan
    // sendiri (dulu 120x60), miniatur keduanya berbeda padahal aslinya sama.
    (fetchFlowcharts as jest.Mock).mockResolvedValue(
      papan(
        [
          {
            id: "n1",
            type: "rect",
            x: 100,
            y: 100,
            label: "Eksplisit",
            color: "blue",
            width: 130,
            height: 70,
          },
          { id: "n2", type: "rect", x: 400, y: 100, label: "Cadangan", color: "amber" },
        ],
        []
      )
    );
    const { container } = renderView();
    await bukaPapan();

    const mini = (judul: string) => {
      const el = Array.from(container.querySelectorAll<HTMLElement>("[title]")).find(
        (e) =>
          e.getAttribute("title") === judul &&
          e.style.width.endsWith("px") &&
          parseFloat(e.style.width) < 60
      );
      return el ? parseFloat(el.style.width) : NaN;
    };
    const a = mini("Eksplisit");
    const b = mini("Cadangan");
    expect(a).toBeGreaterThan(0);
    expect(b).toBeCloseTo(a, 6);

    // Dan di papan: bentuk tanpa `width` memang tergambar 130.
    const cadangan = container.querySelector('[id="val-node-n2"]') as HTMLElement;
    expect(parseFloat(cadangan.style.width)).toBe(130);
  });
});
