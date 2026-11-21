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
 *   1. judul/kunci KETURUNAN yang cocok mengangkat akarnya jadi kandidat
 *      halaman, lalu pohonnya diturunkan seperti biasa;
 *   2. akar yang cocok LANGSUNG tetap jalan walau tidak ada keturunan cocok;
 *   3. tanpa kecocokan, klausa `id IN (?)` tambahan TIDAK ditambahkan —
 *      bentuk query tanpa search harus tetap persis seperti semula;
 *   4. istilah di-trim, di-lower, dan dibungkus `%…%`;
 *   5. query rantai mengikat `projectId` di kedua langkah supaya keturunan
 *      milik proyek lain tidak mengangkat akar di proyek ini.
 *
 * BATAS KEDALAMAN — DIUBAH SADAR oleh #864. Berkas ini dulu mengunci "hanya ANAK
 * LANGSUNG" karena dua saringan klien juga berhenti di situ. #864 mengubah
 * ketiganya (server, `displayRoots`, baris anak) menjadi kedalaman penuh, jadi
 * yang dikunci di sini bukan lagi kedalamannya melainkan ENAM perilaku #863 yang
 * tidak boleh hilang: pengangkatan akar lewat keturunan, klausa `id IN` yang
 * hanya muncul bila ada hasil, bentuk query tanpa search, pemrosesan istilah,
 * dan ikatan `projectId` di kedua langkah rantai.
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
  naik?: any[];
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
      if (/WITH RECURSIVE naik/i.test(sql)) return baris(jawaban.naik ?? []);
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
      naik: [{ id: "epic-1" }],
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
      naik: [],
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
      naik: [],
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
      naik: [],
      total: [{ total: 0 }],
      akar: [],
      tree: [],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination, "  HomePage  ");

    const naik = panggilan.find((p) => /WITH RECURSIVE naik/i.test(p.sql))!;
    expect(naik.params).toEqual(["p1", "%homepage%", "%homepage%", "p1"]);
    const hitung = panggilan.find((p) => /COUNT\(\*\)/i.test(p.sql))!;
    expect(hitung.params).toEqual(["p1", "%homepage%", "%homepage%"]);
  });

  it("query naik mengikat projectId di anchor dan langkah rekursif (tidak silang proyek)", async () => {
    const panggilan = pasang({
      naik: [],
      total: [{ total: 0 }],
      akar: [],
      tree: [],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination, "homepage");

    const naik = panggilan.find((p) => /WITH RECURSIVE naik/i.test(p.sql))!;
    expect(naik.params[0]).toBe("p1");
    expect(naik.sql.match(/projectId = \?/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("tanpa search, query naik sama sekali tidak dikirim", async () => {
    const panggilan = pasang({
      total: [{ total: 1 }],
      akar: [{ id: "akar-1" }],
      tree: [{ id: "akar-1" }],
    });
    tangkapTerpilih();

    await taskRepository.findIssueListPage("p1", pagination);

    expect(panggilan.some((p) => /WITH RECURSIVE naik/i.test(p.sql))).toBe(false);
  });
});
