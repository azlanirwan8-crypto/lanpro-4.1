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

  it("judul tetap membuka detail tugas, dan barisnya membawa ikon jenisnya", () => {
    const { container } = renderPanel();

    const judul = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Enhancement homepage")
    ) as HTMLButtonElement;
    expect(judul).toBeTruthy();

    fireEvent.click(judul);
    expect(setSelectedTaskForDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "t-1" }));
    expect(setIsTaskDetailModalOpen).toHaveBeenCalledWith(true);

    // #700 — ikon jenis baris (folder/dokumen) pindah ke KOLOM nama, di luar
    // tombol judul, jadi yang diperiksa barisnya, bukan tombolnya.
    const baris = judul.closest("div")?.parentElement as HTMLElement;
    expect(baris.querySelector("svg")).toBeTruthy();
  });
});

/**
 * #565 dulu mengunci `status  prioritas  nama` dalam SATU tombol, dengan alasan
 * "tidak ada tulisan kepotong" — panelnya yang melebar. #700 (12 Okt, pemilik
 * proyek menunjuk layar acuan berkolom): Roadmap dibaca sebagai tabel, jadi
 * keempatnya kolom sendiri. Konsekuensi yang diterima sadar: lebar panel menjadi
 * PASTI dan judul panjang dipotong dengan `title=` — pola #647 yang sudah dipakai
 * Daftar Isu. Kerapatan baris TETAP 40 px (#608), dan kode tugas TETAP tidak
 * tampil (#562).
 */
describe("TimelinePanel — empat kolom pohon (#700)", () => {
  const barisTugas = (container: HTMLElement) => {
    const judul = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Enhancement homepage")
    ) as HTMLElement;
    const kolomNama = judul.parentElement as HTMLElement;
    const baris = kolomNama.parentElement as HTMLElement;
    const chip = Array.from(baris.querySelectorAll("span.label-chip")) as HTMLElement[];
    const tanggal = Array.from(baris.querySelectorAll("span")).find(
      (s) => (s.textContent || "").trim() === "—"
    ) as HTMLElement;
    return { baris, kolomNama, judul, chip, tanggal };
  };

  const mendahului = (a: HTMLElement, b: HTMLElement) =>
    !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it("dibaca: nama, lalu status, lalu prioritas, lalu rentang tanggal", () => {
    const { container } = renderPanel();
    const { chip, tanggal } = barisTugas(container);

    expect(chip.map((c) => (c.textContent || "").trim())).toEqual(["In Progress", "High"]);
    expect(tanggal).toBeTruthy();
    expect(mendahului(chip[0], chip[1])).toBe(true);
    expect(mendahului(chip[1], tanggal)).toBe(true);
  });

  it("status dan prioritas duduk di kolomnya sendiri, bukan di dalam tombol judul", () => {
    const { container } = renderPanel();
    const { judul, baris, chip } = barisTugas(container);

    expect(judul.querySelector("span.label-chip")).toBeNull();
    // Kolom status/prioritas adalah anak langsung baris yang sama.
    for (const c of chip) expect(c.parentElement?.parentElement).toBe(baris);
  });

  it("nama dipotong dengan `title=`, dan barisnya selebar panel", () => {
    const { container } = renderPanel();
    const { baris, judul } = barisTugas(container);

    expect(judul.className).toContain("truncate");
    expect(judul.getAttribute("title")).toBe("Enhancement homepage");
    expect(baris.className).toContain("w-full");
    expect(baris.className).not.toContain("w-max");
  });

  it("panel hierarki punya lebar pasti, dengan lantai dan batas", () => {
    const { container } = renderPanel();
    const panel = Array.from(container.querySelectorAll("div")).find(
      (d) => /shrink-0/.test(d.className) && /border-r/.test(d.className)
    ) as HTMLElement;

    expect(panel).toBeTruthy();
    // Tanpa lantai dan batas, satu judul 200 karakter akan memakan papan Gantt —
    // alasan #566 memasang keduanya, dan alasannya tetap berlaku di #700.
    expect(panel.className).toMatch(/w-\[/);
    expect(panel.className).toMatch(/min-w-\[/);
    expect(panel.className).toMatch(/max-w-\[/);
  });

  it("chip prioritas ikut warna labelnya (#564)", () => {
    const { container } = renderPanel();
    const { chip } = barisTugas(container);

    expect(chip[1].className).toContain("label-chip");
    expect(chip[1].style.getPropertyValue("--lbr")).toBe(BAKU.priority.high);
  });
});
