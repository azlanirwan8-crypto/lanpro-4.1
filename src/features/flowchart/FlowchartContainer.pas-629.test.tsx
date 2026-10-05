/**
 * @jest-environment jsdom
 */
/* #534 #618 — "pas ke layar" harus benar-benar mengubah viewport papan, bukan
   cuma ada di rumus. #629 — bentuk tidak boleh lagi membesar saat disentuh. */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
import type { FlowNode } from "./types";

const project = { id: "p1", name: "Proyek Uji" } as Project;

/** Dua bentuk yang duduk JAUH di kanan-bawah, seperti papan yang dilaporkan. */
const BENTUK: FlowNode[] = [
  {
    id: "n1",
    type: "rect",
    x: 2600,
    y: 1800,
    label: "Kirim",
    color: "blue",
    width: 140,
    height: 60,
  },
  {
    id: "n2",
    type: "decision",
    x: 2800,
    y: 2100,
    label: "Selesai?",
    color: "amber",
    width: 140,
    height: 60,
  },
];

const PAPAN = [
  {
    id: "fw1",
    name: "Alur Jauh",
    description: "",
    category: "Panduan",
    nodes: BENTUK,
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

/** DIV pembungkus papan — satu-satunya yang memakai transform scale di editor. */
const wrapperPapan = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("div")).find(
    (d) => d.style.width === "3500px" && /scale\(/.test(d.getAttribute("style") || "")
  ) as HTMLElement;

const bacaTransform = (el: HTMLElement) => {
  const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(
    el.getAttribute("style") || ""
  );
  return m ? { x: +m[1], y: +m[2], skala: +m[3] } : null;
};

async function bukaPapan(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Jauh"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  const kanvas = container.querySelector(".kanvas-papan") as HTMLElement;
  // jsdom tidak punya layout: ukuran elemen selalu 0, jadi kanvas dibuat seolah
  // 800x600 supaya aritmetika pas-ke-layar punya layar untuk dihitung.
  Object.defineProperty(kanvas, "clientWidth", { value: 800, configurable: true });
  Object.defineProperty(kanvas, "clientHeight", { value: 600, configurable: true });
  return kanvas;
}

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("pas ke layar (#534 #618)", () => {
  it("Shift+1 membuat SELURUH bentuk masuk layar, sedangkan setel ulang lama mengirimnya keluar", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const sebelum = bacaTransform(wrapperPapan(container));
    // Keadaan awal papan = 0,9 di (50,50): bentuk di x=2.600 duduk di layar
    // 50 + 2.600*0,9 = 2.390 px — tiga kali lebar layar, jadi tidak terlihat.
    expect(sebelum?.skala).toBe(0.9);
    expect(50 + 2600 * 0.9).toBeGreaterThan(800);

    fireEvent.keyDown(window, { key: "1", shiftKey: true });

    const sesudah = bacaTransform(wrapperPapan(container));
    expect(sesudah).not.toBeNull();
    const t = sesudah!;
    // Bbox = x 2.600..2.940 (340), y 1.800..2.160 (360) pada layar 800x600.
    // Terbatas tinggi: (600-80)/360 = 1,4444.
    expect(t.skala).toBeCloseTo(520 / 360, 6);
    const kiri = t.x + 2600 * t.skala;
    const kanan = t.x + 2940 * t.skala;
    const atas = t.y + 1800 * t.skala;
    const bawah = t.y + 2160 * t.skala;
    expect(kiri).toBeGreaterThanOrEqual(40 - 1e-6);
    expect(kanan).toBeLessThanOrEqual(800 - 40 + 1e-6);
    expect(atas).toBeGreaterThanOrEqual(40 - 1e-6);
    expect(bawah).toBeLessThanOrEqual(600 - 40 + 1e-6);
    // Sisa ruang kiri-kanan dibagi rata.
    expect(kiri).toBeCloseTo(800 - kanan, 4);
  });

  it("tombol di dock memicu aksi yang sama", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const tombol = await screen.findByTitle(/Fit to screen|Pas ke layar/i);
    fireEvent.click(tombol);

    const t = bacaTransform(wrapperPapan(container))!;
    expect(t.skala).toBeCloseTo(520 / 360, 6);
  });

  it("tombol persentase meminta 100%, bukan skala awal — dua hal yang dulu bertukar (#534)", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    fireEvent.keyDown(window, { key: "1", shiftKey: true });
    const sesudahPas = bacaTransform(wrapperPapan(container))!;
    expect(sesudahPas.skala).not.toBe(1);

    fireEvent.click(screen.getByTitle(/zoom \(100%\)/i));
    const persen = bacaTransform(wrapperPapan(container))!;
    expect(persen.skala).toBe(1);
  });

  it("papan kosong tidak dikirim ke titik (0,0) yang kosong", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      { ...PAPAN[0], id: "fw2", name: "Alur Kosong", nodes: [], edges: [] },
    ]);
    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Alur Kosong"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    fireEvent.keyDown(window, { key: "1", shiftKey: true });
    const t = bacaTransform(wrapperPapan(container))!;
    expect(t).toEqual({ x: 50, y: 50, skala: 0.9 });
  });
});

describe("geometri sentuh bentuk (#629)", () => {
  it("bentuk yang diseret tidak lagi menggelembung 1,07", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const kotak = container.querySelector('[id^="val-node-"]') as HTMLElement;
    expect(kotak).toBeTruthy();
    fireEvent.mouseDown(kotak);
    const gaya = kotak.getAttribute("style") || "";
    // `scale: 1` membuat perender tidak menulis transform skala sama sekali.
    expect(gaya).not.toMatch(/scale\(1\.0[2-9]/);
    expect(gaya).not.toMatch(/scale\(1\.[1-9]/);
  });

  it("cincin seleksi tidak lagi berdenyut selamanya", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const kotak = container.querySelector('[id^="val-node-"]') as HTMLElement;
    fireEvent.click(kotak);
    const denyut = Array.from(container.querySelectorAll("[style]")).filter((el) =>
      /animation(-name)?:.*infinite|infinite/i.test(el.getAttribute("style") || "")
    );
    expect(denyut).toHaveLength(0);
  });
});
