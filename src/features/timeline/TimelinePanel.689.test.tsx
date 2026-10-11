/**
 * @jest-environment jsdom
 *
 * #689 butir (f) — tiga hal yang tadi hanya bisa saya klaim dari membaca kode,
 * sekarang diuji lewat render sungguhan:
 *
 * 1. Roadmap tidak punya EMPTY STATE sama sekali. Proyek tanpa tugas, proyek
 *    yang tugasnya belum bertanggal, dan "My Tasks" yang kosong tampil identik:
 *    kanvas kosong tanpa kalimat.
 * 2. `will-change` ditempel ke SETIAP baris tanpa syarat — lima situs, dan baris
 *    bertanggal mendapat tiga lapis sekaligus.
 * 3. Sumbu dulu ditarik paksa ke satu kuartal tetap; sekarang ia mengikuti
 *    tanggal tugas, dan itu terlihat dari rentang tick yang dirender.
 */
import React from "react";
import { render } from "@testing-library/react";
import { TimelinePanel } from "./TimelinePanel";
import { useProjectStore } from "../../store/stores";

const epic = {
  id: "p-1",
  title: "Onboarding NTB",
  key: "PRJ-6",
  status: "To Do",
  type: "Epic",
  projectId: "proj-1",
} as any;

const tugas = (tambahan: Record<string, unknown> = {}) =>
  ({
    id: "t-1",
    title: "Enhancement homepage",
    key: "WMIR-168",
    status: "In Progress",
    priority: "High",
    type: "Task",
    projectId: "proj-1",
    parentId: "p-1",
    ...tambahan,
  }) as any;

const renderPanel = (tasks: any[], currentUser: any = { id: "u-1", role: "admin" }) =>
  render(
    <TimelinePanel
      tasks={tasks}
      selectedProject={{ id: "proj-1", name: "Wondr" } as any}
      updateTaskField={async () => {}}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
      currentUser={currentUser}
    />
  );

const teksPanel = (container: HTMLElement) => container.textContent || "";

describe("#689 Roadmap membedakan situasinya sendiri", () => {
  afterEach(() => useProjectStore.getState().setLingkupTugas("all"));

  it("proyek tanpa tugas mendapat pesan, bukan kanvas bisu", () => {
    const { container } = renderPanel([]);
    expect(teksPanel(container)).toMatch(/belum punya tugas/i);
  });

  it("mode 'My Tasks' yang kosong mengatakan apa yang sebenarnya terjadi", () => {
    useProjectStore.getState().setLingkupTugas("mine");
    const { container } = renderPanel([epic, tugas()], { id: "u-1", role: "admin" });
    const teks = teksPanel(container);
    expect(teks).toMatch(/ditugaskan kepada Anda/i);
    expect(teks).not.toMatch(/belum punya tugas/i);
  });

  it("tugas tanpa tanggal disambut dengan penjelasan tanggal", () => {
    const { container } = renderPanel([epic, tugas()]);
    expect(teksPanel(container)).toMatch(/belum ada tugas yang punya tanggal/i);
  });

  it("tanpa seretan, tidak satu pun elemen membawa will-change", () => {
    const { container } = renderPanel([
      epic,
      tugas({ startDate: new Date("2026-08-04"), endDate: new Date("2026-08-28") }),
    ]);
    const menempel = container.querySelectorAll('[style*="will-change"]');
    expect(menempel.length).toBe(0);
  });

  it("tick bulan mengikuti jadwal tugas, bukan kuartal yang di-hardcode", () => {
    const { container } = renderPanel([
      epic,
      tugas({ startDate: new Date("2026-08-04"), endDate: new Date("2026-08-28") }),
    ]);
    const teks = teksPanel(container);
    expect(teks).toMatch(/Aug/i);
    expect(teks).not.toMatch(/\bMar 2026\b/);
  });
});
