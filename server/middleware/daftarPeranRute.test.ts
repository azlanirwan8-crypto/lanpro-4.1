/**
 * Test penjaga saat boot. §19.8 tahap 2.
 *
 * Yang diuji di sini adalah PEMERIKSAnya, bukan isi rutenya.
 *
 * Angka nyata dari rute sungguhan SENGAJA tidak diuji di sini. Meng-import modul
 * rute di dalam Jest menarik adaptor DB dan membuka koneksi Postgres — persis
 * sebab `getJwtSecret` dulu harus dipisah ke berkas sendiri (§0.3), ketika 22
 * test lulus tetapi exit code-nya 1. Angka nyatanya dibaca dari LOG BOOT server
 * sungguhan, dan dicatat di §19.16.
 */

import {
  catatPenjaga,
  kosongkanPendaftaran,
  periksaPenjaga,
  laporkanPenjaga,
  MODE,
} from "./daftarPeranRute";

beforeEach(() => kosongkanPendaftaran());

describe("membedakan dua bentuk pemakaian `*`", () => {
  it("`['*']` polos dihitung terpisah dari korslet", () => {
    catatPenjaga(["*"]);
    const h = periksaPenjaga();
    expect(h.bintangPolos).toBe(1);
    expect(h.bintangKorslet).toBe(0);
  });

  it("`'*'` bersama peran lain dihitung KORSLET — #73", () => {
    // Bentuk persis dari PUT .../dashboard-layout: daftar perannya jadi tidak
    // berarti apa-apa, sebab `*` meloloskan semuanya lebih dulu.
    catatPenjaga(["admin", "manager", "head", "developer", "designer", "viewer", "*"]);
    const h = periksaPenjaga();
    expect(h.bintangKorslet).toBe(1);
    expect(h.bintangPolos).toBe(0);
  });

  it("`*` tidak pernah dianggap nama peran", () => {
    catatPenjaga(["*"]);
    expect(periksaPenjaga().takDikenal).toEqual([]);
  });
});

describe("peran di luar katalog", () => {
  it("peran hantu §19.2 dilaporkan", () => {
    catatPenjaga(["superadmin", "assistant"]);
    const h = periksaPenjaga();
    expect(h.hasil).toBe("bermasalah");
    expect(h.takDikenal).toEqual(["assistant", "superadmin"]);
  });

  it("peran katalog tidak dilaporkan", () => {
    catatPenjaga(["owner", "admin", "manager", "developer", "qa"]);
    const h = periksaPenjaga();
    expect(h.hasil).toBe("bersih");
    expect(h.takDikenal).toEqual([]);
  });

  it("peran warisan dipisahkan dari yang tak dikenal", () => {
    // `member` dan `designer` BUKAN peran katalog, tetapi terdaftar sebagai
    // warisan — jadi ia ditoleransi sementara dan TIDAK menjatuhkan boot.
    catatPenjaga(["member", "designer", "head"]);
    const h = periksaPenjaga();
    expect(h.hasil).toBe("bersih");
    expect(h.warisanTerpakai).toEqual(["designer", "head", "member"]);
  });

  it("tidak peka huruf besar-kecil", () => {
    catatPenjaga(["ADMIN", "Developer"]);
    expect(periksaPenjaga().hasil).toBe("bersih");
  });
});

describe("mode LAPOR — belum menolak apa pun", () => {
  it("MODE masih LAPOR; menaikkannya ke TOLAK adalah keputusan tersendiri", () => {
    // Bila baris ini merah, seseorang menaikkan mode. Pastikan `member` sudah
    // dipetakan dan `designer` dibuang lebih dulu, kalau tidak server MATI.
    expect(MODE).toBe("LAPOR");
  });

  it("peran tak dikenal TIDAK melempar selama mode LAPOR", () => {
    catatPenjaga(["superadmin"]);
    const pesan: string[] = [];
    expect(() => laporkanPenjaga((p) => pesan.push(p))).not.toThrow();
    expect(pesan.join("\n")).toContain("superadmin");
  });

  it("laporannya menyebut jumlah penjaga dan kedua bentuk `*`", () => {
    catatPenjaga(["*"]);
    catatPenjaga(["admin", "*"]);
    const pesan: string[] = [];
    laporkanPenjaga((p) => pesan.push(p));
    const teks = pesan.join("\n");
    expect(teks).toContain("2 penjaga rute terdaftar");
    expect(teks).toContain("1 ber-");
    expect(teks).toContain("1 korslet");
  });
});

describe("pendaftaran", () => {
  it("menyimpan SALINAN, bukan rujukan — daftar peran rute tidak bisa berubah diam-diam", () => {
    const daftar = ["admin"];
    catatPenjaga(daftar);
    daftar.push("superadmin");
    expect(periksaPenjaga().hasil).toBe("bersih");
  });

  it("nol penjaga menghasilkan laporan bersih, bukan galat", () => {
    const h = periksaPenjaga();
    expect(h.jumlahPenjaga).toBe(0);
    expect(h.hasil).toBe("bersih");
  });
});
