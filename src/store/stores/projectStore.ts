import { create } from "zustand";
import type { LingkupTugas } from "../../lib/tugasSaya";

/**
 * #689 butir (d) — status permintaan daftar isu berhalaman.
 *
 * `fetchTasks` di `AppContainer` menelan galatnya sendiri (`catch` isi `console`
 * saja), jadi halaman yang gagal dimuat tampak seperti daftar yang masih punya
 * baris — pengguna tidak tahu yang ditampilkan adalah data basi, dan tidak punya
 * jalan untuk mengulang. Store dipilih alih-alih prop karena nilainya dimiliki
 * `AppContainer` sementara yang menampilkannya ada di tiga lapis di bawahnya.
 */
export type KeadaanMuatDaftarIsu = "diam" | "memuat" | "galat";

interface ProjectState {
  // Current selections
  selectedProject: any;
  selectedProjectId: string | null;

  // Lists
  projects: any[];
  tasks: any[];
  sprints: any[];
  projectMembers: any[];
  activityLogs: any[];
  masterData: any[];
  allUsers: any[];

  // Task filtering
  taskFilters: Record<string, any>;
  selectedTasks: string[];
  /**
   * #688 — "All Tasks" / "My Tasks" SATU kali untuk seluruh modul.
   * Default aman `all`; dikunci oleh definisi di `src/lib/tugasSaya.ts`.
   */
  lingkupTugas: LingkupTugas;

  /** #689 (d) — lihat `KeadaanMuatDaftarIsu`. Dibaca Issue List (#689) dan
   *  Dashboard (#693); keduanya menampilkan penanda apa adanya, jadi permintaan
   *  berhalaman dari satu layar ikut terasa di layar lain sampai itu diukur. */
  muatDaftarIsu: KeadaanMuatDaftarIsu;

  // Actions
  setSelectedProject: (project: any) => void;
  setSelectedProjectId: (id: string | null) => void;
  setProjects: (projects: any[]) => void;
  setTasks: (tasks: any[]) => void;
  setSprints: (sprints: any[]) => void;
  setProjectMembers: (members: any[]) => void;
  setActivityLogs: (logs: any[]) => void;
  setMasterData: (data: any[]) => void;
  setAllUsers: (users: any[]) => void;

  // Filter actions
  setTaskFilters: (filters: Record<string, any>) => void;
  setLingkupTugas: (lingkup: LingkupTugas) => void;
  setMuatDaftarIsu: (keadaan: KeadaanMuatDaftarIsu) => void;

  setSelectedTasks: (tasks: string[]) => void;
  toggleTaskSelection: (taskId: string) => void;

  // Bulk actions
  clearProjectData: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Initial state
  selectedProject: null,
  selectedProjectId: null,
  projects: [],
  tasks: [],
  sprints: [],
  projectMembers: [],
  activityLogs: [],
  masterData: [],
  allUsers: [],
  taskFilters: {},
  selectedTasks: [],
  lingkupTugas: "all",
  muatDaftarIsu: "diam",

  // Selection actions
  setSelectedProject: (project) =>
    set({ selectedProject: project, selectedProjectId: project?.id }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  // List actions
  setProjects: (projects) => set({ projects }),
  setTasks: (tasks) => set({ tasks }),
  setSprints: (sprints) => set({ sprints }),
  setProjectMembers: (members) => set({ projectMembers: members }),
  setActivityLogs: (logs) => set({ activityLogs: logs }),
  setMasterData: (data) => set({ masterData: data }),
  setAllUsers: (users) => set({ allUsers: users }),

  // Filter actions
  setTaskFilters: (filters) => set({ taskFilters: filters }),
  setLingkupTugas: (lingkup) => set({ lingkupTugas: lingkup }),
  setMuatDaftarIsu: (keadaan) => set({ muatDaftarIsu: keadaan }),
  setSelectedTasks: (tasks) => set({ selectedTasks: tasks }),
  toggleTaskSelection: (taskId) =>
    set((state) => ({
      selectedTasks: state.selectedTasks.includes(taskId)
        ? state.selectedTasks.filter((id) => id !== taskId)
        : [...state.selectedTasks, taskId],
    })),

  // Bulk clear
  clearProjectData: () =>
    set({
      selectedProject: null,
      selectedProjectId: null,
      projects: [],
      tasks: [],
      sprints: [],
      projectMembers: [],
      activityLogs: [],
      masterData: [],
      taskFilters: {},
      selectedTasks: [],
      // #688 — kembali ke default aman "all": pengguna tidak seharusnya berpindah
      // proyek lalu mendapati daftar kosong tanpa tahu filter masih "mine".
      lingkupTugas: "all",
      // #689 (d) — galat dari proyek sebelumnya tidak boleh ikut ke proyek baru.
      muatDaftarIsu: "diam",
    }),
}));
