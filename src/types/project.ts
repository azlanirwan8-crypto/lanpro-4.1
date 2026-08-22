export interface Project {
  id: string;
  name: string;
  key: string; // e.g. "KAN"
  description?: string;
  ownerId: string;
  /**
   * Metodologi proyek (Agile, Scrum, ...). Bersumber dari MasterData bertipe
   * `methodology`. Namanya `category` karena itu nama kolomnya di tabel
   * Projects; isinya metodologi, bukan kategori tugas.
   */
  category?: string;
  /**
   * Item #138 — nilainya berasal dari MasterData bertipe `project_status`,
   * jadi tidak boleh dikunci sebagai union. Union lamanya
   * ('Active' | 'On Hold' | 'Completed' | 'Archived') adalah salinan kedua
   * dari daftar keras di EditProjectModal, dan ia menolak `Planning` serta
   * `Cancelled` yang sudah ada di MasterData.
   */
  status?: string;
  members: string[]; // Keep this for querying
  memberRoles: Record<string, string>;
  pendingInvites?: string[]; // Emails of invited users who haven't registered
  dashboardLayout?: any;
  dashboard_layout?: any;
  createdAt: any;
  taskCounter: number; // To generate sequential keys like KAN-1, KAN-2
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: any;
  endDate: any;
  status: "planned" | "active" | "completed";
  createdAt: any;
}
