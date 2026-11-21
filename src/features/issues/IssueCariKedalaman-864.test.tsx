/**
 * #864 — pencarian Daftar Isu menemukan isu lewat judul subtask di kedalaman
 * berapa pun, dan membukanya sampai akar.
 *
 * BUG. #863 membereskan satu tingkat: anak langsung yang cocok mengangkat
 * akarnya. Cucu masih hilang, dan penyebabnya DUA lapis klien yang berhenti di
 * anak langsung — padahal render baris sudah rekursif (`IssueTableRow`
 * me-render `<IssueTableRow depth={depth + 1}>`), jadi datanya ada, jalurnya
 * tidak:
 *   1. `displayRoots.childMatches` hanya mengecek anak langsung → akar tidak
 *      pernah masuk daftar untuk cucu yang cocok.
 *   2. Saringan baris anak membuang anak yang tidak cocok → walau akar masuk,
 *      induk perantaranya hilang dan keturunnya tidak pernah tersentuh.
 *   3. Auto-expand hanya membuka akar → simpul antara tetap tertutup.
 *
 * KENAPA TEST INI ADA DI DUA TEMPAT. Lapis (1)+(3) hidup di hook, lapis (2)
 * hidup di komponen baris. Keduanya diuji pada permukaan aslinya, bukan lewat
 * salinan logikanya — pelajaran #701: test dengan tiruan regex meloloskan bug
 * yang justru ada di lapis terjemahan.
 */
import React from "react";
import { act, render, renderHook } from "@testing-library/react";
import { IssueTableRow } from "./components/list/IssueTableRow";
import { useIssueList } from "./hooks";

jest.mock("motion/react", () => {
  const asli = jest.requireActual("motion/react");
  const R = require("react");
  const tr = R.forwardRef((props: any, ref: any) => {
    const { layout: _, initial: __, animate: ___, exit: ____, transition: _____, ...lan } = props;
    return R.createElement("tr", { ...lan, ref });
  });
  return {
    ...asli,
    motion: new Proxy(asli.motion, { get: (target, key) => (key === "tr" ? tr : target[key]) }),
  };
});

const task = (id: string, judul: string, parentId: string | null, kunci: string) =>
  ({
    id,
    projectId: "proj-1",
    key: kunci,
    title: judul,
    parentId,
    type: "task",
    status: "To Do",
    priority: "Medium",
    progress: 0,
    reporterId: "u1",
    assigneeId: "u1",
    createdAt: new Date("2026-10-01"),
    updatedAt: new Date("2026-10-02"),
  }) as any;

// Pohon tiga tingkat: hanya CUCU yang mengandung kata yang dicari.
const AKAR = task("epic-1", "Portal pelanggan", null, "LAN-100");
const ANAK = task("story-1", "Penataan beranda", "epic-1", "LAN-101");
const CUCU = task("sub-1", "Kartu homepage baru", "story-1", "LAN-102");
const POHON = [AKAR, ANAK, CUCU];

const MASTER = [
  { id: "t1", type: "issue_type", label: "Task", code: "task", color: "#405189", icon: "Zap" },
  { id: "s1", type: "status", label: "To Do", code: "todo", color: "#71717A", icon: "Circle" },
  { id: "p1", type: "priority", label: "Medium", code: "medium", color: "#71717A", icon: "Minus" },
] as any[];

const kolom = () =>
  [
    { id: "work", visible: true, width: 450 },
    { id: "priority", visible: true, width: 120 },
  ] as any[];

describe("#864 IssueTableRow — induk tanpa kata kunci tetap tampil demi cucunya", () => {
  const renderRow = (lebih: Record<string, any> = {}) => {
    const props = {
      task: AKAR,
      depth: 0,
      canReorder: false,
      isCompact: false,
      isSelected: false,
      handleToggleSelectOne: jest.fn(),
      issueTableColumns: kolom(),
      expandedTasks: new Set<string>(["epic-1", "story-1"]),
      toggleTaskExpansion: jest.fn(),
      inlineAddingTaskId: null,
      setInlineAddingTaskId: jest.fn(),
      inlineTitleMap: {},
      setInlineTitleMap: jest.fn(),
      isInlineTypeOpen: null,
      setIsInlineTypeOpen: jest.fn(),
      inlineAddPriority: "Medium",
      setInlineAddPriority: jest.fn(),
      inlineAddAssigneeId: "",
      setInlineAddAssigneeId: jest.fn(),
      isCreating: false,
      createSubtask: jest.fn(async () => {}),
      tasks: POHON,
      masterData: MASTER,
      projectMembers: [{ uid: "u1", displayName: "Azlan", email: "a@b.c" }] as any[],
      sprints: [],
      isUserReporter: () => true,
      canDeleteIssue: () => true,
      canEditIssue: () => true,
      canManageIssue: () => true,
      canChangeReporter: () => false,
      deleteTask: jest.fn(),
      setSelectedTaskForDetail: jest.fn(),
      setIsTaskDetailModalOpen: jest.fn(),
      setCurrentView: jest.fn(),
      updateTaskField: jest.fn(),
      activeContextMenuTaskId: null,
      setActiveContextMenuTaskId: jest.fn(),
      issueSearch: "homepage",
      ...lebih,
    };
    const { container } = render(
      <table>
        <tbody>
          <IssueTableRow {...(props as any)} />
        </tbody>
      </table>
    );
    return { container, props };
  };

  const teksSel = (container: HTMLElement) => container.textContent || "";

  it("menembus induk yang tidak cocok dan merender cucu yang cocok", () => {
    const { container } = renderRow();
    const teks = teksSel(container);
    expect(teks).toContain("Kartu homepage baru");
    expect(teks).toContain("Penataan beranda");
  });

  it("induk yang tidak cocok TIDAK dipaksa tampil bila tidak ada keturunan yang cocok", () => {
    const { container } = renderRow({ issueSearch: "tidakada" });
    const teks = teksSel(container);
    expect(teks).not.toContain("Penataan beranda");
    expect(teks).not.toContain("Kartu homepage baru");
  });

  it("saringan non-cari tetap berlaku pada anak (regresi perilaku lama)", () => {
    const { container } = renderRow({ issueSearch: "", listFilterStatus: "Done" });
    expect(teksSel(container)).not.toContain("Penataan beranda");
  });
});

describe("#864 displayRoots — akar diangkat lewat cucu dan rantainya dibuka", () => {
  const propsDasar = {
    tasks: POHON,
    roots: [AKAR],
    selectedProject: { id: "proj-1", name: "Proyek" },
    user: { uid: "u1" },
    masterData: MASTER,
    userRole: "Admin",
  } as any;

  const pasang = (lebih: Record<string, any> = {}) => {
    const { result } = renderHook(() => useIssueList({ ...propsDasar, ...lebih }));
    return result;
  };

  it("akar tampil walau kata kunci hanya ada di cucu", () => {
    const result = pasang();
    act(() => result.current.setIssueSearch("homepage"));
    expect(result.current.displayRoots.map((r: any) => r.id)).toEqual(["epic-1"]);
  });

  it("auto-expand membuka akar DAN simpul antara, bukan akar saja", () => {
    const result = pasang();
    act(() => result.current.setIssueSearch("homepage"));
    expect(result.current.expandedTasks.has("epic-1")).toBe(true);
    expect(result.current.expandedTasks.has("story-1")).toBe(true);
  });

  it("membuka hasil di bawah tingkat 20 walau akar juga cocok", () => {
    const akar = task("akar", "Homepage utama", null, "LAN-200");
    const tasks = [akar];
    for (let i = 1; i <= 24; i += 1) {
      tasks.push(
        task(
          `n-${i}`,
          i === 24 ? "Homepage terdalam" : `Lapisan ${i}`,
          i === 1 ? akar.id : `n-${i - 1}`,
          `LAN-${200 + i}`
        )
      );
    }
    const result = pasang({ tasks, roots: [akar] });
    act(() => result.current.setIssueSearch("homepage"));
    expect(result.current.displayRoots.map((r: any) => r.id)).toEqual([akar.id]);
    expect(result.current.expandedTasks.has("n-23")).toBe(true);
  });

  it("tanpa kata kunci, akar yang tidak cocok saringan tetap hilang", () => {
    const result = pasang();
    act(() => result.current.setListFilterStatus("Done"));
    expect(result.current.displayRoots).toEqual([]);
  });

  it("cari yang cocok di akar sendiri tidak membuka anak yang tidak perlu", () => {
    const result = pasang();
    act(() => result.current.setIssueSearch("Portal"));
    expect(result.current.displayRoots.map((r: any) => r.id)).toEqual(["epic-1"]);
    expect(result.current.expandedTasks.has("story-1")).toBe(false);
  });
});
