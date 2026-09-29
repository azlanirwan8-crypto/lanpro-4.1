/**
 * @jest-environment jsdom
 *
 * #564 — chip label harus MEMBAWA warna labelnya, bukan hanya titiknya.
 *
 * Permintaan pemilik proyek 29 Sep, dengan contoh di layar: chip "Story" dan
 * "Tugas" masih putih sementara ikonnya sudah berwarna. Uji ini menutup dua
 * permukaan yang paling sering dilihat: dropdown status/prioritas/jenis yang
 * dipakai ~30 tempat (`StyledDropdown`) dan label status di pohon Timeline.
 *
 * Yang dikunci adalah pasangan kelas + properti kustom `--lbr`: `.label-chip`
 * menurunkan latar, garis dan TEKS-nya dari hex itu (src/index.css), jadi kalau
 * hex-nya salah atau kelasnya hilang, chip kembali jadi putih.
 */
import React from "react";
import { render } from "@testing-library/react";
import { StyledDropdown } from "./CommonComponents";
import { TimelinePanel } from "../../features/timeline/TimelinePanel";
import { BAKU } from "../../lib/warnaLabel";

const master = [
  {
    id: "s1",
    type: "status",
    label: "In Progress",
    code: "in_progress",
    color: BAKU.status.inprogress,
  },
  { id: "s2", type: "status", label: "Selesai", code: "done", color: BAKU.status.done },
  { id: "t1", type: "issue_type", label: "Story", code: "story", color: BAKU.issue_type.story },
] as any[];

const pemicu = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;

describe("StyledDropdown — chip ikut warna label (#564)", () => {
  it("status In Progress memakai ungu master data, bukan warna kata kunci", () => {
    const { container } = render(
      <StyledDropdown
        value="s1"
        onChange={() => {}}
        options={[{ id: "s1", label: "In Progress", color: BAKU.status.inprogress }]}
        type="status"
        masterData={master}
      />
    );
    const btn = pemicu(container);
    expect(btn.className).toContain("label-chip");
    expect(btn.style.getPropertyValue("--lbr")).toBe(BAKU.status.inprogress);
  });

  it("label Indonesia 'Selesai' hijau — dulu dilewati pemetaan Timeline", () => {
    const { container } = render(
      <StyledDropdown
        value="Selesai"
        onChange={() => {}}
        options={[{ id: "Selesai", label: "Selesai" }]}
        type="status"
        masterData={[]}
      />
    );
    const btn = pemicu(container);
    expect(btn.style.getPropertyValue("--lbr")).toBe(BAKU.status.done);
  });

  it("jenis isu ikut warna labelnya sendiri", () => {
    const { container } = render(
      <StyledDropdown
        value="story"
        onChange={() => {}}
        options={[{ id: "story", label: "Story", color: BAKU.issue_type.story }]}
        type="issue_type"
        masterData={master}
      />
    );
    const btn = pemicu(container);
    expect(btn.className).toContain("label-chip");
    expect(btn.style.getPropertyValue("--lbr")).toBe(BAKU.issue_type.story);
  });

  it("pemilih anggota tetap abu: labelnya memang tidak punya warna", () => {
    const { container } = render(
      <StyledDropdown
        value="u-1"
        onChange={() => {}}
        options={[{ id: "u-1", label: "Budi" }]}
        type="member"
        masterData={master}
      />
    );
    const btn = pemicu(container);
    expect(btn.className).not.toContain("label-chip");
    expect(btn.style.getPropertyValue("--lbr")).toBe("");
  });
});

describe("TimelinePanel — label status sebaris (#562 + #564)", () => {
  const tugas = {
    id: "t-1",
    title: "Enhancement homepage",
    status: "In Progress",
    type: "Story",
    projectId: "proj-1",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  } as any;

  it("chip status membawa hex dari master data yang diteruskan", () => {
    const { container } = render(
      <TimelinePanel
        tasks={[tugas]}
        selectedProject={{ id: "proj-1", name: "Wondr" } as any}
        updateTaskField={async () => {}}
        setSelectedTaskForDetail={() => {}}
        setIsTaskDetailModalOpen={() => {}}
        currentUser={{ id: "u-1", role: "admin" }}
        masterData={
          [
            {
              id: "s9",
              type: "status",
              label: "In Progress",
              code: "in_progress",
              color: "#123456",
            },
          ] as any
        }
      />
    );
    const chip = Array.from(container.querySelectorAll("span.label-chip")).find((el) =>
      (el.textContent || "").includes("In Progress")
    ) as HTMLElement | undefined;
    expect(chip).toBeTruthy();
    expect(chip!.style.getPropertyValue("--lbr")).toBe("#123456");
  });
});
