/** @jest-environment jsdom */
/**
 * #689 — regresi kedua yang ditinggalkan #688, dan kebalikan dari tujuan
 * "My Tasks": tugas saya yang bergendong di bawah epic milik orang lain hilang
 * dari layar, tetapi tetap ikut dihitung.
 *
 * `planning/index.tsx:53` menyaring sekali (benar), lalu array HASIL SARINGAN
 * itu diwariskan ke `BacklogSection`/`SprintSection` yang mengelompokkan kartu
 * PER INDUK (`BacklogSection/index.tsx:39,41-45`). Baris induk dibangun dari
 * epic yang tersaring; epic milik orang lain tidak ikut, jadi anaknya yang
 * milik saya tidak punya tempat duduk — tidak dirender di cabang mana pun
 * (`:43` menuntut `!t.parentId` untuk baris "standalone"), sementara badge
 * jumlah (`:61`) memakai `filteredBacklogTasks` yang ikut memasukkannya.
 *
 * Perbaikan yang diuji di sini: lingkup boleh membuang kartu orang lain, tetapi
 * leluhur dari kartu yang tersisa harus tetap ikut, supaya "ada N tugas" selalu
 * sama dengan kartu yang benar-benar tampil.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PlanningView } from "./index";
import { useProjectStore } from "../../store/stores";
import type { MasterData, Task, UserProfile } from "../../types";

const MILIKKU = "uid-saya";
const MILIK_ORANG = "uid-orang";

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

const tasksProyek: Task[] = [
  tugas("epic-orang", { type: "epic", assigneeId: MILIK_ORANG }),
  tugas("punya-saya", { assigneeId: MILIKKU }),
  tugas("anak-saya", { parentId: "epic-orang", assigneeId: MILIKKU }),
  tugas("anak-orang", { parentId: "epic-orang", assigneeId: MILIK_ORANG }),
];

const props = {
  tasks: tasksProyek,
  sprints: [],
  masterData,
  userRole: "admin",
  currentUserProfile: {
    uid: MILIKKU,
    id: MILIKKU,
    email: "saya@contoh.test",
  } as UserProfile,
  user: { uid: MILIKKU, id: MILIKKU, email: "saya@contoh.test" } as UserProfile,
  projectMembers: [],
  expandedSprintId: null,
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
};

describe("#689 lingkup Planning tidak boleh menyembunyikan tugas sendiri", () => {
  beforeEach(() => useProjectStore.getState().setLingkupTugas("all"));
  afterEach(() => useProjectStore.getState().setLingkupTugas("all"));

  it("all: semua kartu tampil seperti biasa", () => {
    render(<PlanningView {...(props as any)} />);
    expect(screen.getByText("Judul punya-saya")).toBeInTheDocument();
    expect(screen.getByText("Judul anak-saya")).toBeInTheDocument();
    expect(screen.getByText("Judul anak-orang")).toBeInTheDocument();
  });

  it("mine: tugas saya tetap tampil walau epiknya milik orang lain", () => {
    useProjectStore.getState().setLingkupTugas("mine");
    render(<PlanningView {...(props as any)} />);

    // Ini yang hilang di kode saat ini: kartanya tersaring masuk, baris induknya
    // tidak, jadi kartu itu tidak punya tempat duduk sama sekali.
    expect(screen.getByText("Judul punya-saya")).toBeInTheDocument();
    expect(screen.getByText("Judul anak-saya")).toBeInTheDocument();
    // Kartu orang lain tetap tidak boleh muncul.
    expect(screen.queryByText("Judul anak-orang")).not.toBeInTheDocument();
  });
});
