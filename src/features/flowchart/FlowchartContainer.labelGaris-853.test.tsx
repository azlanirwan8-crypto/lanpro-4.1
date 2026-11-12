/**
 * @jest-environment jsdom
 *
 * #853 — dari layar sungguhan: klik-ganda garis membuka kotak label DI ATAS
 * garis, dan satu suntingan adalah SATU langkah riwayat.
 *
 * Test komponen (`components/labelGaris-853.test.tsx`) membuktikan mekanikanya.
 * Di sini dibuktikan akibat yang dilihat pemilik proyek: pada tree sebelum
 * perbaikan, klik-ganda garis tidak membuka apa pun (kotak label hanya ada di
 * panel kanan yang tertutup), dan peristiwa gandanya justru sampai ke kanvas
 * lalu memunculkan catatan tempel baru di atas garis.
 *
 * Riwayat diuji lewat Ctrl+Z, bukan lewat hitungan salinan: mengetik beberapa
 * huruf pada suntingan kedua, lalu satu Ctrl+Z, harus kembali ke label hasil
 * suntingan PERTAMA — bukan mundur satu huruf.
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
    id: "fwL",
    name: "Papan Label",
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
    edges: [{ id: "e0", fromNodeId: "a0", toNodeId: "a1", label: "awal" }],
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
  fireEvent.click((await screen.findAllByText("Papan Label"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

const jalurSentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

const kotakLabel = (container: HTMLElement) =>
  container.querySelector('[data-testid="label-garis-e0"]') as SVGForeignObjectElement | null;

const teksLabel = (container: HTMLElement) => kotakLabel(container)?.textContent ?? null;

/** Buka kotak sunting lewat klik-ganda, ketik, lalu tutup dengan Escape. */
async function suntingLabel(container: HTMLElement, ketikan: string[]): Promise<HTMLInputElement> {
  fireEvent.doubleClick(jalurSentuh(container));
  const input = (await screen.findByTestId("sunting-label-garis-e0")) as HTMLInputElement;
  input.focus();
  for (const nilai of ketikan) fireEvent.change(input, { target: { value: nilai } });
  fireEvent.keyDown(input, { key: "Escape" });
  await waitFor(() =>
    expect(container.querySelector('[data-testid="sunting-label-garis-e0"]')).toBeNull()
  );
  return input;
}

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("#853 label garis di papan", () => {
  it("klik-ganda membuka input, mengetik mengubah label, Escape menutup — dan satu Ctrl+Z membatalkan SATU suntingan", async () => {
    const container = await bukaPapan();
    expect(container.querySelector('[data-testid="sunting-label-garis-e0"]')).toBeNull();

    fireEvent.doubleClick(jalurSentuh(container));
    const pertama = (await screen.findByTestId("sunting-label-garis-e0")) as HTMLInputElement;
    expect(pertama.value).toBe("awal");
    // Klik-ganda tidak boleh sampai ke kanvas dan memunculkan catatan tempel.
    expect(screen.queryByText("Ide Baru Miro 🤔")).toBeNull();
    pertama.focus();
    fireEvent.change(pertama, { target: { value: "Satu" } });
    fireEvent.keyDown(pertama, { key: "Escape" });

    await waitFor(() =>
      expect(container.querySelector('[data-testid="sunting-label-garis-e0"]')).toBeNull()
    );
    expect(teksLabel(container)).toBe("Satu");

    // Suntingan kedua, diketik huruf demi huruf.
    await suntingLabel(container, ["D", "Du", "Dua"]);
    expect(teksLabel(container)).toBe("Dua");

    // Satu Ctrl+Z = kembali ke hasil suntingan pertama. Kalau tiap huruf
    // menulis satu snapshot, hasilnya justru "Du".
    act(() => {
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    });
    await waitFor(() => expect(teksLabel(container)).toBe("Satu"));
  });

  it("tanpa klik-ganda tidak ada input label di atas garis", async () => {
    const container = await bukaPapan();
    fireEvent.click(jalurSentuh(container));
    expect(container.querySelector('[data-testid="sunting-label-garis-e0"]')).toBeNull();
    expect(teksLabel(container)).toBe("awal");
  });
});
