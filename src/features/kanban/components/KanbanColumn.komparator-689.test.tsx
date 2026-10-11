/** @jest-environment jsdom */
/**
 * #689 butir (e) — comparator `React.memo` di `KanbanColumn` tidak memeriksa
 * semua field yang DIRENDER `KanbanCard`.
 *
 * Bentuk yang dibuat Kolom#688: comparator membandingkan `id, status, version,
 * title, assigneeId, isBlocked, priority, updatedAt, subtasks, linkedTasks.length`
 * — sementara kartu juga merender `dueDate`, `projectId`, `category`, dan
 * `commentsCount`, plus prop `shakingTaskId` dan `wipLimit`. Jadi kartu yang
 * hanya berubah komentarnya, kategori, tenggatnya, atau getaran penolakannya
 * TIDAK diperbarui sampai sesuatu kebetulan memaksa kolom me-render ulang.
 *
 * Yang dikunci di sini dua hal, bukan satu:
 *  1. perilaku — kartu benar-benar berubah ketika hanya field itu yang berubah;
 *  2. pagar sumber — kalau suatu hari `KanbanCard` membaca `task.<field>` baru
 *     dan comparator lupa mengikutinya, test ini merah. Alasan pagar ini ada di
 *     test yang sama (`useLingkupTugas.688`): dua daftar yang harus cocok tidak
 *     bisa dijaga oleh ingatan penulisnya.
 */
import React from "react";
import * as fs from "node:fs";
import * as path from "node:path";
import { render, screen } from "@testing-library/react";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";

const MARR = [
  { type: "status", code: "todo", label: "To Do", order: 1 },
  { type: "priority", code: "medium", label: "Medium", order: 2 },
];

// Prop yang TIDAK boleh berubah identitas antar rerender. Kalau tidak dikunci,
// comparator menolak sejak `prevProps.pArr !== nextProps.pArr` dan kolom
// me-render ulang apa pun yang terjadi pada kartunya — test jadi hijau tanpa
// menguji apa pun. Pernah terjadi di sini, dan itulah sebabnya baris ini ada.
const STATUS = { code: "todo", label: "To Do" };
const PARR: any[] = [];
const KLIK = () => {};
// `updatedAt` DIBANDINGKAN oleh comparator sebagai identitas objek. Kalau tiap
// pemanggilan membuat Date baru, comparator selalu menolak dan kartu me-render
// ulang apa pun yang terjadi pada field lain — test jadi hijau tanpa menguji
// apa pun. Sudah terjadi di sini; makanya tanggalnya satu objek saja.
const UPDATED = new Date("2026-01-01T00:00:00Z");

const elemen = (task: any) => (
  <DragDropContext onDragEnd={() => {}}>
    <KanbanColumn
      status={STATUS}
      tasks={[task]}
      mArr={MARR}
      pArr={PARR}
      onTaskClick={KLIK}
      columnId="todo"
    />
  </DragDropContext>
);

const tugas = (tambahan: Record<string, unknown> = {}) =>
  ({
    id: "t-1",
    key: "LAN-1",
    projectId: "p1",
    title: "Kartu yang sama",
    status: "todo",
    priority: "medium",
    type: "task",
    dueDate: null,
    category: null,
    commentsCount: 0,
    version: 1,
    updatedAt: UPDATED,
    subtasks: [],
    ...tambahan,
  }) as any;

describe("#689 comparator kolom mengikuti apa yang dirender kartu", () => {
  it("tenggat yang berubah memunculkan peringatan waktu", () => {
    const awal = render(elemen(tugas({ dueDate: null })));
    expect(screen.queryByText(/jam|hari/)).not.toBeInTheDocument();

    awal.rerender(elemen(tugas({ dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000) })));

    expect(screen.getByText(/jam|hari/)).toBeInTheDocument();
  });

  it("jumlah komentar yang naik tampil tanpa perubahan field lain", () => {
    const awal = render(elemen(tugas({ commentsCount: 0 })));
    expect(screen.queryByText("3")).not.toBeInTheDocument();

    awal.rerender(elemen(tugas({ commentsCount: 3 })));

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("kategori yang isi berubah ikut tampil", () => {
    const awal = render(elemen(tugas({ category: null })));
    expect(screen.queryByText(/riset/i)).not.toBeInTheDocument();

    awal.rerender(elemen(tugas({ category: "kelompok_riset" })));

    expect(screen.getByText(/riset/i)).toBeInTheDocument();
  });

  it("getaran penolakan ikut sampai ke kartu", () => {
    const tanpa = render(
      <DragDropContext onDragEnd={() => {}}>
        <KanbanColumn
          status={STATUS}
          tasks={[tugas()]}
          mArr={MARR}
          pArr={PARR}
          onTaskClick={KLIK}
          columnId="todo"
        />
      </DragDropContext>
    );
    expect(tanpa.container.querySelector(".animate-shake")).toBeNull();

    tanpa.rerender(
      <DragDropContext onDragEnd={() => {}}>
        <KanbanColumn
          status={STATUS}
          tasks={[tugas()]}
          mArr={MARR}
          pArr={PARR}
          onTaskClick={KLIK}
          columnId="todo"
          shakingTaskId="t-1"
        />
      </DragDropContext>
    );

    // `shakingTaskId` adalah SATU-SATUNYA yang berubah: kalau comparator tidak
    // membandingkannya, papan menolak sambil kartunya diam saja.
    expect(tanpa.container.querySelector(".animate-shake")).not.toBeNull();
  });

  it("pagar sumber: setiap task.<field> yang dirender kartu dibandingkan comparator", () => {
    const akar = path.resolve(__dirname, "..");
    const kartu = fs.readFileSync(path.join(akar, "components", "KanbanCard.tsx"), "utf8");
    const kolom = fs.readFileSync(path.join(akar, "components", "KanbanColumn.tsx"), "utf8");

    const dibaca = new Set<string>();
    for (const m of kartu.matchAll(/\btask\.([A-Za-z][A-Za-z0-9_]*)/g)) dibaca.add(m[1]);

    const comparator = kolom.slice(kolom.lastIndexOf("(prevProps, nextProps)"));
    const dibandingkan = new Set<string>();
    for (const m of comparator.matchAll(/\bp[tf]\.([A-Za-z][A-Za-z0-9_]*)/g))
      dibandingkan.add(m[1]);

    // Field yang memang bukan tampilan kartu, dan karena itu tidak bisa
    // "basi": dipakai sebagai kunci pencarian atau untuk naik ke induk.
    const diLuar = new Set<string>([]);
    const hilang = [...dibaca].filter((f) => !dibandingkan.has(f) && !diLuar.has(f)).sort();

    expect(hilang).toEqual([]);
  });
});
