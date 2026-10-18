/**
 * @jest-environment jsdom
 *
 * #564 menuntut warna label TERLIHAT di dropdown dan pohon Timeline. #782
 * MEMBALIK sebagian caranya untuk KONTROL FORM saja: trigger `StyledDropdown`
 * tidak lagi dicat `.label-chip`, karena field yang kebetulan punya warna
 * MasterData (status/prioritas/jenis) berdiri sebagai blok berwarna sementara
 * field tetangganya (ASSIGNEE, POINTS) putih — pemilik proyek, 18 Okt: "kasar
 * dan berat serta seperti memaksakan keadaan".
 *
 * Yang TETAP dikunci di sini: warnanya tidak boleh hilang. Ia sekarang dibawa
 * titik/ikon di kiri nilai (pola Jira/Linear), dan badge di kartu/daftar tetap
 * `.label-chip` penuh — lihat test TimelinePanel di bawah dan `LabelChip`.
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
const titik = (btn: HTMLElement) =>
  btn.querySelector("[style*='background-color']") as HTMLElement | null;
const hexTitik = (btn: HTMLElement) => titik(btn)?.style.getPropertyValue("background-color") || "";
/** jsdom menormalkan heksa jadi `rgb(...)`, jadi bandingkan dalam ruang itu. */
const rgb = (heksa: string) => {
  const n = heksa.replace("#", "");
  const d =
    n.length === 3
      ? n
          .split("")
          .map((c) => c + c)
          .join("")
      : n;
  const r = parseInt(d.slice(0, 2), 16),
    t = parseInt(d.slice(2, 4), 16),
    s = parseInt(d.slice(4, 6), 16);
  return `rgb(${r}, ${t}, ${s})`;
};

describe("StyledDropdown — kontrol netral, warna dibawa titiknya (#564 lewat #782)", () => {
  it("status In Progress: kontrolnya netral, ungu master data ada di titik", () => {
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
    expect(btn.className).not.toContain("label-chip");
    expect(btn.className).toContain("bg-surface");
    expect(btn.style.getPropertyValue("--lbr")).toBe("");
    expect(hexTitik(btn)).toBe(rgb(BAKU.status.inprogress));
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
    expect(hexTitik(btn)).toBe(rgb(BAKU.status.done));
  });

  it("jenis isu tanpa ikon tetap membawa warna labelnya sendiri", () => {
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
    expect(btn.className).not.toContain("label-chip");
    expect(hexTitik(btn)).toBe(rgb(BAKU.issue_type.story));
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
    expect(titik(btn)).toBeNull();
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
