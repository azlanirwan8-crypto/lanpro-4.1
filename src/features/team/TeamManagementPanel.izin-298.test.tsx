/**
 * Regresi ISSUE-298 — Manajemen Tim wajib menghormati ceklist izin.
 * Dilaporkan pemilik proyek 30 Agu 2026.
 *
 * Aturan yang dijaga, sesuai `issuePermissions.ts` (#202): hak CRUD datang
 * dari CEKLIST IZIN, bukan dari peran proyek. Hanya Global Admin yang
 * berakses penuh. Sebelum perbaikan, `canManageTeam` memakai rantai OR yang
 * meloloskan peran `owner`/`admin` tanpa pernah memanggil `hasPermission`.
 *
 * Dan UPDATE dipisah dari DELETE: akun yang diberi izin mengubah peran tidak
 * otomatis boleh mengeluarkan anggota.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { TeamManagementPanel } from "./TeamManagementPanel";
import { UserProfile, Project, MasterData } from "../../types";
import * as teamService from "./services/team.service";

jest
  .spyOn(teamService, "fetchTeamTasks")
  .mockImplementation(() => Promise.resolve({ status: "success", data: [] }));

const masterData: MasterData[] = [
  {
    id: "1",
    type: "project_role",
    roleType: "PROJECT",
    code: "developer",
    label: "Developer",
    isActive: true,
  } as any,
  {
    id: "2",
    type: "project_role",
    roleType: "PROJECT",
    code: "admin",
    label: "Project Admin",
    isActive: true,
  } as any,
];

const project: Project = {
  id: "proj-1",
  name: "Proyek Uji",
  description: "-",
  ownerId: "user-owner",
  memberRoles: { "user-owner": "owner", "user-member-1": "developer" },
  members: ["user-owner", "user-member-1"],
  columns: [],
  tasks: [],
} as any;

const anggota: UserProfile[] = [
  {
    id: "user-owner",
    uid: "user-owner",
    email: "owner@contoh.id",
    displayName: "Owner User",
    role: "user",
    username: "owner",
    status: "active",
  } as any,
  {
    id: "user-member-1",
    uid: "user-member-1",
    email: "member1@contoh.id",
    displayName: "Member One",
    role: "user",
    username: "member1",
    status: "active",
  } as any,
];

/** Ceklist izin: hanya aksi yang disebut yang diizinkan. */
const ceklist = (diizinkan: Record<string, string[]>) => (modul: string, aksi: string) =>
  (diizinkan[modul] || []).includes(aksi);

function renderPanel(props: Record<string, unknown>) {
  return render(
    <TeamManagementPanel
      projectMembers={anggota}
      selectedProject={project}
      tasks={[]}
      currentUserProfile={anggota[0]}
      masterData={masterData}
      updateProjectRole={jest.fn()}
      removeProjectMember={jest.fn()}
      {...props}
    />
  );
}

describe("#298 Manajemen Tim menghormati ceklist izin", () => {
  it("peran owner dengan ceklist READ-saja TIDAK boleh melihat tombol keluarkan", () => {
    renderPanel({ userRole: "owner", hasPermission: ceklist({ access: ["R"] }) });

    // Inilah inti #298: sebelum perbaikan, cabang peran==="owner" menang
    // duluan dan ceklist tidak pernah diperiksa.
    expect(screen.queryAllByLabelText("Keluarkan dari Tim")).toHaveLength(0);
  });

  it("peran admin proyek dengan ceklist READ-saja juga TIDAK boleh", () => {
    renderPanel({ userRole: "admin", hasPermission: ceklist({ access: ["R"] }) });

    expect(screen.queryAllByLabelText("Keluarkan dari Tim")).toHaveLength(0);
  });

  it("ceklist UPDATE saja: boleh ubah peran, TIDAK boleh keluarkan anggota", () => {
    renderPanel({ userRole: "developer", hasPermission: ceklist({ access: ["R", "U"] }) });

    // Kontrol peran hadir...
    expect(screen.getAllByText("Developer").length).toBeGreaterThan(0);
    // ...tapi tombol hapus tidak, sebab izin "D" tidak diberikan.
    expect(screen.queryAllByLabelText("Keluarkan dari Tim")).toHaveLength(0);
  });

  it("ceklist DELETE diberikan: tombol keluarkan muncul", () => {
    renderPanel({ userRole: "developer", hasPermission: ceklist({ access: ["R", "U", "D"] }) });

    expect(screen.getAllByLabelText("Keluarkan dari Tim").length).toBeGreaterThan(0);
  });

  it("Global Admin tetap berakses penuh tanpa bergantung ceklist", () => {
    renderPanel({
      userRole: "viewer",
      currentUserProfile: { ...anggota[0], role: "admin" },
      hasPermission: ceklist({}),
    });

    expect(screen.getAllByLabelText("Keluarkan dari Tim").length).toBeGreaterThan(0);
  });
});
