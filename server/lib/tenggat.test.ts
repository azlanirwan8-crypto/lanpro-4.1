/**
 * #563 — aritmetika tenggat. Kolom tanggal di `Tasks` adalah VARCHAR(50) bebas
 * isi, jadi yang diuji di sini terutama: batas 2 hari, mana yang dipakai saat
 * `endDate` kosong, dan bahwa sampah di kolom itu tidak boleh melempar.
 */
import { HARI_TENGGAT_DEKAT, hitungTenggat, tanggalTenggat } from "./tenggat";

const HARI_INI = new Date(2026, 8, 29, 9, 15); // 29 Sep 2026, jam beranda

const tugas = (bagian: any) => ({
  id: bagian.id || "t-x",
  title: bagian.title || "Judul",
  status: bagian.status ?? "To Do",
  endDate: bagian.endDate ?? null,
  startDate: bagian.startDate ?? null,
  dueDate: bagian.dueDate ?? null,
  projectName: bagian.projectName ?? "Wondr",
  ...bagian,
});

describe("hitungTenggat (#563)", () => {
  it("memakai endDate; startDate hanya saat endDate kosong", () => {
    expect(tanggalTenggat({ endDate: "2026-09-28", startDate: "2026-09-01" })).toBe("2026-09-28");
    expect(tanggalTenggat({ endDate: "", startDate: "2026-09-01" })).toBe("2026-09-01");
    // dueDate sengaja tidak dipakai di sini: kartu dasbor juga tidak memakainya.
    expect(tanggalTenggat({ endDate: null, startDate: null, dueDate: "2026-09-01" })).toBe("");
  });

  it("yang masuk hanya lewat tenggat atau sisa <= 2 hari, urut paling terlambat dulu", () => {
    const hasil = hitungTenggat(
      [
        tugas({ id: "lewat", endDate: "2026-09-22" }),
        tugas({ id: "besok", endDate: "2026-09-30" }),
        tugas({ id: "lusa", endDate: "2026-10-01" }),
        tugas({ id: "tiga-hari", endDate: "2026-10-02" }),
        tugas({ id: "cuma-start", endDate: "", startDate: "2026-09-28" }),
      ],
      HARI_INI
    );

    expect(hasil.map((h) => h.id)).toEqual(["lewat", "cuma-start", "besok", "lusa"]);
    expect(hasil[0].selisihHari).toBe(-7);
    expect(hasil[0].terlambat).toBe(true);
    expect(hasil[hasil.length - 1].selisihHari).toBe(HARI_TENGGAT_DEKAT);
    expect(hasil.every((h) => !h.terlambat || h.selisihHari < 0)).toBe(true);
  });

  it("tugas selesai tidak ditagih", () => {
    const hasil = hitungTenggat(
      [tugas({ id: "beres", status: "Done", endDate: "2026-09-20" })],
      HARI_INI
    );
    expect(hasil).toEqual([]);
  });

  it("tanggal rusak atau kosong dilewati tanpa melempar", () => {
    const hasil = hitungTenggat(
      [
        tugas({ id: "teks", endDate: "besok pagi" }),
        tugas({ id: "nol", endDate: "" }),
        tugas({ id: "bulan-13", endDate: "2026-13-40" }),
        tugas({ id: "tanpa-baris", endDate: "20260929" }),
      ],
      HARI_INI
    );
    expect(hasil).toEqual([]);
  });

  it("jam beranda tidak menggeser 'hari ini'", () => {
    // Pukul 23:59 hari yang sama tetap harus menghitung tenggat hari ini sebagai 0.
    const malam = new Date(2026, 8, 29, 23, 59);
    const hasil = hitungTenggat([tugas({ id: "hari-ini", endDate: "2026-09-29" })], malam);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].selisihHari).toBe(0);
    expect(hasil[0].terlambat).toBe(false);
  });

  it("keluaran tidak membawa kode tugas", () => {
    const hasil = hitungTenggat(
      [tugas({ id: "a", taskKey: "WMIR-168", endDate: "2026-09-28" })],
      HARI_INI
    );
    expect(JSON.stringify(hasil)).not.toContain("WMIR-168");
    expect(Object.keys(hasil[0]).sort()).toEqual(
      ["id", "judul", "proyek", "selisihHari", "status", "tanggal", "terlambat"].sort()
    );
  });
});
