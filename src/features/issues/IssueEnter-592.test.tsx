/**
 * #592 — Enter untuk membuat task di Daftar Isu, di semua peramban.
 *
 * Yang diuji bukan hanya "Enter membuat task", tapi dua hal yang bikin dia
 * mati di Chrome: fokus yang hilang setelah memilih nilai di baris yang sama,
 * dan Enter yang datang dari komposisi IME (bukan dari tombol Enter sungguhan).
 */
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { IssueQuickCreateBar } from "./components/list/IssueQuickCreateBar";
import { IssueTableInlineAddRow } from "./components/list/IssueTableInlineAddRow";

// `motion.tr` punya `layout`: animasinya menjalankan rAF yang tidak sempat
// selesai saat suite jsdom ditutup, dan jest memaksa worker keluar paksa.
// Yang diuji di sini logika Enter, bukan animasinya.
jest.mock("motion/react", () => {
  const asli = jest.requireActual("motion/react");
  const R = require("react");
  const tr = R.forwardRef((props: any, ref: any) => {
    const { layout: _, transition: __, ...lan } = props; // prop animasi sengaja dibuang
    return R.createElement("tr", { ...lan, ref });
  });
  return {
    ...asli,
    motion: new Proxy(asli.motion, { get: (target, key) => (key === "tr" ? tr : target[key]) }),
  };
});

const MASTER = [
  { id: "1", type: "issue_type", label: "Task", code: "task", color: "#405189", icon: "Zap" },
  { id: "2", type: "priority", label: "High", code: "high", color: "#EF4444", icon: "ArrowUp" },
] as any[];

const anggota = [{ uid: "u1", displayName: "Azlan", email: "a@b.c" }] as any[];

const barisProps = (lebih: Record<string, any> = {}) => ({
  quickCreateTitle: "Task baru",
  setQuickCreateTitle: jest.fn(),
  createGlobalIssue: jest.fn(async () => {}),
  isCreating: false,
  inlineAddType: "Task",
  setInlineAddType: jest.fn(),
  isInlineTypeOpen: null as string | null,
  setIsInlineTypeOpen: jest.fn(),
  inlineAddPriority: "Medium",
  setInlineAddPriority: jest.fn(),
  inlineAddAssigneeId: "",
  setInlineAddAssigneeId: jest.fn(),
  inlineAddSprintId: "",
  setInlineAddSprintId: jest.fn(),
  masterData: MASTER,
  projectMembers: anggota,
  sprints: [{ id: "s1", name: "Sprint 1" }] as any[],
  ...lebih,
});

const kolomJudul = () => screen.getByPlaceholderText(/tekan Enter untuk menyimpan/i);

describe("IssueQuickCreateBar — Enter (#592)", () => {
  it("Enter di kolom judul membuat task dan kejadian bawaannya dicegah", () => {
    const props = barisProps();
    render(<IssueQuickCreateBar {...(props as any)} />);
    const input = kolomJudul();
    // fireEvent mengembalikan false begitu handler memanggil preventDefault.
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    expect(props.createGlobalIssue).toHaveBeenCalledTimes(1);
  });

  it("Enter dari komposisi IME bukan perintah menyimpan", () => {
    const props = barisProps();
    render(<IssueQuickCreateBar {...(props as any)} />);
    const input = kolomJudul();
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(props.createGlobalIssue).not.toHaveBeenCalled();
  });

  it("fokus kembali ke kolom judul sesudah memilih Sprint, jadi Enter berikutnya hidup", () => {
    const props = barisProps();
    render(<IssueQuickCreateBar {...(props as any)} />);
    const input = kolomJudul();

    // Chrome memindahkan fokus ke tombol yang diklik; panelnya lalu
    // unmount dan fokus jatuh ke <body> - itulah yang membunuh Enter.
    const pemicu = screen.getByRole("button", { name: /Backlog/ });
    fireEvent.click(pemicu);
    pemicu.focus();
    const opsi = screen.getByRole("button", { name: /Sprint 1/ });
    opsi.focus();
    fireEvent.click(opsi);

    expect(props.setInlineAddSprintId).toHaveBeenCalledWith("s1");
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Enter" });
    expect(props.createGlobalIssue).toHaveBeenCalledTimes(1);
  });

  it("fokus kembali ke kolom judul sesudah memilih tipe dari panelnya", () => {
    const props = barisProps({ isInlineTypeOpen: "global" });
    render(<IssueQuickCreateBar {...(props as any)} />);
    const input = kolomJudul();

    fireEvent.click(screen.getByRole("button", { name: /^Task$/ }));

    expect(props.setInlineAddType).toHaveBeenCalledWith("Task");
    expect(document.activeElement).toBe(input);
  });
});

describe("IssueTableInlineAddRow — Enter subtask (#592)", () => {
  const propsSubtask = (lebih: Record<string, any> = {}) => ({
    taskId: "induk-1",
    depth: 0,
    canReorder: false,
    isCompact: false,
    issueTableColumns: [
      { id: "work", visible: true },
      { id: "priority", visible: true },
    ],
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

  const kolomSubtask = () => screen.getByPlaceholderText("Apa yang perlu dikerjakan?");

  it("Enter membuat subtask, tanpa kejadian bawaan", () => {
    const props = propsSubtask();
    render(
      <table>
        <tbody>
          <IssueTableInlineAddRow {...(props as any)} />
        </tbody>
      </table>
    );
    expect(fireEvent.keyDown(kolomSubtask(), { key: "Enter" })).toBe(false);
    expect(props.createSubtask).toHaveBeenCalledWith("induk-1");
  });

  it("Enter dari komposisi IME tidak membuat subtask", () => {
    const props = propsSubtask();
    render(
      <table>
        <tbody>
          <IssueTableInlineAddRow {...(props as any)} />
        </tbody>
      </table>
    );
    fireEvent.keyDown(kolomSubtask(), { key: "Enter", isComposing: true });
    expect(props.createSubtask).not.toHaveBeenCalled();
  });

  it("fokus kembali ke kolom judul sesudah memilih prioritas", () => {
    const props = propsSubtask({ isInlineTypeOpen: null });
    render(
      <table>
        <tbody>
          <IssueTableInlineAddRow {...(props as any)} />
        </tbody>
      </table>
    );
    const input = kolomSubtask();

    const pemicu = screen.getByRole("button", { name: /Medium/ });
    fireEvent.click(pemicu);
    pemicu.focus();
    const opsi = screen.getByRole("button", { name: /High/ });
    opsi.focus();
    fireEvent.click(opsi);

    expect(props.setInlineAddPriority).toHaveBeenCalledWith("High");
    expect(document.activeElement).toBe(input);
  });
});
