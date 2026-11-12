/**
 * @jest-environment jsdom
 *
 * #853 — label garis disunting DI ATAS garisnya dan bisa digeser.
 *
 * SEBAB TEST INI ADA. Kotak label garis hanya hidup di panel kanan yang
 * bawaannya tertutup: mengubah satu label berarti memilih garis, membuka flap
 * panel, lalu mencari kolomnya. draw.io cukup klik-ganda garis. Selain itu
 * label selalu duduk di titik tengah jalur, jadi pada garis pendek ia menutupi
 * bentuk dan tidak ada cara memindahkannya.
 *
 * Yang dikunci di sini: klik-ganda membuka penyuntingan (dan tidak membuka apa
 * pun bila tidak diminta), ketikan mengalir ke `edge.label`, Escape menutup
 * lewat satu jalur pembukuan, dan `labelOffset` menggeser label dari titik
 * tengah — kosong berarti posisi lama, persis.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { FlowchartEdges, titikTengahJalur } from "./FlowchartEdges";
import type { FlowEdge, FlowNode } from "../types";

const NODE: FlowNode[] = [
  { id: "r1", type: "rect", x: 40, y: 40, label: "r1", color: "indigo", width: 155, height: 70 },
  { id: "r2", type: "rect", x: 420, y: 40, label: "r2", color: "indigo", width: 155, height: 70 },
];

const garis = (patch: Partial<FlowEdge> = {}): FlowEdge => ({
  id: "e1",
  fromNodeId: "r1",
  toNodeId: "r2",
  label: "awal",
  ...patch,
});

type Props = React.ComponentProps<typeof FlowchartEdges>;

const propsUntuk = (edges: FlowEdge[], partial: Partial<Props> = {}): Props => ({
  edges,
  nodes: NODE,
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
  koordinatPapan: (x: number, y: number) => ({ x, y }),
  isEditable: true,
  onEdgePatch: jest.fn(),
  getNodeCenter: (id: string) => {
    const n = NODE.find((x) => x.id === id);
    return n ? { x: n.x + n.width! / 2, y: n.y + n.height! / 2 } : { x: 0, y: 0 };
  },
  draggingNodeId: null,
  resizingNodeId: null,
  ...partial,
});

const jalurSentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

const kotakLabel = (container: HTMLElement) =>
  container.querySelector('[data-testid="label-garis-e1"]') as SVGForeignObjectElement | null;

/** jsdom tidak mengisi `clientX`/`clientY` dari `fireEvent.pointerDown`. */
const tekan = (el: Element, x: number, y: number) => {
  const ev = new Event("pointerdown", { bubbles: true });
  Object.assign(ev, { clientX: x, clientY: y, button: 0 });
  el.dispatchEvent(ev);
};
const gerak = (x: number, y: number) => {
  const ev = new Event("pointermove", { bubbles: true });
  Object.assign(ev, { clientX: x, clientY: y });
  window.dispatchEvent(ev);
};
const lepas = () => window.dispatchEvent(new Event("pointerup", { bubbles: true }));

const MODE_SUNTING: Partial<Props> = {
  suntingLabelGarisId: "e1",
  mulaiSuntingLabelGaris: jest.fn(),
  akhiriSuntingLabelGaris: jest.fn(),
};

describe("#853 label garis di papan", () => {
  it("klik-ganda garis meminta penyuntingan; garis biasa tidak menampilkan input", () => {
    const mulaiSuntingLabelGaris = jest.fn();
    const { container } = render(
      <FlowchartEdges {...propsUntuk([garis()], { mulaiSuntingLabelGaris })} />
    );

    expect(container.querySelector('[data-testid="sunting-label-garis-e1"]')).toBeNull();
    fireEvent.doubleClick(jalurSentuh(container));
    expect(mulaiSuntingLabelGaris).toHaveBeenCalledWith("e1");
  });

  it("input label muncul saat disunting dan mengetik mengubah label garis", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(
      <FlowchartEdges {...propsUntuk([garis()], { ...MODE_SUNTING, onEdgePatch })} />
    );

    const input = container.querySelector(
      '[data-testid="sunting-label-garis-e1"]'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("awal");

    fireEvent.change(input, { target: { value: "Ya" } });
    const [id, patch] = onEdgePatch.mock.calls.at(-1)!;
    expect(id).toBe("e1");
    expect(patch).toEqual({ label: "Ya" });
  });

  it("label kosong pun bisa dibuka untuk disunting", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk([garis({ label: undefined })], MODE_SUNTING)} />
    );
    const input = container.querySelector(
      '[data-testid="sunting-label-garis-e1"]'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("Escape menutup penyuntingan lewat satu jalur pembukuan", () => {
    const akhiriSuntingLabelGaris = jest.fn();
    const { container } = render(
      <FlowchartEdges {...propsUntuk([garis()], { ...MODE_SUNTING, akhiriSuntingLabelGaris })} />
    );
    const input = container.querySelector(
      '[data-testid="sunting-label-garis-e1"]'
    ) as HTMLInputElement;
    input.focus();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(akhiriSuntingLabelGaris).toHaveBeenCalledTimes(1);
  });

  it("labelOffset menggeser label; kosong berarti posisi lama persis", () => {
    const { container: dasar } = render(<FlowchartEdges {...propsUntuk([garis()])} />);
    const kotakDasar = kotakLabel(dasar)!;
    expect(kotakDasar).toBeTruthy();

    const d = (dasar.querySelector('[data-testid="garis-e1"]') as SVGPathElement).getAttribute(
      "d"
    )!;
    const angka = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
    const tengah = titikTengahJalur([
      { x: angka[0], y: angka[1] },
      { x: angka[2], y: angka[3] },
    ]);
    expect(Number(kotakDasar.getAttribute("x"))).toBe(tengah.x - 60);
    expect(Number(kotakDasar.getAttribute("y"))).toBe(tengah.y - 17);

    const { container: digeser } = render(
      <FlowchartEdges {...propsUntuk([garis({ labelOffset: { x: 40, y: -25 } })])} />
    );
    const kotakGeser = kotakLabel(digeser)!;
    expect(Number(kotakGeser.getAttribute("x"))).toBe(Number(kotakDasar.getAttribute("x")) + 40);
    expect(Number(kotakGeser.getAttribute("y"))).toBe(Number(kotakDasar.getAttribute("y")) - 25);
  });

  it("menyeret label menyimpan geserannya sebagai labelOffset", () => {
    const onEdgePatch = jest.fn();
    const { container } = render(<FlowchartEdges {...propsUntuk([garis()], { onEdgePatch })} />);
    const teks = kotakLabel(container)!.querySelector("div") as HTMLDivElement;

    tekan(teks, 300, 60);
    gerak(340, 85);
    lepas();

    expect(onEdgePatch.mock.calls.at(-1)![1]).toEqual({ labelOffset: { x: 40, y: 25 } });
  });
});
