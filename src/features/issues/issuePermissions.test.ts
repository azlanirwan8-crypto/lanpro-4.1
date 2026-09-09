/**
 * Item #200/#201 — manage/Assignee.
 * Item #482 — Reporter hanya Administrator sistem.
 * Item #483 — Hapus: admin sistem full · user ikut checklist.
 */
import { Task } from "../../types";
import {
  isUserReporter,
  isUserAssignee,
  canManageIssue,
  canChangeReporter,
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

const hasPermissionSelaluTrue = (..._args: any[]) => true;
const hasPermissionSelaluFalse = (..._args: any[]) => false;

function ctx(userId: string, userRole: string, systemRole?: string): IssuePermissionContext {
  const roleSistem = systemRole ?? userRole;
  return {
    userRole,
    currentUserProfile: { uid: userId, id: userId, role: roleSistem } as any,
    user: { uid: userId, id: userId, role: roleSistem },
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

  describe("canManageIssue (gerbang Delete + Assignee)", () => {
    it("admin selalu bisa manage, walau bukan reporter/assignee", () => {
      expect(canManageIssue(buatIssue(), ctx("orang-lain", "admin"))).toBe(true);
    });

    it("manager dan head selalu bisa manage", () => {
      expect(canManageIssue(buatIssue(), ctx("orang-lain", "manager"))).toBe(true);
      expect(canManageIssue(buatIssue(), ctx("orang-lain", "head"))).toBe(true);
    });

    it("reporter bisa manage issue-nya sendiri", () => {
      expect(canManageIssue(buatIssue(), ctx("user-reporter", "user"))).toBe(true);
    });

    it("assignee (BUKAN reporter) TIDAK bisa manage", () => {
      expect(canManageIssue(buatIssue(), ctx("user-assignee", "user"))).toBe(false);
    });

    it("user tak terkait TIDAK bisa manage", () => {
      expect(canManageIssue(buatIssue(), ctx("orang-lain", "user"))).toBe(false);
    });
  });

  describe("canChangeReporter (#482 — hanya Administrator sistem)", () => {
    it("system admin bisa ganti reporter", () => {
      expect(canChangeReporter(buatIssue(), ctx("orang-lain", "user", "admin"))).toBe(true);
    });

    it("project admin (effectiveRole admin, Users.role user) TIDAK bisa", () => {
      expect(canChangeReporter(buatIssue(), ctx("orang-lain", "admin", "user"))).toBe(false);
    });

    it("manager / head / reporter / assignee TIDAK bisa", () => {
      expect(canChangeReporter(buatIssue(), ctx("orang-lain", "manager", "manager"))).toBe(false);
      expect(canChangeReporter(buatIssue(), ctx("orang-lain", "head", "head"))).toBe(false);
      expect(canChangeReporter(buatIssue(), ctx("user-reporter", "user", "user"))).toBe(false);
      expect(canChangeReporter(buatIssue(), ctx("user-assignee", "user", "user"))).toBe(false);
    });

    it("issue null → false", () => {
      expect(canChangeReporter(null, ctx("x", "admin", "admin"))).toBe(false);
    });
  });

  describe("canEditIssue (gerbang field umum: Status, Priority, dst.)", () => {
    it("admin/manager/head/reporter tetap bisa edit", () => {
      expect(canEditIssue(buatIssue(), ctx("orang-lain", "admin"))).toBe(true);
      expect(canEditIssue(buatIssue(), ctx("user-reporter", "user"))).toBe(true);
    });

    it("assignee (BUKAN reporter) BISA edit task yang diberikan", () => {
      expect(canEditIssue(buatIssue(), ctx("user-assignee", "user"))).toBe(true);
    });

    it("user tak terkait TIDAK bisa edit walau hasPermission selalu true", () => {
      const c = ctx("orang-lain", "user");
      c.hasPermission = hasPermissionSelaluTrue;
      expect(canEditIssue(buatIssue(), c)).toBe(false);
    });
  });

  describe("canDeleteIssue (#483 — admin full · user checklist)", () => {
    it("system admin selalu bisa delete (abaikan checklist)", () => {
      const c = ctx("orang-lain", "user", "admin");
      c.hasPermission = hasPermissionSelaluFalse;
      expect(canDeleteIssue(buatIssue(), c)).toBe(true);
    });

    it("project admin (Users.role user) TIDAK bisa bila checklist menolak", () => {
      const c = ctx("orang-lain", "admin", "user");
      c.hasPermission = hasPermissionSelaluFalse;
      expect(canDeleteIssue(buatIssue(), c)).toBe(false);
    });

    it("non-admin boleh delete bila checklist list.delete mengizinkan", () => {
      const c = ctx("orang-lain", "user", "user");
      c.hasPermission = hasPermissionSelaluTrue;
      expect(canDeleteIssue(buatIssue(), c)).toBe(true);
    });

    it("reporter TIDAK otomatis boleh bila checklist menolak", () => {
      const c = ctx("user-reporter", "user", "user");
      c.hasPermission = hasPermissionSelaluFalse;
      expect(canDeleteIssue(buatIssue(), c)).toBe(false);
    });

    it("memanggil hasPermission dengan peran SISTEM + permissions profil", () => {
      const calls: any[] = [];
      const c = ctx("orang-lain", "admin", "user");
      c.currentUserProfile = {
        ...c.currentUserProfile!,
        permissions: { list: { delete: true } },
      } as any;
      c.hasPermission = (...args: any[]) => {
        calls.push(args);
        return true;
      };
      expect(canDeleteIssue(buatIssue(), c)).toBe(true);
      expect(calls[0][0]).toBe("user");
      expect(calls[0][1]).toBe("list");
      expect(calls[0][2]).toBe("delete");
      expect(calls[0][3]).toBe(false);
      expect(calls[0][4]).toEqual(expect.objectContaining({ list: expect.anything() }));
    });
  });
});
