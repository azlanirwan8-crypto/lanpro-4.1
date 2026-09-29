/**
 * @jest-environment jsdom
 *
 * #562 — satu baris di pohon Timeline: judul + label status berikon, TANPA kode
 * tugas. Permintaan pemilik proyek 28 Sep: "id di buang", "status diganti label
 * sesuai ikon itu, warna dan status ikutin".
 *
 * Yang ikut dikunci di sini: pembuka detail tugas tidak ikut terbuang bersama
 * chip kodenya. Chip itulah satu-satunya jalan membuka modal detail di tampilan
 * pohon, jadi aksinya dipindah ke judul -- dan itu harus tetap terbukti.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { TimelinePanel } from "./TimelinePanel";
import { BAKU } from "../../lib/warnaLabel";

const epic = {
  id: "p-1",
  title: "Onboarding NTB",
  key: "PRJ-6",
  status: "To Do",
  type: "Epic",
  projectId: "proj-1",
} as any;

const tugas = {
  id: "t-1",
  title: "Enhancement homepage",
  key: "WMIR-168",
  status: "In Progress",
  priority: "High",
  type: "Task",
  projectId: "proj-1",
  parentId: "p-1",
} as any;

const setSelectedTaskForDetail = jest.fn();
const setIsTaskDetailModalOpen = jest.fn();

const renderPanel = () =>
  render(
    <TimelinePanel
      tasks={[epic, tugas]}
      selectedProject={{ id: "proj-1", name: "Wondr" } as any}
      updateTaskField={async () => {}}
      setSelectedTaskForDetail={setSelectedTaskForDetail}
      setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
      currentUser={{ id: "u-1", role: "admin" }}
    />
  );

describe("TimelinePanel — baris pohon tanpa kode tugas (#562)", () => {
  beforeEach(() => {
    setSelectedTaskForDetail.mockClear();
    setIsTaskDetailModalOpen.mockClear();
  });

  it("menampilkan judul dan status, tanpa kode tugas", () => {
    const { container } = renderPanel();
    const teks = container.textContent || "";

    expect(teks).toContain("Enhancement homepage");
    expect(teks).toContain("In Progress");
    expect(teks).not.toContain("WMIR-168");
    expect(teks).not.toContain("PRJ-6");
  });

  it("judul tetap membuka detail tugas, dan label status membawa ikon jenisnya", () => {
    const { container } = renderPanel();

    const judul = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Enhancement homepage")
    ) as HTMLButtonElement;
    expect(judul).toBeTruthy();

    fireEvent.click(judul);
    expect(setSelectedTaskForDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "t-1" }));
    expect(setIsTaskDetailModalOpen).toHaveBeenCalledWith(true);

    // Label status = ikon + teks, satu kesatuan di dalam baris yang sama.
    expect(judul.querySelectorAll("svg").length).toBeGreaterThan(0);
  });
});

/**
 * #565 — permintaan pemilik proyek 29 Sep, dengan contoh layar judul terpotong
 * "Pengaturan kasir di wo…": "tidak ada tulisan kepotong, buat responsive kolom
 * table nya" dan "tulisan to do bukan disana tapi di depan", formatnya
 * `status (label)  prioritas (label)  nama task`.
 */
describe("TimelinePanel — urutan label dan judul tanpa potongan (#565)", () => {
  const barisTugas = (container: HTMLElement) => {
    const judul = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Enhancement homepage")
    ) as HTMLElement;
    return { baris: judul.closest("div") as HTMLElement, sel: Array.from(judul.children) };
  };

  it("status dulu, lalu prioritas, lalu namanya", () => {
    const { container } = renderPanel();
    const { sel } = barisTugas(container);

    expect(sel.map((s) => (s.textContent || "").trim())).toEqual([
      "In Progress",
      "High",
      "Enhancement homepage",
    ]);
  });

  it("namanya tidak dipotong: nowrap, tanpa truncate, panelnya yang menggulir", () => {
    const { container } = renderPanel();
    const { baris, sel } = barisTugas(container);
    const nama = sel[sel.length - 1] as HTMLElement;

    expect(nama.className).toContain("whitespace-nowrap");
    expect(nama.className).not.toContain("truncate");
    expect(baris.className).toContain("w-max");
    // Gulir mendatar ada di wadah baris, bukan di dalam teksnya.
    expect(container.querySelector(".overflow-x-auto")).toBeTruthy();
  });

  it("chip prioritas ikut warna labelnya (#564)", () => {
    const { container } = renderPanel();
    const { sel } = barisTugas(container);
    const chip = sel[1] as HTMLElement;

    expect(chip.className).toContain("label-chip");
    expect(chip.style.getPropertyValue("--lbr")).toBe(BAKU.priority.high);
  });
});
