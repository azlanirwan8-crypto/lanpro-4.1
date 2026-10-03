/**
 * #593 — Enter untuk menyimpan di formulir yang dulu hanya bisa diklik.
 *
 * Yang diuji di sini tiga hal yang berbeda sifatnya:
 * 1. kolom nama/judul sebuah formulir = simpan (enterUntukSimpan, #592);
 * 2. kolom PENCARIAN di dalam `<form>` sungguhan tidak boleh ikut mengirim
 *    formnya — tiket bug dibuat hanya karena seseorang menekan Enter saat
 *    menyaring daftar tugas induk;
 * 3. kolom judul di form yang sama justru HARUS tetap mengirim (itu perilaku
 *    bawaan yang diinginkan), jadi asersinya dibalik.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditSuiteModal } from "./EditSuiteModal";
import { EditCaseModal } from "./EditCaseModal";
import { CreateBugTicketModal } from "./CreateBugTicketModal";

describe("EditSuiteModal — Enter menyimpan (#593)", () => {
  const props = (lebih: Record<string, unknown> = {}) => ({
    suite: { id: "s1", name: "Suite Lama", phase: "Plan" } as any,
    onClose: jest.fn(),
    editName: "Suite Baru",
    onNameChange: jest.fn(),
    editAssignedTo: "",
    onAssignedToChange: jest.fn(),
    onSubmit: jest.fn(),
    ...lebih,
  });

  it("Enter pada kolom nama menyimpan suite", () => {
    const p = props();
    render(<EditSuiteModal {...(p as any)} />);
    const kolom = screen.getByDisplayValue("Suite Baru");
    expect(fireEvent.keyDown(kolom, { key: "Enter" })).toBe(false);
    expect(p.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("nama kosong tidak disimpan oleh Enter", () => {
    const p = props({ editName: "" });
    render(<EditSuiteModal {...(p as any)} />);
    fireEvent.keyDown(screen.getAllByRole("textbox")[0], { key: "Enter" });
    expect(p.onSubmit).not.toHaveBeenCalled();
  });

  it("Enter dari komposisi IME bukan perintah menyimpan", () => {
    const p = props();
    render(<EditSuiteModal {...(p as any)} />);
    fireEvent.keyDown(screen.getByDisplayValue("Suite Baru"), {
      key: "Enter",
      isComposing: true,
    });
    expect(p.onSubmit).not.toHaveBeenCalled();
  });
});

describe("EditCaseModal — Enter menyimpan (#593)", () => {
  const props = (lebih: Record<string, unknown> = {}) => ({
    testCase: { id: "c1", title: "Lama" } as any,
    onClose: jest.fn(),
    editTitle: "Judul kasus baru",
    onTitleChange: jest.fn(),
    editSteps: "",
    onStepsChange: jest.fn(),
    editExpected: "",
    onExpectedChange: jest.fn(),
    editPriority: "Medium" as const,
    onPriorityChange: jest.fn(),
    editAssignedTo: "",
    onAssignedToChange: jest.fn(),
    onSubmit: jest.fn(),
    ...lebih,
  });

  it("Enter pada kolom judul menyimpan kasus", () => {
    const p = props();
    render(<EditCaseModal {...(p as any)} />);
    fireEvent.keyDown(screen.getByDisplayValue("Judul kasus baru"), { key: "Enter" });
    expect(p.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Enter di kolom langkah (textarea) tidak mengirim form", () => {
    const p = props();
    render(<EditCaseModal {...(p as any)} />);
    const textarea = document.querySelector("textarea");
    expect(textarea).not.toBeNull();
    expect(fireEvent.keyDown(textarea as HTMLElement, { key: "Enter" })).toBe(true);
    expect(p.onSubmit).not.toHaveBeenCalled();
  });
});

describe("CreateBugTicketModal — Enter di pencarian TIDAK membuat tiket (#593)", () => {
  const props = () => {
    const onSubmit = jest.fn();
    return {
      onSubmit,
      lain: {
        isOpen: true,
        onClose: jest.fn(),
        testCase: { id: "c1", title: "Kasus gagal" } as any,
        titleInput: "",
        onTitleChange: jest.fn(),
        selectedParentId: "",
        onParentSelect: jest.fn(),
        parentSearchTerm: "Laporan",
        onSearchTermChange: jest.fn(),
        priorityInput: "Medium",
        onPriorityChange: jest.fn(),
        assigneeInput: "",
        onAssigneeChange: jest.fn(),
        descriptionInput: "",
        onDescriptionChange: jest.fn(),
        isSubmitting: false,
        tasks: [] as any[],
        projectMembers: [] as any[],
        selectedProject: { id: "p1", name: "Proyek Uji" } as any,
      },
    };
  };

  const bukaPencarian = () => {
    fireEvent.click(screen.getByRole("button", { name: /Pilih Target|Select Target/i }));
    return screen.getByPlaceholderText(/Cari nama Epic|Search .*Epic/i);
  };

  it("Enter saat menyaring tugas induk dicegah tindakan bawaannya", () => {
    const { onSubmit, lain } = props();
    render(<CreateBugTicketModal {...({ ...lain, onSubmit } as any)} />);
    const cari = bukaPencarian();

    expect(fireEvent.keyDown(cari, { key: "Enter" })).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter pada kolom judul tiket tetap diserahkan ke form (bawaan yang diinginkan)", () => {
    const { onSubmit, lain } = props();
    render(<CreateBugTicketModal {...({ ...lain, onSubmit } as any)} />);
    const judul = document.querySelector("#create-bug-ticket-form input[required]") as HTMLElement;
    expect(judul).not.toBeNull();
    expect(fireEvent.keyDown(judul, { key: "Enter" })).toBe(true);
  });

  it("pemilih tugas induk bisa dibuka dengan keyboard (#594)", () => {
    const { onSubmit, lain } = props();
    render(<CreateBugTicketModal {...({ ...lain, onSubmit } as any)} />);
    const pemicu = screen.getByRole("button", { name: /Pilih Target|Select Target/i });

    expect(pemicu.getAttribute("tabindex")).toBe("0");
    expect(pemicu.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(pemicu, { key: "Enter" });

    expect(screen.queryByPlaceholderText(/Cari nama Epic|Search .*Epic/i)).not.toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
