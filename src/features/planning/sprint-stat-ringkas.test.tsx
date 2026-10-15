/** @jest-environment jsdom */
/**
 * Ringkasan sprint dua baris + panel beban per anggota.
 *
 * Permintaan pemilik (15 Okt): empat kartu besar di kepala sprint dikecilkan
 * menjadi dua baris — baris 1 Isu total dan Hold (menggantikan Poin), baris 2
 * Kemajuan (%) dan Selesai — disandingkan panel jumlah tugas per penanggung
 * jawab berbentuk progress bar dengan tinggi yang sama.
 *
 * Yang diuji di sini adalah perilakunya, bukan kelas CSS-nya: Hold dihitung dari
 * baris MasterData (bukan string keras), Poin benar-benar hilang dari kartu, dan
 * tiap anggota menampilkan rasio tugas selesai terhadap tugas miliknya sendiri.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { SprintSection } from "./SprintSection";
import type { MasterData, Sprint, Task, UserProfile } from "../../types";

const masterData: MasterData[] = [
  { id: "p-hold", type: "priority", code: "hold", label: "Tahan", order: 1 } as MasterData,
  { id: "p-high", type: "priority", code: "high", label: "High", order: 2 } as MasterData,
  {
    id: "s-todo",
    type: "status",
    code: "todo",
    label: "To Do",
    isTerminal: false,
    order: 1,
  } as MasterData,
  {
    id: "s-done",
    type: "status",
    code: "done",
    label: "Done",
    isTerminal: true,
    order: 2,
  } as MasterData,
];

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Judul ${id}`,
    type: "task",
    status: "todo",
    priority: "high",
    sprintId: "s1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const sprint = {
  id: "s1",
  projectId: "p1",
  name: "Sprint Satu",
  // `planned`, bukan `active`: sprint aktif otomatis terbuka, dan `Droppable`
  // di dalamnya butuh `DragDropContext` yang tidak dipasang di test ini.
  status: "planned",
  startDate: new Date("2026-10-01"),
  endDate: new Date("2026-10-14"),
} as Sprint;

const projectMembers: UserProfile[] = [
  { uid: "u1", id: "u1", displayName: "Siti Aminah", email: "siti@contoh.test" },
  { uid: "u2", id: "u2", name: "Budi", email: "budi@contoh.test" },
] as unknown as UserProfile[];

const tasks: Task[] = [
  tugas("a", { assigneeId: "u1", priority: "hold" }),
  tugas("b", { assigneeId: "u1", status: "done" }),
  tugas("c", { assigneeId: "u2" }),
  tugas("d", { assigneeId: undefined }),
];

const pasang = (daftarTugas: Task[] = tasks, daftarMaster: MasterData[] = masterData) =>
  render(
    <SprintSection
      sprints={[sprint]}
      tasks={daftarTugas}
      masterData={daftarMaster}
      projectMembers={projectMembers}
      expandedSprintId={null}
      setExpandedSprintId={() => {}}
      renderDraggableTask={(task: Task) => <div key={task.id}>{task.title}</div>}
      handleStartSprint={() => {}}
      handleCompleteSprint={() => {}}
      handleDeleteSprint={() => {}}
      canEditPlanning={false}
      setEditingSprint={() => {}}
      setIsEditSprintModalOpen={() => {}}
    />
  );

/** Angka besar di atas sebuah label kartu ringkasan. */
const nilaiKartu = (label: string) => {
  const elLabel = screen.getByText((teks, node) => node?.textContent === label && !!teks);
  const wadah = elLabel.parentElement;
  if (!wadah) throw new Error(`label ${label} tidak punya wadah`);
  return wadah.firstElementChild?.textContent ?? "";
};

const barisAnggota = (nama: string) => {
  const el = screen.getByText(nama).closest('[data-testid="kartu-beban"]');
  if (!el) throw new Error(`baris ${nama} tidak ditemukan`);
  return el as HTMLElement;
};

const lebarBar = (nama: string) => {
  const bar = barisAnggota(nama).querySelector<HTMLElement>("[style*='width']");
  return bar?.style.width ?? "";
};

describe("ringkasan sprint dua baris", () => {
  it("baris 1: total isu dan jumlah hold dari MasterData", () => {
    pasang();
    expect(nilaiKartu("Isu")).toBe("4");
    expect(nilaiKartu("Hold")).toBe("1");
  });

  it("hold dikenali dari label master, bukan dari kata 'hold' di kode", () => {
    // Prioritas "hold" tidak ada di master; yang ada label "Tahan" dengan kode
    // "hold". Tugas berlabel "Tahan" harus tetap terhitung.
    pasang([tugas("e", { priority: "Tahan" }), tugas("f", { priority: "high" })]);
    expect(nilaiKartu("Hold")).toBe("1");
  });

  it("kartu Poin diganti Hold — tidak ada lagi kartu poin", () => {
    pasang();
    expect(screen.queryByText("Poin")).toBeNull();
    expect(screen.getByText("Hold")).toBeInTheDocument();
  });

  it("baris 2: kemajuan persen dan rasio selesai", () => {
    pasang();
    expect(nilaiKartu("Selesai")).toBe("1/4");
    expect(screen.getByText("Kemajuan · 1/4")).toBeInTheDocument();
    expect(nilaiKartu("Kemajuan · 1/4")).toBe("25%");
  });

  it("empat kartu tersusun dua baris, bukan satu baris empat kolom", () => {
    const { container } = pasang();
    const grid = screen.getByText("Isu").closest(".grid-cols-2");
    expect(grid).toBeTruthy();
    expect(grid!.children).toHaveLength(4);
    expect(container.querySelector(".md\\:grid-cols-4")).toBeNull();
  });
});

describe("panel beban per anggota", () => {
  it("nama anggota diambil dari projectMembers, rasionya selesai/ditugaskan", () => {
    pasang();
    expect(screen.getByText("Siti Aminah")).toBeInTheDocument();
    // Siti punya 2 tugas, satu di antaranya berstatus terminal.
    expect(barisAnggota("Siti Aminah").textContent).toContain("1/2");
    expect(barisAnggota("Budi").textContent).toContain("0/1");
  });

  it("lebar bar = porsi tugas selesai milik anggota itu sendiri", () => {
    pasang();
    expect(lebarBar("Siti Aminah")).toBe("50%");
    expect(lebarBar("Budi")).toBe("0%");
  });

  it("nama anggota tidak dipotong elipsis dan tidak memakai tooltip", () => {
    pasang();
    const nama = screen.getByText("Siti Aminah");
    expect(nama.className).not.toContain("truncate");
    expect(nama.getAttribute("title")).toBeNull();
  });

  it("track bar tetap terlihat walau isinya nol persen", () => {
    pasang();
    const isi = barisAnggota("Budi").querySelector<HTMLElement>("[style*='width']");
    const track = isi?.parentElement;
    expect(track?.className).toContain("bg-surface-sunken");
    expect(track?.className).toContain("border-border-subtle");
    expect(lebarBar("Budi")).toBe("0%");
  });

  it("judul panel dan hitungan anggota di pojok sudah dihapus", () => {
    pasang();
    expect(screen.queryByText("Beban per anggota")).toBeNull();
  });

  it("kartu anggota tersusun dalam grid dua kolom yang lebarnya sama", () => {
    pasang();
    const kartu = barisAnggota("Siti Aminah");
    const deret = kartu.parentElement;
    expect(deret?.className).toContain("md:grid-cols-2");
    // Semua kartu berbagi induk yang sama, jadi lebarnya sama rata.
    expect(deret?.children).toHaveLength(3);
    expect(barisAnggota("Budi").parentElement).toBe(deret);
  });

  it("persentase tercetak tepat sekali di ujung bar, tanpa pil duplikat di atas", () => {
    pasang();
    const kartu = barisAnggota("Siti Aminah");
    const persen = Array.from(kartu.querySelectorAll("span")).filter(
      (s) => s.textContent === "50%"
    );
    expect(persen).toHaveLength(1);
    expect(persen[0].className).not.toContain("opacity-0");
  });

  it("tugas tanpa penanggung jawab tetap terlihat, tidak hilang dari hitungan", () => {
    pasang();
    expect(screen.getByText("Belum Ditugaskan")).toBeInTheDocument();
    expect(barisAnggota("Belum Ditugaskan").textContent).toContain("0/1");
  });

  it("sprint tanpa tugas menampilkan keadaan kosong, bukan bar kosong", () => {
    pasang([]);
    expect(screen.getByText("Belum ada tugas yang ditugaskan")).toBeInTheDocument();
    expect(screen.queryByText("Siti Aminah")).toBeNull();
  });
});
