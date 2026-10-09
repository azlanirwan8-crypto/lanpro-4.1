/**
 * #670 — keluarga huruf, miring, dan garis bawah dari berkas sumber sampai ke
 * `<textarea>` sungguhan, dan nama keluarga asing TIDAK pernah masuk ke `style`.
 *
 * MENGAPA DIUJI PADA DOM. `gayaImpor.test.tsx` dan `hurufSumber-670.test.tsx`
 * sudah mengunci DATA hasil baca. Yang belum terbukti adalah tampilannya: kelas
 * bisa terpasang di objek node lalu hilang ditelan `cn()`, dan `fontFamily` dari
 * berkas unggahan orang boleh berhenti sebagai string, tidak pernah menjadi CSS.
 * Test ini menutup dua-duanya.
 *
 * BATAS YANG HARUS TETAP TERBACA DI SINI: tebal-sebagian tidak bisa digambar.
 * Label papan ini hidup di `textarea` — satu berat untuk seluruh isi. draw.io
 * bisa menebalkan satu kata; papan ini tidak. Yang dijamin #670 adalah tidak
 * ada lagi teks biasa yang tergambar sebagai tebal, bukan bahwa teks campuran
 * bisa dirender campuran.
 */
import React from "react";
import { render } from "@testing-library/react";
import { FlowchartNode } from "./FlowchartNode";
import { parseUniversalDiagram } from "../lib/importers";
import type { FlowNode } from "../types";

const bentuk = (lebih: Partial<FlowNode> = {}): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Periksa kata sandi",
  color: "yellow",
  width: 150,
  height: 70,
  ...lebih,
});

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

const textarea = (html: HTMLElement) => html.querySelector("textarea") as HTMLTextAreaElement;

const kelas = (node: FlowNode) => {
  const { container } = render(<FlowchartNode {...props(node)} />);
  return {
    kelas: textarea(container).className,
    gaya: textarea(container).getAttribute("style") || "",
  };
};

describe("keluarga huruf sumber pada DOM (#670)", () => {
  it("bawaan papan adalah sans, tanpa kelas lain yang menempel", () => {
    const { kelas: kelasBawaan } = kelas(bentuk());
    expect(kelasBawaan).toContain("huruf-sans");
    expect(kelasBawaan).not.toContain("huruf-serif");
    expect(kelasBawaan).not.toContain("huruf-mono");
  });

  it("fontFamily 'Courier New' dari sumber memilih huruf-mono", () => {
    expect(kelas(bentuk({ fontFamily: "Courier New" })).kelas).toContain("huruf-mono");
  });

  it("fontFamily 'Georgia' memilih huruf-serif", () => {
    expect(kelas(bentuk({ fontFamily: "Georgia" })).kelas).toContain("huruf-serif");
  });

  it("nama keluarga yang tidak dikenal jatuh ke sans", () => {
    const hasil = kelas(bentuk({ fontFamily: "Comic Sans MS" }));
    expect(hasil.kelas).toContain("huruf-sans");
    expect(hasil.kelas).not.toContain("Comic");
  });

  it("nama keluarga asing tidak pernah bocor ke atribut style", () => {
    const { gaya } = kelas(bentuk({ fontFamily: 'X; background: url("http://contoh.tdk/x.png")' }));
    expect(gaya).not.toContain("font-family");
    expect(gaya).not.toContain("contoh.tdk");
  });

  it("kelas papan dari panel sifat menang atas keluarga sumber", () => {
    // Tombol serif di panel sifat menulis `fontStyle`; ia harus tetap berarti.
    const hasil = kelas(bentuk({ fontStyle: "serif", fontFamily: "Courier New" }));
    expect(hasil.kelas).toContain("huruf-serif");
    expect(hasil.kelas).not.toContain("huruf-mono");
  });

  it("miring dan garis bawah bitmask menjadi kelas DOM", () => {
    const hasil = kelas(bentuk({ fontWeight: "bold", italic: true, underline: true }));
    expect(hasil.kelas).toContain("font-bold");
    expect(hasil.kelas).toContain("italic");
    expect(hasil.kelas).toContain("underline");
  });

  it("bentuk biasa tidak membawa italic maupun underline", () => {
    const hasil = kelas(bentuk());
    expect(hasil.kelas).not.toContain("italic");
    expect(hasil.kelas).not.toContain("underline");
  });
});

describe("jalur penuh berkas draw.io ke DOM (#670)", () => {
  const xml = [
    '<mxfile><diagram name="s"><mxGraphModel><root>',
    '<mxCell id="0"/><mxCell id="1" parent="0"/>',
    '<mxCell id="v1" value="Periksa kata sandi" style="rounded=0;whiteSpace=wrap;html=1;fontStyle=3;fontFamily=Courier New;fontSize=14;" vertex="1" parent="1">',
    '<mxGeometry x="80" y="80" width="160" height="70" as="geometry"/></mxCell>',
    "</root></mxGraphModel></diagram></mxfile>",
  ].join("");

  const node = () => {
    const hasil = parseUniversalDiagram(xml, "sumber.drawio");
    return (hasil.nodes || [])[0] as FlowNode;
  };

  it("fontStyle=3 menjadi tebal dan miring sekaligus di layar", () => {
    const hasil = kelas(node());
    expect(hasil.kelas).toContain("font-bold");
    expect(hasil.kelas).toContain("italic");
    expect(hasil.kelas).not.toContain("underline");
  });

  it("fontFamily sumber menentukan kelas, fontSize sumber tetap utuh", () => {
    const hasil = kelas(node());
    expect(hasil.kelas).toContain("huruf-mono");
    expect(hasil.gaya).toContain("14px");
  });
});
