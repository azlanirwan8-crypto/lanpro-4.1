/**
 * #665 — gaya garis dari berkas draw.io sampai ke layar.
 *
 * DUA BAGIAN. Bagian parser mengunci apa yang DIBACA dari `style=`; bagian DOM
 * mengunci apa yang BENAR-BENAR DIGAMBAR, karena #650 dan #651 sudah
 * membuktikan bahwa nilai yang tersimpan di model belum tentu sampai ke elemen.
 *
 * TIGA keadaan ujung yang paling gampang salah diuji terpisah: tidak ditulis
 * (papan memakai matanya sendiri), ditulis `none` (tidak boleh ada mata apa
 * pun), dan ditulis bentuk tertentu (digambar bentuk itu, sewarna garisnya).
 */
import React from "react";
import { render } from "@testing-library/react";

import { FlowchartEdges } from "./FlowchartEdges";
import { gayaGarisDrawIo } from "../lib/gayaImpor";
import { parseUniversalDiagram } from "../lib/importers";
import type { FlowEdge, FlowNode } from "../types";

const gaya = (style: string) => gayaGarisDrawIo(style);

describe("gayaGarisDrawIo membaca sisa style tepi (#665)", () => {
  it("warna, tebal, pola, mata panah, isian, dan huruf label", () => {
    expect(
      gaya(
        "edgeStyle=orthogonalEdgeStyle;strokeColor=#b85450;strokeWidth=4;dashPattern=8 8;" +
          "endArrow=classic;endFill=1;startArrow=open;startFill=0;fontSize=10;fontColor=#ff0000"
      )
    ).toMatchObject({
      connector: "orthogonal",
      strokeColor: "#b85450",
      strokeWidth: 4,
      dashPattern: "8,8",
      endArrow: "classic",
      endFill: true,
      startArrow: "open",
      startFill: false,
      labelFontSize: 10,
      labelColor: "#ff0000",
    });
  });

  it("style kosong tidak mengarang apa pun, supaya bawaan papan tetap berlaku", () => {
    const g = gaya("html=1;whiteSpace=wrap");
    expect(g.strokeColor).toBeUndefined();
    expect(g.strokeWidth).toBeUndefined();
    expect(g.endArrow).toBeUndefined();
    expect(g.startArrow).toBeUndefined();
    expect(g.endFill).toBeUndefined();
  });

  it("strokeColor=default bukan warna, melainkan ikut papan", () => {
    expect(gaya("strokeColor=default;endArrow=none").strokeColor).toBeUndefined();
    expect(gaya("strokeColor=default;endArrow=none").endArrow).toBe("none");
  });
});

describe("impor draw.io memasang kolom gaya pada edge (#665)", () => {
  const pagar = (isi: string) =>
    '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
    isi +
    "</root></mxGraphModel></diagram></mxfile>";

  const bentuk = (id: string, x: number) =>
    `<mxCell id="${id}" value="${id}" vertex="1" parent="1"><mxGeometry x="${x}" y="40" width="120" height="60" as="geometry"/></mxCell>`;

  it("tepi bersambung membawa gaya sumbernya", () => {
    const { edges } = parseUniversalDiagram(
      pagar(
        bentuk("a", 40) +
          bentuk("b", 400) +
          '<mxCell id="e1" edge="1" source="a" target="b" parent="1" style="strokeColor=#b85450;strokeWidth=3;dashed=1;dashPattern=2 4;endArrow=none;startArrow=oval"/>'
      ),
      "papan.drawio"
    );
    expect(edges[0]).toMatchObject({
      strokeColor: "#b85450",
      strokeWidth: 3,
      dashPattern: "2,4",
      endArrow: "none",
      startArrow: "oval",
      strokeStyle: "dashed",
    });
  });

  it("tepi yang ujungnya hanya koordinat tidak ketinggalan", () => {
    const { edges } = parseUniversalDiagram(
      pagar(
        bentuk("a", 40) +
          bentuk("b", 400) +
          '<mxCell id="e1" edge="1" parent="1" style="strokeColor=#0000ff;endArrow=open">' +
          '<mxGeometry relative="1" as="geometry"><mxPoint as="sourcePoint" x="160" y="70"/>' +
          '<mxPoint as="targetPoint" x="400" y="70"/></mxGeometry></mxCell>'
      ),
      "papan.drawio"
    );
    expect(edges[0].strokeColor).toBe("#0000ff");
    expect(edges[0].endArrow).toBe("open");
  });
});

const NODE: FlowNode[] = [
  { id: "r1", type: "rect", x: 40, y: 40, label: "r1", color: "indigo", width: 155, height: 70 },
  { id: "r2", type: "rect", x: 420, y: 40, label: "r2", color: "indigo", width: 155, height: 70 },
];

const propsUntuk = (edges: FlowEdge[]) => ({
  edges,
  nodes: NODE,
  canvasTheme: "miro" as const,
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
  connectorType: "straight" as const,
  zoomLevel: 1,
  koordinatPapan: (x: number, y: number) => ({ x, y }),
  isWorkspaceEditable: false,
  isEditable: true,
  draggingNodeId: null,
  resizingNodeId: null,
  onEdgePatch: jest.fn(),
  getNodeCenter: (id: string) => {
    const n = NODE.find((x) => x.id === id);
    return n ? { x: n.x + n.width! / 2, y: n.y + n.height! / 2 } : { x: 0, y: 0 };
  },
});

const jalur = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("path")).filter((p) =>
    (p.getAttribute("d") || "").startsWith("M")
  );

const inti = (container: HTMLElement) => {
  const semua = jalur(container).filter((p) => p.getAttribute("stroke-width") !== "16");
  return semua[semua.length - 1] as SVGPathElement;
};

describe("mata panah dan gaya garis digambar sesuai sumber (#665)", () => {
  it("tanpa gaya sumber: papan tetap memakai matanya sendiri (penjaga #629 dan #630)", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk([{ id: "e1", fromNodeId: "r1", toNodeId: "r2" }])} />
    );
    expect(inti(container).getAttribute("marker-end")).toContain("canvas-arrow-head");
    expect(inti(container).getAttribute("stroke")).toBe("#000000");
    expect(inti(container).getAttribute("stroke-width")).toBe("1");
  });

  it("endArrow=none benar-benar TANPA mata panah", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([{ id: "e1", fromNodeId: "r1", toNodeId: "r2", endArrow: "none" }])}
      />
    );
    expect(inti(container).getAttribute("marker-end")).toBeNull();
  });

  it("warna sumber dipakai oleh garis SEKALIGUS matanya, satu sumber", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([
          {
            id: "e1",
            fromNodeId: "r1",
            toNodeId: "r2",
            strokeColor: "#b85450",
            strokeWidth: 3,
            dashPattern: "8,8",
            endArrow: "classic",
          },
        ])}
      />
    );
    const garis = inti(container);
    expect(garis.getAttribute("stroke")).toBe("#b85450");
    expect(garis.getAttribute("stroke-width")).toBe("3");
    expect(garis.getAttribute("stroke-dasharray")).toBe("8,8");
    const id = (garis.getAttribute("marker-end") || "").replace(/url\(#|\)/g, "");
    const kepala = container.querySelector(`marker[id="${id}"] path`) as SVGElement;
    expect(kepala).toBeTruthy();
    expect(kepala.getAttribute("fill")).toBe("#b85450");
  });

  it("startArrow=open memasang mata terbuka di UJUNG AWAL", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([
          { id: "e1", fromNodeId: "r1", toNodeId: "r2", startArrow: "open", endArrow: "none" },
        ])}
      />
    );
    const garis = inti(container);
    expect(garis.getAttribute("marker-start")).toBeTruthy();
    expect(garis.getAttribute("marker-end")).toBeNull();
    const id = (garis.getAttribute("marker-start") || "").replace(/url\(#|\)/g, "");
    const bentuk = container.querySelector(`marker[id="${id}"] path`) as SVGElement;
    expect(bentuk.getAttribute("fill")).toBe("none");
  });

  it("strokeColor yang bukan hex TIDAK pernah menyentuh DOM", () => {
    for (const jahat of ["javascript:alert(1)", "red; } body {", "url(#x)", ""]) {
      const { container, unmount } = render(
        <FlowchartEdges
          {...propsUntuk([{ id: "e1", fromNodeId: "r1", toNodeId: "r2", strokeColor: jahat }])}
        />
      );
      expect(inti(container).getAttribute("stroke")).toBe("#000000");
      unmount();
    }
  });

  it("fontSize dan fontColor label garis ikut ke labelnya", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([
          {
            id: "e1",
            fromNodeId: "r1",
            toNodeId: "r2",
            label: "YA",
            labelFontSize: 10,
            labelColor: "#ff0000",
          },
        ])}
      />
    );
    const teks = container.querySelector("foreignObject div") as HTMLDivElement;
    expect(teks.style.fontSize).toBe("10px");
    expect(teks.style.color).toBe("rgb(255, 0, 0)");
  });
});
