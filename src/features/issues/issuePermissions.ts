import { Task, UserProfile, PeranEfektif } from "../../types";

/**
 * Item #200/#201 — aturan izin edit/hapus Daftar Isu, disepakati pemilik
 * proyek: Delete dan melimpahkan tanggung jawab (Assignee/Reporter) HANYA
 * boleh Admin/Manager/Head atau Reporter task itu; Assignee (bukan
 * reporter) HANYA boleh mengedit task yang DIBERIKAN ke mereka — tidak
 * boleh melimpahkannya ke orang lain atau menghapusnya.
 *
 * Ditulis sebagai modul murni terpisah (bukan closure di dalam komponen,
 * seperti sebelumnya) sebab logikanya sudah SEKALI salah diimplementasikan
 * (item #200 sempat memakai `hasPermission(userRole, "list", "update", ...)`
 * yang ternyata SELALU `true` untuk role "user" apa pun hubungannya dengan
 * task — lihat `src/lib/permissions.ts:365-372` — melanggar aturan di atas).
 * Fungsi murni di sini bisa diuji langsung tanpa me-mount komponen React.
 *
 * `canDeleteIssue` di sini SENGAJA tetap memakai `hasPermission()` (bukan
 * cuma role-list) supaya custom permission per-user (mis. admin memberi
 * akses delete eksplisit ke satu pengguna) tetap dihormati — pengecualian
 * "list"+update yang bermasalah TIDAK berlaku untuk actionKey "delete".
 */

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

/** Delete, dan field Assignee/Reporter (melimpahkan tanggung jawab). */
export function canManageIssue(
  issue: Task | null | undefined,
  ctx: IssuePermissionContext
): boolean {
  if (!issue) return false;
  return isLeadOrAdmin(ctx) || isUserReporter(issue, ctx);
}

/** Field lain (Status, Priority, dst.) — tambah Assignee task ini sendiri. */
export function canEditIssue(issue: Task | null | undefined, ctx: IssuePermissionContext): boolean {
  if (!issue) return false;
  return canManageIssue(issue, ctx) || isUserAssignee(issue, ctx);
}

export function canDeleteIssue(
  issue: Task | null | undefined,
  ctx: IssuePermissionContext
): boolean {
  if (!issue) return false;
  const isReporter = isUserReporter(issue, ctx);
  const hasRole = ctx.hasPermission(
    ctx.userRole,
    "list",
    "delete",
    isReporter,
    ctx.currentUserProfile?.permissions
  );
  return hasRole || isReporter || isLeadOrAdmin(ctx);
}
