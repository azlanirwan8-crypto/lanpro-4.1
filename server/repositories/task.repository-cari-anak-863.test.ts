/**
 * #863 — Pencarian Daftar Isu tidak menemukan isu yang judul/kuncinya berada
 * di subtask.
 *
 * BUG. `halamanAkar` menempel syarat `search` ke `rootWhere`, yaitu ke baris
 * AKAR saja (judul/kunci akar). Subtask yang judulnya "…homepage…" tidak pernah
 * dicari; akarnya gugur, dan seluruh pohonnya tidak dimuat. Di layar: kotak cari
 * berisi "homepage", tabel kosong, "padahal ada". Ironisnya saringan klien
 * (`displayRoots`, `src/features/issues/hooks.ts`) SUDAH punya aturan benar yang
 * sama dengan Jira — akar tampil bila `rootMatches || childMatches` — tetapi ia
 * kehabisan data karena server tidak pernah mengirim akar itu.
 *
 * YANG DIUJI DI SINI, dan hanya bisa diuji di lapis ini karena query-nya SQL:
 *   1. judul/kunci ANAK LANGSUNG yang cocok mengangkat akarnya jadi kandidat
 *      halaman, lalu pohonnya diturunkan seperti biasa;
 *   2. akar yang cocok LANGSUNG tetap jalan walau tidak punya anak cocok;
 *   3. tanpa kecocokan anak, klausa `id IN (?)` tambahan TIDAK ditambahkan —
 *      bentuk query tanpa search harus tetap persis seperti semula;
 *   4. istilah di-trim, di-lower, dan dibungkus `%…%`;
 *   5. query anak mengikat `projectId` dua kali (akar DAN anak) supaya anak
 *      milik proyek lain tidak mengangkat akar di proyek ini.
 *
 * BATAS KEDALAMAN yang disengaja: hanya ANAK LANGSUNG. UI Daftar Isu merender
 * dua tingkat dan saringan klien hanya mengecek anak langsung; mencari kedalaman
 * penuh akan mengangkat akar yang lalu disembunyikan klien. Kecocokan cucu
 * (data impor) tetap tidak ditemukan — konsisten dengan klien yang sudah ada.
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
  anak?: any[];
  total?: any[];
  akar?: any[];
  tree?: any[];
}

/** Menjawab kueri sesuai BENTUKNYA, seperti driver sungguhan. */
function pasang(jawaban: Jawaban) {
  const panggilan: { sql: string; params: unknown[] }[] = [];
  (db.getConnection as jest.Mock).mockResolvedValue({
    query: async (sql: string, params: unknown[]) => {
      panggilan.push({ sql, params: params ?? [] });
      if (/SELECT DISTINCT p\.id/i.test(sql)) return baris(jawaban.anak ?? []);
      if (/COUNT\(\*\)/i.test(sql)) return baris(jawaban.total ?? []);
      if (/WITH RECURSIVE tree/i.test(sql)) return baris(jawaban.tree ?? []);
      return baris(jawaban.akar ?? []);
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

describe("#863 pencarian Daftar Isu menemukan isu lewat judul anak", () => {
  it("judul anak yang cocok mengangkat akarnya: pohon diturunkan, total = 1 akar", async () => {
    const panggilan = pasang({
      anak: [{ id: "epic-1" }],
      total: [{ total: 1 }],
      akar: [{ id: "epic-1" }],
      tree: [{ id: "epic-1" }, { id: "sub-homepage" }],
    });
    const terpilih = tangkapTerpilih();

    const hasil = await taskRepository.findIssueListPage("p1", pagination, "homepage");

    expect([...(terpilih.ids ?? [])].sort()).toEqual(["epic-1", "sub-homepage"]);
    expect(hasil.total).toBe(1);
    // Kandidat ganda (akar langsung cocok + terangkat lewat anak) mendarat di
    // SATU klausa `id IN (?)` berisi array — bukan duplikat klausa.
    const halaman = panggilan.find((p) => /ORDER BY orderIndex/i.test(p.sql))!;
    expect(halaman.params.filter(Array.isArray)).toHaveLength(1);
  });

  it("akar yang cocok langsung tetap jalan walau tidak ada anak cocok", async () => {
    pasang({
      anak: [],
      total: [{ total: 1 }],
      akar: [{ id: "akar-homepage" }],
      tree: [{ id: "akar-homepage" }],
    });
    const terpilih = tangkapTerpilih();

    const hasil = await taskRepository.findIssueListPage("p1", pagination, "homepage");

    expect([...(terpilih.ids ?? [])]).toEqual(["akar-homepage"]);
    expect(hasil.total).toBe(1);
  });

  it("tanpa kecocokan anak, klausa id IN tambahan tidak ditambahkan", async () => {
    const panggilan = pasang({
      anak: [],
      total: [{ total: 1 }],
      akar: [{ id: "akar-homepage" }],
      tree: [{ id: "akar-homepage" }],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination, "homepage");

    const halaman = panggilan.find((p) => /ORDER BY orderIndex/i.test(p.sql))!;
    // projectId + dua istilah LIKE + limit/offset; tidak ada parameter array.
    expect(halaman.params).toEqual(["p1", "%homepage%", "%homepage%", 25, 0]);
    expect(halaman.sql).not.toMatch(/id IN \(\?\)/);
  });

  it("istilah di-trim, di-lower, dan dibungkus wildcard", async () => {
    const panggilan = pasang({
      anak: [],
      total: [{ total: 0 }],
      akar: [],
      tree: [],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination, "  HomePage  ");

    const anak = panggilan.find((p) => /SELECT DISTINCT p\.id/i.test(p.sql))!;
    expect(anak.params).toEqual(["p1", "p1", "%homepage%", "%homepage%"]);
    const hitung = panggilan.find((p) => /COUNT\(\*\)/i.test(p.sql))!;
    expect(hitung.params).toEqual(["p1", "%homepage%", "%homepage%"]);
  });

  it("query anak mengikat projectId untuk akar dan anak (tidak silang proyek)", async () => {
    const panggilan = pasang({
      anak: [],
      total: [{ total: 0 }],
      akar: [],
      tree: [],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination, "homepage");

    const anak = panggilan.find((p) => /SELECT DISTINCT p\.id/i.test(p.sql))!;
    expect(anak.params[0]).toBe("p1");
    expect(anak.sql.match(/projectId = \?/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("tanpa search, query anak sama sekali tidak dikirim", async () => {
    const panggilan = pasang({
      total: [{ total: 1 }],
      akar: [{ id: "akar-1" }],
      tree: [{ id: "akar-1" }],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination);

    expect(panggilan.some((p) => /SELECT DISTINCT p\.id/i.test(p.sql))).toBe(false);
  });
});
