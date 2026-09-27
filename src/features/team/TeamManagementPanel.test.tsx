import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamManagementPanel } from "./TeamManagementPanel";
import { UserProfile, Project, MasterData } from "../../types";
import * as teamService from "./services/team.service";

jest
  .spyOn(teamService, "fetchTeamTasks")
  .mockImplementation(() => Promise.resolve({ status: "success", data: [] }));

const mockMasterData: MasterData[] = [
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
  {
    id: "3",
    type: "project_role",
    roleType: "PROJECT",
    code: "viewer",
    label: "Viewer",
    isActive: true,
  } as any,
];

const mockProject: Project = {
  id: "proj-1",
  name: "Test Project",
  description: "Test",
  ownerId: "user-owner",
  memberRoles: {
    "user-owner": "owner",
    "user-member-1": "developer",
  },
  members: ["user-owner", "user-member-1"],
  columns: [],
  tasks: [],
} as any;

const mockMembers: UserProfile[] = [
  {
    id: "user-owner",
    uid: "user-owner",
    email: "owner@example.com",
    displayName: "Owner User",
    role: "user",
    username: "owner",
    status: "active",
  } as any,
  {
    id: "user-member-1",
    uid: "user-member-1",
    email: "member1@example.com",
    displayName: "Member One",
    role: "user",
    username: "member1",
    status: "active",
  } as any,
];

describe("TeamManagementPanel — #269 Manajemen Tim UI", () => {
  it("merender dropdown peran dan tombol hapus ketika user adalah owner", async () => {
    const updateProjectRole = jest.fn();
    const removeProjectMember = jest.fn().mockResolvedValue(undefined);

    render(
      <TeamManagementPanel
        projectMembers={mockMembers}
        selectedProject={mockProject}
        tasks={[]}
        currentUserProfile={mockMembers[0]}
        userRole="owner"
        hasPermission={() => true}
        updateProjectRole={updateProjectRole}
        removeProjectMember={removeProjectMember}
        masterData={mockMasterData}
      />
    );

    // List & Grid render Member One
    expect(screen.getByText("Member One")).toBeInTheDocument();

    // Dropdown for Member One role displays "Developer"
    const dropdownButtons = screen.getAllByText("Developer");
    expect(dropdownButtons.length).toBeGreaterThan(0);

    // Open dropdown
    fireEvent.click(dropdownButtons[0]);

    // Select Project Admin from menu
    const adminOptions = screen.getAllByText("Project Admin");
    expect(adminOptions.length).toBeGreaterThan(0);
    fireEvent.click(adminOptions[0]);

    expect(updateProjectRole).toHaveBeenCalledWith("user-member-1", "admin");

    // Remove button should exist for Member One
    const removeButtons = screen.getAllByLabelText("Keluarkan dari Tim");
    expect(removeButtons.length).toBeGreaterThan(0);

    // Click remove button -> opens ConfirmationModal
    fireEvent.click(removeButtons[0]);
    expect(screen.getByText("Keluarkan Anggota Tim")).toBeInTheDocument();

    // Confirm removal
    const confirmButtons = screen.getAllByText("Keluarkan dari Tim");
    // Find the one inside the modal
    const modalConfirmBtn = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(removeProjectMember).toHaveBeenCalledWith("user-member-1");
    });
  });

  it("tidak menampilkan kontrol ubah/hapus bagi viewer (read-only)", () => {
    const updateProjectRole = jest.fn();
    const removeProjectMember = jest.fn();

    render(
      <TeamManagementPanel
        projectMembers={mockMembers}
        selectedProject={mockProject}
        tasks={[]}
        currentUserProfile={
          { id: "user-viewer", uid: "user-viewer", email: "v@e.com", role: "user" } as any
        }
        userRole="viewer"
        hasPermission={() => false}
        updateProjectRole={updateProjectRole}
        removeProjectMember={removeProjectMember}
        masterData={mockMasterData}
      />
    );

    expect(screen.queryByLabelText("Keluarkan dari Tim")).not.toBeInTheDocument();
  });
});
