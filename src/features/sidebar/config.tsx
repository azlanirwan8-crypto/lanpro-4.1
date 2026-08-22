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
    title: "Menu",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        module: "dashboard",
      },
    ],
  },
  {
    id: "collaboration",
    title: "Kolaborasi",
    items: [
      {
        id: "meetingNotes",
        label: "Catatan Rapat",
        icon: <Video className="w-4 h-4" />,
        module: "meetingNotes",
      },
      {
        id: "wiki",
        label: "Dokumentasi",
        icon: <Book className="w-4 h-4" />,
        module: "wiki",
      },
      {
        id: "flowchart",
        label: "Editor Diagram Alur",
        icon: <Workflow className="w-4 h-4" />,
        module: "flowchartEditor",
        badge: "Baru",
        badgeColor: "emerald",
      },
    ],
  },
  {
    id: "projects",
    title: "Manajemen Proyek",
    items: [
      {
        id: "list",
        label: "Daftar Isu",
        icon: <ListTodo className="w-4 h-4" />,
        module: "list",
      },
      {
        id: "sprints",
        label: "Perencanaan & Sprint",
        icon: <Target className="w-4 h-4" />,
        module: "sprints",
      },
      {
        id: "board",
        label: "Papan Kanban",
        icon: <Trello className="w-4 h-4" />,
        module: "board",
      },
      {
        id: "qa",
        label: "Penilaian Kualitas",
        icon: <Beaker className="w-4 h-4" />,
        module: "qa",
      },
      {
        id: "timeline",
        label: "Peta Jalan & Linimasa",
        icon: <Clock className="w-4 h-4" />,
        module: "timeline",
      },
      {
        id: "team",
        label: "Tim",
        icon: <Users className="w-4 h-4" />,
        module: "access",
      },
    ],
  },
  {
    id: "administration",
    title: "Administrasi",
    items: [
      {
        id: "master",
        label: "Master Data",
        icon: <Database className="w-4 h-4" />,
        module: "masterData",
      },
      {
        id: "users",
        label: "Manajemen Pengguna",
        icon: <UserCog className="w-4 h-4" />,
        module: "userManagement",
      },
      {
        id: "auditLog",
        label: "Audit Perusahaan",
        icon: <History className="w-4 h-4" />,
        module: "auditLog",
      },
      {
        id: "dbExplorer",
        label: "Penjelajah Basis Data",
        icon: <Database className="w-4 h-4" />,
        module: "dbExplorer",
      },
      {
        id: "settingsIntegration",
        label: "Pengaturan Integrasi",
        icon: <Settings2 className="w-4 h-4" />,
        module: "settings",
      },
    ],
  },
];
