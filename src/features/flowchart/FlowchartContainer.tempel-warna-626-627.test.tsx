/**
 * @jest-environment jsdom
 */
/* #626 — hasil tempel harus mendarat di tempat pengguna menunjuk.
   #627 — isian bentuk harus cukup kontras dan tidak dibungkus halo saat diam. */
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
import { colorPaletteHex, colorPalettes } from "./constants";
import { renderCustomSvgShape } from "./lib/shapes";
import type { FlowNode } from "./types";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fw1",
    name: "Alur Tempel",
    description: "",
    category: "Panduan",
    nodes: [],
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

/** Tiga bentuk + dua garis, dengan koordinat dokumen draw.io yang JAUH ke kanan. */
const xmlDrawio =
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="a" value="Satu" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="200" y="150" width="140" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="b" value="Dua" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="900" y="150" width="140" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="c" value="Tiga" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="1300" y="150" width="140" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="e1" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="e2" edge="1" parent="1" source="b" target="c"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  "</root></mxGraphModel></diagram></mxfile>";

const htmlDrawio = (xml: string) => {
  const json = JSON.stringify({ xml });
  const lup = json
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

async function bukaPapan(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Tempel"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  const kanvas = container.querySelector(".kanvas-papan") as HTMLElement;
  // jsdom tidak punya layout: persegi elemen selalu 0x0, jadi papan dibuat
  // seolah-olah 800x600 di kiri-atas layar — cukup untuk menguji aritmetika
  // konversi kursor -> koordinat papan.
  kanvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return kanvas;
}

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

/** x terkecil dari bentuk yang baru menempel. */
const xAwal = (container: Element) =>
  Math.min(
    ...Array.from(container.querySelectorAll('[id^="val-node-"]')).map((el) =>
      parseFloat((el as HTMLElement).style.left || "0")
    )
  );

/** Titik tengah kotak pembungkus kelompok yang menempel, dalam koordinat papan. */
const pusatKelompok = (container: Element) => {
  const isi = Array.from(container.querySelectorAll('[id^="val-node-"]')).map((el) => {
    const e = el as HTMLElement;
    return {
      x: parseFloat(e.style.left || "0"),
      y: parseFloat(e.style.top || "0"),
      width: parseFloat(e.style.width || "130"),
      height: parseFloat(e.style.height || "70"),
    };
  });
  const x1 = Math.min(...isi.map((b) => b.x));
  const y1 = Math.min(...isi.map((b) => b.y));
  const x2 = Math.max(...isi.map((b) => b.x + b.width));
  const y2 = Math.max(...isi.map((b) => b.y + b.height));
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
};

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("posisi hasil tempel (#626, jangkar diubah oleh #637)", () => {
  it("tanpa kursor di atas papan, kelompok mencari TENGAH area yang terlihat dan ditahan tepi papan", async () => {
    const { container } = renderPapan();
    await bukaPapan(container);

    tempelPeramban({ "text/html": htmlDrawio(xmlDrawio) });

    // Tengah layar (400,300) -> papan: (389,278). Kelompok ini selebar 1.240 px,
    // jadi memusatkan titik (389,278) berarti pojok kirinya jatuh di x=-231 - di
    // luar dokumen papan (mulai x=10). Yang dijepit adalah kelompoknya secara
    // utuh: x=10, pusatnya bergeser ke 630. SEBELUM #626 hasilnya x=230 dan
    // bentuk terakhir duduk di x=1330, di luar yang sedang dilihat.
    expect(xAwal(container)).toBe(10);
    expect(Math.round(pusatKelompok(container).x)).toBe(630);
    expect(container.querySelectorAll('[id^="val-node-"]')).toHaveLength(3);
    expect(container.querySelectorAll("path[marker-end]")).toHaveLength(2);
  });

  it("kursor di atas papan: PUSAT kelompok yang duduk di titik kursor, bukan pojoknya (#637)", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);

    fireEvent.mouseMove(kanvas, { clientX: 620, clientY: 320 });
    tempelPeramban({ "text/html": htmlDrawio(xmlDrawio) });

    // ((620-50)/0.9, (320-50)/0.9) = (633,300) - titik yang sekarang diduduki
    // TENGAH kelompok, sehingga separuh alur selalu ada di kiri kursor.
    const pusat = pusatKelompok(container);
    expect(Math.round(pusat.x)).toBe(633);
    expect(Math.round(pusat.y)).toBe(300);
    expect(xAwal(container)).toBe(13);
  });
});

describe("kejernisan bentuk (#627)", () => {
  const luminans = (hex: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const kontras = (a: string, b: string) => {
    const [l1, l2] = [luminans(a), luminans(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  /**
   * Ambang di bawah ini ANGKA UKUR, bukan selera, dan dasar pemilihannya
   * berubah 05 Okt (#638, rute 2 yang dipilih pemilik proyek):
   * - Palet lama (#627) punya kontras tepi/isian 4,51-9,45 rata-rata 5,71.
   *   Itulah "masih gemuk dan warnanya pecah" yang dilaporkan pemilik proyek.
   * - draw.io, diukur pada palet kanoniknya sendiri: 1,76-3,32 rata-rata 2,83.
   * - Palet sekarang: 1,76-3,36 rata-rata 2,91, kecuali `slate` 5,27 karena
   *   #f5f5f5/#666666 memang pasangan abu-abu kanonik draw.io.
   * Teks tetap disyaratkan >= 8 (terukur 10,1-13,4), jadi melunakkan tepi tidak
   * dibayar dengan label yang sulit dibaca.
   */
  const BANDANG_TEPI = { min: 1.7, maks: 3.5 };

  it("setiap bentuk duduk di bandang kontras draw.io, bukan setebal palet lama (#638)", () => {
    const tepi = Object.entries(colorPaletteHex).map(([n, w]) => ({
      n,
      c: kontras(w.bg, w.stroke),
    }));
    const keluarBandang = tepi.filter(
      (t) => t.n !== "slate" && (t.c < BANDANG_TEPI.min || t.c > BANDANG_TEPI.maks)
    );
    const rata = tepi.reduce((a, t) => a + t.c, 0) / tepi.length;

    expect(keluarBandang.map((t) => `${t.n} ${t.c.toFixed(2)}`)).toEqual([]);
    // Rata-rata palet lama 5,71 - kalau angka ini naik mendekati itu, bentuk
    // kembali jadi stiker tebal.
    expect(rata).toBeLessThan(3.2);
  });

  it("isian RATA satu tone: tidak ada lagi dua warna dalam satu bentuk (#638)", () => {
    // Gradien 135 derajat bg -> bgGrad adalah separuh dari "warnanya pecah".
    const berGradien = Object.entries(colorPaletteHex).filter(([, w]) => w.bg !== w.bgGrad);
    expect(berGradien.map(([n]) => n)).toEqual([]);
  });

  it("teks di atas isian tetap terbaca, dan hanya ada SATU tabel warna bentuk", () => {
    const tidakTerbaca = Object.entries(colorPaletteHex).filter(
      ([, w]) => kontras(w.bg, "#1e293b") < 8
    );
    expect(tidakTerbaca.map(([n]) => n)).toEqual([]);

    // #631 untuk warna: dulu kelas Tailwind (`bg-amber-100 border-amber-600`)
    // hidup sendiri di `colorPalettes` dan bisa menyimpang dari hex yang
    // dipakai bentuk SVG. Sekarang hex satu-satunya sumber; kelas hanya memegang
    // warna teks, dan kuncinya wajib sama.
    expect(Object.keys(colorPalettes).sort()).toEqual(Object.keys(colorPaletteHex).sort());
    const masihMegangLatar = Object.entries(colorPalettes).filter(([, k]) =>
      /\bbg-/.test(Object.values(k).join(" "))
    );
    expect(masihMegangLatar.map(([n]) => n)).toEqual([]);
  });

  it("bentuk yang diam tidak membawa bayangan, hanya hovered/terpilih", () => {
    const bentuk = (i: Partial<FlowNode>) =>
      ({
        id: "n1",
        type: "circle",
        x: 0,
        y: 0,
        width: 120,
        height: 120,
        label: "Uji",
        color: "yellow",
        ...i,
      }) as FlowNode;
    const diam = renderCustomSvgShape(bentuk({}), "miro", false) as React.ReactElement;
    const terpilih = renderCustomSvgShape(bentuk({}), "miro", true) as React.ReactElement;
    expect((diam.props as { style: { filter: string } }).style.filter).toBe("none");
    expect((terpilih.props as { style: { filter: string } }).style.filter).not.toBe("none");
  });
});
