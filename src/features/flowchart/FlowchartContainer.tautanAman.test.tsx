/**
 * #584 — baris lama yang isinya tidak bisa dipercaya.
 *
 * Lampiran flowchart disimpan sebagai JSON di kolom `canvasData`, dan kolom itu
 * ditulis oleh KLIEN. Validasi saat menyimpan (#583) hanya melindungi tulisan
 * baru: baris yang sudah ada — dan baris yang ditulis oleh tab rusak atau tangan
 * iseng — tetap terbaca oleh layar ini. Jadi yang diuji di sini adalah apa yang
 * masuk ke `href` saat merender, bukan apa yang lewat saat menyimpan.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

jest.mock("sonner", () => ({
  __esModule: true,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    custom: jest.fn(),
    dismiss: jest.fn(),
    message: jest.fn(),
  },
  Toaster: () => null,
}));

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const dokumen = (sebagainya: Record<string, unknown>) => ({
  id: "doc-lama",
  name: "Lampiran Lama",
  createdAt: "9/29/2026, 10.00.00",
  createdBy: "Administrator",
  ...sebagainya,
});

const alur = (documents: unknown[]) =>
  ({
    id: "fw20",
    name: "Alur Tautan",
    description: "",
    category: "Panduan",
    nodes: [{ id: "node_start", type: "oval", x: 150, y: 150, label: "Mulai", color: "emerald" }],
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
    documents,
  }) as any;

async function bukaDaftarDokumen(documents: unknown[]) {
  (fetchFlowcharts as jest.Mock).mockResolvedValue([alur(documents)]);
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
  fireEvent.click(screen.getAllByText("Daftar Dokumen")[0].closest("button") as HTMLElement);
  return hasil.container;
}

/** Semua `href` yang benar-benar terpasang di DOM, apa pun yang ditulis barisnya. */
const hrefTerpasang = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") || "");

describe("FlowchartView — tautan lampiran disaring saat dirender (#584)", () => {
  it("baris javascript: tidak memasang tautan sama sekali", async () => {
    const container = await bukaDaftarDokumen([
      dokumen({ link: "javascript:alert(1)" }),
      dokumen({ id: "doc-2", link: "  JaVaScRiPt:fetch('//x')" }),
      dokumen({ id: "doc-3", link: "data:text/html,<script>alert(1)</script>" }),
    ]);

    expect(hrefTerpasang(container)).toEqual([]);
    // Kegagalannya disampaikan, tidak dibuat diam-diam hilang.
    expect(screen.getAllByText(/tidak dikenal|unrecognised/i).length).toBe(3);
    // Teksnya tetap terlihat supaya pemilik tahu apa yang harus disalin manual.
    expect(screen.getByText("javascript:alert(1)")).toBeTruthy();
  });

  it("baris lama tanpa awalan dan berkas base64 lama tetap bisa dibuka", async () => {
    const pdf = "data:application/pdf;base64,JVBERi0xLjQK";
    const container = await bukaDaftarDokumen([
      dokumen({ link: "docs.google.com/document/d/abc" }),
      dokumen({ id: "doc-2", link: "", fileData: pdf, fileName: "brd.pdf" }),
    ]);

    const hrefs = hrefTerpasang(container);
    expect(hrefs).toContain("https://docs.google.com/document/d/abc");
    expect(hrefs).toContain(pdf);
    expect(screen.queryByText(/tidak dikenal|unrecognised/i)).toBeNull();
  });

  it("lampiran lama berupa data:text/html tidak dipasang sebagai tautan unduh", async () => {
    const container = await bukaDaftarDokumen([
      dokumen({ link: "", fileData: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" }),
    ]);

    expect(hrefTerpasang(container)).toEqual([]);
  });
});
