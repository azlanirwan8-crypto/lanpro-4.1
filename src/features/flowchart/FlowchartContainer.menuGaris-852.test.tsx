/**
 * @jest-environment jsdom
 *
 * #852 — klik-kanan pada GARIS membuka menu garis, bukan menu tambah bentuk.
 *
 * Sebelum perbaikan, `onContextMenu` kanvas hanya mengecualikan tombol, input,
 * dan pembungkus bentuk; jalur SVG garis lolos ke `CanvasContextMenu` yang
 * berisi daftar bentuk. Pengguna yang ingin menghapus garis malah ditawari
 * menambah bentuk di titik itu, dan tidak ada satu pun aksi garis di sana.
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
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fwM",
    name: "Papan Menu",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "m0",
        type: "rect",
        x: 100,
        y: 100,
        label: "A",
        color: "indigo",
        width: 200,
        height: 100,
      },
      {
        id: "m1",
        type: "rect",
        x: 500,
        y: 400,
        label: "B",
        color: "blue",
        width: 200,
        height: 100,
      },
    ],
    edges: [{ id: "e0", fromNodeId: "m0", toNodeId: "m1" }],
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
  fireEvent.click((await screen.findAllByText("Papan Menu"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

const jalurSentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("#852 menu klik-kanan garis", () => {
  it("klik-kanan garis membuka menu garis dan TIDAK membuka menu bentuk", async () => {
    const container = await bukaPapan();

    fireEvent.contextMenu(jalurSentuh(container), { clientX: 320, clientY: 220 });

    await waitFor(() =>
      expect(container.querySelector('[data-testid="menu-garis"]')).not.toBeNull()
    );
    expect(screen.getByText("Aksi Garis")).toBeTruthy();
    expect(screen.queryByText("Aksi Kanvas")).toBeNull();
    // Menu bentuk punya judul "Aksi Komponen"; menu garis tidak boleh dua-duanya.
    expect(screen.queryByText("Aksi Komponen")).toBeNull();
  });

  it("klik-kanan pada latar tetap membuka menu bentuk", async () => {
    const container = await bukaPapan();
    const kanvas = container.querySelector(".kanvas-papan") as HTMLElement;

    fireEvent.contextMenu(kanvas, { clientX: 60, clientY: 60 });

    await waitFor(() => expect(screen.getByText("Aksi Kanvas")).toBeTruthy());
    expect(container.querySelector('[data-testid="menu-garis"]')).toBeNull();
  });

  it("Ubah Label membuka panel kanan yang memuat kolom label garis", async () => {
    const container = await bukaPapan();

    fireEvent.contextMenu(jalurSentuh(container), { clientX: 320, clientY: 220 });
    await waitFor(() =>
      expect(container.querySelector('[data-testid="menu-garis"]')).not.toBeNull()
    );
    fireEvent.click(screen.getByText("Ubah Label"));

    await waitFor(() => expect(screen.getByPlaceholderText("Ya / Tidak / Proses...")).toBeTruthy());
  });

  it("Hapus Garis menghapus garis itu saja, bentuknya tetap", async () => {
    const container = await bukaPapan();

    fireEvent.contextMenu(jalurSentuh(container), { clientX: 320, clientY: 220 });
    await waitFor(() =>
      expect(container.querySelector('[data-testid="menu-garis"]')).not.toBeNull()
    );
    fireEvent.click(screen.getByText("Hapus Garis"));

    await waitFor(() => expect(jalurSentuh(container)).toBeNull());
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });
});
