/**
 * @jest-environment jsdom
 *
 * #763 — PENGUKURAN, bukan dugaan.
 *
 * Pemilik proyek sudah empat kali menulis keluhan yang sama dengan kata yang
 * sama: "patah-patah", "tidak ringan", "masih tidak seperti drawio". Tidak ada
 * satu pun nomor di papan yang menjawabnya dengan ANGKA pada kode hari ini.
 * #521 mengukur biaya ROUTE dan menutupnya dengan cache (kunci: jumlah
 * pemanggilan `findSmartRoute`), lalu catatan #521 sendiri menulis bahwa tuas
 * yang tersisa adalah "memoisasi node/garis — ini memangkas rekonsiliasi
 * React". Angka untuk tuas itu tidak pernah diambil. `agents.md` §0: §1 adalah
 * hipotesis, ukur dulu baru tambal. Berkas ini adalah pengukurannya.
 *
 * APA YANG DIUKUR. Dua hal yang berbeda dan tidak boleh dicampur:
 *
 *   1. **Berapa SUBTREE bangun per peristiwa pointer.** Counter diambil dengan
 *      membungkus komponen lewat `jest.mock`: fungsi komponen dipanggil = ia
 *      dirender. Kalau satu subtree bangun 12 kali untuk 12 kibasan mouse, ia
 *      tidak dilindungi memo apa pun.
 *   2. **Berapa TULISAN DOM yang mengikutinya.** Diff React yang tidak mengubah
 *      apa pun tetap murah; yang membayar di HP adalah atribut yang benar-benar
 *      ditulis ulang (layout + paint). Diambil lewat `MutationObserver`.
 *
 * BATAS JUJUR. jsdom TIDAK melakukan layout/paint, jadi angka milidetik di sini
 * adalah PEMBANDING sebelum-vs-sesudah pada mesin yang sama, BUKAN angka
 * peramban, dan BUKAN klaim "di HP sudah sehalus draw.io". Itu §15.3 dan hanya
 * bisa dibuktikan di tab peramban yang bersih.
 */
import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn().mockResolvedValue(null),
  deleteFlowchart: jest.fn(),
}));
jest.mock("html-to-image", () => ({
  toJpeg: jest.fn(),
  toPng: jest.fn(),
  toSvg: jest.fn(),
}));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

// CARA MENGUKUR, dan kenapa cara pertama dibuang.
//
// Dugaan awal: bungkus tiap komponen lewat `jest.mock` lalu cacat fungsi
// komponennya. Cara itu SAH untuk baseline (belum ada memo di sumber), tetapi
// langsung menjadi bohong begitu sumbernya dibungkus `React.memo` — pembungkus
// saya berdiri di LUAR batas memo, jadi ia tetap menghitung "satu per render"
// bahkan ketika badan komponen aslinya tidak dijalankan sama sekali. Angka
// sebelum dan sesudah tidak lagi mengukur hal yang sama; itu persis jenis
// kesalahan yang sudah dicatat papan (#752: peta yang salah tetap hijau).
//
// Dua probe yang tersisa tidak bisa tertipu oleh memo:
//
//   1. `renderMiniPreviewIcon` — dipanggil SATU KALI untuk tiap pratinjau
//      bentuk yang benar-benar dirender. Palet yang diam = nol; palet yang
//      bangun dengan grup terbuka = ratusan.
//   2. Tulisan DOM lewat `MutationObserver` — biaya layout+paint yang sungguh
//      dibayar HP.
//
// Ditambah milidetik per peristiwa sebagai pembanding ujung-ke-ujung. jsdom
// tidak punya layout/paint, jadi angka ms BUKAN angka peramban (§15.3).
jest.mock("./lib/shapes", () => {
  const actual = jest.requireActual("./lib/shapes");
  return { ...actual, renderMiniPreviewIcon: jest.fn(actual.renderMiniPreviewIcon) };
});

jest.setTimeout(120_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";
import { renderMiniPreviewIcon } from "./lib/shapes";

const project = { id: "p1", name: "Proyek Uji" } as Project;

/** Papan 40 bentuk / 56 garis — ukuran yang di #521 dilaporkan masih 23,4 ms. */
const NODES = Array.from({ length: 40 }, (_, i) => ({
  id: `n${i}`,
  type: "rect" as const,
  x: 60 + (i % 8) * 300,
  y: 60 + Math.floor(i / 8) * 220,
  label: `B${i}`,
  color: "indigo",
  width: 160,
  height: 80,
}));
const EDGES = [
  ...Array.from({ length: 39 }, (_, i) => ({
    id: `e${i}`,
    fromNodeId: `n${i}`,
    toNodeId: `n${i + 1}`,
  })),
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `x${i}`,
    fromNodeId: `n${i}`,
    toNodeId: `n${i + 8}`,
  })),
];

const PAPAN = [
  {
    id: "fw1",
    name: "Papan Ukur",
    description: "",
    category: "Panduan",
    nodes: NODES,
    edges: EDGES,
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

async function masukKanvas() {
  fireEvent.click((await screen.findAllByText("Papan Ukur"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
}

const bentuk = (container: HTMLElement, id: string) =>
  container.querySelector(`[id="val-node-${id}"]`) as HTMLElement;

const EVENT = 12;

type Rekor = {
  /** Berapa pratinjau bentuk yang BENAR-BENAR dirender selama seretan. */
  pratinjauPalet: number;
  /** Tulisan DOM per peristiwa: `svg` = garis, `html` = papan dan bentuk. */
  domPerEvent: Record<string, number>;
  /** Enam elemen yang paling sering ditulis — siapa lagi yang ikut bergerak. */
  domTerinci: Record<string, number>;
  msPerEvent: number;
  /** Berapa piksel bentuk benar-benar berpindah — bukti seretannya nyata. */
  pindah: number;
};

async function bukaPaletBentuk(container: HTMLElement) {
  const pemicu = container.querySelector('[data-testid="tombol-palet-bentuk"]') as HTMLElement;
  if (!pemicu) throw new Error("tombol koleksi simbol tidak ditemukan — pengukur buta");
  fireEvent.click(pemicu);
  await waitFor(() =>
    expect(container.querySelectorAll('[data-testid="judul-grup-palet"]').length).toBeGreaterThan(0)
  );
  // Grup palet tertutup bawaan (#758); isinya baru dirender ketika dibuka.
  // Kolom pencarian dipakai sebagai pemantik karena ia membuka SEMUA grup
  // (`shapeSearchQuery.trim() !== "" ? true : ...`), jadi kasus terburuk yang
  // diukur di sini benar-benar kasus terburuk: banyak pratinjau SVG hidup selama
  // satu frame seretan.
  const kolom = Array.from(container.querySelectorAll("input")).find((el) =>
    /cari|search/i.test(el.getAttribute("placeholder") || "")
  ) as HTMLInputElement;
  if (!kolom) throw new Error("kolom pencarian palet tidak ditemukan — pengukur buta");
  fireEvent.change(kolom, { target: { value: "a" } });
  await waitFor(() =>
    expect(container.querySelectorAll("[data-item-palet]").length).toBeGreaterThan(100)
  );
}

async function ukurSeret(container: HTMLElement, bukaPalet: boolean): Promise<Rekor> {
  const target = bentuk(container, "n0");
  if (!target) throw new Error("bentuk n0 tidak ditemukan");
  const kiriAwal = parseFloat(target.style.left || "0");
  if (bukaPalet) await bukaPaletBentuk(container);

  // Pengelompokan memakai TAG elemen sasaran, bukan penanda yang disisipkan ke
  // sumber: SVG adalah garis, selain itu papan dan bentuk.
  const TAG_SVG = new Set([
    "path",
    "circle",
    "line",
    "polygon",
    "polyline",
    "rect",
    "g",
    "text",
    "marker",
    "foreignobject",
  ]);
  const tulis: Record<string, number> = Object.create(null);
  let totalMutation = 0;
  const observer = new MutationObserver((rekaman) => {
    for (const r of rekaman) {
      totalMutation++;
      const el = r.target as Element;
      const key = TAG_SVG.has(el.nodeName.toLowerCase()) ? "svg" : "html";
      tulis[key] = (tulis[key] || 0) + 1;
      // Rincian per elemen DAN jenis tulisannya: 14 tulisan DOM per frame untuk
      // menggeser SATU bentuk adalah angka yang aneh (satu bentuk hanya butuh
      // left+top), jadi perlu terlihat siapa lagi yang ikut ditulis dan apakah
      // itu atribut atau anak yang dibongkar-pasang.
      const penandanya =
        el.id ||
        (typeof el.getAttribute === "function" && el.getAttribute("data-testid")) ||
        (el.className && typeof el.className === "string" ? el.className.slice(0, 30) : "?");
      const apa = r.type === "attributes" ? `attr:${r.attributeName}` : r.type;
      tulis[`~${key}:${penandanya}:${apa}`] = (tulis[`~${key}:${penandanya}:${apa}`] || 0) + 1;
    }
  });
  observer.observe(container, { attributes: true, childList: true, subtree: true });

  fireEvent.mouseDown(target, { clientX: 140, clientY: 100, button: 0 });
  (renderMiniPreviewIcon as jest.Mock).mockClear();

  // LANGKAH 60 px, bukan 7. Dengan `isSnapToGrid` aktif papan membulatkan ke
  // kelipatan 20, dan langkah kecil membuat `setNodes` bail out (posisi sama)
  // sehingga satu peristiwa tidak selalu satu commit. Diukur dengan counter:
  // langkah 7 menghasilkan 6 commit dari 12 peristiwa, jadi perbandingan
  // sebelum/sesudah tidak bisa dibaca. Langkah 60 memastikan setiap peristiwa
  // benar-benar mengirim bentuk ke tempat baru.
  const mulai = Date.now();
  for (let i = 1; i <= EVENT; i++) {
    fireEvent.mouseMove(window, { clientX: 140 + i * 60, clientY: 100 + i * 40 });
  }
  const ms = Date.now() - mulai;
  const pratinjauPalet = (renderMiniPreviewIcon as jest.Mock).mock.calls.length;
  fireEvent.mouseUp(window, { clientX: 140 + EVENT * 60, clientY: 100 + EVENT * 40 });

  // Callback MutationObserver baru dikirim pada giliran mikrotask berikutnya:
  // memutus pengamat sebelum jeda berarti membacanya SELALU nol, yaitu
  // pengukuran kosong yang tampak seperti hasil.
  await new Promise((r) => setTimeout(r, 0));
  observer.disconnect();

  const pindah = parseFloat(bentuk(container, "n0").style.left || "0") - kiriAwal;

  const domPerEvent: Record<string, number> = {
    TOTAL: +(totalMutation / EVENT).toFixed(2),
    svg: +((tulis["svg"] || 0) / EVENT).toFixed(2),
    html: +((tulis["html"] || 0) / EVENT).toFixed(2),
  };
  const domTerinci = Object.fromEntries(
    Object.entries(tulis)
      .filter(([k]) => k.startsWith("~"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  );

  return {
    pratinjauPalet,
    domPerEvent,
    domTerinci,
    msPerEvent: +(ms / EVENT).toFixed(2),
    pindah,
  };
}

function laporkan(label: string, rekor: Rekor) {
  // Sengaja dicetak: baris inilah yang dipakai sebagai bukti sebelum/sesudah.

  console.log(`HASIL-763 ${label}: ${JSON.stringify(rekor)}`);
}

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue(null);
});

describe("#763 biaya render per kibasan mouse pada papan 40/56", () => {
  it("menyeret bentuk tidak merender ulang pratinjau palet, dan garis tetap bergerak", async () => {
    const { container } = renderView();
    await masukKanvas();
    const rekor = await ukurSeret(container, false);
    expect(rekor.pindah).toBeGreaterThan(20);
    // Palet tertutup: tidak ada pratinjau yang boleh dirender, dan tulisan DOM
    // ke SVG membuktikan garis memang mengikuti bentuk — memo tidak boleh
    // membekukan kanvas.
    expect(rekor.pratinjauPalet).toBe(0);
    expect(rekor.domPerEvent["svg"]).toBeGreaterThan(0);
    laporkan("palet tertutup", rekor);
  });

  it("dengan palet terbuka sekali pun, menyeret bentuk tidak membangun pratinjau bentuk", async () => {
    const { container } = renderView();
    await masukKanvas();
    const rekor = await ukurSeret(container, true);
    expect(rekor.pindah).toBeGreaterThan(20);
    // INI KUNCI #763. Sebelum rel alat dan palet dibungkus `React.memo`, baris
    // ini bernilai EVENT × jumlah bentuk yang cocok (12 × 100+ = ribuan
    // pemanggilan) untuk satu geseran jari.
    expect(rekor.pratinjauPalet).toBe(0);
    expect(rekor.domPerEvent["svg"]).toBeGreaterThan(0);
    laporkan("palet terbuka", rekor);
  });
});
