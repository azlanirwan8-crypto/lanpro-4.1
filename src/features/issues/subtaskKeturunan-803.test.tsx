/**
 * #803 — seksi Daftar Subtugas menampilkan SELURUH keturunan, bukan hanya anak
 * langsung, dan mengurutkannya sebagai pohon.
 *
 * Sebelum perbaikan barisnya `tasks.filter((t) => t.parentId === task.id)`:
 * cucu dan seterusnya sudah ada di sisi klien (server memulangkan subtree penuh
 * lewat `WITH RECURSIVE`) tetapi tidak pernah ditampilkan di layar mana pun,
 * jadi pengguna mengira subtugas bertingkatnya hilang.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { TaskSubtasksSection } from "./components/modal/TaskSubtasksSection";
import type { Task } from "../../types";

const tugas = (id: string, parentId?: string): Task =>
  ({
    id,
    key: `WMIR-${id}`,
    title: `Judul ${id}`,
    status: "To Do",
    priority: "Medium",
    type: "subtask",
    projectId: "proyek-1",
    parentId,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  }) as Task;

const renderSeksi = (semua: Task[], induk: Task) =>
  render(
    <TaskSubtasksSection
      task={induk}
      tasks={semua}
      isEditable
      updateTaskField={jest.fn()}
      deleteTask={jest.fn()}
      projectMembers={[]}
      masterData={[]}
    />
  );

/** Baris ke-i selalu checkbox ke-i; induknya adalah wadah baris itu. */
const baris = () => screen.getAllByRole("checkbox").map((el) => el.parentElement as HTMLElement);

describe("#803 — Daftar Subtugas bertingkat", () => {
  const INDUK = tugas("induk");
  const ANAK = tugas("anak", "induk");
  const CUCU = tugas("cucu", "anak");
  const CICIT = tugas("cicit", "cucu");
  const LAIN = tugas("lain"); // akar lain, bukan keturunan INDUK

  it("menampilkan anak, cucu, dan cicit sekaligus", () => {
    renderSeksi([INDUK, ANAK, CUCU, CICIT, LAIN], INDUK);

    expect(screen.getByDisplayValue("Judul anak")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Judul cucu")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Judul cicit")).toBeInTheDocument();
  });

  it("tidak menyeret isu di luar cabang ini", () => {
    renderSeksi([INDUK, ANAK, CUCU, LAIN], INDUK);

    expect(screen.queryByDisplayValue("Judul lain")).toBeNull();
    expect(screen.queryByDisplayValue("Judul induk")).toBeNull();
  });

  it("mengurutkan baris sebagai pohon dan menaikkan indentasi per tingkat", () => {
    renderSeksi([INDUK, ANAK, CUCU, CICIT], INDUK);

    // Urutan DOM = urutan baca pohon: cucu berdampingan dengan induknya sendiri,
    // bukan sesudah semua anak seperti pada `getAllDescendants`.
    expect(screen.getAllByRole("textbox").map((el) => (el as HTMLInputElement).value)).toEqual([
      "Judul anak",
      "Judul cucu",
      "Judul cicit",
    ]);

    expect(baris().map((el) => el.style.marginLeft)).toEqual(["0px", "20px", "40px"]);
  });

  it("tetap kosong bila memang tidak ada keturunan", () => {
    renderSeksi([INDUK, LAIN], INDUK);

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("Belum ada subtugas")).toBeInTheDocument();
  });
});
