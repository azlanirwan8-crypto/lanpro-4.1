/**
 * #851 — satu seretan garis menghasilkan SATU langkah riwayat.
 *
 * SEBAB TEST INI ADA. `mulaiSeretTekukan` dan `mulaiSeretSegmen` dulu memanggil
 * `onEdgePatch` pada setiap `pointermove`, dan container mencatat riwayat di
 * setiap panggilan. Terukur: seretan 60 langkah = 61 snapshot, sementara
 * riwayat hanya menyimpan 50 — artinya satu seretan menghapus seluruh riwayat
 * sebelumnya, dan Ctrl+Z sesudahnya hanya bisa memutar ulang tengah seretan.
 *
 * Yang dikunci di sini: selama jari bergerak papan tetap ikut (patch dikirim
 * `{ sementara: true }`), tetapi penutup seret dipanggil TEPAT SEKALI dengan
 * waypoint terakhir — itulah satu-satunya momen yang boleh dicatat container.
 * Aksi diskret (hapus tekukan) TIDAK boleh bertanda sementara: ia harus
 * langsung menjadi langkah riwayat.
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
import { ruteOrtogonal } from "../lib/ruteOrtogonal";
import type { FlowEdge, FlowNode } from "../types";

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
  selectedEdgeId: "e1",
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

const jalurRute = () =>
  ruteOrtogonal(
    { x: 210, y: 75, dir: { x: 1, y: 0 } },
    { x: 520, y: 335, dir: { x: -1, y: 0 } },
    "r1",
    "r2",
    NODES
  );

const sentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

const gerak = (x: number, y: number) => {
  const ev = new Event("pointermove", { bubbles: true });
  Object.assign(ev, { clientX: x, clientY: y });
  act(() => window.dispatchEvent(ev));
};

const lepas = () => act(() => window.dispatchEvent(new Event("pointerup", { bubbles: true })));

describe("#851 riwayat seret garis", () => {
  it("seretan 60 langkah pada gagang tekukan: 61 patch sementara, satu penutup", () => {
    const onEdgePatch = jest.fn();
    const onSeretSelesai = jest.fn();
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ onEdgePatch, onSeretSelesai })} />
    );
    const pegangan = container.querySelector('[data-testid^="gagang-tekuk-"]') as SVGCircleElement;
    expect(pegangan).not.toBeNull();

    fireEvent.pointerDown(pegangan, { clientX: 400, clientY: 250, button: 0 });
    for (let i = 1; i <= 60; i++) gerak(400 - i, 250 + i);
    lepas();

    // Satu saat menyisip + enam puluh gerakan: semuanya sementara.
    expect(onEdgePatch).toHaveBeenCalledTimes(61);
    expect(onEdgePatch.mock.calls.every((c) => c[2]?.sementara === true)).toBe(true);

    // Yang dicatat container hanya ini, dan isinya waypoint TERAKHIR.
    expect(onSeretSelesai).toHaveBeenCalledTimes(1);
    expect(onSeretSelesai.mock.calls[0][0]).toBe("e1");
    expect(onSeretSelesai.mock.calls[0][1].waypoints).toEqual(
      onEdgePatch.mock.calls.at(-1)![1].waypoints
    );
  });

  it("seret seluruh segmen juga ditutup satu kali", () => {
    const onEdgePatch = jest.fn();
    const onSeretSelesai = jest.fn();
    const { container } = render(
      <FlowchartEdges {...propsUntuk({ onEdgePatch, onSeretSelesai })} />
    );
    const [start, a] = jalurRute();
    const tengah = { x: (start.x + a.x) / 2, y: start.y };

    const tekan = new Event("pointerdown", { bubbles: true });
    Object.assign(tekan, { clientX: tengah.x, clientY: tengah.y, button: 0 });
    act(() => sentuh(container).dispatchEvent(tekan));
    for (let i = 1; i <= 10; i++) gerak(tengah.x, tengah.y + i * 4);
    lepas();

    expect(onEdgePatch).toHaveBeenCalledTimes(10);
    expect(onEdgePatch.mock.calls.every((c) => c[2]?.sementara === true)).toBe(true);
    expect(onSeretSelesai).toHaveBeenCalledTimes(1);
    expect(onSeretSelesai.mock.calls[0][1].waypoints).toEqual(
      onEdgePatch.mock.calls.at(-1)![1].waypoints
    );
  });

  it("klik di bawah ambang geser tidak menulis apa pun dan tidak menutup seret", () => {
    const onEdgePatch = jest.fn();
    const onSeretSelesai = jest.fn();
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          onEdgePatch,
          onSeretSelesai,
          edges: [garis({ waypoints: [{ x: 300, y: 200 }] })],
        })}
      />
    );
    const titik = container.querySelector('[data-testid="tekukan-0"]') as SVGCircleElement;
    fireEvent.pointerDown(titik, { clientX: 300, clientY: 200, button: 0 });
    lepas();

    expect(onEdgePatch).not.toHaveBeenCalled();
    expect(onSeretSelesai).not.toHaveBeenCalled();
  });

  it("hapus tekukan adalah aksi diskret, bukan bagian dari seret", () => {
    const onEdgePatch = jest.fn();
    const onSeretSelesai = jest.fn();
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk({
          onEdgePatch,
          onSeretSelesai,
          edges: [garis({ waypoints: [{ x: 300, y: 200 }] })],
        })}
      />
    );
    fireEvent.doubleClick(container.querySelector('[data-testid="tekukan-0"]')!);

    expect(onSeretSelesai).not.toHaveBeenCalled();
    expect(onEdgePatch).toHaveBeenCalledTimes(1);
    expect(onEdgePatch.mock.calls[0][1].waypoints).toEqual([]);
    expect(onEdgePatch.mock.calls[0][2]).toBeUndefined();
  });
});
