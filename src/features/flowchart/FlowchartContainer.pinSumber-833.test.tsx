/**
 * @jest-environment jsdom
 *
 * #833 — garis baru menempel di TITIK YANG DITARIK, bukan port pilihan papan.
 *
 * SEBAB TEST INI ADA. #762 sudah mengunci pin pada UJUNG LEPAS, dan ujung itu
 * memang ditulis dari layar. Sumbernya belum: `handleConnectPortClick` menerima
 * nama sisi paku lalu MEMBUANGNYA, dan `tambahSambungan` tidak pernah mengisi
 * `portSumber`. Efeknya garis yang ditarik dari sudut kiri bawah sebuah bentuk
 * selalu melompat ke port tengah — dan arah keluar port itulah yang menentukan
 * bentuk belokan pertama rute ortogonal.
 *
 * Yang dikunci: garis hasil seret dari paku kanan menyimpan `portSumber` di
 * pecahan kanan (x = 1), dan garis baru membawa bentuk ortogonal supaya ekspor
 * draw.io menuliskannya sebagai `edgeStyle=orthogonalEdgeStyle`.
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
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fwP",
    name: "Papan Pin Sumber",
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
    edges: [],
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

const bentuk = (container: HTMLElement, id: string) =>
  container.querySelector(`[id="val-node-${id}"]`) as HTMLElement;

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue(null);
});

describe("#833 pin sumber garis baru", () => {
  it("seret dari paku kanan menyimpan portSumber di sisi kanan", async () => {
    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Papan Pin Sumber"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    // Pilih bentuk supaya paku sambungnya muncul.
    fireEvent.mouseDown(bentuk(container, "a0"), { clientX: 200, clientY: 150, button: 0 });
    fireEvent.mouseUp(window);

    const pakuKanan = await screen.findByTitle(/Tarik panah dari sisi kanan/i);
    fireEvent.mouseDown(pakuKanan, { clientX: 300, clientY: 150, button: 0 });
    // Lepas di atas bentuk kedua; di jsdom semua koordinat papan = koordinat klien.
    fireEvent.mouseMove(window, { clientX: 600, clientY: 450 });
    fireEvent.mouseUp(window, { clientX: 600, clientY: 450 });

    fireEvent.click(await screen.findByTitle(/Simpan seluruh diagram alur/i));
    await waitFor(() => expect(updateFlowchart).toHaveBeenCalled());

    const payload = (updateFlowchart as jest.Mock).mock.calls
      .map((c) => c[2])
      .find((p) => Array.isArray(p?.edges) && p.edges.some((e: any) => e.fromNodeId === "a0"));
    expect(payload).toBeTruthy();
    const garis = payload.edges.find((e: any) => e.fromNodeId === "a0");
    expect(garis.toNodeId).toBe("a1");
    expect(garis.connector).toBe("orthogonal");
    expect(garis.portSumber).toBeTruthy();
    // Bukan port tengah-kanan pilihan papan (1, 0.5): yang disentuh adalah titik
    // di sisi kanan itu, dan pecahannya harus mengikuti jari — bukan dipusatkan.
    expect(garis.portSumber).not.toEqual({ x: 1, y: 0.5 });
    expect(garis.portSumber.x).toBeGreaterThanOrEqual(0);
    expect(garis.portSumber.x).toBeLessThanOrEqual(1);
    expect(garis.portSumber.y).toBeGreaterThanOrEqual(0);
    expect(garis.portSumber.y).toBeLessThanOrEqual(1);
  });
});
