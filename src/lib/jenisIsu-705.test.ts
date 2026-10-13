/**
 * #705 — pencocok jenis isu untuk Advanced Filters.
 *
 * Yang diuji di sini adalah kasus yang TIDAK bisa ditangkap oleh test render:
 * kolom `type` pada tugas ditulis dari lebih dari satu sumber, jadi perbandingan
 * string mentah tampak benar di satu proyek dan salah di proyek lain — tanpa
 * galat, hanya daftar kosong.
 */
import { cocokJenisIsu, kunciJenisIsu, rapikanOpsiJenisIsu, SEMUA_JENIS } from "./jenisIsu";
import type { MasterData } from "../types";

const baris = (b: Partial<MasterData> & { label: string }): MasterData => ({
  id: b.id ?? `md-${b.label}`,
  type: "issue_type",
  label: b.label,
  code: b.code,
  icon: b.icon,
  color: b.color,
  order: b.order ?? 0,
});

describe("#705 kunciJenisIsu", () => {
  const master: MasterData[] = [
    baris({ label: "Bug", code: "bug", icon: "AlertCircle" }),
    baris({ label: "Epic", code: "epik" }),
  ];

  it("nilai kosong menghasilkan kunci kosong", () => {
    expect(kunciJenisIsu(master, undefined)).toBe("");
    expect(kunciJenisIsu(master, "   ")).toBe("");
  });

  it("kunci yang dipakai adalah code master data, bukan label", () => {
    expect(kunciJenisIsu(master, "Bug")).toBe("bug");
    // "epik" adalah code-nya; label "Epic" harus jatuh ke kunci yang SAMA.
    expect(kunciJenisIsu(master, "Epic")).toBe("epik");
  });

  it("nilai yang tidak dikenal master data tetap memakai dirinya sendiri", () => {
    expect(kunciJenisIsu(master, "Cerita")).toBe("cerita");
    expect(kunciJenisIsu([], "Bug")).toBe("bug");
  });
});

describe("#705 cocokJenisIsu", () => {
  const master: MasterData[] = [
    baris({ label: "Bug", code: "bug" }),
    baris({ label: "Epic", code: "epik" }),
  ];

  it("filter 'All' dan filter kosong tidak menyembunyikan apa pun", () => {
    for (const filter of [SEMUA_JENIS, "", undefined, null]) {
      expect(cocokJenisIsu(master, "bug", filter)).toBe(true);
      expect(cocokJenisIsu(master, undefined, filter)).toBe(true);
    }
  });

  it("besar-kecil dan sumber penulisan tidak mengubah hasil", () => {
    // Formulir isu menyimpan label di-lowercase, bilah cepat menyimpan "Epic".
    expect(cocokJenisIsu(master, "bug", "Bug")).toBe(true);
    expect(cocokJenisIsu(master, "Bug", "Bug")).toBe(true);
    expect(cocokJenisIsu(master, "BUG", "bug")).toBe(true);
    expect(cocokJenisIsu(master, "Epic", "epik")).toBe(true);
  });

  /**
   * Ini alasan utama fungsi ini ada, bukan perbandingan langsung. Pemilik proyek
   * mengganti LABEL "Bug" menjadi "Kesalahan" di Master Data — `code` tetap.
   * Tugas-tugas lama masih menyimpan "bug". Filter yang dipilih "Kesalahan"
   * harus TETAP menemukan baris lama itu.
   */
  it("label yang sudah diganti tidak membuang tugas lama", () => {
    const sesudahGanti: MasterData[] = [baris({ label: "Kesalahan", code: "bug" })];
    expect(cocokJenisIsu(sesudahGanti, "bug", "Kesalahan")).toBe(true);
    expect(cocokJenisIsu(sesudahGanti, "Kesalahan", "Kesalahan")).toBe(true);
  });

  it("jenis lain tetap tersaring keluar", () => {
    expect(cocokJenisIsu(master, "bug", "Epic")).toBe(false);
    expect(cocokJenisIsu(master, "epik", "Bug")).toBe(false);
  });

  it("tugas tanpa jenis hilang saat satu jenis dipilih", () => {
    // Jujur: filter jenis yang aktif memang tidak punya apa pun untuk dicocokkan
    // pada baris ini. Tanpa filter (kasus di atas) barisnya tetap tampil.
    expect(cocokJenisIsu(master, undefined, "Bug")).toBe(false);
    expect(cocokJenisIsu(master, "", "Bug")).toBe(false);
  });

  it("tanpa master data sama sekali, pencocokan jatuh ke nilai mentah", () => {
    expect(cocokJenisIsu([], "bug", "Bug")).toBe(true);
    expect(cocokJenisIsu(undefined, "bug", "Epic")).toBe(false);
  });
});

/**
 * `opsiFilter()` menyatu dari label MasterData DAN nilai mentah pada tugas.
 * Untuk `issue_type` dua bentuk itu hampir selalu beda huruf besar-kecil, jadi
 * tanpa penyusutan dropdown-nya menampilkan satu jenis dua kali — dan keduanya
 * memulangkan baris yang sama persis. Test ini mengunci bentuk daftar yang
 * benar-benar dihasilkan produksi: benih `"Bug"` dari master, `"bug"` dari
 * `hooks.ts:381`.
 */
describe("#705 rapikanOpsiJenisIsu", () => {
  const master: MasterData[] = [
    baris({ label: "Bug", code: "bug", icon: "AlertCircle" }),
    baris({ label: "Epic", code: "epic", icon: "Rocket" }),
  ];

  const opsi = (id: string, icon?: string) => ({ id, label: id, icon });

  it("satu jenis hanya muncul satu kali meski ditulis dua bentuk", () => {
    const hasil = rapikanOpsiJenisIsu(master, [
      opsi("Bug", "AlertCircle"),
      opsi("Epic", "Rocket"),
      opsi("bug"),
      opsi("epic"),
    ]);
    expect(hasil.map((o) => o.id)).toEqual(["Bug", "Epic"]);
  });

  it("entri yang tersisa adalah yang punya ikon MasterData", () => {
    // Urutan dibalik: nilai mentah datang lebih dulu, ikon master tetap menang.
    const hasil = rapikanOpsiJenisIsu(master, [opsi("bug"), opsi("Bug", "AlertCircle")]);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].id).toBe("Bug");
    expect(hasil[0].icon).toBe("AlertCircle");
  });

  it("nilai tugas yang tidak dikenal master tetap punya entri sendiri", () => {
    const hasil = rapikanOpsiJenisIsu(master, [
      opsi("Bug", "AlertCircle"),
      opsi("bug"),
      opsi("Insiden"),
    ]);
    expect(hasil.map((o) => o.id)).toEqual(["Bug", "Insiden"]);
  });

  it("jenis yang tersusut tetap menemukan kedua bentuk penulisan", () => {
    const terpilih = rapikanOpsiJenisIsu(master, [opsi("Bug", "AlertCircle"), opsi("bug")])[0];
    expect(cocokJenisIsu(master, "bug", terpilih.id)).toBe(true);
    expect(cocokJenisIsu(master, "Bug", terpilih.id)).toBe(true);
  });

  it("daftar tanpa duplikat dikembalikan apa adanya, terurut label", () => {
    const hasil = rapikanOpsiJenisIsu(master, [opsi("Epic", "Rocket"), opsi("Bug", "AlertCircle")]);
    expect(hasil.map((o) => o.id)).toEqual(["Bug", "Epic"]);
  });
});
