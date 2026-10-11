/** @jest-environment jsdom */
/**
 * #689 butir (g) — Planning.
 *
 * Dua hal diuji di sini, dan keduanya soal keadaan, bukan selera:
 *
 * 1. Pengelompokan induk-anak dibangun sekali (`BacklogSection/index.tsx:41-45`
 *    dulu menyaring ulang SELURUH backlog untuk setiap epik yang dirender).
 *    Yang dikunci: setiap kartu muncul TEPAT SEKALI, di bawah kelompok yang
 *    benar — jadi penyederhanaan itu bukan pembuangan baris.
 * 2. "Belum ada tugas di Backlog" sebelumnya dipakai untuk dua keadaan berbeda:
 *    backlog yang memang kosong, dan backlog yang habis memakan pencariannya
 *    sendiri. Penggunanya tidak bisa membedakan "tidak ada kerja" dari
 *    "saringan saya terlalu sempit".
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { BacklogSection } from "./BacklogSection";
import type { MasterData, Task } from "../../types";

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
  { id: "p1m", type: "priority", code: "High", label: "High", order: 1 } as MasterData,
];

const Benang: React.FC = () => null;

const pasang = (tasks: Task[]) => {
  const terender: string[] = [];
  const renderDraggableTask = (task: Task) => {
    terender.push(task.id);
    return <Benang key={task.id} />;
  };
  render(
    <BacklogSection
      tasks={tasks}
      masterData={masterData}
      renderDraggableTask={renderDraggableTask}
      canEditPlanning
      onAddSprint={() => {}}
    />
  );
  return terender;
};

describe("#689 keadaan Backlog di Planning", () => {
  beforeEach(async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("id");
  });
  afterEach(cleanup);

  it("setiap kartu muncul tepat sekali, di kelompoknya masing-masing", () => {
    const tasks = [
      tugas("epic-1", { type: "epic" }),
      tugas("epic-2", { type: "epic" }),
      tugas("anak-1a", { parentId: "epic-1" }),
      tugas("anak-1b", { parentId: "epic-1" }),
      tugas("anak-2a", { parentId: "epic-2" }),
      tugas("mandiri-1"),
      // Anak yang induknya BUKAN epik tidak dirender di backlog — perilaku lama,
      // dipertahankan apa adanya di sini supaya penyederhanaan grup tidak
      // diam-diam mengubah isi layar. (Catatan #689: kartu seperti ini hilang
      // tanpa kabar; itu temuan terpisah, bukan bagian tambalan ini.)
      tugas("yatim", { parentId: "epic-hilang" }),
    ];

    const terender = pasang(tasks);

    expect([...terender].sort()).toEqual(["anak-1a", "anak-1b", "anak-2a", "mandiri-1"].sort());
    expect(terender).not.toContain("epic-1");
    expect(terender).not.toContain("yatim");
  });

  it("backlog yang memang kosong disebut kosong", () => {
    pasang([]);
    expect(screen.getByTestId("backlog-kosong")).toHaveTextContent("Belum ada tugas di Backlog");
    expect(screen.queryByTestId("backlog-tidak-cocok")).toBeNull();
  });

  it("pencarian yang menghabiskan daftar tidak disebut backlog kosong", () => {
    pasang([tugas("mandiri-1"), tugas("mandiri-2")]);

    fireEvent.change(screen.getByPlaceholderText("Cari tugas backlog..."), {
      target: { value: "tidak-ada-yang-ini" },
    });

    expect(screen.getByTestId("backlog-tidak-cocok")).toHaveTextContent(
      "Tidak ada tugas di Backlog yang cocok"
    );
    expect(screen.queryByTestId("backlog-kosong")).toBeNull();
  });

  it("filter prioritas yang tidak cocok juga disebut saringan, bukan kekosongan", () => {
    const terender = pasang([tugas("mandiri-1", { priority: "Medium" })]);
    expect(terender).toEqual(["mandiri-1"]);
    expect(screen.queryByTestId("backlog-tidak-cocok")).toBeNull();
  });
});
