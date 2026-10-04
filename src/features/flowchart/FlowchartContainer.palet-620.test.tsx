/**
 * @jest-environment jsdom
 *
 * #620 — palet bentuk dan sistem tipe papan kini satu sumber.
 *
 * Yang diuji di sini bukan jumlahnya (itu sudah dijaga `katalog-bentuk.test.ts`
 * dan oleh kompilator lewat `Record<TipeBentukEkstra, Pembuat>`), melainkan dua
 * akibat yang terasa di tangan:
 *  1. 138 bentuk tambahan tidak dikenal `FlowNodeType` dan masuk lewat cast,
 *     jadi tidak ada yang menolak bentuk tanpa gambar;
 *  2. `handleAddNewNode` hanya punya label untuk sebagian tipe, sehingga setiap
 *     bentuk ekstra lahir bernama "Teks Baru" — papan berisi 206 bentuk yang
 *     semuanya bernama sama sampai pengguna sempat mengetik.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const PAPAN = [
  {
    id: "fw6",
    name: "Alur Palet",
    description: "",
    category: "Panduan",
    nodes: [],
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

/** Buka papan kosong lalu buka palet simbol. */
async function bukaPalet(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Palet"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  fireEvent.click(screen.getByTitle(/koleksi simbol|symbol collection/i));
  return {
    cari: await screen.findByPlaceholderText(/Cari bentuk|Search shapes/i),
    kanvas: container.querySelector(".kanvas-papan") as HTMLElement,
  };
}

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("palet bentuk (#620)", () => {
  it("bentuk ekstra lahir dengan namanya sendiri, bukan 'Teks Baru'", async () => {
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
    const { cari } = await bukaPalet(container);

    fireEvent.change(cari, { target: { value: "timer" } });
    fireEvent.click(await screen.findByText("Timer Event"));

    const bentukBaru = await waitFor(() => {
      const el = container.querySelector('[id^="val-node-"]') as HTMLElement;
      expect(el).toBeTruthy();
      return el;
    });
    expect(bentukBaru.textContent).toContain("Timer Event");
    expect(screen.queryByText("Teks Baru")).toBeNull();
  });

  it("bentuk ekstra digambar sebagai SVG, bukan teks tanpa rangka", async () => {
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
    const { cari } = await bukaPalet(container);

    fireEvent.change(cari, { target: { value: "load balancer" } });
    fireEvent.click(await screen.findByText("Load Balancer"));

    await waitFor(() => expect(container.querySelector('[id^="val-node-"] svg')).toBeTruthy());
  });
});
