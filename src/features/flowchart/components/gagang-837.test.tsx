/**
 * @jest-environment jsdom
 *
 * #837 — gagang tekukan harus bisa dipegang dengan mouse sungguhan.
 *
 * DUA SEBAB YANG DIKUNCI DI SINI, keduanya lolos dari test lama:
 *
 * 1. **mousedown masih lolos ke kanvas.** Peramban mengirim `pointerdown` lalu
 *    `mousedown`; `stopPropagation()` pada pointerdown tidak menghentikan yang
 *    kedua. Mousedown yang sampai ke kanvas mengosongkan seleksi dan memulai
 *    kotak seleksi (`handleCanvasMouseDown`), jadi gagang hilang tepat saat
 *    ditekan. Test lama memakai `fireEvent.pointerDown` saja, sehingga urutan
 *    berpasangan itu tidak pernah diuji.
 * 2. **Fokus segmen dikosongkan saat kursor pindah ke gagang.** Dulu
 *    `pointerleave` dipasang di jalur sentuh 16 px; naik ke lingkaran gagang
 *    berarti meninggalkan jalur, dan gagang melompat ke tengah seluruh jalur —
 *    kedip-kedip yang dilihat pemilik proyek. Sekarang fokus dibaca di grup
 *    `<g>` garis, jadi berpindah antar-anak tidak mengosongkannya.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { FlowchartEdges } from "./FlowchartEdges";
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

const gagang = (container: HTMLElement) =>
  container.querySelectorAll('[data-testid^="gagang-tekuk-"]');
const jalurSentuh = (container: HTMLElement) =>
  container.querySelector('path[stroke="transparent"]') as SVGPathElement;

const gerakKursor = (sasaran: Element, x: number, y: number) => {
  act(() => {
    const ev = new Event("pointermove", { bubbles: true });
    Object.assign(ev, { clientX: x, clientY: y });
    sasaran.dispatchEvent(ev);
  });
};

describe("#837 mousedown tidak lolos ke kanvas", () => {
  it("mousedown pada gagang tambah-tekukan dihentikan", () => {
    const induk = jest.fn();
    const { container } = render(
      <div onMouseDown={induk}>
        <FlowchartEdges {...propsUntuk()} />
      </div>
    );
    const el = gagang(container)[0] as SVGCircleElement;
    fireEvent.pointerDown(el, { clientX: 250, clientY: 75, button: 0 });
    fireEvent.mouseDown(el, { clientX: 250, clientY: 75, button: 0 });
    fireEvent.pointerUp(window);
    expect(induk).not.toHaveBeenCalled();
  });

  it("mousedown pada waypoint tersimpan dihentikan", () => {
    const induk = jest.fn();
    const { container } = render(
      <div onMouseDown={induk}>
        <FlowchartEdges {...propsUntuk({ edges: [garis({ waypoints: [{ x: 300, y: 200 }] })] })} />
      </div>
    );
    const el = container.querySelector('[data-testid="tekukan-0"]') as Element;
    fireEvent.pointerDown(el, { clientX: 300, clientY: 200, button: 0 });
    fireEvent.mouseDown(el, { clientX: 300, clientY: 200, button: 0 });
    fireEvent.pointerUp(window);
    expect(induk).not.toHaveBeenCalled();
  });

  it("mousedown pada jalur sentuh dihentikan", () => {
    const induk = jest.fn();
    const { container } = render(
      <div onMouseDown={induk}>
        <FlowchartEdges {...propsUntuk()} />
      </div>
    );
    const jalur = jalurSentuh(container);
    fireEvent.pointerDown(jalur, { clientX: 250, clientY: 75, button: 0 });
    fireEvent.mouseDown(jalur, { clientX: 250, clientY: 75, button: 0 });
    fireEvent.pointerUp(window);
    expect(induk).not.toHaveBeenCalled();
  });
});

describe("#837 fokus segmen tidak berkedip", () => {
  it("kursor pindah dari jalur ke gagang tetap di segmen yang sama", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    const jalur = jalurSentuh(container);

    // Tanpa kursor, gagang duduk di tengah SELURUH jalur. Mengarahkannya ke
    // ruas pertama memindahkannya ke ruas itu (pola test #834).
    gerakKursor(jalur, 250, 75);
    const sebelum = gagang(container);
    expect(sebelum).toHaveLength(1);
    expect(sebelum[0].getAttribute("data-testid")).toBe("gagang-tekuk-0");

    // Peramban mengirim `pointerout` di jalur ketika kursor naik ke gagang.
    // Karena keduanya anak dari `<g>` yang sama, fokus TIDAK boleh dikosongkan.
    act(() => {
      const ev = new Event("pointerout", { bubbles: true }) as Event & {
        relatedTarget?: Element;
      };
      ev.relatedTarget = sebelum[0];
      jalur.dispatchEvent(ev);
    });

    const sesudah = gagang(container);
    expect(sesudah).toHaveLength(1);
    expect(sesudah[0].getAttribute("data-testid")).toBe("gagang-tekuk-0");
    expect(sesudah[0].getAttribute("cy")).toBe(sebelum[0].getAttribute("cy"));
  });

  it("kursor benar-benar keluar dari gugus garis mengosongkan fokus", () => {
    const { container } = render(<FlowchartEdges {...propsUntuk()} />);
    const jalur = jalurSentuh(container);
    gerakKursor(jalur, 250, 75);
    expect(gagang(container)[0].getAttribute("data-testid")).toBe("gagang-tekuk-0");

    act(() => {
      const ev = new Event("pointerout", { bubbles: true }) as Event & {
        relatedTarget?: Element;
      };
      ev.relatedTarget = document.body;
      jalur.dispatchEvent(ev);
    });

    // Kembali ke tengah seluruh jalur; pada rute dua bentuk ini titik tengahnya
    // jatuh di ruas kedua.
    expect(gagang(container)[0].getAttribute("data-testid")).toBe("gagang-tekuk-1");
  });
});
