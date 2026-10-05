/**
 * @jest-environment jsdom
 */
/* #630 — garis terpilih tidak boleh lagi terlihat sebagai pita 16 px. */
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
    edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n2" }],
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
  it("garis istirahat hanya satu jalur 2 px — tidak ada pendar yang ikut tergambar", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const jalur = jalurTergambar(container);
    expect(jalur.length).toBe(1);
    expect(jalur[0].lebar).toBe(2);
    expect(jalur[0].warna).toBe("#475569");
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

  it("garis terpilih = inti 2 px + halo 5 px tipis statis; tidak ada lagi pita 16 px berwarna", async () => {
    const { container } = renderView();
    await bukaPapan(container);

    const inti = container.querySelector(
      'svg path[marker-end^="url(#canvas-arrow-head"]'
    ) as SVGPathElement;
    fireEvent.click(inti);

    const jalur = jalurTergambar(container);
    const lebar = jalur.map((j) => j.lebar).sort((a, b) => a - b);
    expect(lebar).toEqual([2, 5]);
    const halo = jalur.find((j) => j.lebar === 5)!;
    // Halo harus statis: dulu `motion.path` dengan opacity [0.2,0.5,0.2] repeat Infinity.
    expect(Number(halo.opacity)).toBeLessThanOrEqual(0.35);
    expect(halo.kelas).toContain("pointer-events-none");
    // Inti TIDAK lagi ikut menebal saat dipilih (dulu 2 -> 3).
    const intiBaru = jalur.find((j) => j.lebar === 2 && j.warna === "#8b5cf6");
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
