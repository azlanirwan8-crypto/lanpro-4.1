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
import { render, screen, fireEvent, within } from "@testing-library/react";
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
jest.mock("../../lib/sweetalert", () => ({
  confirmDeleteAlert: jest.fn(async () => false),
  showSuccessAlert: jest.fn(),
}));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";
import { confirmDeleteAlert } from "../../lib/sweetalert";

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

  it("snap dan pola papan dapat dipilih dari satu menu", async () => {
    await bukaPapan();
    const pemicu = screen.getByTestId("dock-menu-papan");
    expect(dock()).toContainElement(pemicu);
    expect(pemicu).toHaveClass("min-h-11", "min-w-11");
    fireEvent.click(pemicu);
    const snap = screen.getByRole("button", { name: /Snap to Grid/i });
    expect(snap).toHaveAttribute("aria-pressed", "true");

    for (const pola of [
      /Plain board|Papan polos/,
      /Dotted board|Papan bertitik/,
      /Grid board|Papan berkisi/,
    ]) {
      const tombol = screen.getByTitle(pola);
      expect(tombol).toBeVisible();
      expect(tombol).toHaveClass("min-h-11");
    }
    fireEvent.keyDown(snap, { key: "Escape" });
    expect(pemicu).toHaveFocus();
    expect(pemicu).toHaveAttribute("aria-expanded", "false");
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
    expect(screen.getByTitle(/JPG/i)).not.toBeVisible();
    fireEvent.click(screen.getByTestId("dock-menu-ekspor"));
    const menu = within(screen.getByRole("group", { name: /^(Export|Ekspor)$/i }));
    for (const format of [/JPG/i, /PNG/i, /SVG/i, /JSON/i, /draw\.io file|Berkas draw\.io/i]) {
      expect(menu.getByRole("button", { name: format })).toBeVisible();
    }
  });

  it("aksi kosongkan papan tersembunyi sampai Lainnya dibuka dan tetap meminta konfirmasi", async () => {
    (confirmDeleteAlert as jest.Mock).mockResolvedValue(false);
    await bukaPapan();
    const bersihkan = /clear all canvas|bersihkan semua bentuk/i;
    expect(screen.queryByRole("button", { name: bersihkan })).toBeNull();
    fireEvent.click(screen.getByTestId("dock-menu-lainnya"));
    fireEvent.click(screen.getByRole("button", { name: bersihkan }));
    expect(confirmDeleteAlert).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue("A")).toBeInTheDocument();
  });
});
