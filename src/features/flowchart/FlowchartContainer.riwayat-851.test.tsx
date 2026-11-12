/**
 * @jest-environment jsdom
 *
 * #851 — satu seretan garis = SATU snapshot papan, bukan satu per gerakan.
 *
 * UKURAN, BUKAN DUGAAN. Probe pada `main` menghitung 61 `onEdgePatch` untuk
 * seretan 60 langkah, dan tiap panggilan menyalin SELURUH papan lewat
 * `JSON.parse(JSON.stringify(...))` (terukur 0,41 ms pada 40 bentuk / 0,94 ms
 * pada 100 bentuk). Yang TIDAK terjadi di `main` adalah 61 ENTRI riwayat:
 * penutup seret memakai `historyIndex` dari render saat seret dimulai, jadi
 * setiap snapshot memotong antrean ke panjang yang sama dan saling menimpa.
 * Karena itu undo pada `main` kebetulan tetap benar — yang salah adalah 61
 * salinan penuh yang dibuang. Test kedua di bawah mengunci ukuran itu; test
 * pertama mengunci hasil yang dilihat pengguna supaya perbaikan ini tidak
 * boleh mengubah perilaku undo.
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
    id: "fwR",
    name: "Papan Riwayat",
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
  fireEvent.click((await screen.findAllByText("Papan Riwayat"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

const jalurSentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

const geser = (x: number, y: number) => {
  const ev = new Event("pointermove", { bubbles: true });
  Object.assign(ev, { clientX: x, clientY: y });
  act(() => window.dispatchEvent(ev));
};

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("#851 riwayat seret garis di papan", () => {
  it("satu seretan menyalin papan sekali, bukan sekali per gerakan", async () => {
    // Setiap snapshot menyalin `nodes` dan `edges` sendiri-sendiri; yang dihitung
    // hanya salinan daftar garis (ditandai `fromNodeId`), supaya stringify milik
    // modul lain tidak ikut terhitung.
    const stringifyAsli = JSON.stringify.bind(JSON);
    let salinanPapan = 0;
    const intip = jest.spyOn(JSON, "stringify").mockImplementation((...args: unknown[]) => {
      const hasil = (stringifyAsli as (...a: unknown[]) => string | undefined)(...args);
      if (typeof hasil === "string" && hasil.includes('"fromNodeId"')) salinanPapan++;
      return hasil as string;
    });

    try {
      const container = await bukaPapan();
      fireEvent.click(jalurSentuh(container));
      const pegangan = await waitFor(() => {
        const el = container.querySelector('[data-testid^="gagang-tekuk-"]');
        if (!el) throw new Error("gagang tekukan belum tampil");
        return el as SVGCircleElement;
      });
      const dAwal = jalurSentuh(container).getAttribute("d");

      fireEvent.pointerDown(pegangan, { clientX: 400, clientY: 250, button: 0 });
      fireEvent.mouseDown(pegangan, { clientX: 400, clientY: 250, button: 0 });
      salinanPapan = 0;
      for (let i = 1; i <= 8; i++) geser(400 - i * 5, 250 + i * 5);
      fireEvent.pointerUp(window);
      await waitFor(() => expect(jalurSentuh(container).getAttribute("d")).not.toBe(dAwal));

      // Satu snapshot = satu salinan daftar garis. Delapan gerakan di `main`
      // menghasilkan delapan salinan yang langsung dibuang; di sini satu.
      expect(salinanPapan).toBeLessThanOrEqual(2);
    } finally {
      intip.mockRestore();
    }
  });

  it("satu Ctrl+Z membatalkan seluruh seretan terakhir, bukan potongannya", async () => {
    const container = await bukaPapan();
    fireEvent.click(jalurSentuh(container));

    const pegangan = await waitFor(() => {
      const el = container.querySelector('[data-testid^="gagang-tekuk-"]');
      if (!el) throw new Error("gagang tekukan belum tampil");
      return el as SVGCircleElement;
    });
    const dAwal = jalurSentuh(container).getAttribute("d");

    // Seretan pertama: sisipkan tekukan, lalu geser keluar rute.
    fireEvent.pointerDown(pegangan, { clientX: 400, clientY: 250, button: 0 });
    fireEvent.mouseDown(pegangan, { clientX: 400, clientY: 250, button: 0 });
    for (let i = 1; i <= 8; i++) geser(400 - i * 5, 250 + i * 5);
    fireEvent.pointerUp(window);

    await waitFor(() => expect(jalurSentuh(container).getAttribute("d")).not.toBe(dAwal));
    const dSatu = jalurSentuh(container).getAttribute("d");

    // Seretan kedua pada tekukan yang sudah ada.
    const tekukan = await waitFor(() => {
      const el = container.querySelector('[data-testid="tekukan-0"]');
      if (!el) throw new Error("tekukan belum tampil");
      return el as SVGCircleElement;
    });
    fireEvent.pointerDown(tekukan, { clientX: 360, clientY: 290, button: 0 });
    fireEvent.mouseDown(tekukan, { clientX: 360, clientY: 290, button: 0 });
    for (let i = 1; i <= 8; i++) geser(360 - i * 5, 290 + i * 5);
    fireEvent.pointerUp(window);

    await waitFor(() => expect(jalurSentuh(container).getAttribute("d")).not.toBe(dSatu));

    act(() => {
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    });

    await waitFor(() => expect(jalurSentuh(container).getAttribute("d")).toBe(dSatu));
  });
});
