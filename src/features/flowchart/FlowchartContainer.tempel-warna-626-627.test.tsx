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
import { colorPaletteHex } from "./constants";
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

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("posisi hasil tempel (#626)", () => {
  it("tanpa kursor di atas papan, kelompok mendarat di TENGAH area yang terlihat", async () => {
    const { container } = renderPapan();
    await bukaPapan(container);

    tempelPeramban({ "text/html": htmlDrawio(xmlDrawio) });

    // Tengah papan (400,300) -> papan: ((400-50)/0.9, (300-50)/0.9) = (389, 278).
    // SEBELUM #626: posisi null -> koordinat dokumen ASLI + 30, yaitu x=230 dan
    // bentuk terakhir duduk di x=1330 — di luar yang sedang dilihat.
    expect(xAwal(container)).toBe(389);
    expect(container.querySelectorAll('[id^="val-node-"]')).toHaveLength(3);
    expect(container.querySelectorAll("path[marker-end]")).toHaveLength(2);
  });

  it("kursor di atas papan dipakai apa adanya, bukan tengah papan", async () => {
    const { container } = renderPapan();
    const kanvas = await bukaPapan(container);

    fireEvent.mouseMove(kanvas, { clientX: 620, clientY: 320 });
    tempelPeramban({ "text/html": htmlDrawio(xmlDrawio) });

    // ((620-50)/0.9, (320-50)/0.9) = (633, 300)
    expect(xAwal(container)).toBe(633);
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

  it("setiap isian punya tepi yang terbaca dan teks yang tetap kontras", () => {
    const tepiLemah = Object.entries(colorPaletteHex).filter(
      ([, w]) => kontras(w.bg, w.stroke) < 2.2
    );
    const tidakTerbaca = Object.entries(colorPaletteHex).filter(
      ([, w]) => kontras(w.bg, "#1e293b") < 8
    );
    // SEBELUM #627 isian duduk di tingkat 50/100 (kroma 14-20) sehingga bentuk
    // nyaris menyatu dengan papan; draw.io memakai 20-51. Sekarang 100/200
    // dengan tepi 600/700 — dan TIDAK boleh kembali ke tingkat 50.
    const tingkat50 = new Set([
      "#fffbeb",
      "#fff7ed",
      "#fdf2f8",
      "#eff6ff",
      "#ecfdf5",
      "#faf5ff",
      "#eef2ff",
      "#f0f9ff",
      "#fff1f2",
      "#f5f3ff",
      "#f8fafc",
    ]);
    const kembaliPudar = Object.entries(colorPaletteHex).filter(([, w]) => tingkat50.has(w.bg));
    expect(tepiLemah.map(([n]) => n)).toEqual([]);
    expect(tidakTerbaca.map(([n]) => n)).toEqual([]);
    expect(kembaliPudar.map(([n]) => n)).toEqual([]);
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
