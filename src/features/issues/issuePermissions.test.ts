/**
 * Item #200/#201 — mengunci aturan izin Daftar Isu yang disepakati pemilik
 * proyek: Delete + melimpahkan tanggung jawab (Assignee/Reporter) HANYA
 * Admin/Manager/Head atau Reporter; Assignee (bukan reporter) HANYA boleh
 * mengedit task yang diberikan ke mereka, TIDAK boleh melimpahkan/menghapus.
 *
 * Ditulis setelah #200 sempat SALAH mengimplementasikan ini lewat
 * `hasPermission(userRole, "list", "update", ...)` — fungsi itu ternyata
 * SELALU `true` untuk role "user" pada modul "list" (pengecualian sengaja
 * di `src/lib/permissions.ts:365-372`), jadi siapa pun bisa mengedit issue
 * siapa pun. Test ini memakai `hasPermission` PALSU yang selalu `true`
 * untuk membuktikan bug itu TIDAK BISA terulang — fungsi di sini tidak
 * boleh bergantung padanya sama sekali untuk keputusan izin.
 */
import { Task } from "../../types";
import {
  isUserReporter,
  isUserAssignee,
  canManageIssue,
  canEditIssue,
  canDeleteIssue,
  IssuePermissionContext,
} from "./issuePermissions";

const buatIssue = (over: Partial<Task> = {}): Task =>
  ({
    id: "task-1",
    reporterId: "user-reporter",
    assigneeId: "user-assignee",
    ...over,
  }) as Task;

// Selalu `true` -- meniru bug #200 (hasPermission "list"+"update" selalu
// true untuk role "user"). Test-test di bawah membuktikan fungsi izin di
// sini TIDAK terpengaruh oleh ini untuk keputusan manage/delete-nya.
const hasPermissionSelaluTrue = jest.fn().mockReturnValue(true);
const hasPermissionSelaluFalse = jest.fn().mockReturnValue(false);

function ctx(userId: string, userRole: string): IssuePermissionContext {
  return {
    userRole,
    currentUserProfile: { uid: userId, id: userId } as any,
    user: { uid: userId, id: userId },
    hasPermission: hasPermissionSelaluTrue,
  };
}

describe("issuePermissions", () => {
  describe("isUserReporter / isUserAssignee", () => {
    it("mengenali reporter dan assignee lewat id", () => {
      const issue = buatIssue();
      expect(isUserReporter(issue, ctx("user-reporter", "user"))).toBe(true);
      expect(isUserAssignee(issue, ctx("user-assignee", "user"))).toBe(true);
      expect(isUserReporter(issue, ctx("orang-lain", "user"))).toBe(false);
      expect(isUserAssignee(issue, ctx("orang-lain", "user"))).toBe(false);
    });
  });

  describe("canManageIssue (gerbang Delete + Assignee + Reporter)", () => {
    it("admin selalu bisa manage, walau bukan reporter/assignee", () => {
      const issue = buatIssue();
      expect(canManageIssue(issue, ctx("orang-lain", "admin"))).toBe(true);
    });

    it("manager dan head selalu bisa manage", () => {
      const issue = buatIssue();
      expect(canManageIssue(issue, ctx("orang-lain", "manager"))).toBe(true);
      expect(canManageIssue(issue, ctx("orang-lain", "head"))).toBe(true);
    });

    it("reporter bisa manage issue-nya sendiri", () => {
      const issue = buatIssue();
      expect(canManageIssue(issue, ctx("user-reporter", "user"))).toBe(true);
    });

    it("assignee (BUKAN reporter) TIDAK bisa manage -- tidak boleh melimpahkan/menghapus", () => {
      const issue = buatIssue();
      expect(canManageIssue(issue, ctx("user-assignee", "user"))).toBe(false);
    });

    it("user tak terkait TIDAK bisa manage", () => {
      const issue = buatIssue();
      expect(canManageIssue(issue, ctx("orang-lain", "user"))).toBe(false);
    });
  });

  describe("canEditIssue (gerbang field umum: Status, Priority, dst.)", () => {
    it("admin/manager/head/reporter tetap bisa edit (implikasi dari canManageIssue)", () => {
      const issue = buatIssue();
      expect(canEditIssue(issue, ctx("orang-lain", "admin"))).toBe(true);
      expect(canEditIssue(issue, ctx("user-reporter", "user"))).toBe(true);
    });

    it("assignee (BUKAN reporter) BISA edit task yang diberikan ke mereka", () => {
      const issue = buatIssue();
      expect(canEditIssue(issue, ctx("user-assignee", "user"))).toBe(true);
    });

    it("user tak terkait TIDAK bisa edit, walau hasPermission('list','update') selalu true", () => {
      const issue = buatIssue();
      const c = ctx("orang-lain", "user");
      c.hasPermission = hasPermissionSelaluTrue; // simulasi bug #200
      expect(canEditIssue(issue, c)).toBe(false);
    });
  });

  describe("canDeleteIssue", () => {
    it("admin selalu bisa delete", () => {
      const issue = buatIssue();
      expect(canDeleteIssue(issue, ctx("orang-lain", "admin"))).toBe(true);
    });

    it("reporter bisa delete issue-nya sendiri", () => {
      const issue = buatIssue();
      expect(canDeleteIssue(issue, ctx("user-reporter", "user"))).toBe(true);
    });

    it("assignee (BUKAN reporter) TIDAK bisa delete, walau hasPermission dipaksa false", () => {
      const issue = buatIssue();
      const c = ctx("user-assignee", "user");
      c.hasPermission = hasPermissionSelaluFalse;
      expect(canDeleteIssue(issue, c)).toBe(false);
    });

    it("user tak terkait TIDAK bisa delete bila hasPermission menolak", () => {
      const issue = buatIssue();
      const c = ctx("orang-lain", "user");
      c.hasPermission = hasPermissionSelaluFalse;
      expect(canDeleteIssue(issue, c)).toBe(false);
    });
  });
});
