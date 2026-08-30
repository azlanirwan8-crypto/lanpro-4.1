/**
 * Regresi ISSUE-299 — templat email yang diatur admin harus BENAR-BENAR dipakai.
 * Diminta pemilik proyek 30 Agu 2026.
 *
 * Sebelum perbaikan, `subjectTemplate` dan `bodyTemplate` tersimpan di
 * `IntegrationSettings`, bisa diubah dari halaman Pengaturan, dan **tidak
 * dibaca satu pun jalur pengiriman**. Admin mengisi, menekan Simpan, melihat
 * notifikasi berhasil, dan tidak ada apa pun yang berubah pada email yang
 * benar-benar terkirim.
 */

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: jest.fn().mockResolvedValue([[]]),
      release: () => undefined,
    }),
  },
}));

import { isiPlaceholder } from "./email.service";

describe("#299 pengisian placeholder templat email", () => {
  it("mengganti placeholder yang dikenal", () => {
    const hasil = isiPlaceholder("Halo {{user_name}}, ada {{total_tugas}} tugas.", {
      user_name: "Budi",
      total_tugas: 3,
    });

    expect(hasil).toBe("Halo Budi, ada 3 tugas.");
  });

  it("menerima spasi di dalam kurung", () => {
    expect(isiPlaceholder("Halo {{ user_name }}", { user_name: "Siti" })).toBe("Halo Siti");
  });

  it("MEMBIARKAN placeholder yang tidak dikenal apa adanya", () => {
    // Sengaja tidak diganti string kosong: admin yang salah ketik akan
    // melihat kesalahannya di email uji, sedangkan bagian yang hilang tanpa
    // jejak justru membuatnya menebak-nebak.
    const hasil = isiPlaceholder("Halo {{user_nam}}, {{user_name}}", { user_name: "Budi" });

    expect(hasil).toBe("Halo {{user_nam}}, Budi");
  });

  it("mengganti kemunculan berulang dari placeholder yang sama", () => {
    expect(isiPlaceholder("{{a}} dan {{a}}", { a: "X" })).toBe("X dan X");
  });

  it("templat tanpa placeholder dikembalikan utuh", () => {
    expect(isiPlaceholder("Pemberitahuan sistem", { user_name: "Budi" })).toBe(
      "Pemberitahuan sistem"
    );
  });

  it("angka nol tetap diganti, bukan dianggap kosong", () => {
    // Jebakan klasik: `0` bernilai falsy. Kalau pengecekannya memakai
    // kebenaran nilai alih-alih `undefined`, "0 tugas" akan tampil sebagai
    // "{{total_tugas}} tugas" di email yang justru paling sering terkirim.
    expect(isiPlaceholder("{{total_tugas}} tugas", { total_tugas: 0 })).toBe("0 tugas");
  });
});
