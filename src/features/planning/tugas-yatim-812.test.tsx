/** @jest-environment jsdom */
/**
 * #812 — tugas "yatim": terhitung di metrik sprint (Isu) dan panel beban,
 * tetapi tidak dirender di satu pun kelompok daftar.
 *
 * Skenario asli dari pemilik proyek 06 Nov: kartu kepala sprint menampilkan
 * "9 Isu" dan panel beban menampilkan "Nabila Triana 0/1", padahal kelompok
 * tugas yang terlihat hanya berjumlah 8. Tugas ke-9 milik Nabila adalah anak
 * dari tugas biasa (non-epik) yang TIDAK ikut masuk sprint — tidak memenuhi
 * syarat baris "standalone" lama (`!t.parentId`) dan bukan keturunan epik,
 * jadi tidak pernah tampil walau terhitung.
 *
 * Yang dikunci di sini (keputusan pemilik: opsi 1 — yatim jatuh ke kelompok
 * "Tugas Mandiri"/"Backlog Mandiri", diterapkan di SprintSection DAN
 * BacklogSection):
 *
 * 1. yatim sprint tampil di kelompok "Tugas Mandiri", sehingga baris beban
 *    anggotanya bisa direkonsiliasi dengan kartu yang benar-benar ada.
 * 2. tugas yang TERCAKUP bagian epik (keturunan epik dengan anak langsung di
 *    sprint, walau induk perantaranya di luar sprint) tampil TEPAT SEKALI —
 *    di bagian epik, tidak dobel di "Tugas Mandiri".
 * 3. yatim backlog (induknya di sprint lain) tampil di "Backlog Mandiri".
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { PlanningView } from "./index";
import { useProjectStore } from "../../store/stores";
import type { MasterData, Sprint, Task, UserProfile } from "../../types";

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Judul ${id}`,
    type: "task",
    status: "todo",
    priority: "Medium",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const masterData: MasterData[] = [
  { id: "todo", type: "status", code: "todo", label: "To Do", order: 1 } as MasterData,
];

const sprint = {
  id: "s1",
  projectId: "p1",
  name: "Rilis 1.1.0",
  status: "planned",
  startDate: new Date("2026-09-09"),
  endDate: new Date("2026-10-23"),
} as Sprint;

const anggota: UserProfile[] = [
  {
    uid: "uid-nabila",
    id: "uid-nabila",
    displayName: "Nabila Triana",
    email: "nabila@contoh.test",
  },
] as unknown as UserProfile[];

const props = (tasks: Task[]) => ({
  tasks,
  sprints: [sprint],
  masterData,
  userRole: "admin",
  currentUserProfile: {
    uid: "uid-pemilik",
    id: "uid-pemilik",
    email: "pemilik@contoh.test",
  } as UserProfile,
  user: { uid: "uid-pemilik", id: "uid-pemilik", email: "pemilik@contoh.test" } as UserProfile,
  projectMembers: anggota,
  expandedSprintId: "s1",
  setExpandedSprintId: () => {},
  setSelectedTaskForDetail: () => {},
  setIsTaskDetailModalOpen: () => {},
  setIsNewSprintModalOpen: () => {},
  setIsEditSprintModalOpen: () => {},
  setEditingSprint: () => {},
  handleStartSprint: () => {},
  handleCompleteSprint: () => {},
  handleDeleteSprint: () => {},
  handleDragEndPlanning: () => {},
});

/** Kartu `judulKartu` berada di bawah wadah grup yang kepalanya `labelGrup`. */
const dalamGrup = (labelGrup: string, judulKartu: string) => {
  let el: HTMLElement | null = screen.getByText(judulKartu);
  // Wadah grup = leluhur kartu yang juga menaungi teks kepala grupnya; naik
  // satu per satu supaya tidak bergantung pada kedalaman nesting markup.
  while (el && !(el.textContent ?? "").includes(labelGrup)) el = el.parentElement;
  return el !== null;
};

describe("#812 tugas yatim tampil, bukan cuma terhitung", () => {
  beforeEach(async () => {
    useProjectStore.getState().setLingkupTugas("all");
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("id");
  });
  afterEach(() => {
    cleanup();
    useProjectStore.getState().setLingkupTugas("all");
  });

  it("yatim sprint tampil di 'Tugas Mandiri' dan baris bebannya bisa ditelusuri", () => {
    render(
      <PlanningView
        {...(props([
          tugas("epic-1", { type: "epic" }),
          tugas("anak-epic", { parentId: "epic-1", sprintId: "s1" }),
          tugas("mandiri", { sprintId: "s1" }),
          // Induk biasa yang TIDAK ikut sprint — anaknya jadi yatim.
          tugas("induk-luar"),
          tugas("yatim-sprint", {
            parentId: "induk-luar",
            sprintId: "s1",
            assigneeId: "uid-nabila",
          }),
        ]) as any)}
      />
    );

    // Baris beban terlihat SEJAK AWAL (tanpa membuka grup) — ini keluhan aslinya.
    const barisNabila = screen.getByText("Nabila Triana").closest('[data-testid="kartu-beban"]');
    expect(barisNabila?.textContent).toContain("0/1");

    // Kartunya sendiri baru ada setelah grup standalone sprint dibuka.
    fireEvent.click(screen.getByText("Judul epic-1"));
    fireEvent.click(screen.getByText("Tugas Mandiri"));
    expect(dalamGrup("Tugas Mandiri", "Judul mandiri")).toBe(true);
    expect(dalamGrup("Tugas Mandiri", "Judul yatim-sprint")).toBe(true);
    expect(screen.getByText("Judul anak-epic")).toBeInTheDocument();
  });

  it("keturunan epik yang tercakup bagian epik tidak dobel di 'Tugas Mandiri'", () => {
    render(
      <PlanningView
        {...(props([
          tugas("epic-1", { type: "epic" }),
          tugas("anak-epic", { parentId: "epic-1", sprintId: "s1" }),
          // Perantara TIDAK ikut sprint; cucunya ikut. Epik tetap punya anak
          // langsung di sprint (anak-epic), jadi cucu tercakup bagian epik.
          tugas("perantara", { parentId: "epic-1" }),
          tugas("cucu", { parentId: "perantara", sprintId: "s1" }),
        ]) as any)}
      />
    );

    // "Judul epic-1" ada di dua tempat: kepala bagian epik backlog DAN sprint.
    screen.getAllByText("Judul epic-1").forEach((el) => fireEvent.click(el));

    // Tepat sekali, dan bukan di grup standalone sprint (grup itu tak dibuat
    // sama sekali — tidak ada satu pun tugas mandiri/yatim di sprint ini).
    expect(screen.queryAllByText("Judul cucu")).toHaveLength(1);
    expect(screen.queryByText("Tugas Mandiri")).toBeNull();
  });

  it("yatim backlog (induknya di sprint lain) tampil di 'Backlog Mandiri'", () => {
    render(
      <PlanningView
        {...(props([
          tugas("induk-di-sprint", { sprintId: "s1" }),
          tugas("yatim-backlog", { parentId: "induk-di-sprint" }),
        ]) as any)}
      />
    );

    fireEvent.click(screen.getByText("Tugas Mandiri"));
    expect(dalamGrup("Tugas Mandiri", "Judul induk-di-sprint")).toBe(true);

    fireEvent.click(screen.getByText("Backlog Mandiri"));
    expect(screen.queryAllByText("Judul yatim-backlog")).toHaveLength(1);
    expect(dalamGrup("Backlog Mandiri", "Judul yatim-backlog")).toBe(true);
  });
});
