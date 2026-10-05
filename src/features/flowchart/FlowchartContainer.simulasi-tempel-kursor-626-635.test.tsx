/**
 * @jest-environment jsdom
 */
/**
 * SIMULASI tempel-di-kursor (#626 #635 #637), diminta pemilik proyek 05 Okt:
 * "coba simulasikan jika saya paste di papan, pastikan paste-nya pas dengan
 * posisi cursor berada di mana di atas papan nya, benchmark dengan app tools lain".
 *
 * Yang dilakukan di sini bukan menghitung ulang rumus di test lain, tetapi
 * MENCOBA PAPAN SUNGGUHANNYA: papan dibuka, kursor digerakkan ke titik yang
 * ditentukan, peristiwa `paste` milik peramban dikirim dengan isi draw.io, lalu
 * POSISI BENTUK DAN VIEWPORT DIANGKUK DARI DOM. Angka yang dibandingkan adalah
 * angka yang dipakai peramban untuk menggambar.
 *
 * HASIL SIMULASI PERTAMA adalah alasan #637 ada: yang diancor pojok kiri-atas
 * kelompok, jadi kursor di (700,520) melempar kelompok 1.240 px sampai x layar
 * 1.816 dari layar 800 px — 91 persen keluar layar ("jauh, susah dicari").
 * Test di bawah mengunci aturan yang DIPILIH pemilik proyek (Opsi A): PUSAT
 * kelompok di titik kursor, dan layar hanya MENGGESER tanpa menyentuh zoom.
 *
 * jsdom tidak punya layout, jadi dua hal dipasang manual: `getBoundingClientRect()`
 * kanvas (800x600 di kiri-atas layar) dan `clientWidth`/`clientHeight` elemen yang
 * sama — yang terakhir inilah yang dibaca `tampilDiLayar` (#635).
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

/** Kelompok LEBAR seperti alur nyata: 1.240 px, selebar layar. */
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
  const gaya = Array.from(container.querySelectorAll<HTMLElement>("div"))
    .map((d) => d.getAttribute("style") || "")
    .find((g) => /scale\(/.test(g) && /translate\(/.test(g));
  if (!gaya) throw new Error("lapisan papan (translate+scale) tidak ketemu di DOM");
  const [, px, py, z] =
    gaya.match(/translate\((-?[\d.]+)px, ?(-?[\d.]+)px\) ?scale\(([\d.]+)\)/) || [];
  if (!px) throw new Error(`transform terbaca tidak cocok pola: ${gaya.slice(0, 140)}`);
  return { pan: { x: parseFloat(px), y: parseFloat(py) }, zoom: parseFloat(z) };
};

const batasBentuk = (container: HTMLElement) => {
  const isi = Array.from(container.querySelectorAll<HTMLElement>('[id^="val-node-"]')).map(
    (el) => ({
      x: parseFloat(el.style.left || "0"),
      y: parseFloat(el.style.top || "0"),
      width: parseFloat(el.style.width || "130"),
      height: parseFloat(el.style.height || "70"),
    })
  );
  if (isi.length === 0) throw new Error("tidak ada bentuk di DOM");
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
  tengahX: v.pan.x + (b.x + b.width / 2) * v.zoom,
  tengahY: v.pan.y + (b.y + b.height / 2) * v.zoom,
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

async function tempelDiKursor(kanvas: HTMLElement, kursor: { x: number; y: number }, xml: string) {
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
  ])(
    "$nama: PUSAT kelompok di titik kursor, dan pusat itu berakhir di TENGAH layar (#637)",
    async ({ kursor }) => {
      const { container } = renderPapan();
      const kanvas = await bukaPapan(container);
      await tempelDiKursor(kanvas, kursor, XML_LEBAR);

      const sasaran = papanDariLayar(AWAL, kursor);
      const b = batasBentuk(container);
      const v = viewportLapisan(container);
      const l = keLayar(v, b);

      // Dokumen papan TIDAK tak berbatas seperti Miro: x mulai 10 dan berhenti di
      // 3.500 (`BATAS_PAPAN`), dan yang dijepit adalah kelompoknya secara utuh.
      // Kelompok 1.240 px karenanya tidak bisa berpusat di kiri x=630 - itu bukan
      // salah jangkar, itu tepi papan; sisanya diselesaikan langkah berikutnya.
      const pusatHarapan = Math.min(Math.max(sasaran.x, 10 + b.width / 2), 3500 - b.width / 2);
      expect(Math.round(b.x + b.width / 2)).toBe(Math.round(pusatHarapan));
      expect(Math.round(b.y + b.height / 2)).toBe(Math.round(sasaran.y));

      // Jaminan yang sesungguhnya dilihat pengguna: kelompok yang tidak muat
      // seluruhnya berakhir TERPUSAT di layar, tanpa menyentuh zoom - jadi tidak
      // ada lagi "sudah di paste tapi harus dicari".
      expect(l.tengahX).toBeCloseTo(KANVAS.lebar / 2, 6);
      expect(l.tengahY).toBeCloseTo(KANVAS.tinggi / 2, 6);
      expect(v.zoom).toBe(AWAL.zoom);

      // Kelompok datang utuh: 3 bentuk + 2 garis.
      expect(container.querySelectorAll('[id^="val-node-"]')).toHaveLength(3);
      expect(container.querySelectorAll("path[marker-end]")).toHaveLength(2);
    }
  );

  it("satu bentuk di tengah layar: sudah terlihat, jadi papan TIDAK bergeser dan zoom tetap", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);
    await tempelDiKursor(kanvas, { x: 400, y: 300 }, XML_SELEBAR_JARI);

    expect(viewportLapisan(container)).toEqual(AWAL);
    const l = keLayar(AWAL, batasBentuk(container));
    expect(l.kiri).toBeGreaterThanOrEqual(0);
    expect(l.kanan).toBeLessThanOrEqual(KANVAS.lebar);
    expect(l.atas).toBeGreaterThanOrEqual(0);
    expect(l.bawah).toBeLessThanOrEqual(KANVAS.tinggi);
  });

  it("kelompok 1.240 px di kursor kanan-bawah: layar menggeser sampai pusatnya di tengah, zoom TIDAK disentuh", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);
    await tempelDiKursor(kanvas, { x: 700, y: 520 }, XML_LEBAR);

    const v = viewportLapisan(container);
    const b = batasBentuk(container);
    const l = keLayar(v, b);

    // Pusat kelompok duduk di titik papan bawah kursor (722,522), jadi kotak
    // pembungkusnya 102..1.342. Sebagian memang di luar layar 800 px, TETAPI
    // seimbang: 158 px terpotong di kiri dan 158 px di kanan.
    expect(Math.round(b.x + b.width / 2)).toBe(722);
    expect(l.kiri).toBeCloseTo(-158, 1);
    expect(l.kanan).toBeCloseTo(KANVAS.lebar + 158, 1);
    expect(l.tengahX).toBeCloseTo(KANVAS.lebar / 2, 6);
    expect(l.tengahY).toBeCloseTo(KANVAS.tinggi / 2, 6);
    // Yang tidak boleh terjadi lagi: zoom pengguna berubah karena menempel.
    expect(v.zoom).toBe(AWAL.zoom);
  });

  it("titik kursor yang sama pada zoom berbeda mendarat di titik papan yang berbeda (bukan layar mentah)", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);
    // Perkecil papan lewat gulir, lalu tempel di titik layar yang sama.
    fireEvent.wheel(kanvas, { clientX: 400, clientY: 300, deltaY: 300 });
    await new Promise((r) => setTimeout(r, 0));
    const v = viewportLapisan(container);
    expect(v.zoom).toBeLessThan(AWAL.zoom);

    await tempelDiKursor(kanvas, { x: 400, y: 300 }, XML_SELEBAR_JARI);
    const b = batasBentuk(container);
    expect(Math.round(b.x + b.width / 2)).toBe(Math.round((400 - v.pan.x) / v.zoom));
    expect(Math.round(b.y + b.height / 2)).toBe(Math.round((300 - v.pan.y) / v.zoom));
  });
});
