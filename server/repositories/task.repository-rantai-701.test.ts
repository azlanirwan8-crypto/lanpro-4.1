/**
 * #701 — "My Tasks" di Issue List kehilangan induknya.
 *
 * BUG. Syarat "milik saya" dulu ditempel ke `rootWhere`, yaitu ke baris AKAR
 * saja. Kartu milik saya yang bergendong di bawah epik milik orang lain jadi
 * tidak pernah dimuat: epiknya gugur di syarat akar, dan anak hanya bisa datang
 * sebagai keturunannya. Di layar: tab "My Tasks" kosong padahal pengguna punya
 * tugas. (Kanban dan Planning tidak kena — mereka menutup leluhur di klien lewat
 * `tutupLeluhur()`; Issue List tidak pernah menerima baris itu untuk ditutup.)
 *
 * YANG DIUJI DI SINI, dan hanya bisa diuji di lapis ini karena query-nya SQL:
 *   1. kartu milik saya menarik rantai induknya ikut serta;
 *   2. rantai itu DIPOTONG — sibling milik orang lain tidak ikut naik;
 *   3. `total` adalah jumlah akar rantai, bukan jumlah akar proyek;
 *   4. lintasan ke atas punya batas kedalaman (induk yang melingkar tidak boleh
 *      menahan salah satu dari 20 koneksi pool).
 */
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

import db from "../../src/lib/db";
import { taskRepository } from "./task.repository";

const pagination = { page: 1, limit: 25, offset: 0 } as any;
const baris = (rows: any[]) => [rows, []];

interface Jawaban {
  milik?: any[];
  naik?: any[];
  tree?: any[];
}

/** Menjawab kueri sesuai BENTUKNYA, seperti driver sungguhan. */
function pasang(jawaban: Jawaban) {
  const panggilan: { sql: string; params: unknown[] }[] = [];
  (db.getConnection as jest.Mock).mockResolvedValue({
    query: async (sql: string, params: unknown[]) => {
      panggilan.push({ sql, params: params ?? [] });
      if (/WITH RECURSIVE naik/i.test(sql)) return baris(jawaban.naik ?? []);
      if (/WITH RECURSIVE tree/i.test(sql)) return baris(jawaban.tree ?? []);
      if (/assigneeId IN/i.test(sql)) return baris(jawaban.milik ?? []);
      return baris([]);
    },
    release: () => undefined,
  });
  return panggilan;
}

/** `findTasksWithRelations` adalah langkah berikutnya; di sini yang menarik
 *  hanyalah KUMPULAN id yang ia terima. */
function tangkapTerpilih() {
  const tangkapan: { ids?: Set<string> } = {};
  jest.spyOn(taskRepository, "findTasksWithRelations").mockImplementation((async (
    _p: string,
    ids: Set<string>
  ) => {
    tangkapan.ids = ids;
    return [];
  }) as any);
  return tangkapan;
}

afterEach(() => jest.restoreAllMocks());

describe("#701 rantai induk ikut dibawa saat My Tasks", () => {
  it("kartu milik saya menarik epik orang lain ikut serta", async () => {
    pasang({
      milik: [{ id: "child-1" }],
      naik: [
        { id: "child-1", parentId: "epic-1", orderIndex: 1, createdAt: "2026-09-01" },
        { id: "epic-1", parentId: null, orderIndex: 1, createdAt: "2026-09-01" },
      ],
      tree: [{ id: "epic-1" }, { id: "child-1" }, { id: "sibling-2" }],
    });
    const terpilih = tangkapTerpilih();

    const hasil = await taskRepository.findIssueListPage("p1", pagination, undefined, ["uid-1"]);

    expect([...(terpilih.ids ?? [])].sort()).toEqual(["child-1", "epic-1"]);
    // Sibling yang bukan milik saya TETAP di luar, walau ia keturunan epik yang
    // sama. Kalau ia lolos, "My Tasks" jadi "epik saya dan semua isinya".
    expect(terpilih.ids?.has("sibling-2")).toBe(false);
    expect(hasil.total).toBe(1);
  });

  it("rantainya berhenti di akar, termasuk kalau ada kakek di tengah", async () => {
    pasang({
      milik: [{ id: "tugas" }],
      naik: [
        { id: "tugas", parentId: "epik", orderIndex: 3, createdAt: "2026-09-01" },
        { id: "epik", parentId: "kakek", orderIndex: 3, createdAt: "2026-09-01" },
        { id: "kakek", parentId: null, orderIndex: 3, createdAt: "2026-09-01" },
      ],
      tree: [{ id: "kakek" }, { id: "epik" }, { id: "tugas" }],
    });
    const terpilih = tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination, undefined, ["uid-1"]);

    expect([...(terpilih.ids ?? [])].sort()).toEqual(["epik", "kakek", "tugas"]);
  });

  it("total adalah akar RANTAI, dan halaman hanya menurunkan akar yang terpilih", async () => {
    const panggilan = pasang({
      milik: [{ id: "a" }, { id: "b" }],
      naik: [
        { id: "a", parentId: "epic-a", orderIndex: 1, createdAt: "2026-09-02" },
        { id: "epic-a", parentId: null, orderIndex: 1, createdAt: "2026-09-02" },
        { id: "b", parentId: "epic-b", orderIndex: 2, createdAt: "2026-09-01" },
        { id: "epic-b", parentId: null, orderIndex: 2, createdAt: "2026-09-01" },
      ],
      tree: [{ id: "epic-a" }, { id: "a" }],
    });
    const terpilih = tangkapTerpilih();

    const hasil = await taskRepository.findIssueListPage(
      "p1",
      { page: 1, limit: 1, offset: 0 } as any,
      undefined,
      ["uid-1"]
    );

    // Dua akar di rantai, tapi halaman pertama hanya memuat satu.
    expect(hasil.total).toBe(2);
    const tree = panggilan.find((p) => /WITH RECURSIVE tree/i.test(p.sql))!;
    expect(tree.params).toEqual(["epic-a"]);
    expect([...(terpilih.ids ?? [])].sort()).toEqual(["a", "epic-a"]);
  });

  it("induk yang menggantung tidak membuat kartunya hilang", async () => {
    pasang({
      milik: [{ id: "yatim" }],
      naik: [{ id: "yatim", parentId: "tidak-ada", orderIndex: 1, createdAt: "2026-09-01" }],
      tree: [{ id: "yatim" }],
    });
    const terpilih = tangkapTerpilih();

    const hasil = await taskRepository.findIssueListPage("p1", pagination, undefined, ["uid-1"]);

    // Sama seperti `akarDaftar()` di klien: baris yang induknya tidak dikenal
    // dihitung sebagai akar, bukan dibuang.
    expect(terpilih.ids?.has("yatim")).toBe(true);
    expect(hasil.total).toBe(1);
  });

  it("lintasan ke atas dibatasi kedalamannya", async () => {
    const panggilan = pasang({
      milik: [{ id: "child-1" }],
      naik: [{ id: "child-1", parentId: null, orderIndex: 1, createdAt: "2026-09-01" }],
      tree: [{ id: "child-1" }],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination, undefined, ["uid-1"]);

    const naik = panggilan.find((p) => /WITH RECURSIVE naik/i.test(p.sql))!;
    expect(naik.sql).toMatch(/kedalaman < \d+/);
  });

  it("tanpa satu kunci pun, tidak ada kueri yang dikirim", async () => {
    const panggilan = pasang({});

    const hasil = await taskRepository.findIssueListPage("p1", pagination, undefined, []);

    expect(hasil).toEqual({ items: [], total: 0 });
    expect(panggilan).toEqual([]);
  });
});
