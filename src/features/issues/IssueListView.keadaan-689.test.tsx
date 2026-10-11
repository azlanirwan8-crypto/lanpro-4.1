/** @jest-environment jsdom */
/**
 * #689 butir (d) — layar Isu hanya punya satu pesan kosong untuk empat sebab.
 *
 * `IssueListView.tsx:473` dulu membedakan dua keadaan saja
 * (`lingkup === "mine" && tasks.length === 0`), jadi:
 *
 *   - filter klien yang terlalu sempit disebut "tidak ada tugas untukmu",
 *   - halaman yang lewat dari akhir daftar disebut "tidak ada hasil",
 *   - dan kegagalan `fetchTasks` tidak pernah tampil di layar sama sekali —
 *     `AppContainer.tsx:1207` menangkap errornya ke `console` saja, sehingga
 *     baris dari respons sebelumnya tetap terpampang seolah-olah data baru.
 *
 * Empat sebab itu dibentuk lewat props (dan satu lewat kotak pencarian), karena
 * keputusan "sebab mana yang sedang terjadi" memang dibaca dari angka-angka itu.
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

jest.mock("@hello-pangea/dnd", () => ({
  // DragDropContext menerima anak biasa (ReactNode); Droppable/Draggable
  // memakai render-prop, jadi bentuknya berbeda dan tidak boleh ditukar.
  DragDropContext: ({ children }: any) => children,
  Droppable: ({ children }: any) => children({ innerRef: () => {}, droppableProps: {} }, {}),
  Draggable: ({ children }: any) =>
    children({ innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} }, {}),
}));
jest.mock("../../contexts/MobileActionContext", () => ({
  useMobileAction: () => ({ registerAction: jest.fn(), unregisterAction: jest.fn() }),
}));
jest.mock("./services/issues.service", () => ({
  createTask: jest.fn(),
  reorderTasks: jest.fn(),
}));

import { IssueListView } from "./IssueListView";
import { akarDaftar } from "./lib/akarDaftar";
import { useProjectStore } from "../../store/stores";
import type { MasterData, Task, UserProfile } from "../../types";

const ORANG = { uid: "u1", id: "u1", email: "saya@contoh.test" } as UserProfile;

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Judul ${id}`,
    type: "task",
    status: "todo",
    priority: "Medium",
    assigneeId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const masterData: MasterData[] = [
  { id: "todo", type: "status", code: "todo", label: "To Do", order: 1 } as MasterData,
];

const akar = [tugas("a"), tugas("b"), tugas("c")];

// Filter sesi disimpan di localStorage PER PROYEK (`issueFilterSnapshot.ts:135`).
// Tanpa id proyek yang berbeda tiap test, kata pencarian dari test saringan
// merembes ke test berikutnya dan daftar yang seharusnya berisi jadi kosong.
let nomorProyek = 0;

const props = (ubahan: Record<string, unknown> = {}) =>
  ({
    projectRole: "admin",
    tasks: [],
    roots: [],
    sprints: [],
    projectMembers: [],
    allUsers: [ORANG],
    masterData,
    userRole: "admin",
    user: ORANG,
    currentUserProfile: ORANG,
    hasPermission: () => true,
    updateTaskField: () => {},
    handleQuickCreate: () => {},
    setSelectedTaskForDetail: () => {},
    setIsTaskDetailModalOpen: () => {},
    selectedProject: { id: `p-${nomorProyek}`, name: "Siklus" },
    fetchTasks: jest.fn(),
    issueListPage: 1,
    setIssueListPage: jest.fn(),
    issueListSearch: "",
    setIssueListSearch: () => {},
    issueListMeta: { total: 0, page: 1, limit: 25, totalPages: 0 },
    ...ubahan,
  }) as any;

describe("#689 keadaan kosong Issue List", () => {
  beforeEach(async () => {
    localStorage.clear();
    nomorProyek += 1;
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("id");
    useProjectStore.getState().setMuatDaftarIsu("diam");
    useProjectStore.getState().setLingkupTugas("all");
    sessionStorage.clear();
  });
  afterEach(cleanup);

  it("proyek yang belum punya isu", async () => {
    render(<IssueListView {...props()} />);
    expect(await screen.findByTestId("isu-kosong-kosong")).toHaveTextContent("Belum ada isu");
  });

  it("baris dikirim server, tetapi saringan klien membuangnya semua", async () => {
    render(
      <IssueListView
        {...props({
          tasks: akar,
          roots: akarDaftar(akar),
          issueListMeta: { total: 3, page: 1, limit: 25, totalPages: 1 },
        })}
      />
    );
    // Judul tampil dua kali di DOM (kartu mobile dan baris desktop); yang
    // disembunyikan hanyalah CSS-nya, jadi `findByText` tunggal akan gagal.
    expect((await screen.findAllByText("Judul a")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText(/cari/i), {
      target: { value: "tidak-ada-judul-ini" },
    });

    const kotak = await screen.findByTestId("isu-kosong-tidakCocok");
    expect(kotak).toHaveTextContent("Tidak ada isu yang cocok dengan filter ini");
    // Cause nomor satu tidak boleh ikut muncul: datanya ada, hanya saringannya
    // yang terlalu sempit.
    expect(screen.queryByTestId("isu-kosong-kosong")).toBeNull();
  });

  it("'My Tasks' yang nihil menyebut lingkup, bukan proyeknya", async () => {
    useProjectStore.getState().setLingkupTugas("mine");
    render(<IssueListView {...props()} />);
    expect(await screen.findByTestId("isu-kosong-bukanMilikSaya")).toHaveTextContent(
      "Tidak ada yang ditugaskan kepada Anda di sini"
    );
  });

  it("halaman lewat dari akhir daftar menawarkan jalan kembali", async () => {
    const pindah = jest.fn();
    render(
      <IssueListView
        {...props({
          issueListPage: 7,
          setIssueListPage: pindah,
          issueListMeta: { total: 128, page: 7, limit: 25, totalPages: 6 },
        })}
      />
    );
    const kotak = await screen.findByTestId("isu-kosong-halamanLewat");
    expect(kotak).toHaveTextContent("Halaman ini lewat dari akhir daftar");
    fireEvent.click(screen.getByTestId("isu-ke-halaman-pertama"));
    expect(pindah).toHaveBeenCalledWith(1);
  });

  it("permintaan yang gagal memberi tahu, dan menawarkan ulang", async () => {
    const fetchTasks = jest.fn();
    useProjectStore.getState().setMuatDaftarIsu("galat");
    render(
      <IssueListView
        {...props({
          tasks: akar,
          roots: akarDaftar(akar),
          fetchTasks,
          issueListMeta: { total: 3, page: 1, limit: 25, totalPages: 1 },
        })}
      />
    );
    expect(await screen.findByTestId("isu-galat-muat")).toHaveTextContent(
      "Daftar isu gagal dimuat"
    );
    fireEvent.click(screen.getByTestId("isu-coba-lgi"));
    expect(fetchTasks).toHaveBeenCalledWith(
      expect.objectContaining({ rootsOnly: true, page: 1, limit: 25 })
    );
  });

  it("baris yang tampil tidak memunculkan pesan kosong sama sekali", async () => {
    render(
      <IssueListView
        {...props({
          tasks: akar,
          roots: akarDaftar(akar),
          issueListMeta: { total: 3, page: 1, limit: 25, totalPages: 1 },
        })}
      />
    );
    // Judul tampil dua kali di DOM (kartu mobile dan baris desktop); yang
    // disembunyikan hanyalah CSS-nya, jadi `findByText` tunggal akan gagal.
    expect((await screen.findAllByText("Judul a")).length).toBeGreaterThan(0);
    expect(screen.queryByTestId(/^isu-kosong-/)).toBeNull();
    expect(screen.queryByTestId("isu-galat-muat")).toBeNull();
  });
});
