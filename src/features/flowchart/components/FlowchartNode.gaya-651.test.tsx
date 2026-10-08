/**
 * #651 — tebal huruf dan warna huruf benar-benar sampai ke DOM.
 *
 * MENGAPA DIUJI PADA RENDER, BUKAN PADA SUMBER. Yang dilaporkan pemilik proyek
 * adalah apa yang MATANYA lihat pada papan Miro-nya: semua hurufnya tebal, hasil
 * impor semuanya biasa. Test yang membaca string kelas bisa hijau sementara
 * `cn()` menghasilkan kelas yang berbeda — jadi yang diuji di sini adalah
 * elemen `<textarea>` sungguhan yang dipakai setiap bentuk di papan.
 *
 * DUA HAL YANG DIKUNCI DI SINI:
 * 1. gaya sumber tampil (tebal jadi `font-bold`, hex jadi warna inline);
 * 2. `fontColor` adalah nilai dari BERKAS YANG DIUNGGAH ORANG. Ia sudah
 *    disaring `warnaTeksAman()`, tapi penjaga itu dibuktikan di sini juga pada
 *    batas akhirnya: potongan CSS tidak boleh menemukan jalan ke `style`.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { FlowchartNode } from "./FlowchartNode";
import type { FlowNode } from "../types";

const bentuk = (lebih: Partial<FlowNode> = {}): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Buka wondr merchant",
  color: "yellow",
  width: 150,
  height: 70,
  ...lebih,
});

const props = (node: FlowNode) =>
  ({
    node,
    isSelected: true,
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

describe("tebal dan warna huruf pada bentuk (#651)", () => {
  it("bentuk biasa memakai font-medium, bukan font-bold", () => {
    const { container } = render(<FlowchartNode {...props(bentuk())} />);
    const kelas = textarea(container).className;
    expect(kelas).toContain("font-medium");
    expect(kelas).not.toContain("font-bold");
  });

  it("fontWeight 'bold' dari impor menjadi font-bold di elemen sungguhan", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ fontWeight: "bold" }))} />);
    expect(textarea(container).className).toContain("font-bold");
  });

  it("hex dari berkas impor menjadi warna inline", () => {
    const { container } = render(<FlowchartNode {...props(bentuk({ fontColor: "#b85450" }))} />);
    expect(textarea(container).style.color).toBe("rgb(184, 84, 80)");
  });

  it("potongan CSS di fontColor TIDAK menemukan jalan ke style", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk({ fontColor: "#ffffff; position:fixed; top:0; left:0" }))} />
    );
    const el = textarea(container);
    expect(el.style.color).toBe("");
    expect(el.getAttribute("style")).not.toContain("position");
    expect(el.getAttribute("style")).not.toContain("fixed");
  });

  it("skrip dan nama warna yang bukan hex ditolak juga", () => {
    for (const jahat of ["javascript:alert(1)", "red", "url(#x)", "#12345", "#gggggg"]) {
      const { container, unmount } = render(
        <FlowchartNode {...props(bentuk({ fontColor: jahat }))} />
      );
      expect(textarea(container).style.color).toBe("");
      unmount();
    }
  });

  it("tombol Tebal di overlay menulis fontWeight pada bentuknya sendiri", () => {
    const p = props(bentuk());
    const { getByTitle } = render(<FlowchartNode {...p} />);
    fireEvent.click(getByTitle("Tebal"));
    expect(p.handleUpdateActiveNode).toHaveBeenCalledWith({ fontWeight: "bold" });
  });
});
