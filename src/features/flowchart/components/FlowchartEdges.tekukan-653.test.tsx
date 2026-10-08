/**
 * #653 — garis bisa digeser: tekukan manual disimpan pada garisnya sendiri.
 *
 * SEBAB TEST INI ADA. Keluhan pemilik proyek 09 Okt, dengan screenshot titik
 * biru di atas garis: "kok garis flow nya tidak bisa geser, kalau di miro bisa
 * nih garis nya di geser geser". Yang terukur bukan bug: `FlowEdge` tidak punya
 * medan apa pun untuk menyimpan bentuk jalur, dan lapisan garis tidak punya satu
 * pun affordance seret — jalurnya dihitung ulang tiap frame dari posisi kedua
 * ujung. Jadi ini fitur baru, dan yang dikunci di sini adalah tiga hal yang
 * membuat fitur itu benar: tekukan dihormati alih-alih dihitung ulang, seretan
 * jarinya masuk sebagai KOORDINAT PAPAN (bukan piksel layar), dan hasil tempel
 * membawa tekukannya.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { FlowchartEdges, titikTengahJalur } from "./FlowchartEdges";
import type { FlowEdge, FlowNode } from "../types";

const bentuk = (id: string, x: number): FlowNode => ({
  id,
  type: "rect",
  x,
  y: 40,
  label: id,
  color: "indigo",
  width: 150,
  height: 70,
});

const NODES = [bentuk("r1", 60), bentuk("r2", 460)];

const garis = (patch: Partial<FlowEdge> = {}): FlowEdge => ({
  id: "e1",
  fromNodeId: "r1",
  toNodeId: "r2",
  connector: "straight",
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
  connectorType: "straight",
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

const jalur = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("path")).map((p) => p.getAttribute("d") || "");

describe("titikTengahJalur (#653)", () => {
  it("dua titik: hasilnya tengahnya", () => {
    expect(
      titikTengahJalur([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])
    ).toEqual({ x: 50, y: 0 });
  });

  it("jalur L: titik di separuh PANJANG GARIS, bukan rata-rata koordinat", () => {
    // Rata-rata koordinat memberi (50,50) — ruang kosong di luar garis. Yang
    // benar: 100 px sepanjang jalur 200 px, yaitu di sudutnya.
    expect(
      titikTengahJalur([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ])
    ).toEqual({
      x: 100,
      y: 0,
    });
  });

  it("kosong dan tunggal tidak melempar", () => {
    expect(titikTengahJalur([])).toEqual({ x: 0, y: 0 });
    expect(titikTengahJalur([{ x: 7, y: 9 }])).toEqual({ x: 7, y: 9 });
  });
});

describe("tekukan manual menghormati jalur tersimpan (#653)", () => {
  it("titik tekukan muncul apa adanya di jalur yang digambar", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          edges: [garis({ waypoints: [{ x: 300, y: 900 }] })],
        })}
      />
    );
    // (300,900) jauh di luar jangkauan rute apa pun antara dua bentuk ini:
    // kalau ia muncul di `d`, artinya tekukan yang menang, bukan perhitungannya.
    expect(jalur(container).some((d) => d.includes("300 900"))).toBe(true);
  });

  it("garis tanpa tekukan tetap memakai rute otomatis", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    expect(jalur(container).join(" ")).not.toContain("900");
  });

  it("pemegang tekukan hanya muncul pada garis terpilih", () => {
    const biasa = render(<FlowchartEdges {...propsUntuk()} />);
    expect(biasa.container.querySelectorAll("circle").length).toBe(0);

    const terpilih = render(<FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1" })} />);
    // satu pemegang "tambah tekukan" sudah ada begitu garis dipilih
    expect(terpilih.container.querySelectorAll("circle").length).toBeGreaterThan(0);
  });

  it("papan baca-saja tidak menawarkan pemegang sama sekali", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ selectedEdgeId: "e1", isEditable: false })} />
    );
    expect(container.querySelectorAll("circle").length).toBe(0);
  });
});

/**
 * Seretan sungguhan: pendengarnya dipasang di `window` (lihat `mulaiSeretTekukan`),
 * jadi peristiwanya dikirim ke sana. `clientX`/`clientY` dipasang di atas objek
 * peristiwa karena jsdom tidak menjamin konstruktor PointerEvent membawa init
 * itu — tanpa ini test mengira komponennya rusak padahal peristiwanya yang bohong.
 */
const peristiwaJari = (jenis: "pointermove" | "pointerup", x?: number, y?: number) => {
  const ev = new Event(jenis, { bubbles: true });
  if (x !== undefined) Object.assign(ev, { clientX: x, clientY: y });
  window.dispatchEvent(ev);
};

describe("menyeret dan membuang tekukan (#653)", () => {
  it("seretan jari ditulis sebagai koordinat papan, bukan piksel layar", () => {
    // koordinatPapan di sini menggeser -100 pada x: kalau lapisan garis memakai
    // piksel layar mentah, hasilnya 250 — bukan 150.
    const onEdgePatch = jest.fn();
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          selectedEdgeId: "e1",
          onEdgePatch,
          koordinatPapan: (x: number, y: number) => ({ x: x - 100, y }),
        })}
      />
    );
    const pemegang = container.querySelectorAll("circle");
    const tambah = pemegang[pemegang.length - 1];
    fireEvent.pointerDown(tambah, { clientX: 250, clientY: 75, button: 0 });
    peristiwaJari("pointermove", 250, 300);
    peristiwaJari("pointerup");

    const semua = onEdgePatch.mock.calls.map((c) => c[1].waypoints);
    // Lahir di tengah jalur (335,75), lalu pindah ke jarinya (150,300).
    expect(semua[0]).toEqual([{ x: 335, y: 75 }]);
    expect(semua[semua.length - 1]).toEqual([{ x: 150, y: 300 }]);
    // Patch pertama tidak boleh ikut berubah oleh seretan berikutnya: array yang
    // sudah diserahkan harus tidak pernah dimutasi lagi.
    expect(semua[0]).toEqual([{ x: 335, y: 75 }]);
  });

  it("peristiwa tanpa koordinat DIBUANG, bukan ditulis sebagai NaN", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          selectedEdgeId: "e1",
          onEdgePatch,
          edges: [garis({ waypoints: [{ x: 200, y: 300 }] })],
        })}
      />
    );
    fireEvent.pointerDown(container.querySelectorAll("circle")[0], {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    // Satu kibasan tanpa koordinat (pointer lahir di luar jendela), lalu satu
    // kibasan yang benar. Yang pertama tidak boleh meninggalkan jejak sama sekali.
    peristiwaJari("pointermove");
    peristiwaJari("pointermove", 500, 600);
    peristiwaJari("pointerup");

    const semua = onEdgePatch.mock.calls.map((c) => c[1].waypoints);
    expect(semua).toEqual([[{ x: 500, y: 600 }]]);
  });

  it("klik-ganda pada tekukan membuangnya dan menyisakan yang lain", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          selectedEdgeId: "e1",
          onEdgePatch,
          edges: [
            garis({
              waypoints: [
                { x: 200, y: 300 },
                { x: 400, y: 500 },
              ],
            }),
          ],
        })}
      />
    );
    const tekukan = container.querySelectorAll("circle")[0];
    fireEvent.doubleClick(tekukan);
    expect(onEdgePatch).toHaveBeenCalledWith("e1", {
      waypoints: [{ x: 400, y: 500 }],
    });
  });
});
