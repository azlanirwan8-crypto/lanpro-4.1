/**
 * Item #138 — Status dan Metodologi harus bersumber dari MasterData.
 *
 * Sebelumnya keduanya ditulis keras. Akibatnya `Planning` dan `Cancelled`
 * sudah ada di MasterData tetapi tidak pernah bisa dipilih, sementara
 * `Archived` bisa dipilih walau tidak ada di MasterData sama sekali.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { EditProjectModal } from "./EditProjectModal";

const PROYEK: any = {
  id: "p-123456",
  name: "Proyek Uji",
  key: "UJI",
  description: "",
  ownerId: "u-1",
  status: "Active",
  category: "Agile",
  members: [],
  memberRoles: {},
  createdAt: null,
  taskCounter: 0,
};

const MASTER: any[] = [
  { id: "1", type: "project_status", label: "Planning" },
  { id: "2", type: "project_status", label: "Active" },
  { id: "3", type: "project_status", label: "Cancelled" },
  { id: "4", type: "methodology", label: "Scrum" },
  { id: "5", type: "methodology", label: "Waterfall" },
  // Tipe lain tidak boleh ikut bocor ke dropdown mana pun.
  { id: "6", type: "priority", label: "High" },
];

const tampilkan = (masterData?: any[]) =>
  render(
    <EditProjectModal
      isOpen
      onClose={() => {}}
      editingProject={PROYEK}
      setEditingProject={() => {}}
      onSubmit={() => {}}
      isSubmitting={false}
      effectiveRole={"owner" as any}
      currentUser={null}
      user={null}
      currentUserProfile={null}
      hasPermission={() => false}
      deleteProject={() => {}}
      masterData={masterData}
    />
  );

const nilaiOpsi = () => screen.getAllByRole("option").map((o) => (o as HTMLOptionElement).value);

describe("EditProjectModal — Status & Metodologi dari MasterData (#138)", () => {
  it("menawarkan status dari MasterData, termasuk Planning dan Cancelled", () => {
    tampilkan(MASTER);
    const opsi = nilaiOpsi();
    expect(opsi).toEqual(expect.arrayContaining(["Planning", "Active", "Cancelled"]));
  });

  it("tidak lagi menawarkan Archived yang tidak ada di MasterData", () => {
    tampilkan(MASTER);
    expect(nilaiOpsi()).not.toContain("Archived");
  });

  it("menawarkan metodologi dari MasterData", () => {
    tampilkan(MASTER);
    expect(nilaiOpsi()).toEqual(expect.arrayContaining(["Scrum", "Waterfall"]));
  });

  it("tidak membocorkan tipe MasterData lain ke dropdown", () => {
    tampilkan(MASTER);
    expect(nilaiOpsi()).not.toContain("High");
  });

  it("jatuh ke daftar cadangan bila MasterData kosong, bukan dropdown kosong", () => {
    tampilkan([]);
    const opsi = nilaiOpsi();
    expect(opsi).toEqual(expect.arrayContaining(["Active", "On Hold", "Completed"]));
    expect(opsi).toEqual(expect.arrayContaining(["Agile", "Scrum"]));
  });
});
