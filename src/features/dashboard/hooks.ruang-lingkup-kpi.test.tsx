/** @jest-environment jsdom */
/**
 * Regresi ruang lingkup metrik KPI dashboard — item #129.
 * Ditemukan oleh /qa pada 22 Agustus 2026.
 * Laporan: .gstack/qa-reports/item-129-temuan.md
 *
 * Dua hal yang sebelumnya terbaca bertentangan di satu layar:
 *
 * 1. Keempat kartu KPI menghitung `nonEpicTasks`, sedangkan dropdown sprint
 *    dan kedua kartu "Rincian Tugas" menghitung `tasks` (Epic ikut). Di data
 *    produksi keduanya kebetulan 3 lawan 12 tanpa label apa pun.
 *
 * 2. `inProgressTasks` difilter `status !== Done/Selesai/Backlog` — artinya
 *    SEMUA yang belum selesai, termasuk To Do dan In Review. Tetapi dilabeli
 *    "In Progress", nama status harfiah yang di breakdown bernilai 0. Subset
 *    tampak lebih besar dari supersetnya.
 *
 * Data di bawah sengaja dibuat supaya tiap angka BERBEDA. Di produksi ketiganya
 * kebetulan sama-sama 3, dan itulah yang menyamarkan cacatnya selama ini.
 */
import { renderHook } from "@testing-library/react";
import { useDashboard } from "./hooks";
import { DashboardViewProps } from "./types";
import { Task } from "../../types";

const buatTask = (id: string, type: Task["type"], status: string): Task => ({
  id,
  projectId: "proj-1",
  key: `LAN-${id}`,
  title: `Task ${id}`,
  type,
  status,
  priority: "Medium",
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 4 Epic + 5 non-Epic = 9 total. Non-Epic: 1 Done, 1 Backlog, 3 belum selesai,
// dan hanya SATU di antaranya berstatus "In Progress" harfiah.
const tasks: Task[] = [
  buatTask("e1", "epic", "To Do"),
  buatTask("e2", "epic", "In Progress"),
  buatTask("e3", "epic", "Done"),
  buatTask("e4", "epic", "To Do"),
  buatTask("t1", "task", "Done"),
  buatTask("t2", "task", "Backlog"),
  buatTask("t3", "task", "To Do"),
  buatTask("t4", "task", "In Progress"),
  buatTask("t5", "bug", "In Review"),
];

const props = {
  tasks,
  sprints: [],
  projectMembers: [],
  activityLogs: [],
  selectedProject: null,
  setCurrentView: () => {},
  setSelectedTaskForDetail: () => {},
  setIsTaskDetailModalOpen: () => {},
} as unknown as DashboardViewProps;

describe("#129 ruang lingkup metrik KPI dashboard", () => {
  it("kartu KPI mengecualikan Epic, sementara daftar tugas penuh menyertakannya", () => {
    const { result } = renderHook(() => useDashboard(props));

    // Yang dipakai dropdown sprint dan kedua kartu "Rincian Tugas".
    expect(result.current.tasks).toHaveLength(9);
    // Yang dipakai keempat kartu KPI.
    expect(result.current.nonEpicTasks).toHaveLength(5);
    expect(result.current.totalTasks).toBe(5);

    // Selisihnya harus nyata, bukan kebetulan sama seperti di produksi.
    expect(result.current.totalTasks).not.toBe(result.current.tasks.length);
  });

  it("inProgressTasks berarti BELUM SELESAI, bukan status 'In Progress'", () => {
    const { result } = renderHook(() => useDashboard(props));

    // t3 (To Do), t4 (In Progress), t5 (In Review) — Done dan Backlog keluar.
    expect(result.current.inProgressTasks).toHaveLength(3);

    // Sedangkan status "In Progress" harfiah di seluruh tugas hanya 2 (e2, t4),
    // dan di antara non-Epic cuma 1 (t4). Angkanya memang berbeda — karena itu
    // sub-teks kartu tidak boleh menyebutnya "In Progress".
    const statusHarfiahNonEpic = result.current.nonEpicTasks.filter(
      (t) => t.status === "In Progress"
    );
    expect(statusHarfiahNonEpic).toHaveLength(1);
    expect(result.current.inProgressTasks.length).not.toBe(statusHarfiahNonEpic.length);
  });

  it("Backlog tidak dihitung sebagai belum selesai, tapi tetap masuk total", () => {
    const { result } = renderHook(() => useDashboard(props));

    expect(result.current.inProgressTasks.some((t) => t.status === "Backlog")).toBe(false);
    expect(result.current.nonEpicTasks.some((t) => t.status === "Backlog")).toBe(true);
  });

  it("persentase selesai dihitung terhadap non-Epic, bukan seluruh tugas", () => {
    const { result } = renderHook(() => useDashboard(props));

    // 1 dari 5 non-Epic selesai = 20%. Terhadap 9 tugas hasilnya 11%.
    expect(result.current.completedTasks).toHaveLength(1);
    expect(result.current.completionPercentage).toBe(20);
  });
});
