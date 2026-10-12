/**
 * #701 (lanjutan) — "My Tasks" memulangkan 500, layar memajang "The issue list
 * could not be loaded".
 *
 * BUG. Rantai tugas saya dibangun dengan `IN (?,?,…)`. Kala daftar id-nya tinggal
 * SATU, `convertToPostgres()` di `src/lib/db.ts` melipatnya menjadi `= ANY($1)` —
 * aturan yang hanya benar bila nilainya array, sedangkan yang dikirim string.
 * Postgres menolak (`malformed array literal`), rute menangkap, dan pengguna
 * melihat banner koneksi padahal koneksi baik-baik saja.
 *
 * KENAPA TEST INI ADA DAN YANG LAIN TIDAK BISA MENANGKAPNYA. Test tetangganya
 * memakai adapter DB tiruan, jadi SQL-nya tidak pernah diterjemahkan. Yang diuji
 * di sini justru terjemahannya: `convertToPostgres()` ASLI, bukan tiruan regexnya.
 * Invariannya berlaku untuk semua kueri yang lewat, jadi situs yang belum
 * tersentuh pun ikut terjaga (#329 mencatat gejala yang sama di modul QA).
 */
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

import db from "../../src/lib/db";
import { taskRepository } from "./task.repository";

/**
 * Modul aslinya tetap bisa diminta walau default-nya di-mock.
 *
 * `db.ts` memeriksa Neon pada saat modulnya dinilai (`db.ts:339`) dan itu
 * meninggalkan handle asinkron yang membuat jest menggantung. Connection string
 * dikosongkan KHUSUS selama penilaian modul, lalu dikembalikan apa adanya supaya
 * berkas test lain di worker yang sama tidak ikut berubah.
 */
const bisu = [
  jest.spyOn(console, "error").mockImplementation(() => undefined),
  jest.spyOn(console, "warn").mockImplementation(() => undefined),
];
const urlLama: Record<string, string | undefined> = {
  DATABASE_URL: process.env.DATABASE_URL,
  POSTGRES_URL: process.env.POSTGRES_URL,
};
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
const { convertToPostgres } = jest.requireActual("../../src/lib/db") as {
  convertToPostgres: (sql: string, params: unknown[]) => { text: string; values: unknown[] };
};
for (const [kunci, nilai] of Object.entries(urlLama)) {
  if (nilai === undefined) delete process.env[kunci];
  else process.env[kunci] = nilai;
}
bisu.forEach((spy) => spy.mockRestore());

type Panggilan = { sql: string; params: unknown[] };

const halaman = (rows: any[]) => [rows, []];

/**
 * Invarian: setiap `= ANY($n)` yang lahir dari terjemahan WAJIB memegang array.
 * Yang dikembalikan daftar pelanggar, supaya galat jest terbaca sebagai SQL dan
 * bukan sebagai `false !== true`.
 */
function cermati(panggilan: Panggilan[]): { melanggar: string[]; jumlahAny: number } {
  const melanggar: string[] = [];
  let jumlahAny = 0;
  for (const { sql, params } of panggilan) {
    const { text, values } = convertToPostgres(sql, params);
    for (const cocok of text.matchAll(/= ANY\(\$(\d+)\)/g)) {
      jumlahAny += 1;
      const nilai = values[Number(cocok[1]) - 1];
      if (!Array.isArray(nilai)) {
        melanggar.push(
          `${sql.trim().slice(0, 70)}… → = ANY($${cocok[1]}) memegang ` +
            `${nilai === undefined ? "parameter yang tidak ada" : typeof nilai}`
        );
      }
    }
  }
  return { melanggar, jumlahAny };
}

function pasang(jawaban: (sql: string) => any[]) {
  const panggilan: Panggilan[] = [];
  (db.getConnection as jest.Mock).mockResolvedValue({
    query: async (sql: string, params: unknown[]) => {
      // Yang masuk ke driver adalah BENTUK MySQL (`?` + nilai datar); terjemahan
      // terjadi di dalam `query()`, jadi di sinilah ranjau itu lahir.
      panggilan.push({ sql, params: params ?? [] });
      return halaman(jawaban(sql));
    },
    release: () => undefined,
  });
  return panggilan;
}

const pagination = { page: 1, limit: 25, offset: 0 } as any;

beforeEach(() => jest.spyOn(taskRepository, "findTasksWithRelations").mockResolvedValue([] as any));
afterEach(() => jest.restoreAllMocks());

describe("#701 — terjemahan SQL daftar isu tidak boleh meninggalkan ANY berscalar", () => {
  it("jalur My Tasks dengan SATU kartu milik saya tetap menterjemah ke array", async () => {
    const panggilan = pasang((sql) => {
      if (/WITH RECURSIVE naik/i.test(sql))
        return [
          { id: "child-1", parentId: "epic-1", orderIndex: 1, createdAt: "2026-09-01" },
          { id: "epic-1", parentId: null, orderIndex: 1, createdAt: "2026-09-01" },
        ];
      if (/WITH RECURSIVE tree/i.test(sql)) return [{ id: "epic-1" }, { id: "child-1" }];
      if (/assigneeId IN/i.test(sql)) return [{ id: "child-1" }];
      return [];
    });

    const hasil = await taskRepository.findIssueListPage("p1", pagination, undefined, ["uid-1"]);

    expect(hasil.total).toBe(1);
    // Satu kartu = satu id di jangkar `naik`, dan satu akar rantai di `tree`:
    // justru bentuk yang dulu melipat IN (?) jadi ANY($1) berscalar.
    expect(panggilan.some((p) => /id IN \(\?\)/.test(p.sql))).toBe(true);
    const { melanggar, jumlahAny } = cermati(panggilan);
    expect(jumlahAny).toBeGreaterThan(0);
    expect(melanggar).toEqual([]);
  });

  it("satu kunci penugasan pun menterjemah klausa assignee ke array", async () => {
    const panggilan = pasang((sql) => {
      if (/WITH RECURSIVE/i.test(sql)) return [{ id: "tugas-saya", parentId: null }];
      if (/assigneeId IN/i.test(sql)) return [{ id: "tugas-saya" }];
      return [];
    });

    await taskRepository.findIssueListPage("p1", pagination, undefined, ["uid-1"]);

    const syarat = panggilan.find((p) => /assigneeId IN/i.test(p.sql))!;
    expect(syarat.params[1]).toEqual(["uid-1"]);
    expect(cermati([syarat]).melanggar).toEqual([]);
  });

  it("jalur All Tasks dengan SATU akar ikut terjaga", async () => {
    const panggilan = pasang((sql) => {
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: 1 }];
      if (/WITH RECURSIVE tree/i.test(sql)) return [{ id: "root-1" }];
      return [{ id: "root-1" }];
    });

    const hasil = await taskRepository.findIssueListPage("p1", pagination);

    expect(hasil.total).toBe(1);
    const { melanggar, jumlahAny } = cermati(panggilan);
    expect(jumlahAny).toBeGreaterThan(0);
    expect(melanggar).toEqual([]);
  });
});
