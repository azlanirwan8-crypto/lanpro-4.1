/**
 * @jest-environment jsdom
 *
 * #837 — dari layar sungguhan: menekan gagang tekukan tidak boleh menghapus
 * seleksi garis, dan seretan sesudahnya harus membengkokkan garis.
 *
 * Test komponen (`components/gagang-837.test.tsx`) membuktikan mousedown
 * dihentikan. Di sini dibuktikan akibat yang dilihat pemilik proyek: pada
 * tree sebelum perbaikan, `handleCanvasMouseDown` menerima mousedown dari
 * gagang, mengosongkan `selectedEdgeId`, dan gagang lenyap tepat saat ditekan.
 */
import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn().mockResolvedValue(null),
  deleteFlowchart: jest.fn(),
}));
jest.mock("html-to-image", () => ({
  toJpeg: jest.fn().mockResolvedValue("data:image/jpeg;base64,x"),
  toPng: jest.fn().mockResolvedValue("data:image/png;base64,x"),
  toSvg: jest.fn().mockResolvedValue("data:image/svg+xml,x"),
}));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fwG",
    name: "Papan Gagang",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "a0",
        type: "rect",
        x: 100,
        y: 100,
        label: "A",
        color: "indigo",
        width: 200,
        height: 100,
      },
      {
        id: "a1",
        type: "rect",
        x: 500,
        y: 400,
        label: "B",
        color: "blue",
        width: 200,
        height: 100,
      },
    ],
    edges: [{ id: "e0", fromNodeId: "a0", toNodeId: "a1" }],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
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

async function bukaPapan() {
  const hasil = renderView();
  fireEvent.click((await screen.findAllByText("Papan Gagang"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

const jalurSentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("#837 gagang tekukan di papan", () => {
  it("menekan gagang tidak mengosongkan seleksi, dan seretan membengkokkan garis", async () => {
    const container = await bukaPapan();
    const jalur = jalurSentuh(container);
    fireEvent.click(jalur);

    const pegangan = await waitFor(() => {
      const el = container.querySelector('[data-testid^="gagang-tekuk-"]');
      if (!el) throw new Error("gagang tekukan belum tampil");
      return el as SVGCircleElement;
    });
    const dAwal = jalurSentuh(container).getAttribute("d");

    // Urutan peramban sungguhan, bukan hanya pointerdown seperti test lama.
    fireEvent.pointerDown(pegangan, { clientX: 400, clientY: 250, button: 0 });
    fireEvent.mouseDown(pegangan, { clientX: 400, clientY: 250, button: 0 });

    expect(container.querySelector('[data-testid^="gagang-tekuk-"]')).not.toBeNull();

    // #835 — titik yang duduk tepat DI ATAS rute otomatis sengaja dibuang
    // sebagai salinan router, jadi seretan harus keluar rute (x=400) untuk
    // membuktikan garisnya benar-benar dibengkokkan.
    act(() => {
      const gerak = new Event("pointermove", { bubbles: true });
      Object.assign(gerak, { clientX: 340, clientY: 320 });
      window.dispatchEvent(gerak);
    });
    fireEvent.pointerUp(window);

    // Pendengar seret hidup di `window` dan menulis state; tunggu render-nya.
    await waitFor(() => expect(jalurSentuh(container).getAttribute("d")).not.toBe(dAwal));
  });
});
