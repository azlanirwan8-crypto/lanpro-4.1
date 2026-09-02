/**
 * Regresi #331 — Tim crash untuk peran non-admin.
 *
 * Sebelum perbaikan, `punyaIzin` memanggil hasPermission("access", "U")
 * (2 argumen). Fungsi sungguhan butuh (peran, modul, aksi, …), sehingga
 * `action` undefined dan `action.toLowerCase()` melempar TypeError.
 * Admin lolos karena short-circuit isGlobalAdmin.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { TeamManagementPanel } from "./TeamManagementPanel";
import { hasPermission } from "../../lib/permissions";
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
];

const project: Project = {
  id: "proj-1",
  name: "Proyek Uji",
  description: "-",
  ownerId: "user-1",
  memberRoles: { "user-1": "developer", "user-2": "developer" },
  members: ["user-1", "user-2"],
  columns: [],
  tasks: [],
} as any;

const anggota: UserProfile[] = [
  {
    id: "user-1",
    uid: "user-1",
    email: "u1@contoh.id",
    displayName: "User Satu",
    role: "user",
    username: "u1",
    status: "active",
    permissions: {
      access: { create: false, read: true, update: false, delete: false },
    },
  } as any,
  {
    id: "user-2",
    uid: "user-2",
    email: "u2@contoh.id",
    displayName: "User Dua",
    role: "user",
    username: "u2",
    status: "active",
  } as any,
];

describe("#331 Tim tidak crash untuk peran user", () => {
  it("merender tanpa TypeError saat hasPermission sungguhan dipakai", () => {
    expect(() =>
      render(
        <TeamManagementPanel
          projectMembers={anggota}
          selectedProject={project}
          tasks={[]}
          currentUserProfile={anggota[0]}
          userRole="user"
          hasPermission={hasPermission as any}
          masterData={masterData}
          updateProjectRole={jest.fn()}
          removeProjectMember={jest.fn()}
        />
      )
    ).not.toThrow();

    expect(screen.getByText("User Dua")).toBeInTheDocument();
    expect(screen.queryAllByLabelText("Keluarkan dari Tim")).toHaveLength(0);
  });
});
