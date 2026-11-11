/**
 * @jest-environment jsdom
 *
 * #841 Fase 1 — simulasi dan laporan di layar, bukan hanya di modul.
 *
 * `analisaAlur-841.test.ts` sudah mengunci keputusan strukturnya. Yang dikunci
 * di sini adalah JALURNYA, yaitu hal-hal yang paling mudah salah walau modulnya
 * benar: tombol yang benar-benar menggerakkan token, token yang benar-benar
 * berhenti ketika dijeda, satu klik "Langkah" yang benar-benar hanya menempuh
 * SATU garis, jejak yang tertinggal setelah perjalanan selesai, dan laporan yang
 * membuka dirinya sendiri ketika papan tidak bisa dijalankan.
 *
 * Mesin langkah di sini tidak punya timer sama sekali — ia digerakkan
 * `animationend`. Karena jsdom tidak pernah menjalankan CSS animation, test ini
 * MEMANCINGKAN peristiwa itu sendiri lewat fireEvent.animationEnd, yang justru
 * membuktikan klaim desainnya: yang menggerakkan simulasi adalah peristiwa,
 * bukan `setTimeout` yang tidak bisa dijeda.
 *
 * Papan "Papan Alur" sengaja memuat satu bentuk yatim ("Arsip lama"): ia harus
 * muncul di laporan dan membuat lencana galat menyala, meskipun simulasi tetap
 * berjalan di jalur yang benar.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

const bentuk = (id: string, type: string, label: string, x: number, y: number) => ({
  id,
  type,
  x,
  y,
  label,
  color: "blue",
  width: 200,
  height: 100,
});

const PAPAN = [
  {
    id: "fwAlur",
    name: "Papan Alur",
    description: "",
    category: "Panduan",
    nodes: [
      bentuk("s", "oval", "Mulai", 60, 80),
      bentuk("d", "diamond", "Lolos?", 320, 80),
      bentuk("y", "rect", "Kirim email", 600, 40),
      bentuk("n", "rect", "Eskalasi", 600, 240),
      bentuk("e", "oval", "Selesai", 880, 80),
      // tidak punya satu pun garis: inilah yang dulu dilewati tanpa suara
      bentuk("yatim", "rect", "Arsip lama", 60, 480),
    ],
    edges: [
      { id: "e1", fromNodeId: "s", toNodeId: "d" },
      { id: "e2", fromNodeId: "d", toNodeId: "y", label: "Ya" },
      { id: "e3", fromNodeId: "d", toNodeId: "n", label: "Tidak" },
      { id: "e4", fromNodeId: "y", toNodeId: "e" },
      { id: "e5", fromNodeId: "n", toNodeId: "e" },
    ],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
  {
    id: "fwPutar",
    name: "Papan Lingkaran",
    description: "",
    category: "Panduan",
    nodes: [bentuk("a", "rect", "Tunggu", 60, 80), bentuk("b", "rect", "Kerjakan", 320, 80)],
    edges: [
      { id: "g1", fromNodeId: "a", toNodeId: "b" },
      { id: "g2", fromNodeId: "b", toNodeId: "a" },
    ],
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

async function bukaPapan(nama: string) {
  const { container } = renderView();
  fireEvent.click((await screen.findAllByText(nama))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container;
}

const token = (container: HTMLElement, tepiId: string) =>
  container.querySelector(`[data-testid="token-alur-${tepiId}"]`) as SVGPathElement | null;
const jejak = (container: HTMLElement, tepiId: string) =>
  container.querySelector(`[data-testid="jejak-alur-${tepiId}"]`) as SVGPathElement | null;

const tekan = (id: string) => fireEvent.click(screen.getByTestId(id));

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("#841 token berjalan sepanjang garis", () => {
  it("menekan Simulasi menggerakkan token pada garis PERTAMA dan membuka laporan", async () => {
    const container = await bukaPapan("Papan Alur");

    // sebelum ditekan: tidak ada satu pun yang bergerak
    expect(container.querySelector('[data-testid^="token-alur-"]')).toBeNull();
    expect(screen.queryByTestId("laporan-alur")).toBeNull();

    tekan("tombol-simulasi");

    const jalan = token(container, "e1");
    expect(jalan).not.toBeNull();
    expect(jalan!.getAttribute("d")).toBeTruthy();
    expect(jalan!.getAttribute("class")).toContain("alur-merambat");
    expect(jalan!.getAttribute("pathLength")).toBe("1");
    expect((jalan! as unknown as SVGElement).style.getPropertyValue("--alur-durasi")).toBe("900ms");
    // laporan terbuka sendiri: itulah yang membedakan "lampu menyala" dari analisa
    expect(screen.getByTestId("laporan-alur")).toBeTruthy();
  });

  it("token yang tiba di ujung menggeser langkah: jejak tertinggal, garis berikut menyala", async () => {
    const container = await bukaPapan("Papan Alur");
    tekan("tombol-simulasi");

    fireEvent.animationEnd(token(container, "e1")!);

    expect(jejak(container, "e1")).not.toBeNull();
    expect(token(container, "e1")).toBeNull();
    expect(token(container, "e2")).not.toBeNull();
  });

  it("dijeda, token membeku di tengah garis dan tidak melangkah walau peristiwanya datang", async () => {
    const container = await bukaPapan("Papan Alur");
    tekan("tombol-simulasi");
    tekan("tombol-alur-jeda");

    const jalan = token(container, "e1")! as unknown as SVGElement;
    expect(jalan.style.animationPlayState).toBe("paused");

    // tombol yang sama melanjutkan
    tekan("tombol-alur-jeda");
    expect((token(container, "e1")! as unknown as SVGElement).style.animationPlayState).toBe(
      "running"
    );
  });

  it("satu klik Langkah menempuh tepat satu garis lalu berhenti sendiri", async () => {
    const container = await bukaPapan("Papan Alur");
    tekan("tombol-alur-langkah");

    expect(token(container, "e1")).not.toBeNull();
    fireEvent.animationEnd(token(container, "e1")!);

    // garis kedua sudah siap, tapi dibekukan: tidak ada perjalanan lanjutan
    const berikutnya = token(container, "e2")! as unknown as SVGElement;
    expect(berikutnya.style.animationPlayState).toBe("paused");
    expect(jejak(container, "e1")).not.toBeNull();
  });

  it("perjalanan sampai akhir menyisakan jejak penuh dan ringkasan skenario yang terbaca", async () => {
    const container = await bukaPapan("Papan Alur");
    tekan("tombol-simulasi");

    for (const garis of ["e1", "e2", "e4"]) {
      fireEvent.animationEnd(token(container, garis)!);
    }

    expect(container.querySelector('[data-testid^="token-alur-"]')).toBeNull();
    expect(jejak(container, "e4")).not.toBeNull();
    expect(screen.getByTestId("jejak-alur-teks").textContent).toBe(
      "Mulai → Lolos? (Ya) → Kirim email → Selesai"
    );
  });

  it("kecepatan mengubah lamanya satu garis, bukan melewati garis", async () => {
    const container = await bukaPapan("Papan Alur");
    tekan("tombol-simulasi");
    tekan("tombol-alur-kecepatan");

    // 1× -> 2×: satu garis ditempuh dalam 450 ms, bukan dilewati dua baris
    const jalan = token(container, "e1")! as unknown as SVGElement;
    expect(jalan.style.getPropertyValue("--alur-durasi")).toBe("450ms");
    expect(jejak(container, "e1")).toBeNull();
  });
});

describe("#841 laporan struktur alur", () => {
  it("bentuk yatim dilaporkan, diberi lencana, dan bisa ditunjuk di papan", async () => {
    const container = await bukaPapan("Papan Alur");
    tekan("tombol-laporan-alur");

    expect(screen.getByTestId("lencana-galat-alur").textContent).toBe("1");
    const baris = screen.getByTestId("temuan-tak_terjangkau");
    expect(baris.textContent).toContain("Arsip lama");

    const penunjuk = screen.getAllByTitle("Tunjuk di papan");
    expect(penunjuk.map((b) => b.textContent)).toContain("Arsip lama");
    fireEvent.click(penunjuk[0]);
    // diklik tidak boleh meruntuhkan papan: laporan dan bentuknya masih ada
    expect(screen.getByTestId("laporan-alur")).toBeTruthy();
    expect(container.querySelector("#val-node-yatim")).toBeTruthy();
  });

  it("cabang yang tidak dilalui skenario pertama tetap tercatat", async () => {
    await bukaPapan("Papan Alur");
    tekan("tombol-simulasi");

    const laporan = screen.getByTestId("laporan-alur");
    expect(laporan.textContent).toContain("Cabang yang tidak dilewati");
    // "Eskalasi" hanya bisa dicapai lewat cabang "Tidak", yang tidak dilalui
    expect(laporan.textContent).toContain("Eskalasi");
    expect(screen.getByTestId("jejak-alur-teks").textContent).not.toContain("Eskalasi");
  });

  it("papan yang seluruhnya lingkaran tidak punya awal: laporan yang bicara, bukan animasi", async () => {
    const container = await bukaPapan("Papan Lingkaran");
    tekan("tombol-simulasi");

    expect(screen.getByTestId("laporan-alur")).toBeTruthy();
    expect(screen.getByTestId("temuan-tanpa_awal")).toBeTruthy();
    expect(container.querySelector('[data-testid^="token-alur-"]')).toBeNull();
  });
});

describe("#841 lantai sentuh kendali baru", () => {
  it("setiap tombol pemutar dan laporan memegang target sentuh 44 px", async () => {
    // pelajaran #839: dock tidak pernah dikunci garis dasar 44 px, jadi kendali
    // BARU di dock harus membawa lantainya sendiri sejak awal.
    await bukaPapan("Papan Alur");
    tekan("tombol-simulasi");

    for (const id of [
      "tombol-simulasi",
      "tombol-alur-jeda",
      "tombol-alur-langkah",
      "tombol-alur-kecepatan",
      "tombol-laporan-alur",
    ]) {
      const kelas = screen.getByTestId(id).className;
      expect(`${id}: ${kelas}`).toContain("min-h-11");
    }
  });
});
