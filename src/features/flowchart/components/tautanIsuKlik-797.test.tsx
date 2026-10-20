/**
 * #797 — chip linked issue membuka RINCIAN ISU, bukan kanvas diagram.
 *
 * Pemilik proyek 20 Okt: "ketika linked issue di klik maka dia masuk ke detail
 * issue nya bukan ke detail ini". Yang terjadi sebelumnya: chip tertaut adalah
 * `<span>` tanpa handler di dalam `<tr>` yang `onClick`-nya membuka kanvas, jadi
 * chip itu hanya TERLIHAT seperti pintunya.
 *
 * Yang dikunci di bawah ini bukan "ada onClick"-nya — itu bisa ditulis tanpa
 * pernah benar-benar bekerja. Yang dikunci adalah SIAPA YANG DIPANGGIL dan SIAPA
 * YANG TIDAK: klik chip harus memanggil `bukaRincianIsu` dengan TASK-nya, dan
 * tidak boleh ikut membuka kanvas. Yang kedua itulah `stopPropagation` — dan ia
 * satu-satunya alasan kedua aksi ini bisa hidup di baris yang sama.
 */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { FlowchartDashboard } from "./FlowchartDashboard";
import { FlowchartMobileCardView } from "./FlowchartMobileCardView";
import { SORTIR_AWAL } from "../../../hooks/useSetelanSortir";
import type { FlowchartData } from "../types";
import type { Task } from "../../../types";

const ISU = { id: "i1", key: "WMIR-165", title: "Report Settlement", priority: "high" } as Task;

const ALUR = {
  id: "f1",
  name: "Alur settlement",
  description: "dua sistem",
  epicTaskId: "i1",
  nodes: [],
  edges: [],
  theme: {},
  createdAt: "2026-10-18T10:00:00.000Z",
  lastEditedAt: "2026-10-20T10:00:00.000Z",
} as unknown as FlowchartData;

/**
 * `FlowchartDashboard` merender TABEL dan kartu HP berdampingan — yang mana
 * yang kelihatan diputuskan CSS (`sm:hidden`), dan jsdom tidak menjalankan CSS.
 * Jadi setiap teks ada DUA kali di DOM pada layar desktop. Query tanpa `within`
 * melaporkan "multiple elements" — yang justru bukti kedua permukaan itu nyata
 * ada, dan itulah yang diminta pemilik proyek: "cek semua nya".
 */
const chipTabel = () =>
  within(screen.getByRole("table")).getByRole("button", { name: /Report Settlement/ });
const judulTabel = () => within(screen.getByRole("table")).getByText("Alur settlement");
const chip = () => screen.getByRole("button", { name: /Report Settlement/ });

describe("chip linked issue di tabel desktop (#797)", () => {
  const pasang = (lebih: Record<string, unknown> = {}) => {
    const bukaRincianIsu = jest.fn();
    const handleSelectFlowchart = jest.fn();
    render(
      <FlowchartDashboard
        searchQuery=""
        setSearchQuery={jest.fn()}
        currentPage={1}
        setCurrentPage={jest.fn()}
        itemsPerPage={10}
        setItemsPerPage={jest.fn()}
        totalItems={1}
        totalPages={1}
        currentItems={[ALUR]}
        tasks={[ISU]}
        openCreateModal={jest.fn()}
        getResolvedAuthor={() => "Azlan Irwan"}
        handleSelectFlowchart={handleSelectFlowchart}
        setIsEditorActive={jest.fn()}
        canModifyFlowchart={() => true}
        openEditModal={jest.fn()}
        handleDeleteFlowchart={jest.fn()}
        sortir={SORTIR_AWAL}
        onSortir={jest.fn()}
        bukaRincianIsu={bukaRincianIsu}
        {...(lebih as object)}
      />
    );
    return { bukaRincianIsu, handleSelectFlowchart };
  };

  it("chipnya tombol sungguhan, bukan span ber-onClick", () => {
    pasang();
    expect(chipTabel().tagName).toBe("BUTTON");
    expect(chipTabel().getAttribute("type")).toBe("button");
  });

  it("klik chip memanggil bukaRincianIsu dengan ISUNYA, bukan dengan id diagram", () => {
    const { bukaRincianIsu } = pasang();
    fireEvent.click(chipTabel());
    expect(bukaRincianIsu).toHaveBeenCalledTimes(1);
    expect(bukaRincianIsu).toHaveBeenCalledWith(ISU);
  });

  it("klik chip TIDAK membuka kanvas — inilah stopPropagation itu", () => {
    const { handleSelectFlowchart } = pasang();
    fireEvent.click(chipTabel());
    expect(handleSelectFlowchart).not.toHaveBeenCalled();
  });

  it("bagian baris yang lain tetap membuka kanvas seperti sebelumnya", () => {
    const { bukaRincianIsu, handleSelectFlowchart } = pasang();
    fireEvent.click(judulTabel());
    expect(handleSelectFlowchart).toHaveBeenCalledWith("f1");
    expect(bukaRincianIsu).not.toHaveBeenCalled();
  });

  it("tooltipnya menyebut AKSI dan judulnya, bukan mengulang teks yang terbaca", () => {
    pasang();
    expect(chipTabel().getAttribute("title")).toMatch(/rincian/i);
    expect(chipTabel().getAttribute("title")).toContain("Report Settlement");
  });

  it("baris tanpa isu tertaut tidak memunculkan pintu palsu", () => {
    pasang({ currentItems: [{ ...ALUR, epicTaskId: undefined }], tasks: [] });
    expect(
      within(screen.getByRole("table")).queryByRole("button", { name: /Report Settlement/ })
    ).toBeNull();
  });
});

describe("chip linked issue di kartu HP (#797)", () => {
  const pasang = () => {
    const bukaRincianIsu = jest.fn();
    const onSelectFlowchart = jest.fn();
    render(
      <FlowchartMobileCardView
        flowcharts={[ALUR]}
        tasks={[ISU]}
        onSelectFlowchart={onSelectFlowchart}
        onEditFlowchart={jest.fn()}
        onDeleteFlowchart={jest.fn()}
        canModifyFlowchart={() => true}
        getResolvedAuthor={() => "Azlan Irwan"}
        onOpenCreate={jest.fn()}
        bukaRincianIsu={bukaRincianIsu}
      />
    );
    return { bukaRincianIsu, onSelectFlowchart };
  };

  it("permukaan HP tidak tertinggal: pintunya sama", () => {
    const { bukaRincianIsu, onSelectFlowchart } = pasang();
    fireEvent.click(chip());
    expect(bukaRincianIsu).toHaveBeenCalledWith(ISU);
    expect(onSelectFlowchart).not.toHaveBeenCalled();
  });

  it("klik bagian kartu yang lain tetap membuka kanvas", () => {
    const { bukaRincianIsu, onSelectFlowchart } = pasang();
    fireEvent.click(screen.getByText("Alur settlement"));
    expect(onSelectFlowchart).toHaveBeenCalledWith("f1");
    expect(bukaRincianIsu).not.toHaveBeenCalled();
  });
});

describe("perakitan di container (#797)", () => {
  const papan = readFileSync(join(__dirname, "../FlowchartContainer.tsx"), "utf8");

  it("dua setter rincian isu dirangkai SEKALI di container, tidak diwariskan mentah", () => {
    // `setIsTaskDetailModalOpen(true)` adalah satu-satunya yang menyimpan
    // `previousView`; memisahkannya dari `setSelectedTaskForDetail` membuat
    // tombol kembali berhenti membawa pengguna ke daftar alur.
    const tubuh = papan.slice(papan.indexOf("const bukaRincianIsu"));
    expect(tubuh.slice(0, 400)).toMatch(/setSelectedTaskForDetail\(task\)/);
    expect(tubuh.slice(0, 400)).toMatch(/setIsTaskDetailModalOpen\(true\)/);
  });

  it("kedua permukaan tampil menerimanya", () => {
    expect((papan.match(/bukaRincianIsu=\{bukaRincianIsu\}/g) || []).length).toBe(1);
    expect(readFileSync(join(__dirname, "FlowchartDashboard.tsx"), "utf8")).toMatch(
      /bukaRincianIsu=\{bukaRincianIsu\}/
    );
  });
});
