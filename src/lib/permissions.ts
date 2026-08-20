import { UserPermissions, ModulePermission, PeranEfektif } from "../types";
import { normalkanPeran } from "../types/roles";
import {
  bolehDiProyek,
  bolehDiSistem,
  punyaGodMode,
  type ModulProyek,
  type ModulSistem,
  type Aksi,
} from "./matriksAkses";

const FULL_ACCESS: ModulePermission = { create: true, read: true, update: true, delete: true };
const CRU_ACCESS: ModulePermission = { create: true, read: true, update: true, delete: false };
const RU_ACCESS: ModulePermission = { create: false, read: true, update: true, delete: false };
const READ_ONLY: ModulePermission = { create: false, read: true, update: false, delete: false };
const NO_ACCESS: ModulePermission = { create: false, read: false, update: false, delete: false };

/**
 * Izin bawaan per peran — diselaraskan penuh dengan MATRIKS_PROYEK dan MATRIKS_SISTEM (§19.4 & §19.5).
 */
export const DEFAULT_PERMISSIONS: Partial<Record<PeranEfektif, UserPermissions>> = {
  owner: {
    dashboard: READ_ONLY,
    access: FULL_ACCESS,
    list: FULL_ACCESS,
    board: FULL_ACCESS,
    sprints: FULL_ACCESS,
    timeline: FULL_ACCESS,
    wiki: FULL_ACCESS,
    flowchart: FULL_ACCESS,
    meetingNotes: FULL_ACCESS,
    qa: FULL_ACCESS,
    notebooklm: FULL_ACCESS,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
  },
  admin: {
    dashboard: FULL_ACCESS,
    meetingNotes: FULL_ACCESS,
    wiki: FULL_ACCESS,
    notebooklm: FULL_ACCESS,
    list: FULL_ACCESS,
    sprints: FULL_ACCESS,
    board: FULL_ACCESS,
    qa: FULL_ACCESS,
    timeline: FULL_ACCESS,
    access: FULL_ACCESS,
    userManagement: FULL_ACCESS,
    masterData: FULL_ACCESS,
    auditLog: FULL_ACCESS,
    dbExplorer: FULL_ACCESS,
    settings: FULL_ACCESS,
    flowchart: FULL_ACCESS,
  },
  manager: {
    dashboard: READ_ONLY,
    meetingNotes: FULL_ACCESS,
    wiki: FULL_ACCESS,
    notebooklm: FULL_ACCESS,
    list: FULL_ACCESS,
    sprints: FULL_ACCESS,
    board: FULL_ACCESS,
    qa: FULL_ACCESS,
    timeline: FULL_ACCESS,
    access: RU_ACCESS,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
    flowchart: FULL_ACCESS,
  },
  system_analyst: {
    dashboard: READ_ONLY,
    access: READ_ONLY,
    list: CRU_ACCESS,
    board: RU_ACCESS,
    sprints: READ_ONLY,
    timeline: READ_ONLY,
    wiki: FULL_ACCESS,
    flowchart: FULL_ACCESS,
    meetingNotes: CRU_ACCESS,
    qa: RU_ACCESS,
    notebooklm: CRU_ACCESS,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
  },
  business_analyst: {
    dashboard: READ_ONLY,
    access: READ_ONLY,
    list: CRU_ACCESS,
    board: RU_ACCESS,
    sprints: READ_ONLY,
    timeline: READ_ONLY,
    wiki: CRU_ACCESS,
    flowchart: CRU_ACCESS,
    meetingNotes: FULL_ACCESS,
    qa: RU_ACCESS,
    notebooklm: CRU_ACCESS,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
  },
  developer: {
    dashboard: READ_ONLY,
    access: READ_ONLY,
    list: CRU_ACCESS,
    board: RU_ACCESS,
    sprints: READ_ONLY,
    timeline: READ_ONLY,
    wiki: READ_ONLY,
    flowchart: READ_ONLY,
    meetingNotes: READ_ONLY,
    qa: RU_ACCESS,
    notebooklm: READ_ONLY,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
  },
  qa: {
    dashboard: READ_ONLY,
    access: READ_ONLY,
    list: CRU_ACCESS,
    board: RU_ACCESS,
    sprints: READ_ONLY,
    timeline: READ_ONLY,
    wiki: READ_ONLY,
    flowchart: READ_ONLY,
    meetingNotes: CRU_ACCESS,
    qa: FULL_ACCESS,
    notebooklm: READ_ONLY,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
  },
  user: {
    dashboard: READ_ONLY,
    meetingNotes: CRU_ACCESS,
    wiki: READ_ONLY,
    notebooklm: CRU_ACCESS,
    list: CRU_ACCESS,
    sprints: READ_ONLY,
    board: RU_ACCESS,
    qa: READ_ONLY,
    timeline: READ_ONLY,
    access: NO_ACCESS,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
    flowchart: READ_ONLY,
  },
  head: {
    dashboard: READ_ONLY,
    access: READ_ONLY,
    list: READ_ONLY,
    board: READ_ONLY,
    sprints: READ_ONLY,
    timeline: READ_ONLY,
    wiki: READ_ONLY,
    flowchart: READ_ONLY,
    meetingNotes: READ_ONLY,
    qa: READ_ONLY,
    notebooklm: READ_ONLY,
    userManagement: READ_ONLY,
    masterData: READ_ONLY,
    auditLog: READ_ONLY,
    dbExplorer: NO_ACCESS,
    settings: READ_ONLY,
  },
  viewer: {
    dashboard: READ_ONLY,
    meetingNotes: READ_ONLY,
    wiki: READ_ONLY,
    notebooklm: READ_ONLY,
    list: READ_ONLY,
    sprints: READ_ONLY,
    board: READ_ONLY,
    qa: READ_ONLY,
    timeline: READ_ONLY,
    access: READ_ONLY,
    userManagement: NO_ACCESS,
    masterData: NO_ACCESS,
    auditLog: NO_ACCESS,
    dbExplorer: NO_ACCESS,
    settings: NO_ACCESS,
    flowchart: READ_ONLY,
  },
};

export const KEY_MAP: Record<string, string> = {
  flowchartEditor: "flowchart",
  issueList: "list",
  issues: "list",
  Kanban: "board",
  kanban: "board",
  planning: "sprints",
  qaTesting: "qa",
  roadmap: "timeline",
  team: "access",
  users: "userManagement",
  master: "masterData",
  explorer: "dbExplorer",
  "enterprise-audit": "auditLog",
  auditLogs: "auditLog",
  configuration: "masterData",
  "meeting-notes": "meetingNotes",
  "notebook-lm": "notebooklm",
};

export function normalizeModuleKey(key: string): string {
  return KEY_MAP[key] || key;
}

export function cleanUserPermissions(custom: any): any {
  if (!custom) return {};
  let parsedCustom = custom;
  if (typeof custom === "string") {
    try {
      parsedCustom = JSON.parse(custom);
    } catch {
      return {};
    }
  }
  if (!parsedCustom || typeof parsedCustom !== "object") return {};
  const cleaned: any = {};
  const adminPerms = DEFAULT_PERMISSIONS.admin || (DEFAULT_PERMISSIONS.owner as UserPermissions);
  Object.keys(parsedCustom).forEach((key) => {
    const normKey = KEY_MAP[key] || key;
    if (adminPerms && adminPerms[normKey as keyof UserPermissions] !== undefined) {
      if (key !== normKey && parsedCustom[normKey] !== undefined) {
        return;
      }
      cleaned[normKey] = parsedCustom[key];
    }
  });
  return cleaned;
}

export function getUserPermissions(
  role: PeranEfektif,
  custom?: Partial<UserPermissions>
): UserPermissions {
  // Sengaja `string`, bukan tipe peran: `administrator` dan `superadmin` BUKAN
  // peran yang sah di katalog mana pun (§19.2 mengukur nol baris data untuk
  // keduanya). Perbandingannya dipertahankan sebagai jaring pengaman terhadap
  // data lama, tetapi tipenya tidak boleh berpura-pura keduanya sah.
  const normRole: string = normalkanPeran(role) || "viewer";
  const isAdmin = normRole === "admin" || normRole === "administrator" || normRole === "superadmin";
  if (isAdmin) {
    return DEFAULT_PERMISSIONS.admin || (DEFAULT_PERMISSIONS.owner as UserPermissions);
  }

  const defaults = DEFAULT_PERMISSIONS[normRole as PeranEfektif] || DEFAULT_PERMISSIONS.viewer || (DEFAULT_PERMISSIONS.owner as UserPermissions);

  // Deep copy and normalize defaults
  const merged: any = {};
  Object.keys(defaults).forEach((key) => {
    const normKey = KEY_MAP[key] || key;
    merged[normKey] = { ...defaults[key as keyof UserPermissions] };
  });

  let parsedCustom: any = custom;
  if (typeof custom === "string") {
    try {
      parsedCustom = JSON.parse(custom);
    } catch {
      parsedCustom = {};
    }
  }

  if (parsedCustom && typeof parsedCustom === "object") {
    Object.keys(parsedCustom).forEach((key) => {
      const normKey = KEY_MAP[key] || key;
      const customVal = parsedCustom[key as keyof UserPermissions];
      if (customVal) {
        let valToMerge: ModulePermission;
        if (typeof customVal === "string") {
          // Handle legacy data
          if (customVal === "full") valToMerge = FULL_ACCESS;
          else if (customVal === "view") valToMerge = READ_ONLY;
          else valToMerge = NO_ACCESS;
        } else {
          valToMerge = { ...customVal };
        }

        // Check if this key is a deprecated key, and if the standard normalized key exists as a sibling in custom
        if (key !== normKey && parsedCustom[normKey as keyof UserPermissions] !== undefined) {
          // Do not merge this deprecated key! The standard key has higher priority.
          return;
        }

        merged[normKey] = {
          ...(merged[normKey] || NO_ACCESS),
          ...valToMerge,
        };
      }
    });
  }
  return merged as UserPermissions;
}

export function hasPermission(
  userRole: PeranEfektif,
  module: keyof UserPermissions | string,
  action: "create" | "read" | "update" | "delete" | string,
  isOwner: boolean = false,
  customPermissions?: Partial<UserPermissions>
): boolean {
  // Lihat catatan tipe `string` di getUserPermissions.
  const normRole: string = normalkanPeran(userRole) || "viewer";
  const isAdmin = normRole === "admin" || normRole === "administrator" || normRole === "superadmin";
  if (isAdmin) {
    return true;
  }

  const normModule = (KEY_MAP[module as string] || module) as keyof UserPermissions;

  // Normalize action: map add -> create
  let normalizedAction = action.toLowerCase();
  if (normalizedAction === "add") normalizedAction = "create";

  // Validate action
  if (!["create", "read", "update", "delete"].includes(normalizedAction)) {
    console.warn(`[PERM_MISMATCH] Module: ${module}, Invalid Action: ${action}`);
    return false;
  }

  const actionKey = normalizedAction as "create" | "read" | "update" | "delete";

  const perms = getUserPermissions(userRole, customPermissions);
  const modulePerm = perms[normModule];

  const hasActionPerm = Boolean(modulePerm?.[actionKey]);

  // Logging if permission check fails in development
  if (!hasActionPerm) {
    console.warn(`[PERM_MISMATCH] Module: ${module}, Action: ${action} - Denied`);
  }

  // Owners have access if permission allows
  if (isOwner && actionKey !== "create" && hasActionPerm) {
    return true;
  }

  if (!hasActionPerm) {
    return false;
  }

  // Role-specific ownership logic (unless custom permissions explicitly grant access)
  // Managers bypass ownership checks for project-related modules unless overridden
  if (
    normRole === "manager" &&
    !customPermissions?.[normModule] &&
    ["list", "sprints", "board", "meetingNotes", "qa", "flowchart"].includes(normModule as string)
  ) {
    return true;
  }

  // General users can only update or delete data they own (Reporter or Assignee), unless custom permissions bypass it
  const isProjectModuleUpdate =
    actionKey === "update" && ["list", "board", "sprints", "qa"].includes(normModule as string);
  if (
    normRole === "user" &&
    (actionKey === "delete" || (actionKey === "update" && !isProjectModuleUpdate)) &&
    !isOwner
  ) {
    if (
      customPermissions &&
      (customPermissions[normModule] || customPermissions[module as keyof UserPermissions])
    ) {
      const customVal =
        customPermissions[normModule] || customPermissions[module as keyof UserPermissions];
      if (typeof customVal === "string") {
        if (customVal === "full") return true;
      } else {
        const hasCustomAction = Boolean((customVal as any)?.[actionKey]);
        if (hasCustomAction) {
          return true;
        }
      }
    }
    return false;
  }

  return true;
}

/**
 * Mengekstrak peran proyek dari pengguna di dalam konteks proyek. (§19.27 / #87)
 */
export function resolveProjectRole(user: any, project: any): string | null {
  if (!user || !project) return null;
  const userId = user.id || user.uid;
  if (!userId) return null;

  // Project Owner
  if (
    project.ownerId &&
    (String(project.ownerId) === String(user.id) || String(project.ownerId) === String(user.uid))
  ) {
    return "owner";
  }

  // Project Members lookup in memberRoles map
  if (project.memberRoles && typeof project.memberRoles === "object") {
    const role = project.memberRoles[user.id] || project.memberRoles[user.uid];
    if (role) return normalkanPeran(role);
  }

  // Project members array lookup
  if (Array.isArray(project.members)) {
    const member = project.members.find(
      (m: any) =>
        String(m.id || m.uid || m.userId) === String(user.id) ||
        String(m.id || m.uid || m.userId) === String(user.uid)
    );
    if (member && member.role) return normalkanPeran(member.role);
  }

  return null;
}

/**
 * Pemeriksa izin Two-Tier terpadu — membaca matriks terpusat yang sama dengan server. (§19.8 Tahap 5b)
 */
export function can(
  action: "create" | "read" | "update" | "delete" | Aksi | string,
  module: ModulProyek | ModulSistem | string,
  context?: {
    user?: any;
    project?: any;
    role?: PeranEfektif | string;
    isOwner?: boolean;
    customPermissions?: Partial<UserPermissions>;
  }
): boolean {
  const user = context?.user;
  const project = context?.project;
  const systemRole = user?.role || (typeof context?.role === "string" ? context.role : "user");

  // Global Administrator memiliki God Mode penuh
  if (punyaGodMode(systemRole)) return true;

  let normalizedAction = action.toUpperCase();
  if (normalizedAction === "ADD") normalizedAction = "CREATE";
  const actionLetter: Aksi =
    normalizedAction === "CREATE" || normalizedAction === "C"
      ? "C"
      : normalizedAction === "READ" || normalizedAction === "R"
      ? "R"
      : normalizedAction === "UPDATE" || normalizedAction === "U"
      ? "U"
      : normalizedAction === "DELETE" || normalizedAction === "D"
      ? "D"
      : "R";

  const normModule = normalizeModuleKey(module);

  // Modul Sistem (DI LUAR proyek)
  if (["userManagement", "masterData", "auditLog", "dbExplorer", "settings"].includes(normModule)) {
    return bolehDiSistem(systemRole, normModule, actionLetter);
  }

  // Modul Proyek (DI DALAM proyek)
  let projectRole: string | null = null;
  if (user && project) {
    projectRole = resolveProjectRole(user, project);
  } else if (context?.role) {
    projectRole = normalkanPeran(context.role);
  }

  if (projectRole) {
    return bolehDiProyek(projectRole, normModule, actionLetter);
  }

  return hasPermission(
    (context?.role || systemRole) as PeranEfektif,
    module,
    action,
    context?.isOwner,
    context?.customPermissions
  );
}
