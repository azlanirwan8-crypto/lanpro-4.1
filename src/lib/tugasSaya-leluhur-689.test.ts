/**
 * #689 — `tutupLeluhur` dijaga di tingkat definisi, bukan di tingkat layar.
 *
 * Fungsi ini adalah tambalan untuk cacat yang hanya muncul saat layar
 * MENGELAMPOKKAN kartu per induk: penyaring "My Tasks" membuang epic milik
 * orang lain, dan kartu milik saya yang bergendong di bawahnya kehilangan
 * tempat duduk. Kalau aturannya hanya ditulis di salah satu layar, layar
 * berikutnya mengulang cacat yang sama — itu persis sebab #688 dulu punya tiga
 * pengertian "milik saya".
 */
import { tutupLeluhur, saringMenurutLingkup } from "./tugasSaya";
import type { Task } from "../types";

const MILIKKU = "uid-saya";
const MILIK_ORANG = "uid-orang";
const orang = { uid: MILIKKU, id: MILIKKU, email: "saya@contoh.test" };

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Judul ${id}`,
    type: "task",
    status: "todo",
    priority: "Medium",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const idDari = (daftar: (Task | null | undefined)[]) => daftar.map((t) => t?.id);

// `saringMenurutLingkup` masih membawa union null dari pemakai lamanya; di sini
// yang diuji adalah rantai induknya, jadi null dibuang lebih dulu.
const mine = (daftar: Task[]) =>
  saringMenurutLingkup(daftar, orang, "mine").filter((t): t is Task => Boolean(t));

describe("#689 tutupLeluhur", () => {
  it("mengembalikan epic induk walau epic itu bukan milik saya", () => {
    const semua = [
      tugas("epic-orang", { type: "epic", assigneeId: MILIK_ORANG }),
      tugas("anak-saya", { parentId: "epic-orang", assigneeId: MILIKKU }),
    ];
    const tersaring = mine(semua);
    expect(idDari(tersaring)).toEqual(["anak-saya"]);

    expect(idDari(tutupLeluhur(tersaring, semua))).toEqual(["anak-saya", "epic-orang"]);
  });

  it("menutup seluruh rantai, bukan cuma induk langsung", () => {
    const semua = [
      tugas("l1", { type: "epic", assigneeId: MILIK_ORANG }),
      tugas("l2", { parentId: "l1", assigneeId: MILIK_ORANG }),
      tugas("l3", { parentId: "l2", assigneeId: MILIKKU }),
    ];
    const hasil = tutupLeluhur(mine(semua), semua);
    expect(idDari(hasil).sort()).toEqual(["l1", "l2", "l3"]);
  });

  it("tidak pernah menarik kartu daun milik orang lain", () => {
    const semua = [
      tugas("epic-orang", { type: "epic", assigneeId: MILIK_ORANG }),
      tugas("anak-saya", { parentId: "epic-orang", assigneeId: MILIKKU }),
      tugas("anak-orang", { parentId: "epic-orang", assigneeId: MILIK_ORANG }),
    ];
    const hasil = tutupLeluhur(mine(semua), semua);
    expect(idDari(hasil)).not.toContain("anak-orang");
  });

  it("dua anak di bawah satu epic yang sama hanya menambah epic sekali", () => {
    const semua = [
      tugas("epic-orang", { type: "epic", assigneeId: MILIK_ORANG }),
      tugas("a", { parentId: "epic-orang", assigneeId: MILIKKU }),
      tugas("b", { parentId: "epic-orang", assigneeId: MILIKKU }),
    ];
    const hasil = tutupLeluhur(mine(semua), semua);
    expect(idDari(hasil)).toEqual(["a", "b", "epic-orang"]);
  });

  it("induk yang tidak dikenal dibiarkan (jalur standalone pemakai tidak berubah)", () => {
    const semua = [tugas("yatim", { parentId: "tidak-ada", assigneeId: MILIKKU })];
    const hasil = tutupLeluhur(mine(semua), semua);
    expect(idDari(hasil)).toEqual(["yatim"]);
  });

  it("parent melingkar tidak membuat perulangan tanpa akhir", () => {
    const semua = [
      tugas("c1", { parentId: "c2", assigneeId: MILIKKU }),
      tugas("c2", { parentId: "c1", assigneeId: MILIK_ORANG }),
    ];
    const hasil = tutupLeluhur(mine(semua), semua);
    expect(idDari(hasil).sort()).toEqual(["c1", "c2"]);
  });

  it("tanpa tambahan apa pun, array yang sama dikembalikan (identitas stabil)", () => {
    const semua = [tugas("a", { assigneeId: MILIKKU }), tugas("b", { assigneeId: MILIKKU })];
    const tersaring = mine(semua);
    expect(tutupLeluhur(tersaring, semua)).toBe(tersaring);
  });

  it("semua input non-array diperlakukan kosong, tidak melempar", () => {
    expect(tutupLeluhur(null, null)).toEqual([]);
    expect(idDari(tutupLeluhur([tugas("a")], undefined))).toEqual(["a"]);
  });
});
