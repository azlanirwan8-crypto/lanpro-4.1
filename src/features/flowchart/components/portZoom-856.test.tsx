/**
 * @jest-environment jsdom
 *
 * #856 — port sambung harus terjangkau di zoom rendah DAN di layar sentuh.
 *
 * Tiga jalur:
 *  1. Port tampil saat bentuk DIPILIH walau kursor tidak di atasnya — di HP
 *     tidak ada hover, jadi seleksi adalah satu-satunya isyarat yang ada.
 *  2. Ruang penangkapnya tetap 32 px LAYAR: ukuran yang ditulis ke DOM dibagi
 *     `zoomLevel`, sehingga zoom 0,5 menghasilkan dua kali angka papan.
 *  3. Tombol bilah gaya garis memakai kelas tinggi minimum layar sentuh dan
 *     kembali kecil di layar lebar.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlowchartNode } from "./FlowchartNode";
import { EdgeStyleBar } from "./EdgeStyleBar";
import type { FlowNode } from "../types";

const bentuk = (): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Proses",
  color: "green",
  width: 150,
  height: 70,
});

const props = (lebih: Record<string, unknown> = {}) =>
  ({
    node: bentuk(),
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

const port = (container: HTMLElement, nama: string) =>
  container.querySelector(`[data-testid="port-sambung-${nama}"]`) as HTMLElement;

describe("#856 port saat dipilih", () => {
  it("muncul pada bentuk terpilih walau tidak disorot", () => {
    const { container } = render(<FlowchartNode {...props({ isHovered: false })} />);
    expect(container.querySelectorAll('[data-testid^="port-sambung-"]')).toHaveLength(4);
  });

  it("tidak muncul pada bentuk yang tidak dipilih dan tidak disorot", () => {
    const { container } = render(
      <FlowchartNode {...props({ isSelected: false, isHovered: false })} />
    );
    expect(container.querySelectorAll('[data-testid^="port-sambung-"]')).toHaveLength(0);
  });

  it("ketukan pada port tetap memanggil sambungan dengan nama sisi yang benar", () => {
    const handleConnectPortClick = jest.fn();
    const { container } = render(<FlowchartNode {...props({ handleConnectPortClick })} />);

    fireEvent.mouseDown(port(container, "right"));

    expect(handleConnectPortClick).toHaveBeenCalledWith("n1", "right", expect.anything());
  });
});

describe("#856 port tetap 32 px layar", () => {
  it("zoom 100% menulis 32 px, dan titik ungunya 14 px", () => {
    const { container } = render(<FlowchartNode {...props({ zoomLevel: 1 })} />);
    const p = port(container, "top");
    expect(p.style.width).toBe("32px");
    expect(p.style.height).toBe("32px");
    const titik = p.firstElementChild as HTMLElement;
    expect(titik.style.width).toBe("14px");
  });

  it("zoom 50% membagi ukuran dengan zoom: angka papan dua kali lipat", () => {
    const { container } = render(<FlowchartNode {...props({ zoomLevel: 0.5 })} />);
    const p = port(container, "top");
    expect(p.style.width).toBe("64px");
    expect(p.style.height).toBe("64px");
    const titik = p.firstElementChild as HTMLElement;
    expect(titik.style.width).toBe("28px");
  });

  it("pusat penangkap duduk tepat di tepi bentuk", () => {
    const { container } = render(<FlowchartNode {...props({ zoomLevel: 1 })} />);
    const atas = port(container, "top");
    expect(atas.style.left).toBe("50%");
    expect(atas.style.top).toBe("0%");
    expect(atas.style.transform).toBe("translate(-50%, -50%)");
    const kanan = port(container, "right");
    expect(kanan.style.left).toBe("100%");
    expect(kanan.style.top).toBe("50%");
  });
});

describe("#856 tombol bilah gaya garis", () => {
  it("memakai tinggi minimum layar sentuh dan kembali kecil di layar lebar", () => {
    render(
      <EdgeStyleBar
        edge={{ id: "e1", fromNodeId: "a", toNodeId: "b" }}
        bentukBawaan="orthogonal"
        zoom={1}
        titik={{ x: 0, y: 0 }}
        onPatch={jest.fn()}
      />
    );

    const lurus = screen.getByTestId("tombol-luruskan-garis");
    expect(lurus.className).toContain("min-h-11");
    expect(lurus.className).toContain("min-w-11");
    expect(lurus.className).toContain("md:min-h-0");
    expect(lurus.className).toContain("md:min-w-0");
  });
});
