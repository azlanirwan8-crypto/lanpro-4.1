/**
 * #703/#704 — apa yang benar-benar ditulis ke database untuk PIC jamak, tag isu,
 * tautan, dan berkas.
 *
 * SATU JAMINAN YANG PALING MAHAL DI SINI. `src/lib/db.ts:59` mengubah `IN (?)`
 * menjadi `= ANY(?)`, dan bentuk itu MENSYARATKAN array. #701 baru saja mati
 * karena pola itu: daftar satu elemen dikirim sebagai nilai tunggal, Postgres
 * menolak kuernya, dan jawabannya adalah tabel kosong yang tampak seperti
 * "tidak ada data". Test ini mengunci bahwa `discussion_point_assignees` dan
 * `discussion_point_files` membaca dengan ARRAY, bukan daftar placeholder yang
 * bisa menyusut jadi satu.
 *
 * Yang dikunci berikutnya: `assigneeIds` `undefined` dan `[]` TIDAK boleh berarti
 * sama. Toggle status hanya mengirim `{ status }`; kalau itu ikut mengosongkan
 * daftar penerima, satu klik "selesai" menghapus PIC orang.
 */
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn() },
}));

import db from "../../src/lib/db";
import { discussionPointsRepository } from "./discussion-points.repository";
import { createDiscussionPointSchema } from "../schemas/discussion-points.schema";

type Panggilan = { sql: string; params: unknown[] };

const panggilan: Panggilan[] = [];
const sambungan = {
  release: jest.fn(),
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
};

const halaman = (rows: any[]) => [rows, []];

beforeEach(() => {
  panggilan.length = 0;
  sambungan.release.mockClear();
  sambungan.begin.mockClear();
  sambungan.commit.mockClear();
});

const siapkan = (jawab: (sql: string, params: unknown[]) => any[]) => {
  (db.getConnection as jest.Mock).mockResolvedValue({
    query: async (sql: string, params: unknown[]) => {
      panggilan.push({ sql, params });
      return jawab(sql, params);
    },
    release: sambungan.release,
    beginTransaction: sambungan.begin,
    commit: sambungan.commit,
    rollback: sambungan.rollback,
  });
};

describe("discussion_point_assignees (#703, keputusan B2 = b)", () => {
  it("membaca daftar penerima dengan SATU kueri ber-array, bukan per baris", async () => {
    siapkan((sql) => {
      if (/FROM DiscussionPoints/i.test(sql))
        return halaman([
          { id: "d-1", concern: "A" },
          { id: "d-2", concern: "B" },
        ]);
      if (/discussion_point_assignees/i.test(sql))
        return halaman([{ point_id: "d-1", user_id: "u-1" }]);
      return halaman([]);
    });

    const hasil = await discussionPointsRepository.findByMeetingId("m-1");

    const kueriPenerima = panggilan.filter((p) => /discussion_point_assignees/i.test(p.sql));
    expect(kueriPenerima).toHaveLength(1);
    expect(kueriPenerima[0].sql).toContain("point_id IN (?)");
    // Array, BUKAN dipecah jadi (?,?,…). Lihat catatan di kepala berkas ini.
    expect(kueriPenerima[0].params).toEqual([["d-1", "d-2"]]);

    expect(hasil.find((p) => p.id === "d-1")!.assigneeIds).toEqual(["u-1"]);
    // Titik diskusi tanpa baris penerima tetap dapat daftar, bukan `undefined`,
    // supaya form tidak perlu membedakan "kosong" dan "belum dibaca".
    expect(hasil.find((p) => p.id === "d-2")!.assigneeIds).toEqual([]);
  });

  it("tanpa satu titik diskusi pun, tidak ada kueri penerima sama sekali", async () => {
    siapkan((sql) => (/FROM DiscussionPoints/i.test(sql) ? halaman([]) : halaman([])));
    const hasil = await discussionPointsRepository.findByMeetingId("m-1");
    expect(hasil).toEqual([]);
    expect(panggilan.filter((p) => /discussion_point_assignees/i.test(p.sql))).toEqual([]);
  });

  it("createPoint menulis satu baris per penerima dan membuang duplikatnya", async () => {
    siapkan(() => halaman([]));
    await discussionPointsRepository.createPoint({
      id: "d-9",
      meetingId: "m-1",
      concern: "C",
      assigneeIds: ["u-1", "u-2", "u-1", ""],
    } as any);

    const sisip = panggilan.filter((p) => /INSERT INTO discussion_point_assignees/i.test(p.sql));
    expect(sisip).toHaveLength(2);
    expect(sisip.map((p) => p.params[2])).toEqual(["u-1", "u-2"]);
    // id baris dibuat di repository, bukan digabung dari string pemanggil.
    expect(sisip[0].params[0]).toBeTruthy();
  });

  it("updatePoint: [] mengosongkan, undefined tidak menyentuh", async () => {
    siapkan(() => halaman([]));

    await discussionPointsRepository.updatePoint("d-1", { assigneeIds: [] });
    expect(panggilan.some((p) => /DELETE FROM discussion_point_assignees/i.test(p.sql))).toBe(true);
    expect(
      panggilan.some((p) => /INSERT INTO discussion_point_assignees/i.test(p.sql))
    ).toBe(false);

    panggilan.length = 0;
    await discussionPointsRepository.updatePoint("d-1", { status: "completed" });
    expect(panggilan.some((p) => /discussion_point_assignees/i.test(p.sql))).toBe(false);
    // Toggle status tidak boleh ikut menulis ulang daftar penerima.
    expect(panggilan[0].sql).toContain("status = ?");
  });

  it("deletePoint ikut menghapus penerima dan berkas, tidak meninggalkan yatim", async () => {
    siapkan(() => halaman([]));
    await discussionPointsRepository.deletePoint("d-1");
    const gabungan = panggilan.map((p) => p.sql).join("\n");
    expect(gabungan).toContain("DELETE FROM discussion_point_assignees WHERE point_id = ?");
    expect(gabungan).toContain("DELETE FROM discussion_point_files WHERE point_id = ?");
    expect(gabungan).toContain("DELETE FROM discussion_point_comments WHERE pointId = ?");
    expect(sambungan.release).toHaveBeenCalled();
  });
});

describe("tags dan links JSONB (#703 B1 = a, #704 B3)", () => {
  it("nilai array ditulis sebagai TEKS JSON, bukan array JS", async () => {
    siapkan(() => halaman([]));
    await discussionPointsRepository.createPoint({
      id: "d-3",
      meetingId: "m-1",
      concern: "C",
      tags: [{ id: "t-1", label: "WMIR-168 Enhancement homepage" }],
      links: [{ id: "l-1", label: "Spec", url: "https://contoh.test/spec" }],
    } as any);

    const sisip = panggilan.find((p) => /INSERT INTO DiscussionPoints/i.test(p.sql))!;
    expect(sisip.sql).toContain("tags, links");
    const teksTags = sisip.params.find((v) => typeof v === "string" && v.startsWith("[{"));
    expect(JSON.parse(String(teksTags))).toEqual([
      { id: "t-1", label: "WMIR-168 Enhancement homepage" },
    ]);
  });

  it("schema menolak tautan yang bukan http(s) — ia akan jadi href", () => {
    const salah = createDiscussionPointSchema.safeParse({
      concern: "C",
      links: [{ id: "l-1", url: "javascript:alert(1)" }],
    });
    expect(salah.success).toBe(false);

    const sah = createDiscussionPointSchema.safeParse({
      concern: "C",
      links: [{ id: "l-1", url: "https://contoh.test/a" }],
    });
    expect(sah.success).toBe(true);
  });

  it("schema menolak daftar penerima yang tidak masuk akal panjangnya", () => {
    const banyak = Array.from({ length: 51 }, (_, i) => `u-${i}`);
    expect(createDiscussionPointSchema.safeParse({ concern: "C", assigneeIds: banyak }).success).toBe(
      false
    );
    expect(
      createDiscussionPointSchema.safeParse({ concern: "C", assigneeIds: banyak.slice(0, 50) })
        .success
    ).toBe(true);
  });
});

describe("discussion_point_files (#704, butir 6)", () => {
  it("baris berkas dibaca dengan SATU kueri ber-array dan dipetakan kembali", async () => {
    siapkan((sql) => {
      if (/FROM DiscussionPoints/i.test(sql)) return halaman([{ id: "d-1", concern: "A" }]);
      if (/discussion_point_assignees/i.test(sql)) return halaman([]);
      if (/discussion_point_files/i.test(sql))
        return halaman([
          {
            id: "f-1",
            point_id: "d-1",
            file_ref: "a.png",
            name: "a.png",
            original_name: "A.png",
            mimetype: "image/png",
            size: "1024",
            url: "/uploads/a.png?token=x",
            uploaded_by: "u-1",
            uploaded_by_name: "Rina",
            uploaded_at: "2026-10-12T00:00:00.000Z",
          },
        ]);
      return halaman([]);
    });

    const hasil = await discussionPointsRepository.findByMeetingId("m-1");
    const kueriBerkas = panggilan.find((p) => /discussion_point_files/i.test(p.sql))!;
    expect(kueriBerkas.sql).toContain("point_id IN (?)");
    expect(kueriBerkas.params).toEqual([["d-1"]]);
    expect(hasil[0].files).toHaveLength(1);
    expect(hasil[0].files![0]).toMatchObject({
      id: "f-1",
      pointId: "d-1",
      mimetype: "image/png",
      // BIGINT pulang sebagai string; angka yang dipakai UI harus number.
      size: 1024,
    });
  });

  it("findFilePointId memulangkan induknya supaya hapus bisa diperiksa", async () => {
    siapkan(() => halaman([{ point_id: "d-7" }]));
    await expect(discussionPointsRepository.findFilePointId("f-1")).resolves.toBe("d-7");
  });
});
