/**
 * #689 butir (d) — empat sebab daftar Isu terlihat kosong harus punya nama yang
 * berbeda. Fungsi ini murni; yang diuji adalah keputusan pelabelannya, karena
 * itulah bagian yang dulu salah dan tidak akan ketahuan kalau cuma dilihat
 * sekilas.
 */
import { keadaanDaftar, kunciPesanKosong } from "./keadaanKosong";

const args = (ubahan: Partial<Parameters<typeof keadaanDaftar>[0]> = {}) => ({
  tampil: 0,
  sebelumSaring: 25,
  hasilSaring: 0,
  total: 128,
  adaQueryServer: false,
  mine: false,
  punyaIdentitas: true,
  ...ubahan,
});

describe("#689 keadaanDaftar", () => {
  it("ada baris => bukan urusan pesan kosong", () => {
    expect(keadaanDaftar(args({ tampil: 3, hasilSaring: 3 }))).toBe("adaIsi");
  });

  it("proyek yang belum punya isu sama sekali", () => {
    expect(keadaanDaftar(args({ sebelumSaring: 0, total: 0 }))).toBe("kosong");
  });

  it("server mengirim baris tetapi saringan klien membuangnya", () => {
    expect(keadaanDaftar(args())).toBe("tidakCocok");
  });

  it("pencarian server yang tidak cocok jangan disebut proyek kosong", () => {
    expect(keadaanDaftar(args({ sebelumSaring: 0, total: 0, adaQueryServer: true }))).toBe(
      "tidakCocok"
    );
  });

  it("'My Tasks' yang nihil menunjuk lingkup, bukan datanya", () => {
    expect(keadaanDaftar(args({ sebelumSaring: 0, total: 0, mine: true }))).toBe("bukanMilikSaya");
  });

  it("'My Tasks' tidak boleh disalahkan kalau server justru mengirim barisnya", () => {
    // Server sudah menyaring mineOnly; baris yang datang memang milik pengguna
    // ini. Yang membuangnya adalah filter klien, dan itu yang harus disebutkan.
    expect(keadaanDaftar(args({ mine: true }))).toBe("tidakCocok");
  });

  it("'My Tasks' tanpa identitas tidak boleh menuduh lingkup", () => {
    expect(
      keadaanDaftar(args({ sebelumSaring: 0, total: 0, mine: true, punyaIdentitas: false }))
    ).toBe("kosong");
  });

  it("halaman lewat dari akhir daftar: server punya baris, halaman ini tidak", () => {
    expect(keadaanDaftar(args({ sebelumSaring: 0 }))).toBe("halamanLewat");
  });

  it("pengirian halaman di luar rentang juga halamanLewat, bukan tidakCocok", () => {
    expect(keadaanDaftar(args({ hasilSaring: 4 }))).toBe("halamanLewat");
  });

  it("setiap keadaan menunjuk kunci kamus yang berbeda kecuali adaIsi", () => {
    const judul = ["kosong", "tidakCocok", "bukanMilikSaya", "halamanLewat"].map(
      (k) => kunciPesanKosong(k as never).judul
    );
    expect(new Set(judul).size).toBe(4);
    // `adaIsi` sengaja memakai kunci kosong biasa: cabang itu tidak dirender.
    expect(kunciPesanKosong("adaIsi").judul).toBe("issues.emptyTitle");
  });

  it("setiap kunci punya pasangan petunjuk yang berbeda", () => {
    const petunjuk = ["kosong", "tidakCocok", "bukanMilikSaya", "halamanLewat"].map(
      (k) => kunciPesanKosong(k as never).petunjuk
    );
    expect(new Set(petunjuk).size).toBe(4);
  });
});
