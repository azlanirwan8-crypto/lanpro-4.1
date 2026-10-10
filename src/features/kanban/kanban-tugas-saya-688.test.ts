/** @jest-environment jsdom */
/**
 * #688 — "My Tasks" di Papan dihitung di SATU titik.
 *
 * Kenyataan yang diuji di sini: `useBoard` menurunkan `epics`,
 * `standaloneTasks`, `groupedTasks`, dan kepala kolom dari `tArr`. Kalau
 * penyaringannya ditaruh di komponen (hanya di kolom), epics dan penghitung di
 * kepala kolom tetap menampilkan pekerjaan orang lain sementara kartunya hilang
 * — angka tidak cocok isi, cacat yang sudah pernah dilaporkan untuk Dashboard
 * (#112, #129). Test ini memasang penyaringan di hulu, jadi semua turunan
 * wajib ikut.
 *
 * Identitas masuk lewat `props.user`. `useAuth()` TIDAK dipakai di sini: ia
 * bukan context, dan instansiasi keduanya kosong (`src/hooks/useAuth.ts:101`).
 */
import { renderHook } from "@testing-library/react";
import { useBoard } from "./hooks/useKanbanLogic";
import { useProjectStore } from "../../store/stores";
import type { MasterData, Task, UserProfile } from "../../types";

const status = (kode: string, label: string, order: number): MasterData =>
  ({ id: kode, type: "status", code: kode, label, order }) as MasterData;

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Task ${id}`,
    type: "task",
    status: "To Do",
    priority: "Medium",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const MILIKKU = "uid-saya";
const MILIK_ORANG = "uid-orang";

const masterData: MasterData[] = [status("todo", "To Do", 1), status("doing", "In Progress", 2)];

const tasks: Task[] = [
  tugas("e-mine", { type: "epic", assigneeId: MILIKKU }),
  tugas("e-orang", { type: "epic", assigneeId: MILIK_ORANG }),
  tugas("t-mine", { parentId: "e-mine", assigneeId: MILIKKU }),
  tugas("t-orang", { parentId: "e-orang", assigneeId: MILIK_ORANG }),
  tugas("t-multi", { parentId: "e-orang", assignees: [MILIK_ORANG, MILIKKU] }),
];

const props = {
  tasks,
  masterData,
  projectMembers: [
    { uid: MILIKKU, displayName: "Saya" },
    { uid: MILIK_ORANG, displayName: "Rina" },
  ],
  userRole: "user",
  user: { uid: MILIKKU, id: MILIKKU, email: "saya@contoh.test" } as UserProfile,
  selectedProject: { id: "p1" },
  setSelectedTaskForDetail: () => {},
  setIsTaskDetailModalOpen: () => {},
};

const setLingkup = (nilai: "all" | "mine") => useProjectStore.getState().setLingkupTugas(nilai);

describe("#688 lingkup tugas di Papan", () => {
  beforeEach(() => setLingkup("all"));

  it("all menampilkan semua epic dan semua kartu", () => {
    const { result } = renderHook(() => useBoard(props as any, "epic"));
    expect(result.current.tArr).toHaveLength(5);
    expect(result.current.epics.map((e: Task) => e.id).sort()).toEqual(["e-mine", "e-orang"]);
  });

  it("mine membuang epic dan kartu orang lain dari SEMUA turunan", () => {
    setLingkup("mine");
    const { result } = renderHook(() => useBoard(props as any, "epic"));

    expect(result.current.tArr.map((t) => t.id).sort()).toEqual(["e-mine", "t-mine", "t-multi"]);
    // Epics ikut tersaring — bukan hanya kartunya.
    expect(result.current.epics.map((e: Task) => e.id)).toEqual(["e-mine"]);
    // Multi-assignee tetap milik saya walau epic induknya milik orang lain.
    expect(result.current.tArr.map((t) => t.id)).toContain("t-multi");
    // groupedTasks dibangun dari tArr, jadi kolom tidak bisa kebagian tugas orang.
    const groupId = Object.keys(result.current.groupedTasks || {});
    const semuaYangDikelompokkan = groupId.flatMap((k) =>
      (result.current.groupedTasks as any)[k].map((t: Task) => t.id)
    );
    expect(semuaYangDikelompokkan).not.toContain("t-orang");
    expect(semuaYangDikelompokkan).not.toContain("e-orang");
  });

  it("mine tanpa pengguna login mengosongkan papan, bukan menunjukkannya semua", () => {
    setLingkup("mine");
    const { result } = renderHook(() => useBoard({ ...props, user: null } as any, "epic"));
    expect(result.current.tArr).toEqual([]);
    expect(result.current.epics).toEqual([]);
  });

  it("penugasan lewat email dikenali walau assigneeId kosong", () => {
    setLingkup("mine");
    const { result } = renderHook(() =>
      useBoard(
        {
          ...props,
          tasks: [...tasks, tugas("t-email", { assigneeEmail: "saya@contoh.test" })],
        } as any,
        "epic"
      )
    );
    expect(result.current.tArr.map((t) => t.id)).toContain("t-email");
  });
});
