/**
 * @jest-environment jsdom
 */
/* #630 — garis terpilih tidak boleh lagi terlihat sebagai pita 16 px. */
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
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

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fw1",
    name: "Alur Garis",
    description: "",
    category: "Panduan",
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
    nodes: [
      {
        id: "n1",
        type: "rect",
        x: 100,
        y: 100,
        label: "Satu",
        color: "blue",
        width: 140,
        height: 60,
      },
      {
        id: "n2",
        type: "rect",
        x: 520,
        y: 100,
        label: "Dua",
        color: "amber",
        width: 140,
        height: 60,
      },
    ],
    // #656 — label ikut dipasang supaya penjaga "teks polos, bukan kotp" punya
    // sesuatu untuk dibaca. Test #630 di bawah hanya menghitung `path`, jadi
    // kehadiran label tidak mengubah hitungannya.
    edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n2", label: "YA" }],
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

async function bukaPapan(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Garis"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
}

/**
 * Hanya jalur di LAPISAN GARIS papan. `svg path` saja akan ikut menangkap
 * puluhan path ikon lucide, jadi lapisannya dicari lewat induk dari jalur yang
 * memegang kepala panah.
 */
const lapisanGaris = (container: HTMLElement): SVGSVGElement | null => {
  const inti = container.querySelector('path[marker-end^="url(#canvas-arrow-head"]');
  return inti ? (inti.closest("svg") as SVGSVGElement) : null;
};

const jalurTergambar = (container: HTMLElement) => {
  const lapisan = lapisanGaris(container);
  if (!lapisan) return [];
  return (
    Array.from(lapisan.querySelectorAll("path"))
      // Kepala panah hidup di dalam <defs> dan bukan jalur yang menebalkan garis.
      .filter((p) => !p.closest("defs"))
      .filter((p) => p.getAttribute("stroke") !== "transparent")
      .filter((p) => (p.getAttribute("d") || "").startsWith("M"))
      .map((p) => ({
        lebar: Number(p.getAttribute("stroke-width")),
        warna: p.getAttribute("stroke"),
        opacity: p.getAttribute("opacity"),
        kelas: p.getAttribute("class") || "",
      }))
  );
};

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("pendar garis terpilih (#630)", () => {
  it("garis istirahat hanya satu jalur — tidak ada pendar yang ikut tergambar", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const jalur = jalurTergambar(container);
    expect(jalur.length).toBe(1);
    // #656 — inti garis sekarang 1 px sewarna draw.io, bukan 2 px `#475569`.
    expect(jalur[0].lebar).toBe(1);
    expect(jalur[0].warna).toBe("#000000");
  });

  it("wilayah sentuh 16 px tetap ada tapi TRANSPARAN, jadi tidak menebalkan apa pun", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const hit = Array.from(container.querySelectorAll("svg path")).filter(
      (p) => p.getAttribute("stroke-width") === "16"
    );
    expect(hit).toHaveLength(1);
    expect(hit[0].getAttribute("stroke")).toBe("transparent");
  });

  it("garis terpilih = inti 1 px + halo 5 px tipis statis; tidak ada lagi pita 16 px berwarna", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const inti = container.querySelector(
      'svg path[marker-end^="url(#canvas-arrow-head"]'
    ) as SVGPathElement;
    fireEvent.click(inti);

    const jalur = jalurTergambar(container);
    const lebar = jalur.map((j) => j.lebar).sort((a, b) => a - b);
    expect(lebar).toEqual([1, 5]);
    const halo = jalur.find((j) => j.lebar === 5)!;
    // Halo harus statis: dulu `motion.path` dengan opacity [0.2,0.5,0.2] repeat Infinity.
    expect(Number(halo.opacity)).toBeLessThanOrEqual(0.35);
    expect(halo.kelas).toContain("pointer-events-none");
    // Inti TIDAK lagi ikut menebal saat dipilih (dulu 2 -> 3). #656: intinya
    // 1 px, seleksi hanya diganti warna.
    const intiBaru = jalur.find((j) => j.lebar === 1 && j.warna === "#8b5cf6");
    expect(intiBaru).toBeTruthy();
    // Dan pita 16 px tidak pernah lagi diwarnai.
    expect(jalur.some((j) => j.lebar >= 8)).toBe(false);
  });

  it("penanda arah alur tidak lagi memakai filter drop-shadow", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const berBayangan = Array.from(container.querySelectorAll("svg path")).filter((p) =>
      /drop-shadow/.test(p.getAttribute("class") || "")
    );
    expect(berBayangan).toHaveLength(0);
  });
});

/**
 * #656 — garis papan mengikuti bawaan draw.io.
 *
 * TIGA HAL DIKUNCI TERPISAH karena dulu ketiganya ditulis di tiga tempat yang
 * bisa lupa disamakan: warna jalur, warna kepala panah, dan tebal garis.
 * Dua test terakhir MEMBACA SUMBERNYA: jsdom tidak menjalankan kaskade CSS
 * maupun state awal container, jadi "bawaan perutean" dan "tidak ada hex yang
 * ditulis dua kali" hanya bisa dibuktikan di sana.
 */
describe("garis papan mengikuti draw.io (#656)", () => {
  it("kepala panah memakai warna yang sama dengan garisnya", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const inti = container.querySelector(
      'path[marker-end^="url(#canvas-arrow-head"]'
    ) as SVGPathElement;
    const kepala = container.querySelector("#canvas-arrow-head path") as SVGPathElement;
    expect(inti.getAttribute("stroke")).toBe("#000000");
    expect(kepala.getAttribute("fill")).toBe("#000000");
  });

  it("label garis adalah teks polos, bukan kotp berbingkai dan berbayangan", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const chip = container.querySelector("foreignObject div") as HTMLDivElement;
    expect(chip.textContent).toBe("YA");
    for (const kelas of ["border-", "shadow-soft", "rounded", "truncate", "font-medium"]) {
      expect(chip.className).not.toContain(kelas);
    }
    expect(chip.className).toContain("font-normal");
    // Membungkus, bukan dibuang ke elipsis - draw.io menuliskan labelnya penuh.
    expect(chip.className).toContain("break-words");
  });

  it("warna garis tidak lagi ditulis dua kali di berkas yang sama", () => {
    const sumber = readFileSync(join(__dirname, "components", "FlowchartEdges.tsx"), "utf8");
    expect(sumber).not.toContain("#475569");
    expect((sumber.match(/warnaGarisPapan\(canvasTheme\)/g) || []).length).toBeGreaterThanOrEqual(
      2
    );
  });

  it("bawaan perutean papan adalah garis lurus seperti draw.io, bukan bezier", () => {
    const sumber = readFileSync(join(__dirname, "FlowchartContainer.tsx"), "utf8");
    expect(
      /useState<"bezier" \| "straight" \| "orthogonal">\(\s*"straight"\s*\)/.test(sumber)
    ).toBe(true);
  });
});
