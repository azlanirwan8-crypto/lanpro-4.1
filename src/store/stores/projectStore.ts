import { create } from "zustand";
import type { LingkupTugas } from "../../lib/tugasSaya";

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
    }),
}));
