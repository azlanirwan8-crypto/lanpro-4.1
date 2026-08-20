import type { SystemRole, PeranWarisan } from "./roles";

export type { SystemRole, ProjectRole, PeranWarisan, PeranEfektif } from "./roles";

/**
 * Peran SISTEM seorang pengguna — isi kolom `Users.role`. §19.4
 *
 * Dulu ditutup dengan `| string`, yang membuat SETIAP string lolos sebagai
 * peran dan karena itu membuat 11 nama peran hantu (§19.2) tak terdeteksi
 * kompilator selamanya. Penutup itu DICABUT (§19.8 tahap 1).
 *
 * `PeranWarisan` sengaja masih ikut: nilai lama itu benar-benar ada di database
 * dan di penjaga rute, jadi menghapusnya dari tipe hanya akan memindahkan
 * kebohongan ke `as any`. Ia terdaftar supaya bisa dihitung dan dihabiskan —
 * lihat `src/types/roles.ts`.
 *
 * Peran PROYEK adalah kosakata TERPISAH (`ProjectRole`), bukan tipe ini.
 * Alasannya ada di kepala `roles.ts`: kode `admin` berarti dua hal berbeda di
 * dua lingkup, dan salah satunya memicu God Mode.
 */
export type AppRole = SystemRole | PeranWarisan;

export interface ModulePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface UserPermissions {
  dashboard?: ModulePermission;
  meetingNotes?: ModulePermission;
  wiki?: ModulePermission;
  list?: ModulePermission;
  sprints?: ModulePermission;
  board?: ModulePermission;
  timeline?: ModulePermission;
  access?: ModulePermission;
  flowchart?: ModulePermission;
  qa?: ModulePermission;
  userManagement?: ModulePermission;
  masterData?: ModulePermission;
  auditLog?: ModulePermission;
  dbExplorer?: ModulePermission;
  settings?: ModulePermission;

  // New unified keys
  flowchartEditor?: ModulePermission;
  issueList?: ModulePermission;
  planning?: ModulePermission;
  kanban?: ModulePermission;
  qaTesting?: ModulePermission;
  roadmap?: ModulePermission;
  team?: ModulePermission;
  auditLogs?: ModulePermission;
  configuration?: ModulePermission;
}

export interface UserProfile {
  id: string;
  uid: string;
  username: string;
  lastSeen?: string;
  name?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  avatar_url?: string;
  avatarUrl?: string;
  avatar?: string;
  phone?: string;
  position?: string;
  department?: string;
  status: "pending" | "approved" | "rejected";
  role: AppRole;
  permissions?: Partial<UserPermissions>;
  passwordHash: string;
}

export type User = UserProfile;
