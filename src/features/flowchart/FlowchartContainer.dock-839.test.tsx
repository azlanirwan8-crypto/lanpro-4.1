/**
 * @jest-environment jsdom
 *
 * #839 — satu fungsi, satu rumah.
 *
 * SEBAB TEST INI ADA. Pemilik proyek menunjuk lima tangkapan layar: JPG/JSON/
 * .drawio ada di bilah atas DAN di dock bawah, dan panel properti punya DUA
 * sakelar (ikon `Activity` di bilah atas, flap `Edit3` di kanan). Dua pintu ke
 * satu kamar itu bukan sekadar tidak rapi — keadaannya bisa terbaca berbeda,
 * dan tidak ada yang bisa menebak pintu mana yang sedang dipakai.
 *
 * Yang dikunci di sini bukan kelas Tailwind, tapi FAKTA STRUKTUR: tombolnya ada
 * di dock, bilah atas cuma menyimpan layar penuh, dan pintu kedua benar-benar
 * hilang dari DOM. `data-testid` sengaja dipasang di dua wadahnya supaya test
 * ini tidak ikut merah hanya karena posisi pixel bergeser.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    id: "fwD",
    name: "Papan Dock",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "d0",
        type: "rect",
        x: 100,
        y: 100,
        label: "A",
        color: "indigo",
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

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

async function bukaPapan() {
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
  fireEvent.click((await screen.findAllByText("Papan Dock"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
}

const dock = () => screen.getByTestId("dock-kanvas");
const bilahAtas = () => screen.getByTestId("bilah-atas-kanvas");

// Test ini berjalan dengan locales `id` (lihat setup jest), jadi polanya ditulis
// dua bahasa seperti test papan lain (`/Snap to Grid|Snapping/i`): yang dikunci
// adalah identitas tombolnya, bukan bahasa yang sedang aktif.
describe("#839 kendali papan dikumpulkan di dock bawah", () => {
  it("bilah atas hanya berisi satu tombol, yaitu layar penuh", async () => {
    await bukaPapan();
    const tombol = bilahAtas().querySelectorAll("button");
    expect(tombol).toHaveLength(1);
    expect(tombol[0].getAttribute("title")).toMatch(/Full screen|Layar Penuh/i);
  });

  it("snap kisi dan tiga pola papan duduk di dock, dan tetap 44 px", async () => {
    await bukaPapan();
    const snap = screen.getByTitle(/Snap to Grid/i);
    expect(dock().contains(snap)).toBe(true);
    expect(snap.className).toMatch(/min-h-11/);
    expect(snap.className).toMatch(/min-w-11/);

    for (const pola of [
      /Plain board|Papan polos/,
      /Dotted board|Papan bertitik/,
      /Grid board|Papan berkisi/,
    ]) {
      const tombol = screen.getByTitle(pola);
      expect(dock().contains(tombol)).toBe(true);
      expect(tombol.className).toMatch(/min-h-11/);
      expect(tombol.className).toMatch(/min-w-11/);
    }
  });

  it("satu pintu ke panel properti: sakelar kedua hilang, flap kanan tetap ada", async () => {
    await bukaPapan();
    expect(screen.queryByTitle(/Toggle Configuration Panel|Alihkan Panel Konfigurasi/i)).toBeNull();
    const pintu = screen.getAllByTitle(/Properties Panel|Panel Properti/i);
    expect(pintu).toHaveLength(1);
  });

  it("ekspor tidak lagi punya kembarannya di bilah atas", async () => {
    await bukaPapan();
    expect(bilahAtas().querySelectorAll("button")).toHaveLength(1);
    // Dock tetap punya ketiganya — dipindah, bukan dibuang.
    expect(screen.getByTitle(/JPG/i)).toBeInTheDocument();
    expect(screen.getByTitle(/draw\.io file|Berkas draw\.io/i)).toBeInTheDocument();
  });
});
