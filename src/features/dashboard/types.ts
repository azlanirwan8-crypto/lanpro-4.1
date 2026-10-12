import { Task, Sprint, UserProfile, ActivityLog, Project, MasterData } from "../../types";

export interface DashboardViewProps {
  tasks: Task[];
  sprints: Sprint[];
  projectMembers: UserProfile[];
  activityLogs: ActivityLog[];
  selectedProject: Project | null;
  setCurrentView: (view: any) => void;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (isOpen: boolean) => void;
  userRole?: string | null;
  currentUser?: UserProfile | null;
  fetchTasks?: () => Promise<void>;
  masterData?: MasterData[];
  /**
   * #694 (A') — feed yang sudah disaring ruang lingkup tugas tapi BELUM disaring
   * sprint. Dua panel memang tidak bisa ikut tersaring: riwayat velocity butuh
   * lima sprint sekaligus, dan burndown/Ringkasan Sprint butuh tugas sprint yang
   * DITUNJUK, bukan tugas sprint yang dipilih. Tanpa feed kedua ini, memilih
   * satu sprint membuat velocity runtuh jadi satu batang dan burndown kosong.
   * Bila tidak diisi, pemakainya jatuh ke `props.tasks`.
   */
  tasksSemuaSprint?: Task[];
  /** Id sprint yang dipilih di header; `null`/`"ALL"` berarti seluruh sprint. */
  sprintIdTerpilih?: string | null;
}
