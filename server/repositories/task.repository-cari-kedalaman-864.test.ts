/**
 * #864 — `halamanAkar` harus mengangkat akar lewat keturunan di kedalaman
 * berapa pun, bukan hanya anak langsung.
 *
 * BUG. #863 memperbaiki satu tingkat: akar diangkat bila ANAK LANGSUNG-nya
 * cocok. Isu di kedalaman dua (cucu — bentuk yang lahir dari impor berjenjang)
 * tetap hilang, karena kueriangkatannya berupa JOIN satu langkah
 * (`INNER JOIN Tasks c ON c.parentId = p.id`). Yang diuji di sini justru
 * bentuk kuerinya: kalau masih satu langkah, kedalaman dua tidak pernah bisa
 * ditemukan tidak peduli berapa banyak test UI yang hijau.
 *
 * UNION harus membuang simpul duplikat agar relasi yang melingkar berhenti.
 */
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

import db from "../../src/lib/db";
import { taskRepository } from "./task.repository";

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

const pasang = (jawaban: (sql: string) => any[]) => {
  const panggilan: Panggilan[] = [];
  (db.getConnection as jest.Mock).mockResolvedValue({
    query: async (sql: string, params: unknown[]) => {
      panggilan.push({ sql, params: (params as unknown[]) || [] });
      return [jawaban(sql), []];
    },
    release: () => undefined,
  });
  return panggilan;
};

const pagination = { page: 1, limit: 25, offset: 0 } as any;

const naik = (p: Panggilan[]) => p.find((x) => /WITH RECURSIVE naik/i.test(x.sql));
const halaman = (p: Panggilan[]) =>
  p.find(
    (x) => /FROM Tasks WHERE/.test(x.sql) && !/WITH RECURSIVE/i.test(x.sql) && !/COUNT/i.test(x.sql)
  );

beforeEach(() => jest.spyOn(taskRepository, "findTasksWithRelations").mockResolvedValue([] as any));
afterEach(() => jest.restoreAllMocks());

describe("#864 halamanAkar mengangkat akar lewat kedalaman penuh", () => {
  it("cari mengirim CTE rekursif, bukan JOIN satu langkah", async () => {
    const panggilan = pasang((sql) => {
      if (/WITH RECURSIVE naik/i.test(sql)) return [{ id: "epic-1" }];
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: 1 }];
      if (/WITH RECURSIVE tree/i.test(sql))
        return [{ id: "epic-1" }, { id: "story-1" }, { id: "sub-1" }];
      return [{ id: "epic-1" }];
    });

    await taskRepository.findIssueListPage("p1", pagination, "homepage");

    const cte = naik(panggilan);
    expect(cte).toBeDefined();
    expect(cte!.sql).toMatch(/\bUNION\s+SELECT/i);
    expect(/INNER JOIN naik n ON p\.id = n\.parentId/i.test(cte!.sql)).toBe(true);
  });

  it("CTE membuang simpul duplikat tanpa batas kedalaman", async () => {
    const panggilan = pasang((sql) => (/WITH RECURSIVE naik/i.test(sql) ? [{ id: "epic-1" }] : []));
    await taskRepository.findIssueListPage("p1", pagination, "homepage");
    const cte = naik(panggilan)!;
    expect(cte.sql).toMatch(/\bUNION\s+SELECT/i);
    expect(cte.sql).not.toMatch(/kedalaman|UNION ALL/i);
  });

  it("projectId terikat di anchor DAN di langkah rekursif", async () => {
    const panggilan = pasang((sql) =>
      /\[?WITH RECURSIVE naik/i.test(sql) ? [{ id: "epic-1" }] : []
    );
    await taskRepository.findIssueListPage("p1", pagination, "homepage");
    const cte = naik(panggilan)!;
    const jumlahProjectId = (cte.sql.match(/projectId = \?/gi) || []).length;
    expect(jumlahProjectId).toBeGreaterThanOrEqual(2);
    expect(cte.params.filter((v) => v === "p1").length).toBeGreaterThanOrEqual(2);
  });

  it("akar hasil angkat masuk sebagai SATU parameter array, bukan daftar placeholder", async () => {
    const panggilan = pasang((sql) => {
      if (/WITH RECURSIVE naik/i.test(sql)) return [{ id: "epic-1" }, { id: "epic-2" }];
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: 2 }];
      if (/WITH RECURSIVE tree/i.test(sql)) return [{ id: "epic-1" }];
      return [{ id: "epic-1" }];
    });

    await taskRepository.findIssueListPage("p1", pagination, "homepage");

    const halamanAkar = halaman(panggilan)!;
    expect(/id IN \(\?\)/.test(halamanAkar.sql)).toBe(true);
    expect(halamanAkar.params).toEqual([
      "p1",
      "%homepage%",
      "%homepage%",
      ["epic-1", "epic-2"],
      25,
      0,
    ]);
  });

  it("terjemahan Postgres tidak boleh meninggalkan = ANY yang memegang scalar", async () => {
    const panggilan = pasang((sql) => {
      if (/WITH RECURSIVE naik/i.test(sql)) return [{ id: "epic-1" }];
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: 1 }];
      if (/WITH RECURSIVE tree/i.test(sql)) return [{ id: "epic-1" }, { id: "sub-1" }];
      return [{ id: "epic-1" }];
    });

    await taskRepository.findIssueListPage("p1", pagination, "homepage");

    for (const { sql, params } of panggilan) {
      const { text, values } = convertToPostgres(sql, params);
      for (const cocok of text.matchAll(/= ANY\(\$(\d+)\)/g)) {
        expect(Array.isArray(values[Number(cocok[1]) - 1])).toBe(true);
      }
    }
  });

  it("tidak ada akar terangkat: klausa IN tidak ditempel dan halaman kosong", async () => {
    const panggilan = pasang((sql) => {
      if (/WITH RECURSIVE naik/i.test(sql)) return [];
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: 0 }];
      return [];
    });

    const hasil = await taskRepository.findIssueListPage("p1", pagination, "homepage");

    expect(hasil.total).toBe(0);
    const halamanAkar = halaman(panggilan)!;
    expect(halamanAkar.sql).not.toMatch(/id IN \(\?\)/);
    expect(halamanAkar.params).toEqual(["p1", "%homepage%", "%homepage%", 25, 0]);
  });

  it("tanpa kata kunci, CTE pencarian tidak dikirim sama sekali", async () => {
    const panggilan = pasang((sql) => {
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: 1 }];
      if (/WITH RECURSIVE tree/i.test(sql)) return [{ id: "root-1" }];
      return [{ id: "root-1" }];
    });

    await taskRepository.findIssueListPage("p1", pagination);

    expect(naik(panggilan)).toBeUndefined();
    // Yang tidak boleh ada ialah `id IN (?)` di ROOT-WHERE. Kueri `tree` ke bawah
    // memang memakai bentuk itu sejak lama, jadi pemeriksaannya per kueri akar.
    expect(halaman(panggilan)!.sql).not.toMatch(/id IN \(\?\)/);
    expect(panggilan.find((p) => /COUNT\(\*\)/i.test(p.sql))!.sql).not.toMatch(/id IN \(\?\)/);
  });

  it("istilah dicari di-trim, di-lower, dan dibungkus untuk kedua-duanya (judul dan kunci)", async () => {
    const panggilan = pasang((sql) =>
      /\[?WITH RECURSIVE naik/i.test(sql) ? [{ id: "epic-1" }] : []
    );
    await taskRepository.findIssueListPage("p1", pagination, "  HomePage  ");
    const cte = naik(panggilan)!;
    expect(cte.params.filter((v) => v === "%homepage%")).toEqual(["%homepage%", "%homepage%"]);
    expect(/title/i.test(cte.sql) && /taskKey/i.test(cte.sql)).toBe(true);
  });
});
