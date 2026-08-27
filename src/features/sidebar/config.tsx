import React from "react";
import {
  LayoutDashboard,
  ListTodo,
  Target,
  Video,
  Book,
  Trello,
  Clock,
  Users,
  Database,
  History,
  UserCog,
  Workflow,
  Beaker,
  Settings2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export interface SidebarSubItemConfig {
  id: string;
  label: string;
  module: string;
}

export interface SidebarItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  module: string;
  action?: "read" | "create" | "update" | "delete";
  /**
   * Menu ini TIDAK bisa menampilkan apa pun tanpa proyek terpilih — item #160.
   *
   * Bukan soal izin melainkan soal render: `AppContainer` menahan `AppRoutes`
   * di balik `selectedProject`, jadi tanpa proyek tombolnya menghasilkan layar
   * kosong. Hanya `users` dan `master` yang punya cabang SENDIRI di atas
   * penjaga itu, karena itu keduanya tetap hidup.
   */
  butuhProyek?: boolean;
  /**
   * Tetap ditampilkan walau `projects.length === 0` — revisi #160.
   *
   * Hanya untuk `dashboard`. Ia memang berada di balik penjaga
   * `selectedProject`, tetapi tanpa proyek ia mendarat di layar sambutan, jadi
   * tombolnya TIDAK buntu. Disisakan supaya navigasi tidak pernah benar-benar
   * kosong: pengguna yang kehilangan seluruh menu kehilangan juga jawaban atas
   * "aplikasi ini apa dan saya sedang di mana".
   */
  tetapTampil?: boolean;
  badge?: string;
  badgeColor?: "orange" | "emerald" | "blue" | "purple";
  children?: SidebarSubItemConfig[];
}

export interface SidebarSectionConfig {
  id: string;
  title: string;
  items: SidebarItemConfig[];
}

export const sidebarSections: SidebarSectionConfig[] = [
  {
    id: "menu",
    title: "sidebar.menu",
    items: [
      {
        id: "dashboard",
        label: "sidebar.dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        butuhProyek: true,
        tetapTampil: true,
        module: "dashboard",
      },
    ],
  },
  {
    id: "collaboration",
    title: "sidebar.collaboration",
    items: [
      {
        id: "meetingNotes",
        label: "sidebar.meetingNotes",
        icon: <Video className="w-4 h-4" />,
        butuhProyek: true,
        module: "meetingNotes",
      },
      {
        id: "wiki",
        label: "sidebar.documentation",
        icon: <Book className="w-4 h-4" />,
        butuhProyek: true,
        module: "wiki",
      },
      {
        id: "flowchart",
        label: "sidebar.flowchartEditor",
        icon: <Workflow className="w-4 h-4" />,
        butuhProyek: true,
        module: "flowchartEditor",
        badge: "sidebar.badgeNew",
        badgeColor: "emerald",
      },
    ],
  },
  {
    id: "projects",
    title: "sidebar.projectManagement",
    items: [
      {
        id: "list",
        label: "sidebar.issueList",
        icon: <ListTodo className="w-4 h-4" />,
        butuhProyek: true,
        module: "list",
      },
      {
        id: "sprints",
        label: "sidebar.planningSprint",
        icon: <Target className="w-4 h-4" />,
        butuhProyek: true,
        module: "sprints",
      },
      {
        id: "board",
        label: "sidebar.kanbanBoard",
        icon: <Trello className="w-4 h-4" />,
        butuhProyek: true,
        module: "board",
      },
      {
        id: "qa",
        label: "sidebar.qualityAssessment",
        icon: <Beaker className="w-4 h-4" />,
        butuhProyek: true,
        module: "qa",
      },
      {
        id: "timeline",
        label: "sidebar.roadmapTimeline",
        icon: <Clock className="w-4 h-4" />,
        butuhProyek: true,
        module: "timeline",
      },
      {
        id: "team",
        label: "sidebar.team",
        icon: <Users className="w-4 h-4" />,
        butuhProyek: true,
        module: "access",
      },
    ],
  },
  {
    id: "administration",
    title: "sidebar.administration",
    items: [
      {
        id: "master",
        label: "sidebar.masterData",
        icon: <Database className="w-4 h-4" />,
        module: "masterData",
      },
      {
        id: "users",
        label: "sidebar.userManagement",
        icon: <UserCog className="w-4 h-4" />,
        module: "userManagement",
      },
      {
        id: "userSessions",
        label: "sidebar.userSessions",
        icon: <ShieldCheck className="w-4 h-4" />,
        module: "userManagement",
      },
      {
        id: "auditLog",
        label: "sidebar.enterpriseAudit",
        icon: <History className="w-4 h-4" />,
        butuhProyek: true,
        module: "auditLog",
      },
      {
        id: "dbExplorer",
        label: "sidebar.dbExplorer",
        icon: <Database className="w-4 h-4" />,
        butuhProyek: true,
        module: "dbExplorer",
      },
      {
        id: "settingsIntegration",
        label: "sidebar.settingIntegration",
        icon: <Settings2 className="w-4 h-4" />,
        butuhProyek: true,
        module: "settings",
      },
    ],
  },
];
