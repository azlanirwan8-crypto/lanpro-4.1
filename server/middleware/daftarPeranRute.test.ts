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
  catatPenjagaMatriks,
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

describe("mode TOLAK — server menolak menyala bila peran tak dikenal", () => {
  it("MODE sudah TOLAK sejak 16 Agu 2026", () => {
    // Menurunkannya kembali ke LAPOR mengembalikan keadaan di mana salah ketik
    // nama peran jadi lubang senyap alih-alih kegagalan boot yang keras.
    expect(MODE).toBe("TOLAK");
  });

  it("peran tak dikenal MELEMPAR — inilah penolakan bootnya", () => {
    catatPenjaga(["superadmin"]);
    expect(() => laporkanPenjaga(() => {})).toThrow(/superadmin/);
  });

  it("peran warisan TIDAK menjatuhkan boot — ia terdaftar, bukan tak dikenal", () => {
    catatPenjaga(["member", "designer", "head"]);
    expect(() => laporkanPenjaga(() => {})).not.toThrow();
  });

  it("peran katalog dan `*` tidak menjatuhkan boot", () => {
    catatPenjaga(["owner", "developer", "qa", "*"]);
    expect(() => laporkanPenjaga(() => {})).not.toThrow();
  });

  it("laporannya menyebut jumlah penjaga dan kedua bentuk `*`", () => {
    catatPenjaga(["*"]);
    catatPenjaga(["admin", "*"]);
    const pesan: string[] = [];
    laporkanPenjaga((p) => pesan.push(p));
    const teks = pesan.join("\n");
    expect(teks).toContain("2 penjaga lama");
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

describe("#90 penjaga boot mengawasi penjaga MATRIKS, bukan tempat kosong", () => {
  it("menghitung penjaga matriks yang terdaftar", () => {
    catatPenjagaMatriks("list", "R");
    catatPenjagaMatriks("qa", "D");
    expect(periksaPenjaga().jumlahPenjagaMatriks).toBe(2);
  });

  it("modul yang tidak ada di matriks MENJATUHKAN boot", () => {
    // Salah ketik nama modul tidak memicu galat apa pun saat berjalan — ia
    // hanya menolak semua orang diam-diam. Inilah yang menangkapnya.
    catatPenjagaMatriks("liist", "R");
    expect(() => laporkanPenjaga(() => {})).toThrow(/liist/);
  });

  it("modul+aksi yang tidak mengizinkan SIAPA PUN menjatuhkan boot", () => {
    // `dashboard` hanya `R` di §19.5. Menjaga sebuah rute dengan
    // `jagaProyek("dashboard","U")` membuat rutenya mustahil dipakai.
    catatPenjagaMatriks("dashboard", "U");
    expect(() => laporkanPenjaga(() => {})).toThrow(/dashboard:U/);
  });

  it("kombinasi yang sah tidak menjatuhkan boot", () => {
    catatPenjagaMatriks("dashboard", "R");
    catatPenjagaMatriks("wiki", "D");
    catatPenjagaMatriks("list", "C");
    expect(() => laporkanPenjaga(() => {})).not.toThrow();
    expect(periksaPenjaga().hasil).toBe("bersih");
  });

  it("nol penjaga apa pun tetap laporan bersih, bukan galat", () => {
    expect(periksaPenjaga().hasil).toBe("bersih");
    expect(periksaPenjaga().jumlahPenjagaMatriks).toBe(0);
  });
});
