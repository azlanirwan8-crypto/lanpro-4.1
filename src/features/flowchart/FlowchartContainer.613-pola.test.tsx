/**
 * #613 — pola latar papan bisa dipilih (polos / bertitik / berkisi) dan KISI-nya
 * benar-benar tergambar.
 *
 * DUA HAL YANG DIKUNCI.
 * (1) Kontrak baru: `.grid-dots-light`/`.grid-blueprint-dark` dulu dipilih dari
 *     tema aplikasi dan TIDAK PERNAH punya `background-size`, jadi gradiennya
 *     hanya digambar sekali untuk seluruh elemen — satu titik di tengah papan,
 *     bukan kisi titik. Terukur di peramban: `background-size: auto` pada elemen
 *     800x600. Kelas baru wajib membawa ukuran ubin.
 * (2) Pilihan pengguna tersimpan per papan dan ikut SEMUA jalur tulis (#570),
 *     sementara warna papan tetap ikut tema aplikasi (#547).
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";

jest.setTimeout(40_000);

const project = { id: "p1", name: "Proyek Uji" } as Project;

const papan = (isi: Record<string, unknown>) =>
  ({
    id: "fw13",
    name: "Alur Pola",
    description: "",
    category: "Panduan",
    nodes: [
      { id: "n1", type: "rect", x: 40, y: 40, label: "A", color: "indigo", width: 155, height: 70 },
    ],
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
    documents: [],
    ...isi,
  }) as never;

async function bukaEditor() {
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
  fireEvent.click((await screen.findAllByText("Alur Pola", undefined, { timeout: 8000 }))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping|Snap grid|Free move/i);
  return hasil;
}

beforeEach(() => {
  localStorage.clear();
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue({});
});

describe("#613 — pola papan", () => {
  it("bawaannya bertitik, dan polanya benar-benar diulang (bukan satu titik)", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([papan({})]);
    const { container } = await bukaEditor();

    expect(container.querySelector(".papan-titik")).toBeTruthy();

    const gaya = Array.from(container.querySelectorAll("style"))
      .map((s) => s.textContent || "")
      .join("\n");
    expect(gaya).toMatch(/\.papan-titik\s*\{[^}]*background-size:\s*20px 20px/);
    expect(gaya).toMatch(/\.papan-kisi\s*\{[^}]*background-size:\s*20px 20px/);
  });

  it("ikon papan polos melepas kisi dan perubahannya sampai ke server", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([papan({})]);
    const { container } = await bukaEditor();

    fireEvent.click(screen.getByLabelText("Papan polos"));

    await waitFor(() => expect(container.querySelector(".papan-titik")).toBeNull());

    await waitFor(
      () =>
        expect(updateFlowchart).toHaveBeenCalledWith(
          "p1",
          "fw13",
          expect.objectContaining({ polaPapan: "polos" })
        ),
      { timeout: 9000 }
    );
  });

  it("papan yang tersimpan berkisi dibuka kembali berkisi", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([papan({ polaPapan: "kisi" })]);
    const { container } = await bukaEditor();

    expect(container.querySelector(".papan-kisi")).toBeTruthy();
    expect(container.querySelector(".papan-titik")).toBeNull();
  });

  it("warna papan tetap ikut tema aplikasi walau pola dipilih (#547 tidak dibalik)", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([papan({})]);
    const { container } = await bukaEditor();

    const papanEl = container.querySelector(".papan-titik") as Element;
    expect(papanEl.getAttribute("class")).toMatch(/bg-surface/);
    // Kontrak #547: tidak ada warna keras di elemen papan.
    expect(papanEl.getAttribute("class")).not.toMatch(/#0a1124|sky-100/);
  });

  it("ketiganya ada di bilah kendali dan yang aktif terbaca dari aria-pressed", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([papan({})]);
    await bukaEditor();

    const polos = screen.getByLabelText("Papan polos");
    const titik = screen.getByLabelText("Papan bertitik");
    const kisi = screen.getByLabelText("Papan berkisi");

    expect(titik).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(kisi);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(kisi).toHaveAttribute("aria-pressed", "true");
    expect(titik).toHaveAttribute("aria-pressed", "false");
    expect(polos).toHaveAttribute("aria-pressed", "false");
  });
});
