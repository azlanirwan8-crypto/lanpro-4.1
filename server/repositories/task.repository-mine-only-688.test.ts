/**
 * #688 — apa yang benar-benar dijalankan database saat "My Tasks".
 *
 * Dua jaminan yang hanya bisa dibuktikan di lapis ini:
 *
 * 1. `total` dan halamannya dihitung dari WHERE yang SAMA. Kalau filter hanya
 *    ditempel di query baris, `total` tetap milik semua orang — paginasi
 *    menampilkan "128 tugas" di atas daftar berisi tiga baris.
 *
 * 2. Array kunci KOSONG tidak boleh menjadi "tanpa filter". Di lapis inilah
 *    kekeliruan itu berubah menjadi kebocoran seluruh isi proyek.
 */
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

import db from "../../src/lib/db";
import { taskRepository } from "./task.repository";

type Panggilan = { sql: string; params: unknown[] };

const sambungan: { panggilan: Panggilan[]; release: jest.Mock } = {
  panggilan: [],
  release: jest.fn(),
};

const halaman = (rows: any[]) => [rows, []];

describe("findIssueListPage dengan penugasan (#688)", () => {
  beforeEach(() => {
    sambungan.panggilan = [];
    sambungan.release.mockClear();
    (db.getConnection as jest.Mock).mockResolvedValue({
      query: async (sql: string, params: unknown[]) => {
        sambungan.panggilan.push({ sql, params });
        // COUNT → 1 baris, lalu root → satu id, lalu tree → id yang sama.
        if (/COUNT\(\*\)/i.test(sql)) return halaman([{ total: 1 }]);
        if (/WITH RECURSIVE/i.test(sql)) return halaman([{ id: "root-1" }]);
        return halaman([{ id: "root-1" }]);
      },
      release: sambungan.release,
    });
  });

  const pagination = { page: 1, limit: 25, offset: 0 } as any;

  it("array kunci kosong menghentikan query sebelum satu baris pun dibaca", async () => {
    const hasil = await taskRepository.findIssueListPage("p1", pagination, undefined, []);

    expect(hasil).toEqual({ items: [], total: 0 });
    expect(sambungan.panggilan).toEqual([]);
  });

  it("kunci yang sama dipakai di query COUNT dan query baris", async () => {
    await taskRepository.findIssueListPage("p1", pagination, undefined, [
      "uid-1",
      "rina@contoh.test",
    ]);

    const count = sambungan.panggilan.find((p) => /COUNT\(\*\)/i.test(p.sql))!;
    const baris = sambungan.panggilan.find((p) => /ORDER BY orderIndex/i.test(p.sql))!;
    expect(count).toBeDefined();
    expect(baris).toBeDefined();

    for (const q of [count, baris]) {
      expect(q.sql).toContain("assigneeId IN (?,?)");
      expect(q.sql).toContain("assigneeEmail IN (?,?)");
      expect(q.sql).toContain("assignees::text LIKE ?");
      expect(q.params).toEqual(expect.arrayContaining(["uid-1", "rina@contoh.test", '%"uid-1"%']));
    }
  });

  it("total yang dibalik ikut tersaring, bukan jumlah seluruh proyek", async () => {
    // WHERE di query COUNT dan query baris harus identik. Beda satu klausa saja
    // membuat halaman berteriak "128 tugas" di atas tiga baris.
    await taskRepository.findIssueListPage("p1", pagination, "login", ["uid-1"]);

    const qCount = sambungan.panggilan.find((p) => /COUNT\(\*\)/i.test(p.sql))!;
    const qBaris = sambungan.panggilan.find((p) => /ORDER BY orderIndex/i.test(p.sql))!;
    const where = (sql: string) =>
      sql.split("WHERE")[1].split("ORDER BY")[0].split("LIMIT")[0].trim();

    expect(where(qCount.sql)).toBe(where(qBaris.sql));
    // Parameter COUNT = parameter baris tanpa LIMIT/OFFSET di ujung.
    expect(qBaris.params.slice(0, qCount.params.length)).toEqual(qCount.params);
  });

  it("tanpa kunci, tidak ada klausa assignee sama sekali (All Tasks)", async () => {
    await taskRepository.findIssueListPage("p1", pagination);
    const gabung = sambungan.panggilan.map((p) => p.sql).join("\n");
    expect(gabung).not.toContain("assigneeId IN");
    expect(gabung).not.toContain("assignees::text");
  });

  /**
   * Pembatasnya LIKE, bukan perbandingan persis. Metakarakter yang tidak
   * di-escape membuat satu akun bisa melebarkan filternya sendiri: email boleh
   * diubah oleh pemiliknya, dan `%` di dalamnya berarti "apa saja" —
   * "My Tasks" lalu memulangkan tugas orang lain.
   */
  it("metakarakter LIKE di kunci di-escape, tidak jadi wildcard", async () => {
    await taskRepository.findIssueListPage("p1", pagination, undefined, ["a%@contoh.test"]);

    const baris = sambungan.panggilan.find((p) => /ORDER BY orderIndex/i.test(p.sql))!;
    expect(baris.sql).toContain("assignees::text LIKE ? ESCAPE");
    const pola = baris.params.find((p) => typeof p === "string" && p.startsWith('%"a'));
    expect(pola).toBe('%"a\\%@contoh.test"%');
  });

  it("connection selalu dilepas walau tidak ada root", async () => {
    (db.getConnection as jest.Mock).mockResolvedValue({
      query: async (sql: string) => {
        sambungan.panggilan.push({ sql, params: [] });
        return halaman(/COUNT\(\*\)/i.test(sql) ? [{ total: 0 }] : []);
      },
      release: sambungan.release,
    });
    const hasil = await taskRepository.findIssueListPage("p1", pagination, undefined, ["uid-1"]);
    expect(hasil.total).toBe(0);
    expect(sambungan.release).toHaveBeenCalled();
  });
});
