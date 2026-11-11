/**
 * @jest-environment jsdom
 *
 * #838 — keluhan dari layar sungguhan: garis dua bentik hampir sejajar punya
 * undakan kecil di tengah (rute otomatis H-V-H, #833) dan TIDAK ADA cara
 * meluruskan: tombol "Luruskan Garis" nonaktif karena waypoint sudah kosong.
 *
 * Di sini dibuktikan akhir ceritanya: pilih garis, tekan "Luruskan Garis" di
 * panel, dan undakan hilang — `d` berubah dari dua sudut membulat (perintah
 * `Q`) menjadi satu segmen lurus. Pada tree sebelum perbaikan tombolnya mati
 * dan klik tidak mengubah apa pun.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  toSvg: jest.fn().mockResolvedValue("data:image/svg+xml;base64,x"),
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

// Dua bentuk sengaja TIDAK sama y (selisih 12 px): router ortogonal wajib
// menyisipkan undakan di tengah — persis tangkapan layar pemilik proyek.
const PAPAN = [
  {
    id: "fwL",
    name: "Papan Luruskan",
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
        y: 112,
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
  fireEvent.click((await screen.findAllByText("Papan Luruskan"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

const jalurSentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("#838 Luruskan Garis pada garis polos berundak", () => {
  it("satu klik panel menghilangkan undakan: d tanpa sudut membulat", async () => {
    const container = await bukaPapan();

    fireEvent.click(jalurSentuh(container));
    const tombol = await screen.findByText("Luruskan Garis");
    // Tombol panel selalu terlihat; undakan ini bawaan rute otomatis, bukan
    // waypoint, jadi sebelum #838 ia justru nonaktif di keadaan ini.
    expect((tombol as HTMLButtonElement).disabled).toBe(false);

    const dAwal = jalurSentuh(container).getAttribute("d") || "";
    expect(dAwal).toContain("Q");

    fireEvent.click(tombol);

    await waitFor(() => {
      const d = jalurSentuh(container).getAttribute("d") || "";
      expect(d).not.toBe(dAwal);
      // Mode lurus menggambar polyline polos (hanya M/L); sudut membulat
      // fillet ortogonal selalu membawa perintah Q.
      expect(d).not.toContain("Q");
    });
  });
});
