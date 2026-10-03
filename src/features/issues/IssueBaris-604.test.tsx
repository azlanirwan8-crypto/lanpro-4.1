/**
 * #604 — Daftar Isu: aksi di DEPAN baris, tipe sesuai hierarki, bawaan Epic.
 *
 * Tiga hal yang dulu membuat pengguna tersandung:
 * 1. Simpan/Batal (baris tambah) dan Hapus (baris task) duduk di sel PALING
 *    UJUNG. Pada layar sempit kolom itu baru terlihat setelah tabel digulir ke
 *    kanan — aksi tersering justru paling jauh dari jangkauan.
 * 2. Semua tipe Master Data ditawarkan di mana-mana, jadi Epic bisa lahir di
 *    bawah Task dan Sub-task berdiri tanpa induk ("epic sub nya task terus sub
 *    nya lagi epic").
 * 3. Isu baru dari bilah cepat selalu ber-type Task, padahal ia lahir di puncak
 *    pohon — tempat Epic seharusnya.
 */
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { IssueQuickCreateBar } from "./components/list/IssueQuickCreateBar";
import { IssueTableInlineAddRow } from "./components/list/IssueTableInlineAddRow";
import { IssueTableRow } from "./components/list/IssueTableRow";
import { useIssueList } from "./hooks";

// Sama seperti IssueEnter-592.test.tsx: `motion.tr` menjadwalkan rAF yang tidak
// sempat selesai saat suite jsdom ditutup, dan jest memaksa worker keluar paksa.
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

const TIPE = ["Epic", "Story", "Task", "Bug", "Sub-task"];

const MASTER = [
  ...TIPE.map((label, i) => ({
    id: `t${i}`,
    type: "issue_type",
    label,
    code: label.toLowerCase().replace(/[\s_-]+/g, ""),
    color: "#405189",
    icon: "Zap",
  })),
  { id: "p1", type: "priority", label: "Medium", code: "medium", color: "#71717A", icon: "Minus" },
  { id: "p2", type: "priority", label: "High", code: "high", color: "#EF4444", icon: "ArrowUp" },
  { id: "s1", type: "status", label: "To Do", code: "todo", color: "#71717A", icon: "Circle" },
] as any[];

const anggota = [{ uid: "u1", displayName: "Azlan", email: "a@b.c" }] as any[];

const kolom = () =>
  [
    { id: "work", visible: true, width: 450 },
    { id: "priority", visible: true, width: 120 },
  ] as any[];

/** true bila `a` mendahului `b` dalam urutan dokumen. */
const mendahului = (a: Element, b: Element) =>
  !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("IssueTableInlineAddRow — hierarki tipe baris anak (#604)", () => {
  const propsDasar = (lebih: Record<string, any> = {}) => ({
    taskId: "induk-1",
    depth: 1,
    canReorder: false,
    isCompact: false,
    issueTableColumns: kolom(),
    inlineTitleMap: { "induk-1": "Anak tugas" },
    setInlineTitleMap: jest.fn(),
    setInlineAddingTaskId: jest.fn(),
    inlineAddType: "Task",
    setInlineAddType: jest.fn(),
    isInlineTypeOpen: null as string | null,
    setIsInlineTypeOpen: jest.fn(),
    inlineAddPriority: "Medium",
    setInlineAddPriority: jest.fn(),
    inlineAddAssigneeId: "",
    setInlineAddAssigneeId: jest.fn(),
    isCreating: false,
    createSubtask: jest.fn(async () => {}),
    masterData: MASTER,
    projectMembers: anggota,
    ...lebih,
  });

  const renderBaris = (lebih: Record<string, any> = {}) => {
    const props = propsDasar(lebih);
    const { container } = render(
      <table>
        <tbody>
          <IssueTableInlineAddRow {...(props as any)} />
        </tbody>
      </table>
    );
    return { props, container };
  };

  it("anak Task tidak menawarkan Epic — dan membawa pilihan ke Sub-task", () => {
    const { props } = renderBaris({ tipeInduk: "Task", isInlineTypeOpen: "inline" });

    expect(screen.queryByRole("button", { name: /^Epic$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Story$/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Sub-task$/ })).toBeTruthy();
    // "Task" bukan anak yang sah dari Task, jadi nilai bawaan dikoreksi.
    expect(props.setInlineAddType).toHaveBeenCalledWith("Sub-task");
  });

  it("anak Epic menawarkan Story/Task/Bug/Sub-task, tapi tidak Epic lagi", () => {
    renderBaris({ tipeInduk: "Epic", isInlineTypeOpen: "inline" });

    expect(screen.queryByRole("button", { name: /^Epic$/ })).toBeNull();
    for (const label of ["Story", "Task", "Bug", "Sub-task"]) {
      expect(
        screen.getAllByRole("button", { name: new RegExp(`^${label}$`) }).length
      ).toBeGreaterThan(0);
    }
  });

  it("baris puncak tidak menawarkan Sub-task karena tidak ada induk", () => {
    renderBaris({ tipeInduk: null, isInlineTypeOpen: "inline" });

    expect(screen.queryByRole("button", { name: /^Sub-task$/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Epic$/ })).toBeTruthy();
  });

  it("Simpan dan Batal duduk di DEPAN kolom judul, bukan di sel terakhir", () => {
    const { container } = renderBaris();

    const input = screen.getByPlaceholderText("Apa yang perlu dikerjakan?");
    const simpan = screen.getByRole("button", { name: "Simpan" });
    const batal = screen.getByRole("button", { name: "Batal" });

    // Inilah yang dulu menuntut gulir ke kanan: keduanya lewat di belakang judul.
    expect(mendahului(simpan, input)).toBe(true);
    expect(mendahului(batal, input)).toBe(true);

    const tds = Array.from(container.querySelectorAll("td"));
    const tdTerakhir = tds[tds.length - 1];
    expect(tdTerakhir).not.toContainElement(simpan);
    expect(tdTerakhir).not.toContainElement(batal);
    // Jumlah sel tidak boleh berubah dari sebelumnya (2 kolom terlihat +
    // penahan checkbox + sel penutup), kalau tidak baris ini miring terhadap header.
    expect(tds).toHaveLength(4);
  });

  it("Batal menutup baris tambah", () => {
    const { props } = renderBaris();
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(props.setInlineAddingTaskId).toHaveBeenCalledWith(null);
  });

  it("panel tipe baris anak membuka dengan gerakan standar dropdown", () => {
    const { container } = renderBaris({ tipeInduk: "Epic", isInlineTypeOpen: "inline" });
    const panel = container.querySelector(".animate-dropdown");
    // Inilah yang dulu tidak ada sama sekali: panelnya muncul seketika, dan itu
    // yang dilaporkan sebagai "patah-patah". Kelas (bukan transisi inline) yang
    // dipakai StyledDropdown, dan hanya itu yang hormat ke prefers-reduced-motion.
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("style")).toBeNull();
  });

  it("Enter tetap menyimpan lewat tombol Simpan yang sekarang di depan", async () => {
    const { props } = renderBaris();
    fireEvent.keyDown(screen.getByPlaceholderText("Apa yang perlu dikerjakan?"), {
      key: "Enter",
    });
    await Promise.resolve();
    expect(props.createSubtask).toHaveBeenCalledWith("induk-1");
  });
});

describe("IssueQuickCreateBar — tipe puncak (#604)", () => {
  const props = (lebih: Record<string, any> = {}) => ({
    quickCreateTitle: "Isu baru",
    setQuickCreateTitle: jest.fn(),
    createGlobalIssue: jest.fn(async () => {}),
    isCreating: false,
    inlineAddType: "Epic",
    setInlineAddType: jest.fn(),
    isInlineTypeOpen: "global" as string | null,
    setIsInlineTypeOpen: jest.fn(),
    inlineAddPriority: "Medium",
    setInlineAddPriority: jest.fn(),
    inlineAddAssigneeId: "",
    setInlineAddAssigneeId: jest.fn(),
    inlineAddSprintId: "",
    setInlineAddSprintId: jest.fn(),
    masterData: MASTER,
    projectMembers: anggota,
    sprints: [] as any[],
    ...lebih,
  });

  it("daftar tipe puncak menyisakan Epic/Story/Task/Bug dan membuang Sub-task", () => {
    render(<IssueQuickCreateBar {...(props() as any)} />);

    expect(screen.queryByRole("button", { name: /^Sub-task$/ })).toBeNull();
    for (const label of ["Epic", "Story", "Task", "Bug"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeTruthy();
    }
  });

  it("pilihan yang masih legal tidak ditimpa; nilai tidak legal dibawa ke Epic", () => {
    const masihLegal = props({ inlineAddType: "Bug" });
    render(<IssueQuickCreateBar {...(masihLegal as any)} />);
    expect(masihLegal.setInlineAddType).not.toHaveBeenCalled();

    const sisaBarisAnak = props({ inlineAddType: "Sub-task" });
    render(<IssueQuickCreateBar {...(sisaBarisAnak as any)} />);
    expect(sisaBarisAnak.setInlineAddType).toHaveBeenCalledWith("Epic");
  });

  it("panelnya membuka dengan kelas animasi standar dropdown", () => {
    const { container } = render(<IssueQuickCreateBar {...(props() as any)} />);
    const panel = container.querySelector(".animate-dropdown");
    expect(panel).not.toBeNull();
    // Kelas, bukan transisi inline: hanya ini yang dimatikan oleh
    // prefers-reduced-motion di index.css.
    expect(panel?.getAttribute("style")).toBeNull();
  });
});

describe("IssueTableRow — Hapus di depan (#604)", () => {
  const task = {
    id: "lan-1",
    projectId: "proj-1",
    key: "LAN-1",
    title: "Sambungkan gerbang",
    type: "task",
    status: "To Do",
    priority: "Medium",
    progress: 0,
    reporterId: "u1",
    createdAt: new Date("2026-10-01"),
    updatedAt: new Date("2026-10-02"),
  } as any;

  const renderRow = (lebih: Record<string, any> = {}) => {
    const deleteTask = jest.fn();
    const props = {
      task,
      depth: 0,
      canReorder: false,
      isCompact: false,
      isSelected: false,
      handleToggleSelectOne: jest.fn(),
      issueTableColumns: kolom(),
      expandedTasks: new Set<string>(),
      toggleTaskExpansion: jest.fn(),
      inlineAddingTaskId: null,
      setInlineAddingTaskId: jest.fn(),
      inlineTitleMap: {},
      setInlineTitleMap: jest.fn(),
      inlineAddType: "Epic",
      setInlineAddType: jest.fn(),
      isInlineTypeOpen: null,
      setIsInlineTypeOpen: jest.fn(),
      inlineAddPriority: "Medium",
      setInlineAddPriority: jest.fn(),
      inlineAddAssigneeId: "",
      setInlineAddAssigneeId: jest.fn(),
      isCreating: false,
      createSubtask: jest.fn(async () => {}),
      tasks: [task],
      masterData: MASTER,
      projectMembers: anggota,
      sprints: [],
      isUserReporter: () => true,
      canDeleteIssue: () => true,
      canEditIssue: () => true,
      canManageIssue: () => true,
      canChangeReporter: () => false,
      deleteTask,
      setSelectedTaskForDetail: jest.fn(),
      setIsTaskDetailModalOpen: jest.fn(),
      setCurrentView: jest.fn(),
      updateTaskField: jest.fn(),
      activeContextMenuTaskId: null,
      setActiveContextMenuTaskId: jest.fn(),
      ...lebih,
    };
    const { container } = render(
      <table>
        <tbody>
          <IssueTableRow {...(props as any)} />
        </tbody>
      </table>
    );
    return { container, deleteTask };
  };

  it("Hapus adalah tombol pertama baris dan berada di sel judul, bukan sel terakhir", () => {
    const { container } = renderRow();

    const hapus = screen.getByRole("button", { name: "Hapus Isu" });
    const tombol = Array.from(container.querySelectorAll("tr:first-of-type button"));
    expect(tombol[0]).toBe(hapus);

    const tds = Array.from(container.querySelectorAll("tr:first-of-type td"));
    const judul = screen.getByTitle("Klik untuk membuka halaman detail isu");
    expect(hapus.closest("td")).toBe(judul.closest("td"));
    expect(hapus.closest("td")).not.toBe(tds[tds.length - 1]);
  });

  it("wadah tombol Hapus selalu dipesan, jadi judul tidak bergeser saat hover", () => {
    const { container } = renderRow();
    const hapus = screen.getByRole("button", { name: "Hapus Isu" });
    const pembungkus = hapus.parentElement as HTMLElement;
    const judul = screen.getByTitle("Klik untuk membuka halaman detail isu");
    expect(pembungkus.contains(hapus)).toBe(true);
    expect(judul.closest("td")?.contains(pembungkus)).toBe(true);
    // Wadah tetap ada walau isinya baru muncul saat hover; kalau tidak,
    // setiap hover menggeser judul baris.
    expect(pembungkus.className).toMatch(/w-6/);
    expect(pembungkus.className).toMatch(/shrink-0/);
    expect(hapus.className).toMatch(/opacity-0 group-hover:opacity-100/);
  });

  it("tanpa izin hapus, jumlah tombol baris berkurang persis satu", () => {
    const dengan = renderRow().container.querySelectorAll("tr:first-of-type button").length;
    // Render ulang di dalam `it` yang sama menambah ke document, jadi keduanya
    // dibaca dari container masing-masing, bukan lewat screen.getByRole.
    const tanpa = renderRow({ canDeleteIssue: () => false }).container.querySelectorAll(
      "tr:first-of-type button"
    ).length;
    expect(tanpa).toBe(dengan - 1);
  });

  it("tetap menghapus task yang benar saat diklik", () => {
    const { deleteTask } = renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Hapus Isu" }));
    expect(deleteTask).toHaveBeenCalledWith("lan-1");
  });
});

describe("useIssueList — bawaan tipe isu baru (#604)", () => {
  const props = {
    tasks: [],
    roots: [],
    selectedProject: { id: "proj-1", name: "Proyek" },
    user: { uid: "u1" },
    masterData: MASTER,
    userRole: "Admin",
  } as any;

  it("bilah cepat mulai dengan Epic, bukan Task", () => {
    const { result } = renderHook(() => useIssueList(props));
    expect(result.current.inlineAddType).toBe("Epic");
  });
});
