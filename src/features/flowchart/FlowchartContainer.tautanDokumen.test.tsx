/**
 * #583 — "Add Document" tidak lagi mengunggah berkas.
 *
 * Alasannya ukuran: berkas 5 MB masuk ke payload `canvasData` sebagai base64,
 * jadi satu lampiran menambah ~6,7 MB teks pada baris yang juga ditulis ulang
 * oleh autosave setiap beberapa detik. Yang pemilik proyek minta: tautan dokumen.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  loading: jest.fn(),
  custom: jest.fn(),
  dismiss: jest.fn(),
  message: jest.fn(),
};
jest.mock("sonner", () => ({ __esModule: true, toast: mockToast, Toaster: () => null }));

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const alur = {
  id: "fw20",
  name: "Alur Tautan",
  description: "",
  category: "Panduan",
  nodes: [
    {
      id: "node_start",
      type: "oval",
      x: 150,
      y: 150,
      label: "Mulai",
      color: "emerald",
      width: 140,
      height: 70,
    },
  ],
  edges: [],
  theme: "miro",
  createdBy: "u1",
  createdByName: "Administrator",
  documents: [],
};

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockResolvedValue([alur]);
  mockToast.error.mockClear();
  mockToast.success.mockClear();
});

async function bukaDaftarDokumen() {
  const hasil = render(
    <FlowchartView
      selectedProject={project}
      tasks={[] as Task[]}
      projectMembers={[]}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
      currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
    />
  );
  fireEvent.click((await screen.findAllByText("Alur Tautan"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  // Kartu papan membuka tab Diagram Alur; daftar dokumen ada di tab sebelahnya.
  fireEvent.click(screen.getAllByText("Daftar Dokumen")[0].closest("button") as HTMLElement);
  fireEvent.click(await screen.findByText("Tambah Dokumen"));
  return hasil.container;
}

describe("FlowchartView — lampiran berupa tautan dokumen (#583)", () => {
  it("modal tambah dokumen meminta tautan, bukan berkas", async () => {
    const container = await bukaDaftarDokumen();

    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.querySelector('input[type="url"]')).toBeTruthy();
    // Judul modal dan label field sama-sama menyebut "tautan dokumen".
    expect(screen.getAllByText(/tautan dokumen/i).length).toBeGreaterThan(0);
  });

  it("tautan tanpa http ditolak, dan pesan galatnya menyebut kenapa", async () => {
    const container = await bukaDaftarDokumen();
    const [nama, tautan] = container.querySelectorAll("input") as NodeListOf<HTMLInputElement>;

    fireEvent.change(nama, { target: { value: "BRD QRIS" } });
    fireEvent.change(tautan, { target: { value: "docs.google.com/abc" } });
    fireEvent.click(screen.getByText("Simpan Tautan"));

    expect(mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/http/i));
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("tautan yang sah tampil sebagai kartu dengan tombol Buka Tautan", async () => {
    const container = await bukaDaftarDokumen();
    const [nama, tautan] = container.querySelectorAll("input") as NodeListOf<HTMLInputElement>;

    fireEvent.change(nama, { target: { value: "BRD QRIS" } });
    fireEvent.change(tautan, { target: { value: "https://docs.google.com/document/d/abc" } });
    fireEvent.click(screen.getByText("Simpan Tautan"));

    await waitFor(() => expect(screen.getByText("BRD QRIS")).toBeTruthy());
    const buka = screen.getByText("Buka Tautan").closest("a") as HTMLAnchorElement;
    expect(buka.getAttribute("href")).toBe("https://docs.google.com/document/d/abc");
    // Tautan eksternal selalu dibuka dengan rel ini, kalau-kalau isinya jahat.
    expect(buka.getAttribute("rel")).toContain("noopener");
  });
});
