/**
 * #689 butir E3 — `reorderTasks` menulis `orderIndex` POSISIONAL dari daftar
 * yang dikirim, sementara Issue List mengirim SATU HALAMAN.
 *
 * Bentuk rusaknya hari ini, untuk proyek dengan akar berurutan `a,b,c,d,e`:
 * pengguna menyeret `d` ke samping `b` di halaman yang tidak memuat semuanya,
 * browser mengirim `[d,b]`, dan repository menulis `d=0, b=1`. `a` sudah
 * memegang 0 dan `c` sudah memegang 1 — jadi dua tugas kini berbagi nomor yang
 * sama, urutan proyek jadi tergantung `createdAt`, dan pekerjaan yang tidak
 * pernah disentuh pengguna ikut tergeser. Ditambah cacat klien
 * (`IssueListView.tsx:221-227` memotong array satu halaman dengan indeks
 * absolut), id yang di-`UPDATE` bisa `undefined` dan query-nya hanya mengenai
 * nol baris: API bilang "success", database tidak berubah.
 *
 * Aturan yang diuji di sini — dan aturan ini MENYIMPAN perilaku lama saat
 * klien mengirim daftar lengkap, karena slot yang ditempati id yang diminta
 * adalah 0..n-1:
 *
 *   id yang diminta menempati ulang HANYA slot yang sudah mereka diami di
 *   urutan global, dalam urutan baru yang diminta. Yang tidak dikirim tidak
 *   disentuh sama sekali.
 *
 * `db.ts` tidak disentuh; hanya query yang dijalankan repository yang diperiksa.
 */
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

import db from "../../src/lib/db";
import { taskRepository } from "./task.repository";

type Tulis = { id: string; urutan: unknown };

const GLOBAL = ["a", "b", "c", "d", "e"];

/**
 * Koneksi palsu: SELECT daftar akar global menjawab `GLOBAL`, setiap UPDATE
 * dicatat sebagai pasangan (id, orderIndex).
 */
const pasangKoneksi = (rootGlobal: string[] = GLOBAL) => {
  const tulisan: Tulis[] = [];
  const baca: { sql: string; params: unknown[] }[] = [];

  (db.getConnection as jest.Mock).mockResolvedValue({
    query: async (sql: string, params: unknown[]) => {
      if (/^\s*SELECT/i.test(sql)) {
        baca.push({ sql, params });
        return [rootGlobal.map((id) => ({ id })), []];
      }
      tulisan.push({ id: String(params[1]), urutan: params[0] });
      return [[], []];
    },
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  });

  return { tulisan, baca };
};

describe("#689 reorderTasks tidak boleh menulis posisional dari daftar sebagian", () => {
  beforeEach(() => {
    (db.getConnection as jest.Mock).mockReset();
  });

  it("menempati ulang hanya slot milik id yang diminta", async () => {
    const { tulisan } = pasangKoneksi();

    await taskRepository.reorderTasks("proyek-1", ["d", "b"]);

    // Di global: a=0 b=1 c=2 d=3 e=4. Slot yang diami {b,d} adalah [1,3].
    expect(tulisan).toEqual([
      { id: "d", urutan: 1 },
      { id: "b", urutan: 3 },
    ]);
    // Yang tidak dikirim tidak boleh ikut tertulis.
    expect(tulisan.map((t) => t.id)).not.toContain("a");
    expect(tulisan.map((t) => t.id)).not.toContain("c");
    expect(tulisan.map((t) => t.id)).not.toContain("e");
  });

  it("daftar lengkap berperilaku sama seperti sebelumnya (tidak ada perubahan untuk Issue List tanpa paging)", async () => {
    const { tulisan } = pasangKoneksi();

    await taskRepository.reorderTasks("proyek-1", ["e", "c", "a", "b", "d"]);

    expect(tulisan).toEqual([
      { id: "e", urutan: 0 },
      { id: "c", urutan: 1 },
      { id: "a", urutan: 2 },
      { id: "b", urutan: 3 },
      { id: "d", urutan: 4 },
    ]);
  });

  it("id yang bukan akar proyek ini dibuang, bukan ditulis", async () => {
    const { tulisan } = pasangKoneksi();

    await taskRepository.reorderTasks("proyek-1", ["b", "bukan-akar", "a"]);

    expect(tulisan.map((t) => t.id)).toEqual(["b", "a"]);
    expect(tulisan.every((t) => t.urutan !== undefined)).toBe(true);
  });

  it("id berulang hanya ditulis sekali", async () => {
    const { tulisan } = pasangKoneksi();

    await taskRepository.reorderTasks("proyek-1", ["c", "c", "a"]);

    expect(tulisan.map((t) => t.id)).toEqual(["c", "a"]);
  });

  it("hanya akar yang diambil, dengan pembatas daftar yang dipakai repo ini", async () => {
    const { baca } = pasangKoneksi();

    await taskRepository.reorderTasks("proyek-1", ["a"]);

    expect(baca).toHaveLength(1);
    const sql = baca[0].sql;
    expect(sql).toMatch(/parentId IS NULL/i);
    expect(sql).toMatch(/ORDER BY orderIndex ASC/i);
    expect(sql).toMatch(/LIMIT/i);
    expect(baca[0].params).toContain("proyek-1");
  });

  it("transaksi ditutup dan koneksi dilepas saat salah satu tulisan gagal", async () => {
    const release = jest.fn();
    (db.getConnection as jest.Mock).mockResolvedValue({
      query: async (sql: string) => {
        if (/^\s*SELECT/i.test(sql)) return [[{ id: "a" }, { id: "b" }], []];
        throw new Error("koleps");
      },
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release,
    });

    await expect(taskRepository.reorderTasks("proyek-1", ["b", "a"])).rejects.toThrow("koleps");
    expect(release).toHaveBeenCalledTimes(1);
  });
});
