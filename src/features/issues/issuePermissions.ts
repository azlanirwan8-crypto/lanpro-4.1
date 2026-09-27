/**
 * Item #200/#201 — Assignee/manage: Admin/Manager/Head atau Reporter task;
 * Assignee (bukan reporter) hanya edit field lain di task yang diberikan.
 *
 * Item #482 — field Reporter: hanya Administrator SISTEM (`Users.role ===
 * admin`), bukan project admin/manager/head/reporter.
 *
 * Item #483 — Hapus issue (keputusan pemilik): Administrator sistem = full
 * akses; user non-admin = ikut checklist `list.delete` di Users.permissions
 * (Issue Management). Jangan memakai `effectiveRole` proyek untuk gerbang
 * Hapus — project admin dengan role sistem `user` harus ikut checklist,
 * sama seperti API `checkUserPermissionBackend`.
 *
 * Ditulis sebagai modul murni terpisah supaya bisa diuji tanpa React.
 */

import { Task, UserProfile, PeranEfektif } from "../../types";
import { normalkanPeran } from "../../types/roles";

export interface IssuePermissionContext {
  userRole?: PeranEfektif | string | null;
  currentUserProfile?: UserProfile | null;
  user?: any;
  hasPermission: (
    userRole: any,
    module: string,
    action: string,
    isOwner: boolean,
    customPermissions?: any
  ) => boolean;
}

const LEAD_ROLES = ["admin", "manager", "head"];

function currentUserIdOf(ctx: IssuePermissionContext): string | undefined {
  return (
    ctx.currentUserProfile?.uid ||
    ctx.currentUserProfile?.id ||
    ctx.user?.uid ||
    ctx.user?.id ||
    undefined
  );
}

/** Peran SISTEM dari profil Users — jangan pakai effectiveRole proyek. */
function systemRoleOf(ctx: IssuePermissionContext): string {
  return normalkanPeran(ctx.currentUserProfile?.role ?? ctx.user?.role ?? null);
}

export function isUserReporter(
  issue: Task | null | undefined,
  ctx: IssuePermissionContext
): boolean {
  if (!issue) return false;
  const currentUserId = currentUserIdOf(ctx);
  const currentUsername = ctx.currentUserProfile?.username || ctx.user?.username;
  const currentEmail = ctx.currentUserProfile?.email || ctx.user?.email;
  const rId = issue.reporterId;
  return (
    !!currentUserId &&
    (rId === currentUserId ||
      rId === currentUsername ||
      rId === currentEmail ||
      rId === ctx.currentUserProfile?.id)
  );
}

export function isUserAssignee(
  issue: Task | null | undefined,
  ctx: IssuePermissionContext
): boolean {
  if (!issue) return false;
  const currentUserId = currentUserIdOf(ctx);
  if (!currentUserId) return false;
  if (issue.assigneeId && issue.assigneeId === currentUserId) return true;
  if (Array.isArray((issue as any).assignees) && (issue as any).assignees.includes(currentUserId)) {
    return true;
  }
  return false;
}

function isLeadOrAdmin(ctx: IssuePermissionContext): boolean {
  return LEAD_ROLES.includes(String(ctx.userRole || ""));
}

/** Delete, dan field Assignee (melimpahkan tanggung jawab). Reporter → #482. */
export function canManageIssue(
  issue: Task | null | undefined,
  ctx: IssuePermissionContext
): boolean {
  if (!issue) return false;
  return isLeadOrAdmin(ctx) || isUserReporter(issue, ctx);
}

/**
 * #482 — ubah Reporter hanya Administrator sistem (`Users.role === admin`).
 * Project admin / manager / head / reporter TIDAK boleh.
 */
export function canChangeReporter(
  issue: Task | null | undefined,
  ctx: IssuePermissionContext
): boolean {
  if (!issue) return false;
  return systemRoleOf(ctx) === "admin";
}

/** Field lain (Status, Priority, dst.) — tambah Assignee task ini sendiri. */
export function canEditIssue(issue: Task | null | undefined, ctx: IssuePermissionContext): boolean {
  if (!issue) return false;
  return canManageIssue(issue, ctx) || isUserAssignee(issue, ctx);
}

/**
 * #483 — Hapus: Administrator sistem selalu boleh; selain itu HANYA checklist
 * `list.delete` (Users.permissions). Peran proyek TIDAK membuka tombol.
 * Memakai `systemRoleOf` saat memanggil `hasPermission` supaya project
 * `admin` tidak kena short-circuit God Mode di permissions.ts.
 */
export function canDeleteIssue(
  issue: Task | null | undefined,
  ctx: IssuePermissionContext
): boolean {
  if (!issue) return false;
  if (systemRoleOf(ctx) === "admin") return true;
  const custom = ctx.currentUserProfile?.permissions ?? ctx.user?.permissions ?? undefined;
  const allowed = ctx.hasPermission(
    (systemRoleOf(ctx) || "user") as any,
    "list",
    "delete",
    false,
    custom
  );
  return Boolean(allowed);
}
