/**
 * @jest-environment jsdom
 *
 * #766 — garis harus BISA DIBENTUK, bukan hanya bisa dipilih.
 *
 * SEBAB TEST INI ADA. Pemilik proyek mengirim tangkapan layar papan yang sedang
 * digarapnya dan menulis: "garis tidak bisa di geser, di atur, di bentuk, tidak
 * responsive. benchmark ke tools drawio saat buat garis dari diagram 1 ke
 * diagram lain, bisa di atur garis nya bengkok nya, ini tidak bisa."
 *
 * Yang ada sebelum item ini (#653) memang sudah menyimpan tekukan, tetapi
 * affordance-nya satu lingkaran kosong 5 px di TENGAH SELURUH jalur, dan hanya
 * pada garis yang sudah TERPILIH. Pada garis diagonal yang menyeberangi dua
 * bentuk itu artinya: satu sasaran seukuran titik, di tempat yang tidak bisa
 * dipilih, setelah garisnya sudah terpilih — dan memilih garis di HP saja sudah
 * sulit. draw.io memasang pegangan pada SETIAP SEGMEN dan menampilkannya saat
 * garis hanya disentuh kursor.
 *
 * EMPAT hal yang dikunci di sini, semuanya adalah perilaku yang rusak sebelumnya:
 *
 * 1. **Satu gagang per segmen.** Garis yang berbelok punya lebih dari satu
 *    pegangan; jumlahnya ikut jumlah segmennya.
 * 2. **Muncul saat diarahkan, bukan hanya saat dipilih.** Yang tidak terlihat
 *    tidak akan pernah ditemukan.
 * 3. **Menyisip tidak melompat.** Tekukan baru masuk PADA INDEKS segmennya dan
 *    titik-titik lama tetap berurutan — kalau sisanya dihitung ulang, garisnya
 *    justru berubah bentuk saat orang mulai membengkokkannya, dan itu keluhan
 *    "tidak bisa diatur" dalam bentuk paling buruk.
 * 4. **Sasaran sentuhnya 13 px ruang papan dan ikut zoom.** Lingkarannya sendiri
 *    tetap kecil supaya tidak menutupi garis; yang dikecil/diperbesar adalah
 *    wilayah jarinya.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import type { FlowEdge, FlowNode, Point } from "../types";

const bentuk = (id: string, x: number, y: number): FlowNode => ({
  id,
  type: "rect",
  x,
  y,
  label: id,
  color: "indigo",
  width: 150,
  height: 70,
});

// Dua bentuk yang TIDAK segaris: rute orthogonalnya wajib berbelok, jadi jumlah
// segmennya lebih dari satu dan itu yang mau diukur.
const NODES = [bentuk("r1", 60, 40), bentuk("r2", 520, 300)];

const garis = (patch: Partial<FlowEdge> = {}): FlowEdge => ({
  id: "e1",
  fromNodeId: "r1",
  toNodeId: "r2",
  ...patch,
});

type Props = React.ComponentProps<typeof FlowchartEdges>;

const propsUntuk = (partial: Partial<Props> = {}): Props => ({
  edges: [garis()],
  nodes: NODES,
  canvasTheme: "miro",
  selectedEdgeId: null,
  setSelectedEdgeId: jest.fn(),
  hoveredEdgeId: null,
  setHoveredEdgeId: jest.fn(),
  selectedNodeId: null,
  setSelectedNodeId: jest.fn(),
  hoveredNodeId: null,
  connectSourceId: null,
  setConnectSourceId: jest.fn(),
  hoverCoords: { x: 0, y: 0 },
  connectorType: "orthogonal",
  zoomLevel: 1,
  isEditable: true,
  onEdgePatch: jest.fn(),
  koordinatPapan: (x: number, y: number) => ({ x, y }),
  onDeleteEdge: jest.fn(),
  getNodeCenter: (id: string) => {
    const n = NODES.find((x) => x.id === id);
    return n ? { x: n.x + n.width! / 2, y: n.y + n.height! / 2 } : { x: 0, y: 0 };
  },
  draggingNodeId: null,
  resizingNodeId: null,
  ...partial,
});

const gagang = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-testid^="gagang-tekuk-"]')) as SVGCircleElement[];

const titikGagang = (el: SVGCircleElement) => ({
  x: parseFloat(el.getAttribute("cx") || "0"),
  y: parseFloat(el.getAttribute("cy") || "0"),
});

/**
 * Seretan sungguhan. Sama seperti #653: pendengarnya duduk di `window`, dan
 * jsdom tidak menjamin peristiwa pointer membawa `clientX`/`clientY` dari
 * init-nya — jadi keduanya dipasang tangan. Tanpa ini test mengira komponennya
 * rusak padahal peristiwanya yang bohong.
 */
const seret = (el: SVGCircleElement, ke: { x: number; y: number }, onEdgePatch: jest.Mock) => {
  fireEvent.pointerDown(el, { clientX: 0, clientY: 0, button: 0 });
  const gerak = new Event("pointermove", { bubbles: true });
  Object.assign(gerak, { clientX: ke.x, clientY: ke.y });
  window.dispatchEvent(gerak);
  window.dispatchEvent(new Event("pointerup", { bubbles: true }));
  return onEdgePatch.mock.calls.map((c) => c[1].waypoints as { x: number; y: number }[]);
};

/** `lama` harus tetap terbaca di dalam `baru`, berurutan, tanpa titik yang berpindah. */
const adakahUrut = (lama: Point[], baru: Point[]): boolean => {
  let i = 0;
  for (const b of baru) {
    if (i < lama.length && lama[i].x === b.x && lama[i].y === b.y) i++;
  }
  return i === lama.length;
};

describe("#766 gagang tekukan per segmen", () => {
  it("satu garis yang berbelok punya LEBIH DARI SATU gagang, sebanyak segmennya", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1" })} />);
    const daftar = gagang(container);
    expect(daftar.length).toBeGreaterThan(1);
    // Tiap gagang duduk di tengah segmennya sendiri-sendiri: tidak ada dua
    // gagang yang bertumpuk di satu titik.
    const titik = new Set(daftar.map((g) => `${titikGagang(g).x},${titikGagang(g).y}`));
    expect(titik.size).toBe(daftar.length);
  });

  it("gagang sudah muncul ketika garis hanya diarahkan kursor", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ selectedEdgeId: null, hoveredEdgeId: "e1" })} />
    );
    expect(gagang(container).length).toBeGreaterThan(1);
  });

  it("garis yang tidak dipilih dan tidak diarahkan tidak memasang gagang", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    expect(gagang(container)).toHaveLength(0);
  });

  it("menyisip tekukan di tengah TIDAK mengubah titik tekukan yang sudah ada", () => {
    const onEdgePatch = jest.fn();
    const { container, rerender } = render(
      <FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1", onEdgePatch })} />
    );

    // Tekukan pertama: sisip di segmen terakhir, jadi ada satu titik manual.
    const daftar = gagang(container);
    const pertama = seret(daftar[daftar.length - 1], { x: 700, y: 120 }, onEdgePatch);
    const hasilPertama = pertama[0];
    expect(hasilPertama.length).toBeGreaterThan(1);

    // Pasang hasilnya, lalu sisip SATU LAGI di tengah segmen nomor 1.
    onEdgePatch.mockClear();
    rerender(
      <FlowchartEdges
        {...propsUntuk({
          selectedEdgeId: "e1",
          onEdgePatch,
          edges: [garis({ waypoints: hasilPertama })],
        })}
      />
    );
    const gagangKini = gagang(container);
    expect(gagangKini.length).toBe(hasilPertama.length + 1);

    const kedua = seret(gagangKini[1], { x: 300, y: 600 }, onEdgePatch);
    const hasilKedua = kedua[kedua.length - 1];
    expect(hasilKedua.length).toBeGreaterThan(hasilPertama.length);

    // INI INTINYA, dan inilah yang dulu gagal: tekukan yang SUDAH ada harus
    // tetap ada, di urutan yang sama. Yang boleh bertambah hanyalah sudut yang
    // tadinya disintesis saat menggambar (connector orthogonal membuat sudut
    // sendiri di atas kertas), karena menyisip tekukan berarti bentuk garis yang
    // terlihat sekarang disimpan apa adanya ke dalam model.
    expect(hasilKedua[1]).toEqual({ x: 300, y: 600 });
    expect(adakahUrut(hasilPertama, hasilKedua)).toBe(true);
  });

  it("wilayah sentuh gagang 13 px papan dan ikut skala zoom", () => {
    const { container, rerender } = render(
      <FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1", zoomLevel: 1 })} />
    );
    const dekat = gagang(container)[0];
    expect(parseFloat(dekat.getAttribute("r") || "0")).toBe(13);

    // Di papan 0,5 zoom satu piksel layar mewakili dua piksel papan: jarinya
    // harus ikut membesar, bukan ikut mengecil.
    rerender(<FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1", zoomLevel: 0.5 })} />);
    expect(parseFloat(gagang(container)[0].getAttribute("r") || "0")).toBe(26);

    // Jalur sentuh garis mengikuti aturan yang sama — memilih garis adalah pintu
    // masuk ke SEMUA keluwesan garis, jadi kalau pintunya sekecil enam piksel di
    // layar HP, tidak ada yang bisa diatur setelahnya.
    const sentuh = container.querySelector('path[stroke="transparent"]') as SVGPathElement;
    expect(parseFloat(sentuh.getAttribute("stroke-width") || "0")).toBe(32);
  });
});
