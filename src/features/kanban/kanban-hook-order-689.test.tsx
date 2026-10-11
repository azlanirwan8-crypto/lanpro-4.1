/** @jest-environment jsdom */
/**
 * #689 — papan crashed di render KEDUA, bukan di render pertama.
 *
 * `src/features/kanban/index.tsx` mengembalikan "memuat papan" lebih dulu ketika
 * `boardStatuses` masih kosong (:40), tetapi dua `React.useMemo` berikutnya
 * (:59 dan :106) berada DI BAWAH return itu. Selama MasterData sudah tiba sebelum
 * render pertama, jumlahnya kebetulan cocok dan tidak ada yang terlihat. Begitu
 * status tiba belakangan — masterData dimuat perlahan, kosong karena galat
 * konfigurasi, atau fetch gagal — render kedua memanggil LEBIH BANYAK hook dari
 * render pertama, dan React melempar "Rendered more hooks than during the
 * previous render".
 *
 * Ini tidak terperiksa alat mana pun di repo: `npm run lint` adalah `tsc` +
 * validate-permissions (`package.json:26`), dan `eslint.config.js` tidak memuat
 * plugin `react-hooks`. Jadi perilakunya dikunci lewat test, bukan lewat alat.
 */
import React from "react";
import { render } from "@testing-library/react";
import { BoardView } from "./index";
import type { Task } from "../../types";

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Task ${id}`,
    type: "task",
    status: "todo",
    priority: "Medium",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const masterStatus = [
  { id: "todo", type: "status", code: "todo", label: "To Do", order: 1 },
  { id: "doing", type: "status", code: "doing", label: "In Progress", order: 2 },
];

const props = {
  tasks: [tugas("t-1"), tugas("t-2", { status: "doing" })],
  masterData: [] as any[],
  projectMembers: [{ uid: "uid-saya", displayName: "Saya" }],
  userRole: "admin",
  user: { uid: "uid-saya", id: "uid-saya", email: "saya@contoh.test" },
  selectedProject: { id: "p1" },
  setSelectedTaskForDetail: () => {},
  setIsTaskDetailModalOpen: () => {},
};

describe("#689 urutan hook di BoardView", () => {
  let spy: jest.SpyInstance;
  beforeAll(() => {
    // React mencatat galat render dua kali; bising ini bukan bagian yang diuji.
    spy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterAll(() => spy.mockRestore());

  it("status MasterData yang tiba sesudah render pertama tidak menjatuhkan papan", () => {
    const { rerender } = render(<BoardView {...(props as any)} />);

    expect(() =>
      rerender(<BoardView {...(props as any)} masterData={masterStatus} />)
    ).not.toThrow();
  });

  it("papan boleh kembali kosong tanpa membuat render berikutnya meledak", () => {
    const awal = render(<BoardView {...(props as any)} masterData={masterStatus} />);

    expect(() => awal.rerender(<BoardView {...(props as any)} masterData={[]} />)).not.toThrow();
    expect(() =>
      awal.rerender(<BoardView {...(props as any)} masterData={masterStatus} />)
    ).not.toThrow();
  });
});
