/**
 * @jest-environment jsdom
 *
 * #621 — bobot kerja per bingkai saat menyeret SATU bentuk di papan besar.
 *
 * Diukur dengan harness yang sama seperti #599 (papan 200 bentuk, 10 gerakan
 * kursor), hanya yang dihitung berbeda: berapa kali BADAN RENDER bentuk
 * dijalankan. SEBELUM #621: 1.800 badan render dan 566,6 ms `actualDuration`
 * untuk satu seretan, karena `FlowchartNode` menerima `selectedNodeId`,
 * `hoveredNodeId`, `draggingNodeId`, `copiedNodes` dan tujuh closure baru pada
 * setiap render — `React.memo` tidak akan pernah lolos selama itu prop-nya.
 *
 * SESUDAH #621 (bentuk = boolean per bentuk + penangan lewat ref stabil):
 * **9** badan render, dan seluruhnya milik bentuk yang diseret.
 *
 * Yang dijaga test ini: bentuk yang TIDAK berubah tidak dirender ulang, TETAPI
 * bentuk yang berubah tetap berubah (memo yang membekukan layar lebih buruk
 * daripada tidak memo sama sekali).
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));
jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

jest.setTimeout(60_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";
import * as nodeTheme from "./lib/nodeTheme";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const JUMLAH = 200;
const bentuk = (i: number) => ({
  id: `g${i}`,
  type: "rect",
  x: 60 + (i % 20) * 240,
  y: 60 + Math.floor(i / 20) * 140,
  label: `Bentuk ${i}`,
  color: "indigo",
  width: 155,
  height: 70,
});

const PAPAN = [
  {
    id: "fw1",
    name: "Alur Ukur",
    description: "",
    category: "Panduan",
    nodes: Array.from({ length: JUMLAH }, (_, i) => bentuk(i)),
    edges: [] as { id: string; fromNodeId: string; toNodeId: string }[],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

/**
 * `getShapeThemeClasses(node, isSelected)` dipanggil di badan render setiap
 * bentuk, jadi ia bisa dipakai sebagai penghitung render yang persis: satu
 * panggilan = satu badan render, dan argumennya menyebut BENTUK mana.
 */
function hitungBadanRender() {
  const spy = jest.spyOn(nodeTheme, "getShapeThemeClasses");
  return {
    nol: () => spy.mockClear(),
    jumlah: () => spy.mock.calls.length,
    idTerender: () => Array.from(new Set(spy.mock.calls.map((c) => (c[0] as { id: string }).id))),
    /** Bentuk `id` dirender dengan keadaan TERPILIH? */
    terpilih: (id: string) =>
      spy.mock.calls.some((c) => (c[0] as { id: string }).id === id && c[1] === true),
    pulihkan: () => spy.mockRestore(),
  };
}

async function masukKanvas(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Ukur"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container.querySelector(".kanvas-papan") as HTMLElement;
}

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("bobot render per bingkai papan (#621)", () => {
  it("menyeret satu bentuk tidak merender ulang 199 bentuk lainnya", async () => {
    const { container } = render(
      <FlowchartView
        selectedProject={project}
        tasks={[] as Task[]}
        projectMembers={[]}
        setSelectedTaskForDetail={jest.fn()}
        setIsTaskDetailModalOpen={jest.fn()}
        currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
      />
    );
    const kanvas = await masukKanvas(container);
    const alat = hitungBadanRender();
    alat.nol();

    const sasaran = container.querySelector('[id="val-node-g0"]') as HTMLElement;
    fireEvent.mouseDown(sasaran, { clientX: 104, clientY: 104, button: 0 });
    alat.nol();
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        fireEvent.mouseMove(kanvas, { clientX: 104 + i * 12, clientY: 104 + i * 6, button: 0 });
      });
    }

    // SEBELUM #621: 1.800. Batas 30 memberi ruang gerakan tanpa kembali ke "gemuk".
    expect(alat.jumlah()).toBeLessThanOrEqual(30);
    expect(alat.idTerender()).toEqual(["g0"]);
    // Bentuk yang diseret memang bergerak, bukan hanya tidak dirender ulang.
    expect(sasaran.style.left).not.toBe(`${bentuk(0).x}px`);

    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 224, clientY: 164 });
    });
    alat.pulihkan();
  });

  it("memo tidak membekukan seleksi: bentuk yang dipilih berubah, lainnya tidak", async () => {
    const { container } = render(
      <FlowchartView
        selectedProject={project}
        tasks={[] as Task[]}
        projectMembers={[]}
        setSelectedTaskForDetail={jest.fn()}
        setIsTaskDetailModalOpen={jest.fn()}
        currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
      />
    );
    await masukKanvas(container);
    const alat = hitungBadanRender();
    alat.nol();

    fireEvent.mouseDown(container.querySelector('[id="val-node-g7"]') as HTMLElement, {
      clientX: 300,
      clientY: 100,
      button: 0,
    });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 300, clientY: 100 });
    });

    // Hanya bentuk yang masuk/keluar seleksi yang dirender ulang, dan ia
    // dirender dengan keadaan terpilih yang BARU — bukti memo tidak membekukan
    // layar.
    expect(alat.idTerender()).toEqual(["g7"]);
    expect(alat.terpilih("g7")).toBe(true);
    alat.pulihkan();
  });
});
