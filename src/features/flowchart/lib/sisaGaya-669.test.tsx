/**
 * #669 — sisa gaya draw.io yang tidak punya jalan masuk: putar, opasitas,
 * bayangan, gradasi, dan yang paling terlihat TITIK SAMBUNG garis.
 *
 * TIGA LAPISAN DIUJI TERPISAH karena #650, #651, dan #657 sudah membuktikan
 * pola kegagalannya sama: nilai yang terbaca dari berkas belum tentu tersimpan
 * di model, dan yang tersimpan di model belum tentu digambar. Test ini mengunci
 * ketiganya: apa yang dibaca, apa yang dipasang, apa yang benar-benar tampil.
 *
 * UNTUK TITIK PORT, ANGKA YANG DIUJI BUKAN KELAS. draw.io menulis `exitX/exitY`
 * sebagai pecahan; yang harus mendarat adalah koordinat papan. Itu satu-satunya
 * cara membuktikan "garis ini menempel di tempat yang sama dengan di draw.io",
 * dan itu juga yang tidak bisa dibaca dari tangkapan layar.
 */
import React from "react";
import { render } from "@testing-library/react";
import { gayaDrawIo, gayaGarisDrawIo } from "./gayaImpor";
import { parseUniversalDiagram } from "./importers";
import { FlowchartNode } from "../components/FlowchartNode";
import { FlowchartEdges, arahPort, titikPort } from "../components/FlowchartEdges";
import type { FlowEdge, FlowNode } from "../types";

describe("gayaDrawIo membaca kunci yang selama ini dibuang (#669)", () => {
  it("rotation boleh negatif dan boleh berkoma", () => {
    expect(gayaDrawIo("rounded=0;rotation=15").rotation).toBe(15);
    expect(gayaDrawIo("rotation=-15").rotation).toBe(-15);
    expect(gayaDrawIo("rotation=7.5").rotation).toBe(7.5);
  });

  it("rotation tidak ditulis berarti tidak ada putar", () => {
    expect(gayaDrawIo("rounded=0;whiteSpace=wrap").rotation).toBeUndefined();
  });

  it("opacity=0 adalah nilai, bukan ketiadaan", () => {
    // Penjaga "harus lebih besar dari nol" akan membuang yang nol, dan nol
    // berarti bentuknya benar-benar hilang di draw.io.
    expect(gayaDrawIo("opacity=0").opacity).toBe(0);
    expect(gayaDrawIo("opacity=60").opacity).toBe(60);
    expect(gayaDrawIo("whiteSpace=wrap").opacity).toBeUndefined();
  });

  it("opacity di luar rentang dipangkas, bukan dipercaya", () => {
    expect(gayaDrawIo("opacity=250").opacity).toBe(100);
    expect(gayaDrawIo("opacity=-20").opacity).toBe(0);
  });

  it("shadow=1 menyala dan shadow=0 tidak", () => {
    expect(gayaDrawIo("shadow=1").shadow).toBe(true);
    expect(gayaDrawIo("shadow=0").shadow).toBeUndefined();
    expect(gayaDrawIo("whiteSpace=wrap").shadow).toBeUndefined();
  });

  it("gradientColor ikut terbawa apa adanya", () => {
    expect(gayaDrawIo("fillColor=#ffffff;gradientColor=#0000ff").gradientHex).toBe("#0000ff");
    expect(gayaDrawIo("gradientColor=default").gradientHex).toBeUndefined();
  });
});

describe("titik sambung garis dibaca sebagai pasangan (#669)", () => {
  it("exitX/exitY dan entryX/entryY menjadi dua titik", () => {
    const g = gayaGarisDrawIo(
      "edgeStyle=orthogonalEdgeStyle;exitX=0.5;exitY=1;entryX=0.5;entryY=0"
    );
    expect(g.portSumber).toEqual({ x: 0.5, y: 1 });
    expect(g.portTujuan).toEqual({ x: 0.5, y: 0 });
  });

  it("nol adalah posisi yang sah di kedua sumbu", () => {
    const g = gayaGarisDrawIo("exitX=0;exitY=0.25;entryX=1;entryY=1");
    expect(g.portSumber).toEqual({ x: 0, y: 0.25 });
    expect(g.portTujuan).toEqual({ x: 1, y: 1 });
  });

  it("SATU kunci saja bukan titik, jadi tidak dipasang", () => {
    // `exitX=0.5` tanpa `exitY` adalah setengah titik. Menempelkannya ke sisi
    // mana pun sama dengan mengarang posisi garis.
    const g = gayaGarisDrawIo("exitX=0.5");
    expect(g.portSumber).toBeUndefined();
  });

  it("keluar akal dibiarkan, papan yang memutuskan sendiri", () => {
    expect(gayaGarisDrawIo("exitX=9;exitY=0").portSumber).toBeUndefined();
  });
});

describe("impor memasang gaya #669 pada model", () => {
  const pagar = (isi: string) =>
    '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
    isi +
    "</root></mxGraphModel></diagram></mxfile>";

  const hasil = () =>
    parseUniversalDiagram(
      pagar(
        '<mxCell id="a" value="Satu" vertex="1" parent="1" style="rounded=0;rotation=15;opacity=60;shadow=1;fillColor=#ffffff;gradientColor=#0000ff">' +
          '<mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell>' +
          '<mxCell id="b" value="Dua" vertex="1" parent="1" style="rounded=0">' +
          '<mxGeometry x="400" y="40" width="120" height="60" as="geometry"/></mxCell>' +
          '<mxCell id="e1" edge="1" source="a" target="b" parent="1" ' +
          'style="exitX=0.5;exitY=1;entryX=0.5;entryY=0"></mxCell>'
      ),
      "papan.drawio"
    );

  it("rotation, opacity, shadow, gradientColor mendarat di node", () => {
    const n = hasil().nodes[0];
    expect(n.rotation).toBe(15);
    expect(n.opacity).toBe(60);
    expect(n.shadow).toBe(true);
    expect(n.gradientHex).toBe("#0000ff");
  });

  it("node kedua yang tidak menulis gaya apa pun tidak ikut terisi", () => {
    const b = hasil().nodes[1];
    expect(b.rotation).toBeUndefined();
    expect(b.opacity).toBeUndefined();
    expect(b.shadow).toBeUndefined();
    expect(b.gradientHex).toBeUndefined();
  });

  it("titik sambung mendarat di edge", () => {
    expect(hasil().edges[0].portSumber).toEqual({ x: 0.5, y: 1 });
    expect(hasil().edges[0].portTujuan).toEqual({ x: 0.5, y: 0 });
  });

  it("hex gradien yang tidak sah tidak pernah masuk ke model", () => {
    const hasil2 = parseUniversalDiagram(
      pagar(
        '<mxCell id="a" value="X" vertex="1" parent="1" style="gradientColor=javascript:alert(1)">' +
          '<mxGeometry x="1" y="1" width="10" height="10" as="geometry"/></mxCell>'
      ),
      "papan.drawio"
    );
    expect(hasil2.nodes[0].gradientHex).toBeUndefined();
  });
});

describe("geometri titik port adalah angka, bukan kesan (#669)", () => {
  const node: FlowNode = {
    id: "r1",
    type: "rect",
    x: 40,
    y: 40,
    label: "r1",
    color: "indigo",
    width: 160,
    height: 80,
  };

  it("pecahan dihitung dari lebar dan tinggi bentuk", () => {
    expect(titikPort(node, { x: 0.5, y: 1 })).toMatchObject({ x: 120, y: 120 });
    expect(titikPort(node, { x: 1, y: 0.5 })).toMatchObject({ x: 200, y: 80 });
    expect(titikPort(node, { x: 0, y: 0 })).toMatchObject({ x: 40, y: 40 });
  });

  it("arah keluar dari sumbu yang paling jauh dari tengah", () => {
    expect(arahPort({ x: 0.5, y: 1 })).toEqual({ x: 0, y: 1 });
    expect(arahPort({ x: 0.5, y: 0 })).toEqual({ x: 0, y: -1 });
    expect(arahPort({ x: 1, y: 0.5 })).toEqual({ x: 1, y: 0 });
    expect(arahPort({ x: 0, y: 0.25 })).toEqual({ x: -1, y: 0 });
  });
});

// ── bagian render ────────────────────────────────────────────────────────────

const propsBentuk = (node: FlowNode) =>
  ({
    node,
    isSelected: false,
    setSelectedNodeId: jest.fn(),
    setSelectedEdgeId: jest.fn(),
    isSourceOfConnect: false,
    adaSumberSambung: false,
    setConnectSourceId: jest.fn(),
    isHovered: false,
    setHoveredNodeId: jest.fn(),
    isDragging: false,
    isActiveSim: false,
    canvasTheme: "miro",
    isWorkspaceEditable: true,
    setActiveTool: jest.fn(),
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    setNodeContextMenu: jest.fn(),
    handleNodeMouseDown: jest.fn(),
    handleResizeMouseDown: jest.fn(),
    handleConnectPortClick: jest.fn(),
    handleUpdateActiveNode: jest.fn(),
    handleUpdateNode: jest.fn(),
    handleDuplicateNode: jest.fn(),
    handleDeleteSelected: jest.fn(),
    getLinkedTaskDetails: () => undefined,
    setSelectedTaskForDetail: jest.fn(),
    setIsTaskDetailModalOpen: jest.fn(),
  }) as any;

const bingkai = (container: HTMLElement) =>
  container.querySelector(".w-full.h-full.relative") as HTMLElement;

const bentukDasar = (lebih: Partial<FlowNode> = {}): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Satu",
  color: "yellow",
  width: 160,
  height: 80,
  ...lebih,
});

describe("putar, opasitas, bayangan, dan gradasi digambar (#669)", () => {
  it("rotation menjadi transform rotate pada bingkai bentuk", () => {
    const { container } = render(<FlowchartNode {...propsBentuk(bentukDasar({ rotation: 15 }))} />);
    expect(bingkai(container).style.transform).toBe("rotate(15deg)");
  });

  it("rotation negatif tetap negatif", () => {
    const { container } = render(
      <FlowchartNode {...propsBentuk(bentukDasar({ rotation: -15 }))} />
    );
    expect(bingkai(container).style.transform).toBe("rotate(-15deg)");
  });

  it("tanpa rotation tidak ada transform sama sekali", () => {
    const { container } = render(<FlowchartNode {...propsBentuk(bentukDasar())} />);
    expect(bingkai(container).style.transform).toBe("");
  });

  it("opacity 60 menjadi 0.6, dan 0 menjadi benar-benar 0", () => {
    const a = render(<FlowchartNode {...propsBentuk(bentukDasar({ opacity: 60 }))} />);
    expect(bingkai(a.container).style.opacity).toBe("0.6");
    const b = render(<FlowchartNode {...propsBentuk(bentukDasar({ opacity: 0 }))} />);
    expect(bingkai(b.container).style.opacity).toBe("0");
    const c = render(<FlowchartNode {...propsBentuk(bentukDasar())} />);
    expect(bingkai(c.container).style.opacity).toBe("");
  });

  it("shadow=1 memberi bayangan; tanpa shadow tidak ada", () => {
    const { container } = render(<FlowchartNode {...propsBentuk(bentukDasar({ shadow: true }))} />);
    expect(bingkai(container).style.filter).toContain("drop-shadow");
    const bersih = render(<FlowchartNode {...propsBentuk(bentukDasar())} />);
    expect(bingkai(bersih.container).style.filter).toBe("");
  });

  it("bentuk div memakai gradasi CSS dari isian ke gradientColor", () => {
    const { container } = render(
      <FlowchartNode
        {...propsBentuk(bentukDasar({ fillHex: "#ffffff", gradientHex: "#0000ff" }))}
      />
    );
    const gaya = bingkai(container).style.backgroundImage;
    expect(gaya).toContain("linear-gradient");
    expect(gaya).toContain("#0000ff");
    expect(gaya).toContain("#ffffff");
  });

  it("bentuk SVG mendapat <defs> dan isian yang menunjuknya", () => {
    const { container } = render(
      <FlowchartNode
        {...propsBentuk(
          bentukDasar({ id: "oval1", type: "oval", fillHex: "#ffffff", gradientHex: "#00ff00" })
        )}
      />
    );
    const gradien = container.querySelector("linearGradient");
    expect(gradien).not.toBeNull();
    expect(gradien!.getAttribute("id")).toBe("grad-sumber-oval1");
    // Nama unsurnya TIDAK diasumsikan: `oval` digambar `<rect>`, `decision`
    // `<polygon>`, dan lain-lain punya bentuknya sendiri. Yang dijanjikan adalah
    // "ada sesuatu yang diisi oleh gradien ini", jadi semua unsur bersisian
    // `fill` dipinda periksa.
    const isian = Array.from(container.querySelectorAll("[fill]")).map((el) =>
      el.getAttribute("fill")
    );
    expect(isian).toContain("url(#grad-sumber-oval1)");
    const stop = Array.from(gradien!.querySelectorAll("stop")).map((s) =>
      s.getAttribute("stop-color")
    );
    expect(stop).toEqual(["#ffffff", "#00ff00"]);
  });

  it("fillColor=none berarti tidak ada gradasi walau gradientColor ditulis", () => {
    const { container } = render(
      <FlowchartNode {...propsBentuk(bentukDasar({ fillNone: true, gradientHex: "#0000ff" }))} />
    );
    expect(bingkai(container).style.backgroundImage).toBe("");
    expect(container.querySelector("linearGradient")).toBeNull();
  });

  it("hex yang tidak sah tidak pernah menjadi gaya", () => {
    const { container } = render(
      <FlowchartNode
        {...propsBentuk(bentukDasar({ gradientHex: 'red; background: url("http://jahat/x.png")' }))}
      />
    );
    const semua = bingkai(container).getAttribute("style") || "";
    expect(semua).not.toContain("jahat");
    expect(container.querySelector("linearGradient")).toBeNull();
  });
});

describe("garis menempel pada titik yang ditulis sumber (#669)", () => {
  const NODES: FlowNode[] = [
    { id: "r1", type: "rect", x: 40, y: 40, label: "r1", color: "indigo", width: 160, height: 80 },
    { id: "r2", type: "rect", x: 420, y: 40, label: "r2", color: "indigo", width: 160, height: 80 },
  ];

  const propsUntuk = (edges: FlowEdge[]) =>
    ({
      edges,
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
      koordinatPapan: (x: number, y: number) => ({ x, y }),
      isWorkspaceEditable: false,
      isEditable: true,
      draggingNodeId: null,
      resizingNodeId: null,
      onEdgePatch: jest.fn(),
      getNodeCenter: (id: string) => {
        const n = NODES.find((x) => x.id === id);
        return n ? { x: n.x + n.width! / 2, y: n.y + n.height! / 2 } : { x: 0, y: 0 };
      },
    }) as any;

  const inti = (container: HTMLElement) => {
    const p = Array.from(container.querySelectorAll("path")).filter((el) =>
      (el.getAttribute("d") || "").startsWith("M")
    );
    return p[p.length - 1] as SVGPathElement;
  };

  /** Titik pertama dari `d` bentuk `M x y ...`. */
  const titikPertama = (el: SVGPathElement) => {
    const m = /^M\s*(-?[\d.]+)\s+(-?[\d.]+)/.exec(el.getAttribute("d") || "");
    return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
  };

  it("tanpa titik sumber: papan memilih sisi terdekat (kanan ke kiri)", () => {
    const { container } = render(
      <FlowchartEdges {...propsUntuk([{ id: "e1", fromNodeId: "r1", toNodeId: "r2" }])} />
    );
    expect(titikPertama(inti(container))).toEqual({ x: 200, y: 80 });
  });

  it("exitX=0.5,exitY=1 pindah ke BAWAH bentuk, bukan sisi terdekat", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([
          {
            id: "e1",
            fromNodeId: "r1",
            toNodeId: "r2",
            portSumber: { x: 0.5, y: 1 },
            portTujuan: { x: 0.5, y: 0 },
          },
        ])}
      />
    );
    // r1 = (40,40) 160x80 -> bawah-tengah = (120,120); r2 -> atas-tengah = (500,40).
    expect(titikPertama(inti(container))).toEqual({ x: 120, y: 120 });
    const d = inti(container).getAttribute("d") || "";
    expect(d.trimEnd().endsWith("500 40")).toBe(true);
  });

  it("satu ujung saja pun sudah cukup untuk memindahkan ujung itu saja", () => {
    const { container } = render(
      <FlowchartEdges
        {...propsUntuk([
          { id: "e1", fromNodeId: "r1", toNodeId: "r2", portSumber: { x: 0, y: 0.25 } },
        ])}
      />
    );
    // Kiri r1 pada seperempat tinggi = (40, 60). Ujung tujuan tetap pilihan papan.
    expect(titikPertama(inti(container))).toEqual({ x: 40, y: 60 });
  });
});
