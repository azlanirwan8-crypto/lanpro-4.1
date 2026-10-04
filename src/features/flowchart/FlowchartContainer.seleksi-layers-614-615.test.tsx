/**
 * @jest-environment jsdom
 *
 * #614 + #615 — seleksi kelompok dan tata lapisan papan flowchart.
 *
 * Yang diuji adalah dua hal yang sebelumnya TIDAK ADA sama sekali:
 * - kelompok seleksi hanya bisa lahir dari Shift+seret; Shift+klik diabaikan
 *   (`shiftKey` tidak dibaca di penangan klik bentuk), dan kelompok yang sudah
 *   lahir tidak punya kotak bersama, hanya ring per bentuk;
 * - tidak ada satu pun kontrol z-order, jadi bentuk yang menutupi bentuk lain
 *   hanya bisa ditata dengan hapus lalu gambar ulang.
 */
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
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
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

/** Tiga bentuk yang saling bertumpuk: g0 tertutup g1, g1 tertutup g2. */
const PAPAN = [
  {
    id: "fw1",
    name: "Alur Lapisan",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "g0",
        type: "rect",
        x: 100,
        y: 100,
        label: "Satu",
        color: "indigo",
        width: 200,
        height: 100,
      },
      {
        id: "g1",
        type: "rect",
        x: 160,
        y: 130,
        label: "Dua",
        color: "blue",
        width: 200,
        height: 100,
      },
      {
        id: "g2",
        type: "rect",
        x: 220,
        y: 160,
        label: "Tiga",
        color: "sky",
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

async function masukKanvas(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Lapisan"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container.querySelector(".kanvas-papan") as HTMLElement;
}

const bentuk = (container: HTMLElement, id: string) =>
  container.querySelector(`[id="val-node-${id}"]`) as HTMLElement;

/** Urutan DOM = urutan lukis: yang terakhir ada di paling depan. */
const urutanDom = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[id^="val-node-"]')).map((el) => el.id);

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue(null);
});

describe("tata lapisan bentuk (#615)", () => {
  it("mengirim bentuk ke paling belakang mengubah urutan lukis", async () => {
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
    await masukKanvas(container);
    expect(urutanDom(container)).toEqual(["val-node-g0", "val-node-g1", "val-node-g2"]);

    fireEvent.contextMenu(bentuk(container, "g2"));
    fireEvent.click(await screen.findByLabelText("Paling belakang"));

    await waitFor(() =>
      expect(urutanDom(container)).toEqual(["val-node-g2", "val-node-g0", "val-node-g1"])
    );
  });

  it("membawa bentuk ke paling depan dari posisi tengah", async () => {
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
    await masukKanvas(container);

    fireEvent.contextMenu(bentuk(container, "g0"));
    fireEvent.click(await screen.findByLabelText("Paling depan"));

    await waitFor(() =>
      expect(urutanDom(container)).toEqual(["val-node-g1", "val-node-g2", "val-node-g0"])
    );
  });

  it("naik satu tingkat hanya bertukar dengan tetangganya", async () => {
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
    await masukKanvas(container);

    fireEvent.contextMenu(bentuk(container, "g0"));
    fireEvent.click(await screen.findByLabelText("Naik satu tingkat"));

    await waitFor(() =>
      expect(urutanDom(container)).toEqual(["val-node-g1", "val-node-g0", "val-node-g2"])
    );
  });

  /**
   * Lesson #570: urutan lukis tidak disimpan di kolom mana pun — ia hidup di
   * DALAM urutan array `nodes`. Kalau ada jalur tulis yang menyortir array itu,
   * tataan pengguna hilang diam-diam saat papan dibuka ulang.
   */
  it("urutan lapisan ikut terkirim ke server, bukan hanya mengubah layar", async () => {
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
    await masukKanvas(container);

    fireEvent.contextMenu(bentuk(container, "g2"));
    fireEvent.click(await screen.findByLabelText("Paling belakang"));
    await waitFor(() => expect(urutanDom(container)[0]).toBe("val-node-g2"));

    await waitFor(
      () =>
        expect(updateFlowchart).toHaveBeenCalledWith(
          "p1",
          "fw1",
          expect.objectContaining({
            nodes: [
              expect.objectContaining({ id: "g2" }),
              expect.objectContaining({ id: "g0" }),
              expect.objectContaining({ id: "g1" }),
            ],
          })
        ),
      { timeout: 9000 }
    );
  });
});

describe("seleksi kelompok dengan klik (#614)", () => {
  const renderPapan = () =>
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

  it("Shift+klik bentuk kedua memunculkan satu kotak bersama, lalu menyeret salah satu menggerakkan keduanya", async () => {
    const { container } = renderPapan();
    const kanvas = await masukKanvas(container);

    fireEvent.mouseDown(bentuk(container, "g0"), { clientX: 120, clientY: 120, button: 0 });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 120, clientY: 120 });
    });
    expect(container.querySelector('[data-testid="kotak-grup"]')).toBeNull();

    fireEvent.mouseDown(bentuk(container, "g1"), {
      clientX: 200,
      clientY: 160,
      button: 0,
      shiftKey: true,
    });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 200, clientY: 160 });
    });

    const kotak = container.querySelector('[data-testid="kotak-grup"]') as HTMLElement;
    expect(kotak).toBeTruthy();
    expect(kotak.style.width).toBeTruthy();
    // Delapan pegangan bersama, bukan satu per bentuk.
    expect(container.querySelectorAll('[data-testid^="pegangan-grup-"]')).toHaveLength(8);

    const kiriG2Awal = bentuk(container, "g2").style.left;
    const kiriG1Awal = bentuk(container, "g1").style.left;
    fireEvent.mouseDown(bentuk(container, "g0"), { clientX: 120, clientY: 120, button: 0 });
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.mouseMove(kanvas, { clientX: 120 + i * 16, clientY: 120 + i * 8, button: 0 });
      });
    }
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 200, clientY: 160 });
    });

    expect(bentuk(container, "g0").style.left).not.toBe("100px");
    expect(bentuk(container, "g1").style.left).not.toBe(kiriG1Awal);
    // g2 bukan anggota kelompok: tidak boleh ikut bergerak.
    expect(bentuk(container, "g2").style.left).toBe(kiriG2Awal);
  });

  it("Shift+klik bentuk yang sudah terseleksi mengeluarkannya dari kelompok", async () => {
    const { container } = renderPapan();
    await masukKanvas(container);

    fireEvent.mouseDown(bentuk(container, "g0"), { clientX: 120, clientY: 120, button: 0 });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 120, clientY: 120 });
    });
    fireEvent.mouseDown(bentuk(container, "g1"), {
      clientX: 200,
      clientY: 160,
      button: 0,
      shiftKey: true,
    });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 200, clientY: 160 });
    });
    expect(container.querySelector('[data-testid="kotak-grup"]')).toBeTruthy();

    fireEvent.mouseDown(bentuk(container, "g1"), {
      clientX: 200,
      clientY: 160,
      button: 0,
      shiftKey: true,
    });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 200, clientY: 160 });
    });
    // Tinggal satu anggota -> tidak ada kotak kelompok lagi.
    expect(container.querySelector('[data-testid="kotak-grup"]')).toBeNull();
  });

  it("menarik pegangan kotak bersama mengubah ukuran semua anggota", async () => {
    const { container } = renderPapan();
    const kanvas = await masukKanvas(container);

    fireEvent.mouseDown(bentuk(container, "g0"), { clientX: 120, clientY: 120, button: 0 });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 120, clientY: 120 });
    });
    fireEvent.mouseDown(bentuk(container, "g1"), {
      clientX: 200,
      clientY: 160,
      button: 0,
      shiftKey: true,
    });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 200, clientY: 160 });
    });

    const lebarG0Awal = bentuk(container, "g0").style.width;
    const tinggiG1Awal = bentuk(container, "g1").style.height;

    const pegangan = container.querySelector('[data-testid="pegangan-grup-se"]') as HTMLElement;
    fireEvent.mouseDown(pegangan, { clientX: 400, clientY: 300, button: 0 });
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        fireEvent.mouseMove(kanvas, { clientX: 400 + i * 30, clientY: 300 + i * 20, button: 0 });
      });
    }
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 520, clientY: 380 });
    });

    const angka = (v: string) => parseFloat(v);
    expect(angka(bentuk(container, "g0").style.width)).toBeGreaterThan(angka(lebarG0Awal));
    expect(angka(bentuk(container, "g1").style.height)).toBeGreaterThan(angka(tinggiG1Awal));
  });
});
