/** @jest-environment jsdom */
/**
 * #689 — dua cacat yang ditinggalkan #688 di Papan, keduanya karena SATU sebab:
 * array HASIL SARINGAN dipakai untuk keputusan dan untuk tulis-ulang state,
 * bukan hanya untuk tampilan.
 *
 * (1) `useKanbanLogic.ts:183-198` membangun salinan optimistik dari `tArr`
 *     (sudah disaring) lalu mengirimnya ke `props.setTasks` — yaitu state task
 *     GLOBAL — sambil menembak `suppressTaskDataRefresh(8000)`. Dalam mode
 *     "My Tasks", seluruh tugas orang lain hilang dari state bersama selama
 *     delapan detik dan layar lain (Issue List, Timeline, Planning, Dashboard)
 *     membacanya. Sebelum #688 tulisan ini aman karena `tArr === tasks`.
 *
 * (2) Gerbang "anak belum selesai tidak boleh ditutup" dan pencarian epik induk
 *     dibaca dari `tArr` juga (`:128`, `:163`, `:179`). Anak yang penugasannya
 *     ke orang lain menjadi TAK TERLIHAT oleh penjaga, sehingga penjaganya
 *     lolos dan server yang menolak — atau lebih buruk, menerima.
 *     Kelas cacat yang sama dengan #675: keputusan keamanan/consistency yang
 *     ditopang array tampilan.
 *
 * Yang boleh disaring hanyalah apa yang DIRENDER (`epics`, `standaloneTasks`,
 * `groupedTasks`).
 */
import { renderHook, act } from "@testing-library/react";
import { useBoard } from "./hooks/useKanbanLogic";
import { updateTask } from "./services/kanban.service";
import { useProjectStore } from "../../store/stores";
import type { MasterData, Task, UserProfile } from "../../types";

jest.mock("./services/kanban.service", () => ({
  updateTask: jest.fn(async () => ({ status: "success" })),
  resolveUserId: (u: any) => u?.uid ?? u?.id ?? null,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), loading: jest.fn() },
}));

const status = (kode: string, label: string, order: number): MasterData =>
  ({ id: kode, type: "status", code: kode, label, order }) as MasterData;

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

const MILIKKU = "uid-saya";
const MILIK_ORANG = "uid-orang";

const masterData: MasterData[] = [
  status("todo", "To Do", 1),
  status("doing", "In Progress", 2),
  status("done", "Done", 3),
];

const setLingkup = (nilai: "all" | "mine") => useProjectStore.getState().setLingkupTugas(nilai);

const dasar = {
  masterData,
  projectMembers: [{ uid: MILIKKU, displayName: "Saya" }],
  userRole: "admin" as const,
  user: { uid: MILIKKU, id: MILIKKU, email: "saya@contoh.test" } as UserProfile,
  selectedProject: { id: "p1" },
  setSelectedTaskForDetail: () => {},
  setIsTaskDetailModalOpen: () => {},
};

describe("#689 lingkup tidak boleh menjadi sumber kebenaran state", () => {
  beforeEach(() => {
    setLingkup("all");
    (updateTask as jest.Mock).mockClear();
  });

  it("tulis optimistik mengirim SELURUH daftar task, bukan hanya yang tersaring", async () => {
    setLingkup("mine");
    const setTasks = jest.fn();
    const { result } = renderHook(() =>
      useBoard(
        {
          ...dasar,
          setTasks,
          tasks: [
            tugas("e-mine", { type: "epic", assigneeId: MILIKKU }),
            tugas("t-mine", { parentId: "e-mine", assigneeId: MILIKKU }),
            tugas("e-orang", { type: "epic", assigneeId: MILIK_ORANG }),
            tugas("t-orang", { parentId: "e-orang", assigneeId: MILIK_ORANG }),
          ],
        } as any,
        "epic"
      )
    );

    await act(async () => {
      await result.current.handleDragEndBoard({
        draggableId: "t-mine",
        source: { droppableId: "e-mine:todo", index: 0 },
        destination: { droppableId: "e-mine:doing", index: 0 },
      });
    });

    expect(setTasks).toHaveBeenCalledTimes(1);
    const ditulis: Task[] = setTasks.mock.calls[0][0];

    // Tugas orang lain harus tetap ada di state bersama.
    expect(ditulis.map((t) => t.id).sort()).toEqual(["e-mine", "e-orang", "t-mine", "t-orang"]);
    // Dan kartu yang diseret benar-benar berubah status di salinan itu.
    expect(ditulis.find((t) => t.id === "t-mine")?.status).toBe("doing");
  });

  it("penjaga anak-belum-selesai tetap melihat anak milik orang lain", async () => {
    setLingkup("mine");
    const setTasks = jest.fn();
    const { result } = renderHook(() =>
      useBoard(
        {
          ...dasar,
          setTasks,
          userRole: "admin",
          tasks: [
            tugas("induk", { assigneeId: MILIKKU, status: "doing" }),
            tugas("anak-orang", { parentId: "induk", assigneeId: MILIK_ORANG, status: "todo" }),
          ],
        } as any,
        "epic"
      )
    );

    await act(async () => {
      await result.current.handleDragEndBoard({
        draggableId: "induk",
        source: { droppableId: "standalone:doing", index: 0 },
        destination: { droppableId: "standalone:done", index: 0 },
      });
    });

    // Anak belum selesai milik siapa pun harus memblokir, bukan dilupakan.
    expect(updateTask).not.toHaveBeenCalled();
    expect(setTasks).not.toHaveBeenCalled();
  });

  it("lingkup all tidak mengubah perilaku yang sudah benar", async () => {
    const setTasks = jest.fn();
    const { result } = renderHook(() =>
      useBoard(
        {
          ...dasar,
          setTasks,
          tasks: [
            tugas("e-1", { type: "epic", assigneeId: MILIKKU }),
            tugas("t-1", { parentId: "e-1", assigneeId: MILIKKU }),
            tugas("t-2", { parentId: "e-1", assigneeId: MILIK_ORANG }),
          ],
        } as any,
        "epic"
      )
    );

    await act(async () => {
      await result.current.handleDragEndBoard({
        draggableId: "t-1",
        source: { droppableId: "e-1:todo", index: 0 },
        destination: { droppableId: "e-1:doing", index: 0 },
      });
    });

    expect((updateTask as jest.Mock).mock.calls[0][3]).toMatchObject({ status: "doing" });
    expect(setTasks.mock.calls[0][0].map((t: Task) => t.id)).toEqual(["e-1", "t-1", "t-2"]);
  });
});
