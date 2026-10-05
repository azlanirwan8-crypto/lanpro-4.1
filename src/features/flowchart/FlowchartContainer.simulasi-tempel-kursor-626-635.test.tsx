/**
 * @jest-environment jsdom
 */
/**
 * SIMULASI tempel-di-kursor (#626 + #635), diminta pemilik proyek 05 Okt:
 * "coba simulasikan jika saya paste di papan, pastikan paste-nya itu pas dengan
 * posisi cursor berada di mana di atas papan nya, benchmark dengan app tools lain".
 *
 * Yang dilakukan di sini bukan menghitung ulang rumus di test lain, tetapi
 * MENCOBA PAPAN SUNGGUHANNYA: papan dibuka, kursor digerakkan ke titik yang
 * ditentukan, peristiwa `paste` milik peramban dikirim dengan isi draw.io, lalu
 * POSISI BENTUK DAN VIEWPORT DIANGKUK DARI DOM. Angka yang dibandingkan adalah
 * angka yang dipakai peramban untuk menggambar.
 *
 * jsdom tidak punya layout, jadi dua hal dipasang manual: `getBoundingClientRect()`
 * kanvas (800x600 di kiri-atas layar) dan `clientWidth`/`clientHeight` elemen yang
 * sama — yang terakhir inilah yang dibaca `tampilDiLayar` (#635) untuk memutuskan
 * perlu menggeser layar atau tidak.
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
const KANVAS = { lebar: 800, tinggi: 600 };
const AWAL = { pan: { x: 50, y: 50 }, zoom: 0.9 };

const PAPAN = [
  {
    id: "fw1",
    name: "Alur Simulasi",
    description: "",
    category: "Panduan",
    nodes: [],
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

const bentuk = (id: string, x: number, label: string) =>
  `<mxCell id="${id}" value="${label}" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="150" width="140" height="60" as="geometry"/></mxCell>`;

const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

/** Kelompok LEBAR seperti alur nyata: x 200..1.440, yaitu 1.240 px selebar layar. */
const XML_LEBAR = pagar(
  bentuk("a", 200, "Satu") +
    bentuk("b", 900, "Dua") +
    bentuk("c", 1300, "Tiga") +
    '<mxCell id="e1" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="e2" edge="1" parent="1" source="b" target="c"><mxGeometry relative="1" as="geometry"/></mxCell>'
);

/** Satu bentuk 140x60: selalu muat, jadi ini kasus "papan tidak boleh melompat". */
const XML_SELEBAR_JARI = pagar(bentuk("a", 200, "Satu"));

const htmlDrawio = (xml: string) => {
  const lup = JSON.stringify({ xml })
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<div class="mxgraph" data-mxgraph="${lup}"></div>`;
};

const tempelPeramban = (isi: Record<string, string>) => {
  const e = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData?: unknown;
  };
  e.clipboardData = { getData: (jenis: string) => isi[jenis] || "", types: Object.keys(isi) };
  fireEvent(window, e);
};

/** `transform: translate(Xpx, Ypx) scale(Z)` pada lapisan papan, dibaca dari DOM. */
const viewportLapisan = (container: HTMLElement) => {
  const kandidat = Array.from(container.querySelectorAll<HTMLElement>("div")).map((d) => ({
    el: d,
    gaya: d.getAttribute("style") || "",
  }));
  const tembus = kandidat.filter((k) => /scale\(/.test(k.gaya));
  const el = tembus.find((k) => /translate\(/.test(k.gaya));
  if (!el) {
    throw new Error(
      `lapisan papan (translate+scale) tidak ketemu; yang punya scale: ${
        tembus.map((k) => k.gaya.slice(0, 90)).join(" || ") || "(tidak ada)"
      }`
    );
  }
  const [, px, py, z] =
    el.gaya.match(/translate\((-?[\d.]+)px, ?(-?[\d.]+)px\) ?scale\(([\d.]+)\)/) || [];
  if (!px) throw new Error(`transform terbaca tidak cocok pola: ${el.gaya.slice(0, 140)}`);
  return { pan: { x: parseFloat(px), y: parseFloat(py) }, zoom: parseFloat(z) };
};

const bentukDiDom = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[id^="val-node-"]')).map((el) => ({
    x: parseFloat(el.style.left || "0"),
    y: parseFloat(el.style.top || "0"),
    width: parseFloat(el.style.width || "130"),
    height: parseFloat(el.style.height || "70"),
  }));

const batasBentuk = (container: HTMLElement) => {
  const isi = bentukDiDom(container);
  const x1 = Math.min(...isi.map((b) => b.x));
  const y1 = Math.min(...isi.map((b) => b.y));
  const x2 = Math.max(...isi.map((b) => b.x + b.width));
  const y2 = Math.max(...isi.map((b) => b.y + b.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
};

/** Posisi layar sebuah kotak papan: persis rumus lapisan transform. */
const keLayar = (
  v: { pan: { x: number; y: number }; zoom: number },
  b: ReturnType<typeof batasBentuk>
) => ({
  kiri: v.pan.x + b.x * v.zoom,
  kanan: v.pan.x + (b.x + b.width) * v.zoom,
  atas: v.pan.y + b.y * v.zoom,
  bawah: v.pan.y + (b.y + b.height) * v.zoom,
});

const papanDariLayar = (v: typeof AWAL, titik: { x: number; y: number }) => ({
  x: (titik.x - v.pan.x) / v.zoom,
  y: (titik.y - v.pan.y) / v.zoom,
});

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

async function bukaPapan(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Simulasi"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  const kanvas = container.querySelector(".kanvas-papan") as HTMLElement;
  kanvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: KANVAS.lebar,
    bottom: KANVAS.tinggi,
    width: KANVAS.lebar,
    height: KANVAS.tinggi,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  Object.defineProperty(kanvas, "clientWidth", { value: KANVAS.lebar, configurable: true });
  Object.defineProperty(kanvas, "clientHeight", { value: KANVAS.tinggi, configurable: true });
  return kanvas;
}

async function tempelDiKursor(
  container: HTMLElement,
  kanvas: HTMLElement,
  kursor: { x: number; y: number },
  xml: string
) {
  fireEvent.mouseMove(kanvas, { clientX: kursor.x, clientY: kursor.y });
  tempelPeramban({ "text/html": htmlDrawio(xml) });
  await new Promise((r) => setTimeout(r, 0));
}

describe("simulasi: ke mana hasil tempel mendarat relative ke kursor", () => {
  beforeEach(() => {
    // Tanpa nilai, `fetchFlowcharts(...).then` di efek mount papan melempar
    // "Cannot read properties of undefined" dan seluruh simulasi mati di render.
    (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  });

  it.each([
    { nama: "kiri-atas", kursor: { x: 120, y: 90 } },
    { nama: "tengah", kursor: { x: 400, y: 300 } },
    { nama: "kanan-bawah", kursor: { x: 700, y: 520 } },
  ])("$nama: POJOK KIRI-ATAS kelompok mendarat tepat di titik kursor", async ({ kursor }) => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);
    await tempelDiKursor(container, kanvas, kursor, XML_LEBAR);

    const sasaran = papanDariLayar(AWAL, kursor);
    const b = batasBentuk(container);
    expect(Math.round(b.x)).toBe(Math.round(sasaran.x));
    expect(Math.round(b.y)).toBe(Math.round(sasaran.y));
    // Kelompok datang utuh: 3 bentuk + 2 garis.
    expect(container.querySelectorAll('[id^="val-node-"]')).toHaveLength(3);
    expect(container.querySelectorAll("path[marker-end]")).toHaveLength(2);
  });

  it("satu bentuk di tengah layar: hasilnya sudah terlihat, jadi papan TIDAK bergeser dan zoom tetap", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);
    await tempelDiKursor(container, kanvas, { x: 400, y: 300 }, XML_SELEBAR_JARI);

    expect(viewportLapisan(container)).toEqual(AWAL);
    const l = keLayar(AWAL, batasBentuk(container));
    expect(l.kiri).toBeGreaterThanOrEqual(0);
    expect(l.kanan).toBeLessThanOrEqual(KANVAS.lebar);
    expect(l.atas).toBeGreaterThanOrEqual(0);
    expect(l.bawah).toBeLessThanOrEqual(KANVAS.tinggi);
  });

  it("kelompok selebar 1.240 px di kursor kanan-bawah: #635 menarik layar sampai SEMUANYA terlihat", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);
    await tempelDiKursor(container, kanvas, { x: 700, y: 520 }, XML_LEBAR);

    const v = viewportLapisan(container);
    const b = batasBentuk(container);
    const l = keLayar(v, b);

    // SEBELUM #635, dengan layar masih di keadaan awal (zoom 0,9, pan 50):
    // kursor (700,520) -> titik papan (722,522), kelompok 1.240 px membentang
    // sampai x layar 700 + 1.240*0,9 = 1.816, sementara layarnya 800 px.
    const sebelum = keLayar(AWAL, b);
    expect(Math.round(sebelum.kiri)).toBe(700);
    expect(Math.round(sebelum.kanan)).toBe(1816);
    expect(sebelum.kanan).toBeGreaterThan(KANVAS.lebar);

    // SESUDAH #635: seluruh kelompok masuk layar.
    expect(l.kiri).toBeGreaterThanOrEqual(0);
    expect(l.atas).toBeGreaterThanOrEqual(0);
    expect(l.kanan).toBeLessThanOrEqual(KANVAS.lebar);
    expect(l.bawah).toBeLessThanOrEqual(KANVAS.tinggi);
    // Yang dilakukan #635 di kasus ini: MENURUNKAN zoom 0,9 -> ~0,581 supaya
    // seluruh kelompok muat, bukan hanya menggeser. Ini konsekuensi yang dicatat
    // untuk dibandingkan dengan Figma/Miro (mereka memusatkan, tidak mengubah zoom).
    expect(v.zoom).toBeLessThan(AWAL.zoom);
    expect(v.zoom).toBeCloseTo((KANVAS.lebar - 2 * 40) / 1240, 3);
  });

  it("titik kursor yang sama pada zoom berbeda mendarat di titik papan yang berbeda (bukan layar mentah)", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);
    // Perkecil papan dua kali lewat gulir (wheel), lalu tempel di titik layar yang sama.
    fireEvent.wheel(kanvas, { clientX: 400, clientY: 300, deltaY: 300 });
    await new Promise((r) => setTimeout(r, 0));
    const v = viewportLapisan(container);
    expect(v.zoom).toBeLessThan(AWAL.zoom);

    await tempelDiKursor(container, kanvas, { x: 400, y: 300 }, XML_SELEBAR_JARI);
    const b = batasBentuk(container);
    expect(Math.round(b.x)).toBe(Math.round((400 - v.pan.x) / v.zoom));
    expect(Math.round(b.y)).toBe(Math.round((300 - v.pan.y) / v.zoom));
  });
});
