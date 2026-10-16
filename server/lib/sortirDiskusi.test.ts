import { DAFTAR_KOLOM_SORTIR, KOLOM_SORTIR_DISKUSI, susunUrutanDiskusi } from "./sortirDiskusi";

/**
 * #765 — `ORDER BY` dibangun dari teks, bukan dari parameter: Postgres tidak
 * menerima `$1` di tempat nama kolom. Artinya SATU-SATUNYA hal yang berdiri antara
 * `?sort=` di URL dan eksekusi SQL adalah daftar di berkas ini. Test-nya karena
 * itu tidak boleh menguji "hasilnya tersortir" saja — ia harus membuktikan bahwa
 * string yang datang dari pengguna TIDAK PERNAH menempel ke klausa itu.
 */
describe("#765 — susunUrutanDiskusi", () => {
  it("tanpa permintaan: urutan bawaan papan, sama seperti sebelum #765", () => {
    expect(susunUrutanDiskusi()).toBe('ORDER BY "createdAt" ASC');
    expect(susunUrutanDiskusi({})).toBe('ORDER BY "createdAt" ASC');
  });

  it("setiap kolom yang diizinkan menghasilkan ekspresi bercutip dari peta", () => {
    expect(susunUrutanDiskusi({ sortir: "keterangan" })).toBe(
      'ORDER BY keterangan ASC NULLS LAST, "createdAt" ASC, id ASC'
    );
    expect(susunUrutanDiskusi({ sortir: "tindakanLanjut", arah: "desc" })).toBe(
      'ORDER BY "tindakanLanjut" DESC NULLS LAST, "createdAt" ASC, id ASC'
    );
    expect(susunUrutanDiskusi({ sortir: "targetDate", arah: "asc" })).toBe(
      'ORDER BY "targetDate" ASC NULLS LAST, "createdAt" ASC, id ASC'
    );
    expect(susunUrutanDiskusi({ sortir: "status", arah: "desc" })).toBe(
      "ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END DESC NULLS LAST, \"createdAt\" ASC, id ASC"
    );
    expect(susunUrutanDiskusi({ sortir: "concern", arah: "asc" })).toBe(
      'ORDER BY concern ASC NULLS LAST, "createdAt" ASC, id ASC'
    );
  });

  it("kolom `createdAt` tidak mengulang dirinya sendiri sebagai pengikat", () => {
    const hasil = susunUrutanDiskusi({ sortir: "createdAt", arah: "desc" });
    expect(hasil).toBe('ORDER BY "createdAt" DESC NULLS LAST, id ASC');
    expect(hasil.match(/createdAt/g)).toHaveLength(1);
  });

  it("NULLS LAST di kedua arah — kolom kosong tidak pernah menempati layar pertama", () => {
    /* Postgres memperlakukan NULL sebagai nilai TERBESAR. Tanpa klausa ini,
     * `keterangan DESC` menaruh semua poin tanpa catatan di paling atas papan,
     * padahal tinggi kolom teks dibatasi gulir sejak #708 — jadi yang pertama
     * terlihat justru kolom kosong. */
    for (const arah of ["asc", "desc"] as const) {
      for (const kolom of DAFTAR_KOLOM_SORTIR) {
        expect(susunUrutanDiskusi({ sortir: kolom, arah })).toContain("NULLS LAST");
      }
    }
  });

  it("pengikat stabil: setiap urutan lain selalu berakhir dengan createdAt + id", () => {
    /* Papan di-page dengan LIMIT/OFFSET. Mengurutkan kolom yang nilainya boleh
     * berulang (`status`, `keterangan`) tanpa pengikat membuat satu baris muncul
     * di dua halaman, atau tidak muncul sama sekali. */
    for (const kolom of DAFTAR_KOLOM_SORTIR) {
      if (kolom === "createdAt") continue;
      const hasil = susunUrutanDiskusi({ sortir: kolom, arah: "asc" });
      expect(hasil.endsWith(', "createdAt" ASC, id ASC')).toBe(true);
    }
  });

  it("nilai asing TIDAK menempel ke SQL — ia jatuh ke urutan bawaan", () => {
    /* Ini penjaga inject-nya. Setiap string di bawah akan menempel ke SQL kalau
     * seseorang mengganti peta ini dengan `KOLOM_SORTIR_DISKUSI[req.query.sort]`
     * apa adanya. */
    const coba = [
      "id; DROP TABLE DiscussionPoints",
      "concern) ASC, (SELECT 1",
      'createdAt" ASC, (SELECT pg_sleep(10))',
      "1=2",
      "passwordHash",
      "meetingId",
      "",
      "CONCERN",
    ];
    for (const sortir of coba) {
      expect(susunUrutanDiskusi({ sortir, arah: "desc" })).toBe('ORDER BY "createdAt" ASC');
    }
  });

  it("peta dan daftar kunci satu sumber — tidak ada kolom yang hilang dari salah satunya", () => {
    expect([...DAFTAR_KOLOM_SORTIR].sort()).toEqual(Object.keys(KOLOM_SORTIR_DISKUSI).sort());
    /* Nama kolom fisik yang benar, menurut `src/lib/pg-migrate.ts:530-548`.
     * Yang camelCase WAJIB bercutip karena dibuat dengan kutip dua; `concern`,
     * `keterangan`, dan `status` huruf kecil utuh jadi tidak. */
    expect(KOLOM_SORTIR_DISKUSI).toEqual({
      createdAt: '"createdAt"',
      concern: "concern",
      keterangan: "keterangan",
      tindakanLanjut: '"tindakanLanjut"',
      targetDate: '"targetDate"',
      status: "CASE status WHEN 'pending' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END",
    });
  });
});
