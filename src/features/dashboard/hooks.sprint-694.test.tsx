/** @jest-environment jsdom */
/**
 * #694 (A') — saringan sprint di header Dashboard.
 *
 * CACAT ASLI. `selectedSprintFilter` menghasilkan satu array tersaring yang
 * hanya dibaca DUA panel (rincian jenis tugas dan rincian status). Empat kartu
 * KPI, Ringkasan Sprint, burndown, velocity, dan beban tim membaca feed yang
 * tidak tersaring. Hasilnya satu layar dengan dua ruang lingkup: memilih
 * "Release 11.0" mengubah bagian bawah layar dan membiarkan "Total Tugas" di
 * atas tetap menghitung semua sprint — persis cacat yang dilarang #129/#688.
 *
 * KENAPA JAWABANNYA DUA FEED, BUKAN SATU. Menyaring segalanya memang satu
 * baris, dan itulah yang merusak tiga panel:
 *   - `velocityData` berulang atas LIMA sprint terakhir. Feed yang dipotong ke
 *     satu sprint membuat empat batangnya jadi nol.
 *   - `burndownData` dan `sprintWorkloadData` memfilter ke sprint yang
 *     DITUNJUK. Kalau feed-nya sudah dipotong ke sprint lain, keduanya kosong.
 * Jadi layar ini punya dua feed: yang tersaring untuk angka milik satu sprint,
 * yang utuh untuk riwayat dan panel per-sprint. `sprintAcuan` adalah sprint
 * yang sedang ditunjuk — pilihan header, atau sprint aktif bila header di
 * "All Sprints".
 */
import { renderHook } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { useDashboard } from "./hooks";
import { DashboardViewProps } from "./types";
import { Sprint, Task } from "../../types";

const HARI = 24 * 60 * 60 * 1000;
const hari = (offset: number) => new Date(Date.now() + offset * HARI);

const buatTask = (id: string, sprintId: string, selesai = false): Task =>
  ({
    id,
    projectId: "proj-1",
    key: `LAN-${id}`,
    title: `Tugas ${id}`,
    type: "task",
    status: selesai ? "Done" : "To Do",
    priority: "Medium",
    sprintId,
    createdAt: hari(-10),
    updatedAt: hari(-1),
  }) as Task;

const sprints: Sprint[] = [
  { id: "s-lama", name: "Rilis 10", startDate: hari(-30), endDate: hari(-20) },
  { id: "s-aktif", name: "Rilis 11", startDate: hari(-3), endDate: hari(+4), status: "active" },
  { id: "s-depan", name: "Rilis 12", startDate: hari(+10), endDate: hari(+17) },
] as unknown as Sprint[];

// Angka dibuat BERBEDA per sprint supaya "satu layar dua ruang lingkup" tidak
// bisa lolos dengan kebetulan sama: 2 + 5 + 1 tugas, 1 tanpa sprint.
const semuaTugas: Task[] = [
  buatTask("a1", "s-lama"),
  buatTask("a2", "s-lama", true),
  buatTask("b1", "s-aktif"),
  buatTask("b2", "s-aktif"),
  buatTask("b3", "s-aktif", true),
  buatTask("b4", "s-aktif"),
  buatTask("b5", "s-aktif", true),
  buatTask("c1", "s-depan"),
  buatTask("z1", ""),
];

const propsUntuk = (sprintIdTerpilih: string | null): DashboardViewProps => {
  const tersaring = sprintIdTerpilih
    ? semuaTugas.filter((t) => String(t.sprintId || "") === sprintIdTerpilih)
    : semuaTugas;
  return {
    tasks: tersaring,
    tasksSemuaSprint: semuaTugas,
    sprintIdTerpilih,
    sprints,
    projectMembers: [],
    activityLogs: [],
    selectedProject: null,
    setCurrentView: () => {},
    setSelectedTaskForDetail: () => {},
    setIsTaskDetailModalOpen: () => {},
  } as unknown as DashboardViewProps;
};

describe("#694 pilihan sprint berlaku ke seluruh layar", () => {
  it("KPI mengikuti sprint yang dipilih", () => {
    const { result } = renderHook(() => useDashboard(propsUntuk("s-aktif")));

    // s-aktif punya 5 tugas, seluruhnya 9. Kalau kartu KPI masih membaca feed
    // utuh, angka ini 9 dan bug #694 hidup lagi.
    expect(result.current.totalTasks).toBe(5);
    expect(result.current.completedTasks).toHaveLength(2);
  });

  it("panel per-sprint menunjuk sprint yang DIPILIH, bukan sprint aktif", () => {
    const dipilih = renderHook(() => useDashboard(propsUntuk("s-depan"))).result.current;

    expect(dipilih.sprintAcuan?.id).toBe("s-depan");
    expect(dipilih.activeSprint?.id).toBe("s-aktif");
    // s-depan punya 1 tugas. Bila yang dipakai masih sprint aktif, hasilnya 5.
    expect(dipilih.sprintTotalTasks).toBe(1);
    expect(dipilih.burndownData.length).toBeGreaterThan(0);
  });

  it("tanpa pilihan, yang ditunjuk tetap sprint aktif", () => {
    const { result } = renderHook(() => useDashboard(propsUntuk(null)));

    expect(result.current.sprintAcuan?.id).toBe("s-aktif");
    expect(result.current.totalTasks).toBe(9);
    expect(result.current.sprintTotalTasks).toBe(5);
  });

  it("riwayat velocity tetap lima sprint walau satu dipilih", () => {
    const { result } = renderHook(() => useDashboard(propsUntuk("s-aktif")));

    const velocity = result.current.velocityData;
    expect(velocity).toHaveLength(3);
    // Ini inti A': empat batang lain TIDAK runtuh jadi nol.
    expect(velocity.find((v) => v.name === "Rilis 10")?.Planned).toBe(2);
    expect(velocity.find((v) => v.name === "Rilis 12")?.Planned).toBe(1);
  });
});

/**
 * Kontrak pemasangan di sisi layar. Test di atas membuktikan `useDashboard`
 * benar MUNGKIN diberi dua feed; yang ini membuktikan layar memang memberinya.
 * Tanpa ini, `tasksSemuaSprint` bisa dibiarkan kosong selamanya dan seluruh
 * test di atas tetap hijau.
 */
describe("#694 DashboardView menyambung pilihan sprint ke titik potong", () => {
  const sumber = readFileSync(join(__dirname, "DashboardView.tsx"), "utf8");

  it("kedua feed dan id sprint yang dipilih diteruskan ke useDashboard", () => {
    expect(sumber).toMatch(/tasksSemuaSprint:\s*tasksDalamLingkup/);
    expect(sumber).toMatch(/tasks:\s*tasksTersaring/);
    expect(sumber).toMatch(/sprintIdTerpilih,/);
  });

  it("pilihan sprint tidak lagi menggerakkan panel sendiri di dalam layar", () => {
    // `filteredTasks` adalah nama dari keadaan rusak: satu saringan, dua
    // pembaca. Ia tidak boleh hidup lagi sebagai data.
    expect(sumber).not.toMatch(/const filteredTasks/);
  });
});
