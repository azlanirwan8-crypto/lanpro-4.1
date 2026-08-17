/**
 * @jest-environment jsdom
 */
import {
  DEFAULT_PERMISSIONS,
  getUserPermissions,
  hasPermission,
  resolveProjectRole,
  can,
} from "./permissions";
import { MATRIKS_PROYEK, MATRIKS_SISTEM } from "./matriksAkses";

describe("Permissions Matrix Alignment (§19.8 Tahap 5b / Item #87)", () => {
  const dummyUser = { id: "user-1", uid: "user-1", role: "user" };
  const adminUser = { id: "admin-1", uid: "admin-1", role: "admin" };

  describe("resolveProjectRole", () => {
    it("mengenali Project Owner dari project.ownerId", () => {
      const project = { id: "proj-1", ownerId: "user-1" };
      expect(resolveProjectRole(dummyUser, project)).toBe("owner");
    });

    it("mengenali Project Role dari project.memberRoles map", () => {
      const project = {
        id: "proj-1",
        ownerId: "other-user",
        memberRoles: { "user-1": "manager" },
      };
      expect(resolveProjectRole(dummyUser, project)).toBe("manager");
    });

    it("mengenali Project Role dari project.members array", () => {
      const project = {
        id: "proj-1",
        ownerId: "other-user",
        members: [{ id: "user-1", role: "developer" }],
      };
      expect(resolveProjectRole(dummyUser, project)).toBe("developer");
    });

    it("mengembalikan null jika pengguna bukan anggota proyek", () => {
      const project = {
        id: "proj-1",
        ownerId: "other-user",
        memberRoles: { "other-2": "developer" },
      };
      expect(resolveProjectRole(dummyUser, project)).toBeNull();
    });
  });

  describe("can() dan hasPermission() per Peran Proyek", () => {
    it("Global Administrator memiliki God Mode di seluruh modul sistem dan proyek", () => {
      expect(can("create", "sprints", { user: adminUser })).toBe(true);
      expect(can("delete", "userManagement", { user: adminUser })).toBe(true);
      expect(hasPermission("admin", "sprints", "delete")).toBe(true);
    });

    it("Project Manager memiliki izin penuh (CRUD) di sprints, list, board, dan modul teknis", () => {
      const project = { id: "proj-1", memberRoles: { "user-1": "manager" } };
      expect(can("create", "sprints", { user: dummyUser, project })).toBe(true);
      expect(can("update", "sprints", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "sprints", { user: dummyUser, project })).toBe(true);
      expect(can("update", "list", { user: dummyUser, project })).toBe(true);
      expect(can("read", "access", { user: dummyUser, project })).toBe(true);
      expect(can("update", "access", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "access", { user: dummyUser, project })).toBe(false); // access hanya RU untuk manager
    });

    it("Developer dapat membuat/mengubah list (CRU) dan board (RU), tetapi tidak dapat menghapus atau membuat sprint", () => {
      const project = { id: "proj-1", memberRoles: { "user-1": "developer" } };
      expect(can("create", "list", { user: dummyUser, project })).toBe(true);
      expect(can("update", "list", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "list", { user: dummyUser, project })).toBe(false);
      expect(can("update", "board", { user: dummyUser, project })).toBe(true);
      expect(can("create", "sprints", { user: dummyUser, project })).toBe(false);
      expect(can("delete", "sprints", { user: dummyUser, project })).toBe(false);
      expect(can("read", "sprints", { user: dummyUser, project })).toBe(true);
    });

    it("QA Engineer memiliki kontrol penuh CRUD di modul QA, tetapi tidak dapat menghapus sprint", () => {
      const project = { id: "proj-1", memberRoles: { "user-1": "qa" } };
      expect(can("create", "qa", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "qa", { user: dummyUser, project })).toBe(true);
      expect(can("create", "sprints", { user: dummyUser, project })).toBe(false);
    });

    it("System Analyst memiliki kontrol CRUD di wiki dan flowchart", () => {
      const project = { id: "proj-1", memberRoles: { "user-1": "system_analyst" } };
      expect(can("create", "wiki", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "wiki", { user: dummyUser, project })).toBe(true);
      expect(can("create", "flowchart", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "flowchart", { user: dummyUser, project })).toBe(true);
    });

    it("Business Analyst memiliki kontrol CRUD di meetingNotes", () => {
      const project = { id: "proj-1", memberRoles: { "user-1": "business_analyst" } };
      expect(can("create", "meetingNotes", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "meetingNotes", { user: dummyUser, project })).toBe(true);
      expect(can("delete", "wiki", { user: dummyUser, project })).toBe(false); // wiki hanya CRU
    });

    it("Viewer hanya memiliki izin baca (R) di seluruh modul", () => {
      const project = { id: "proj-1", memberRoles: { "user-1": "viewer" } };
      expect(can("read", "list", { user: dummyUser, project })).toBe(true);
      expect(can("create", "list", { user: dummyUser, project })).toBe(false);
      expect(can("update", "list", { user: dummyUser, project })).toBe(false);
      expect(can("delete", "list", { user: dummyUser, project })).toBe(false);
    });
  });
});
