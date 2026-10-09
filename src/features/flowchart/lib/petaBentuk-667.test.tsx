/**
 * #667 — peta bentuk draw.io yang sebelumnya salah tebak, `fillColor=none`,
 * dan label yang dulu DIKARANG.
 *
 * URUTAN ADALAH BUG-NYA. draw.io menulis awan sebagai `ellipse;shape=cloud`;
 * pemeriksaan lama menanyakan "ada kata ellipse?" lebih dulu, jadi setiap awan
 * datang sebagai oval. Bentuk yang tidak disebut di mana pun (`shape=process`)
 * jatuh ke `rect`, dan teks polos (`style=text`) - yang di sumbernya tidak ada
 * kotak sama sekali - datang sebagai kotak berwarna dengan tepi.
 */
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";

import { parseUniversalDiagram } from "./importers";
import { FlowchartNode } from "../components/FlowchartNode";
import type { FlowNode } from "../types";

const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

const vertex = (id: string, style: string, value = "Satu") =>
  `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell>`;

const satu = (style: string, value = "Satu") =>
  parseUniversalDiagram(pagar(vertex("a", style, value)), "papan.drawio").nodes[0];

describe("bentuk dibaca dari `shape=`, bukan dari tebakan (#667)", () => {
  it("awan: `ellipse;shape=cloud` tetap awan, bukan oval", () => {
    expect(satu("ellipse;shape=cloud;whiteSpace=wrap;html=1").type).toBe("cloud");
  });

  it("proses: `shape=process` menjadi subprocess, bukan rect", () => {
    expect(satu("shape=process;whiteSpace=wrap;html=1").type).toBe("subprocess");
  });

  it("oval biasa tetap oval dan belah ketupat tetap belah ketupat", () => {
    expect(satu("ellipse;whiteSpace=wrap").type).toBe("oval");
    expect(satu("rhombus;whiteSpace=wrap").type).toBe("diamond");
  });
});

describe("`fillColor=none` dan teks polos tidak lagi ditebak jadi kotak (#667)", () => {
  it("fillColor=none berarti tidak ada isian", () => {
    expect(satu("ellipse;fillColor=none;dashed=1;strokeColor=#666666").fillNone).toBe(true);
  });

  it("style=text: tanpa isian DAN tanpa tepi", () => {
    const teks = satu(
      "text;html=1;align=center;verticalAlign=middle;fillColor=none;strokeColor=none"
    );
    expect(teks.fillNone).toBe(true);
    expect(teks.borderStyle).toBe("none");
  });

  it("strokeColor=none melepas tepinya, isian tetap ada", () => {
    const tanpaTepi = satu("rounded=1;whiteSpace=wrap;fillColor=#d5e8d4;strokeColor=none");
    expect(tanpaTepi.borderStyle).toBe("none");
    expect(tanpaTepi.fillNone).toBeUndefined();
  });

  it("bentuk normal TIDAK ikut berubah: solid dan tidak transparan", () => {
    const normal = satu("rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf");
    expect(normal.borderStyle).toBe("solid");
    expect(normal.fillNone).toBeUndefined();
    expect(normal.fillHex).toBe("#dae8fc");
  });
});

describe("label kosong tetap kosong (#667)", () => {
  it("value kosong tidak lagi dikarangi menjadi 'Komponen Alur'", () => {
    expect(satu("rounded=1", "").label).toBe("");
  });

  it("penjeraf tidak lagi MENUGASKAN string keras itu ke label", () => {
    const sumber = readFileSync(join(__dirname, "importers.ts"), "utf8");
    // Yang dilarang adalah penugasannya; komentar yang menceritakan bug ini
    // boleh menyebut string-nya.
    expect(sumber).not.toMatch(/=\s*["'`]Komponen Alur/);
  });
});

/** Bentuk div: penjaga bahwa `fillNone` benar-benar menggambar transparan. */
const props = (node: FlowNode) =>
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
    isWorkspaceEditable: false,
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

describe("isian kosong sampai ke elemen (#667)", () => {
  const bentuk = (lebih: Partial<FlowNode>): FlowNode => ({
    id: "n1",
    type: "rect",
    x: 40,
    y: 40,
    label: "Teks polos",
    color: "slate",
    width: 150,
    height: 70,
    ...lebih,
  });

  const divBewarna = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("div")).find((d) => !!d.style.borderColor);

  it("rect dengan fillNone digambar transparan, bukan warna paletnya", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ fillNone: true }))} />);
    expect(divBewarna(container)!.style.backgroundColor).toBe("transparent");
  });

  it("rect tanpa fillNone tetap memakai warna bentuknya", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ fillHex: "#d5e8d4" }))} />);
    expect(divBewarna(container)!.style.backgroundColor).toBe("rgb(213, 232, 212)");
  });
});
