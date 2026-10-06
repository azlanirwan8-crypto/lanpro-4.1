/**
 * @jest-environment jsdom
 */
/**
 * #642 — papan berhenti bergerak sendiri.
 *
 * DUA BAGIAN, karena dua-duanya dulu lolos:
 *
 * BAGIAN 1 (perilaku). Kedua menu konteks papan menulis `exit` di akar
 * `motion.div` mereka, tapi dipasang POLOS di `FlowchartContainer.tsx`
 * (`{menu && <Menu/>}` tanpa `AnimatePresence`). Akibatnya React melepas
 * elemennya pada bingkai yang sama: membuka beranimasi, menutup seketika. Ini
 * diuji lewat peristiwa sungguhan — `contextmenu` pada bentuk, lalu Escape —
 * dan yang diukur adalah ADA TIDAKKNYA elemen di DOM tepat setelah menu
 * diperintahkan menutup. Sebelum pembungkusnya dipasang, asersi itu merah.
 *
 * BAGIAN 2 (penjaga sumber). Loop yang dihapus memang tidak meninggalkan
 * jejak di DOM kalau tidak ada yang mengamatinya, dan jenis kemundurannya
 * diam: seseorang menambah `repeat: Infinity` baru, semuanya tetap terlihat
 * normal, dan tab kembali sibuk saat pengguna tidak berbuat apa-apa. Yang
 * dibaca di sini: loop apa yang TINGGAL dan di blok mana ia duduk.
 *
 * Yang sengaja TETAP ADA dan tidak akan membuat test ini merah: animasi garis
 * bantu SEDANG menarik sambungan (`strokeDashoffset: [-20, 0]`). Itu keadaan
 * aktif, berhenti saat mouse lepas, dan Miro/FigJam pun menandainya bergerak.
 */
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

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
    name: "Alur Gerakan",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "n1",
        type: "rect",
        x: 120,
        y: 120,
        label: "Satu",
        color: "indigo",
        width: 140,
        height: 60,
      },
    ],
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

/** Elemen akar menu konteks bentuk: satu-satunya div fixed selebar w-48. */
const menuBentuk = (container: HTMLElement) =>
  container.querySelector("div.fixed.w-48") as HTMLElement | null;

const bukaPapan = async (container: HTMLElement) => {
  fireEvent.click((await screen.findAllByText("Alur Gerakan"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container.querySelector('[id^="val-node-"]') as HTMLElement;
};

describe("menu konteks papan menutup dengan gerakan (#642)", () => {
  beforeEach(() => {
    (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  });

  it("kanan-klik membuka menu, dan Escape menganimasikannya keluar sebelum hilang", async () => {
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

    const bentuk = await bukaPapan(container);
    if (!bentuk) throw new Error("bentuk papan tidak muncul di DOM");
    fireEvent.contextMenu(bentuk);

    const menu = await waitFor(() => {
      const m = menuBentuk(container);
      if (!m) throw new Error("menu konteks tidak muncul setelah kanan-klik");
      return m;
    });

    fireEvent.keyDown(document, { key: "Escape" });

    // INI INTINYA. Setelah perintah menutup, elemen masih harus ada sebentar:
    // itu tanda AnimatePresence menahannya selama 120 ms gerakan keluar. Tanpa
    // pembungkus, baris berikut sudah null.
    expect(menuBentuk(container)).not.toBeNull();
    expect(container.contains(menu)).toBe(true);

    // Dan ia benar-benar selesai, bukan tertinggal selamanya.
    await waitFor(() => expect(menuBentuk(container)).toBeNull(), { timeout: 3_000 });
  });
});

describe("loop yang tidak membawa informasi dilepas (#642)", () => {
  it("bentuk tidak lagi punya keyframes rotate yang diulang selamanya", () => {
    const node = baca("src/features/flowchart/components/FlowchartNode.tsx");
    // `gayaBentuk` mengunci PUTAR_BENTUK = 0 (#629), jadi loop rotate dulu tidak
    // pernah punya nilai untuk dianimasikan: konfigurasi mati.
    expect(node).not.toContain("repeat: Infinity");
    expect(node).not.toContain('type: "keyframes"');
  });

  it("tracer hover tidak lagi mengulang dashoffset, dan tidak ada titik ping", () => {
    const edges = baca("src/features/flowchart/components/FlowchartEdges.tsx");
    expect(edges).not.toContain("strokeDashoffset: [0, -72]");
    // Yang dilarang adalah PEMAKAIANNYA, bukan penyebutannya: kelas ini juga
    // disebut di komentar yang menjelaskan kenapa ia dilepas.
    expect(edges).not.toMatch(/className="[^"]*animate-ping/);
    // Loop yang TINGGAL hanya satu dan duduk di penanda "sedang menarik".
    expect(edges.match(/repeat: Infinity/g) || []).toHaveLength(1);
    expect(edges).toContain("strokeDashoffset: [-20, 0]");
  });

  it("tombol minimap tidak lagi berdenyut sepanjang panel terbuka", () => {
    const minimap = baca("src/features/flowchart/components/FlowchartMinimap.tsx");
    expect(minimap).not.toContain("animate-pulse");
  });

  it("pembungkusnya ada dan prop exit-nya masih ada — kalau salah satu hilang, gerakannya mati lagi", () => {
    const papan = baca("src/features/flowchart/FlowchartContainer.tsx");
    expect(papan).toContain('import { AnimatePresence } from "motion/react"');
    expect(papan.match(/<AnimatePresence>/g) || []).toHaveLength(2);

    for (const berkas of ["NodeContextMenu", "CanvasContextMenu"]) {
      const menu = baca(`src/features/flowchart/components/${berkas}.tsx`);
      expect(menu).toContain("exit={{");
    }
  });
});
