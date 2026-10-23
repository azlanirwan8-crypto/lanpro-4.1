/**
 * #802 — satu dialog hapus di layar rincian.
 *
 * Yang diuji adalah MEKANISMENYA, bukan tampilan. SweetAlert2 hanya punya satu
 * popup: `fire()` kedua menghancurkan popup pertama dan resolve-nya menjadi
 * `{ isDismissed: true }` (`node_modules/sweetalert2/dist/sweetalert2.esm.js:4502-4509`).
 *
 * Sebelum perbaikan, tombol hapus di seksi subtugas dan di sidebar membuka
 * dialognya SENDIRI, lalu memanggil `deleteTask` (yang membuka dialog KEDUA)
 * dan `showSuccessAlert` (dialog KETIGA) pada tick yang sama. Dialog ketiga itu
 * membatalkan dialog kedua sebelum pengguna sempat klik, jadi DELETE tidak
 * pernah dikirim sementara layar sudah bilang "Berhasil!".
 *
 * Karena itu penegasannya: SATU `Swal.fire` per klik, dan aksi hapus benar-
 * benar jalan setelah konfirmasi itu diterima.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Swal from "sweetalert2";
import { TaskSubtasksSection } from "./components/modal/TaskSubtasksSection";
import { TaskDetailSidebar } from "./components/modal/TaskDetailSidebar";
import { confirmDeleteAlert } from "../../lib/sweetalert";
import type { Task } from "../../types";

// Sidebar menarik milestone dan work log saat dipasang. Keduanya infra-struktur
// jaringan, bukan bagian yang sedang diuji. Fungsi biasa (bukan `jest.fn()`)
// supaya `resetMocks` bawaan Jest tidak menghapus isinya di antara test.
jest.mock("../timeline/milestone.service", () => ({
  fetchMilestones: () => Promise.resolve([]),
}));
jest.mock("../../services/taskService", () => ({
  fetchTaskWorkLogs: () => Promise.resolve({ status: "success", data: [] }),
  createTaskWorkLog: () => Promise.resolve({ status: "success" }),
}));

/** Popup SweetAlert2 — `role` tidak dipasang oleh pustakanya, jadi diambil via kelas. */
const popup = () => document.querySelector(".swal2-popup");

const tugas = (id: string, parentId?: string): Task =>
  ({
    id,
    key: `WMIR-${id}`,
    title: `Judul ${id}`,
    status: "To Do",
    priority: "Medium",
    type: "subtask",
    projectId: "proyek-1",
    parentId,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  }) as Task;

const INDUK = tugas("induk");
const ANAK = tugas("anak", "induk");

/**
 * Peniru `AppContainer.deleteTask`: konfirmasi SATU kali di dalam dirinya,
 * baru menghapus bila diterima. Persis kontrak yang dilanggar #802.
 */
const peniruDeleteTask =
  (terhapus: string[]) =>
  async (id: string): Promise<void> => {
    const diterima = await confirmDeleteAlert("Hapus Tugas?", `Yakin hapus ${id}?`);
    if (diterima) terhapus.push(id);
  };

afterEach(() => {
  Swal.close();
});

describe("#802 — hapus subtugas dari layar rincian", () => {
  it("klik tong sampah membuka SATU dialog, dan dialog itu tetap berdiri", async () => {
    const fire = jest.spyOn(Swal, "fire");
    const terhapus: string[] = [];

    render(
      <TaskSubtasksSection
        task={INDUK}
        tasks={[INDUK, ANAK]}
        isEditable
        updateTaskField={jest.fn()}
        deleteTask={peniruDeleteTask(terhapus)}
        projectMembers={[]}
        masterData={[]}
      />
    );

    fireEvent.click(screen.getByTitle("Hapus Subtugas"));

    await waitFor(() => expect(Swal.isVisible()).toBe(true));
    expect(fire).toHaveBeenCalledTimes(1);
    // Yang berdiri adalah dialog KONFIRMASI — bukan dialog sukses yang
    // membunuhnya. Ini inti regresi #802.
    expect(popup()).toHaveTextContent("Hapus Tugas?");
    expect(terhapus).toEqual([]);
  });

  it("konfirmasi yang diterima benar-benar menghapus subtugasnya", async () => {
    const terhapus: string[] = [];

    render(
      <TaskSubtasksSection
        task={INDUK}
        tasks={[INDUK, ANAK]}
        isEditable
        updateTaskField={jest.fn()}
        deleteTask={peniruDeleteTask(terhapus)}
        projectMembers={[]}
        masterData={[]}
      />
    );

    fireEvent.click(screen.getByTitle("Hapus Subtugas"));
    await waitFor(() => expect(Swal.isVisible()).toBe(true));

    await Swal.clickConfirm();

    // `deleteTask` masih menunggu resolve SweetAlert2, jadi hasilnya baru ada
    // satu tick kemudian.
    await waitFor(() => expect(terhapus).toEqual(["anak"]));
  });
});

describe("#802 — tombol Hapus Isu di sidebar rincian", () => {
  it("tidak menutup modal dan tidak membunyikan sukses; hanya satu dialog", async () => {
    const fire = jest.spyOn(Swal, "fire");
    const terhapus: string[] = [];

    render(
      <TaskDetailSidebar
        task={INDUK}
        masterData={[]}
        projectMembers={[]}
        sprints={[]}
        isEditable
        blockMember={false}
        isProjectMember={false}
        isReporter
        canManage
        canChangeReporter
        canDelete
        updateTaskField={jest.fn()}
        toggleBlockedStatus={jest.fn()}
        handleSuggestStoryPoints={jest.fn()}
        deleteTask={peniruDeleteTask(terhapus)}
        safeFormat={(d: any, f: string) => `${f}`}
      />
    );

    fireEvent.click(screen.getByText("Hapus Isu"));

    await waitFor(() => expect(Swal.isVisible()).toBe(true));
    expect(fire).toHaveBeenCalledTimes(1);
    expect(popup()).toHaveTextContent("Hapus Tugas?");
    expect(terhapus).toEqual([]);
  });
});
