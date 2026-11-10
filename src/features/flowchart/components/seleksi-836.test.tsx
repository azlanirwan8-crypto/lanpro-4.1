/**
 * @jest-environment jsdom
 *
 * #836 — seleksi kanvas native menyerupai draw.io.
 *
 * TIGA HAL YANG DIKUNCI, dan ketiganya terlihat di tangkapan layar pemilik:
 * garis seleksi putus-putus (bukan cincin tebal), semua gagang lingkaran dengan
 * warna tema (bukan kotak/lingkaran violet), dan port sambung hanya muncul saat
 * bentuk DISOROT — draw.io tidak memenuhi bentuk terpilih dengan tombol `+`.
 *
 * Yang diuji adalah DOM sungguhan, bukan string sumber: `cn()` dan kondisional
 * render bisa menghasilkan kelas/elemen yang berbeda dari yang tertulis.
 */
import React from "react";
import { render } from "@testing-library/react";
import { FlowchartNode } from "./FlowchartNode";
import { getShapeThemeClasses } from "../lib/nodeTheme";
import type { FlowNode } from "../types";

const bentuk = (lebih: Partial<FlowNode> = {}): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Proses Langkah Kerja",
  color: "green",
  width: 150,
  height: 70,
  ...lebih,
});

const props = (node: FlowNode, lebih: Record<string, unknown> = {}) =>
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
    handleRotateMouseDown: jest.fn(),
    handleConnectPortClick: jest.fn(),
    handleUpdateActiveNode: jest.fn(),
    handleUpdateNode: jest.fn(),
    isEditingLabel: false,
    mulaiSuntingLabel: jest.fn(),
    akhiriSuntingLabel: jest.fn(),
    handleDuplicateNode: jest.fn(),
    handleDeleteSelected: jest.fn(),
    getLinkedTaskDetails: () => undefined,
    setSelectedTaskForDetail: jest.fn(),
    setIsTaskDetailModalOpen: jest.fn(),
    ...lebih,
  }) as any;

describe("#836 seleksi kanvas native", () => {
  it("bentuk terpilih memakai garis putus-putus primary, bukan ring violet", () => {
    const kelas = getShapeThemeClasses(bentuk(), true);
    expect(kelas).toContain("outline-dashed");
    expect(kelas).toContain("outline-primary");
    expect(kelas).not.toContain("ring-violet-500");
    expect(getShapeThemeClasses(bentuk(), false)).not.toContain("outline-dashed");
  });

  it("delapan gagang tampil sebagai lingkaran primary", () => {
    const { container } = render(<FlowchartNode {...props(bentuk())} />);
    const gagang = container.querySelectorAll('[data-testid^="gagang-ukur-"]');
    expect(gagang).toHaveLength(8);
    gagang.forEach((el) => {
      expect(el.className).toContain("rounded-full");
      expect(el.className).toContain("bg-primary");
      expect(el.className).not.toContain("violet");
    });
  });

  it("tidak ada cincin seleksi kedua di samping garis putus-putus", () => {
    const { container } = render(<FlowchartNode {...props(bentuk())} />);
    const cincinGanda = Array.from(container.querySelectorAll("div")).filter(
      (d) => d.className.split(" ").includes("-inset-1") && /\bborder-2\b/.test(d.className)
    );
    expect(cincinGanda).toHaveLength(0);
  });

  it("gagang putar juga memakai primary", () => {
    const { container } = render(<FlowchartNode {...props(bentuk())} />);
    const putar = container.querySelector('[data-testid="gagang-putar"]') as HTMLElement;
    expect(putar.className).toContain("border-primary");
    expect(putar.className).not.toContain("violet");
  });

  it("port dan tombol tambah-cepat TIDAK tampil hanya karena bentuk terpilih", () => {
    const { container } = render(<FlowchartNode {...props(bentuk())} />);
    expect(container.querySelectorAll('[data-testid^="port-sambung-"]')).toHaveLength(0);
    expect(container.querySelector('[data-testid="tambah-cepat-kanan"]')).toBeNull();
    expect(container.querySelector('[data-testid="tambah-cepat-bawah"]')).toBeNull();
  });

  it("saat disorot, empat port dan dua tombol tambah-cepat tampil", () => {
    const { container } = render(<FlowchartNode {...props(bentuk(), { isHovered: true })} />);
    expect(container.querySelectorAll('[data-testid^="port-sambung-"]')).toHaveLength(4);
    expect(container.querySelector('[data-testid="tambah-cepat-kanan"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tambah-cepat-bawah"]')).not.toBeNull();
  });

  it("disorot tanpa terpilih: port tampil, gagang ukuran tidak", () => {
    const { container } = render(
      <FlowchartNode {...props(bentuk(), { isHovered: true, isSelected: false })} />
    );
    expect(container.querySelectorAll('[data-testid^="port-sambung-"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-testid^="gagang-ukur-"]')).toHaveLength(0);
  });
});
