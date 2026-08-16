/**
 * Menegakkan kontrak antara enum peran dan penyemai katalog.
 *
 * KENAPA TEST INI ADA, dan kenapa ia MEMBACA BERKAS alih-alih meng-import.
 *
 * §19.10 mencatat kekeliruan yang layak diingat: penyemai versi pertama menulis
 * `type = 'system_role'` ke database, seluruh pemeriksaan sisi database lulus,
 * dan barisnya tetap TIDAK PERNAH muncul di layar — karena antarmuka membaca
 * `type = 'project_role'`. Datanya benar, kontraknya yang putus.
 *
 * Kegagalan yang sama bisa terulang di sini dengan bentuk berbeda: seseorang
 * menambah peran ke `SYSTEM_ROLES`/`PROJECT_ROLES` tanpa menambahkannya ke
 * penyemai, atau sebaliknya. Kompilator tidak akan protes — keduanya berkas
 * yang sah. Yang menangkapnya hanya perbandingan langsung.
 *
 * Penyemai adalah `.cjs` yang membuka koneksi Postgres saat dijalankan, jadi
 * ia tidak boleh di-import di dalam test. Berkasnya DIBACA sebagai teks dan
 * kode perannya diambil dengan regex. Ini disengaja: test membandingkan apa
 * yang BENAR-BENAR TERTULIS di penyemai, bukan apa yang bisa dieksekusi.
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  SYSTEM_ROLES,
  PROJECT_ROLES,
  PERAN_WARISAN,
  adalahPeranSistem,
  adalahPeranProyek,
  peranTakDikenal,
  normalkanPeran,
} from "./roles";

const BERKAS_PENYEMAI = join(__dirname, "..", "..", "scripts", "db", "seed-katalog-peran.cjs");

/**
 * Mengambil kode peran per lingkup dari penyemai.
 *
 * Penyemai menyusun dua array literal, `SYSTEM_ROLES` dan `PROJECT_ROLES`, yang
 * tiap barisnya memuat `code: "..."`. Yang dipotong di sini adalah teks antara
 * nama array itu dan penutupnya, lalu semua `code:` di dalamnya dikumpulkan.
 */
function kodeDariPenyemai(namaArray: string): string[] {
  const sumber = readFileSync(BERKAS_PENYEMAI, "utf8");
  const mulai = sumber.indexOf(`${namaArray} = [`);
  if (mulai === -1) {
    throw new Error(
      `Array '${namaArray}' tidak ditemukan di penyemai. ` +
        `Bila namanya diganti, perbarui test ini — JANGAN melonggarkan pencariannya.`
    );
  }
  const selesai = sumber.indexOf("\n];", mulai);
  const potongan = sumber.slice(mulai, selesai === -1 ? undefined : selesai);
  return [...potongan.matchAll(/code:\s*"([^"]+)"/g)].map((m) => m[1]);
}

describe("enum peran vs penyemai katalog", () => {
  it("SYSTEM_ROLES sama persis dengan kode SYSTEM di penyemai", () => {
    expect([...SYSTEM_ROLES].sort()).toEqual(kodeDariPenyemai("SYSTEM_ROLES").sort());
  });

  it("PROJECT_ROLES sama persis dengan kode PROJECT di penyemai", () => {
    expect([...PROJECT_ROLES].sort()).toEqual(kodeDariPenyemai("PROJECT_ROLES").sort());
  });

  it("jumlahnya 4 SYSTEM + 8 PROJECT seperti §19.8 tahap 0", () => {
    expect(SYSTEM_ROLES).toHaveLength(4);
    expect(PROJECT_ROLES).toHaveLength(8);
  });
});

describe("tabrakan kode antar lingkup — alasan enum dipisah", () => {
  /**
   * Ini bukan sekadar mencatat keadaan; ia menjaga ALASAN pemisahan tetap
   * terlihat. Bila suatu hari kode-kode ini tidak lagi bertabrakan, penggabungan
   * dua enum jadi satu bisa dipertimbangkan ulang — dan test ini yang akan
   * memberi tahu.
   */
  it("`admin` dan `viewer` ada di KEDUA lingkup", () => {
    const bertabrakan = SYSTEM_ROLES.filter((r) =>
      (PROJECT_ROLES as readonly string[]).includes(r)
    );
    expect(bertabrakan.sort()).toEqual(["admin", "viewer"]);
  });

  it("`admin` sistem tidak sama artinya dengan `admin` proyek", () => {
    // Keduanya lolos pemeriksaan lingkupnya masing-masing. Yang membedakan
    // hanya lingkup tempat ia diperiksa — persis kenapa lingkup wajib dibawa.
    expect(adalahPeranSistem("admin")).toBe(true);
    expect(adalahPeranProyek("admin")).toBe(true);
  });
});

describe("normalisasi nilai peran dari data lama", () => {
  it("tidak peka huruf besar-kecil dan spasi berlebih", () => {
    expect(normalkanPeran("  ADMIN ")).toBe("admin");
    expect(adalahPeranSistem("Admin")).toBe(true);
    expect(adalahPeranProyek("  Developer  ")).toBe(true);
  });

  it("null dan undefined jadi string kosong, bukan lolos", () => {
    expect(normalkanPeran(null)).toBe("");
    expect(normalkanPeran(undefined)).toBe("");
    expect(adalahPeranSistem(null)).toBe(false);
  });

  it("LABEL bukan kode — `Department Head` ditolak, `head` diterima", () => {
    // Persis nilai yang pernah tersimpan salah, lihat kepala roleCatalog.ts.
    expect(adalahPeranSistem("Department Head")).toBe(false);
    expect(adalahPeranSistem("head")).toBe(true);
  });
});

describe("peranTakDikenal — bahan penjaga saat boot (tahap 2)", () => {
  it("peran katalog dikenal di lingkupnya", () => {
    expect(peranTakDikenal("developer", "PROJECT")).toBe(false);
    expect(peranTakDikenal("head", "SYSTEM")).toBe(false);
  });

  it("peran warisan TIDAK dianggap tak dikenal — ia terdaftar, sedang ditunggu pemetaannya", () => {
    for (const w of PERAN_WARISAN) {
      expect(peranTakDikenal(w, "PROJECT")).toBe(false);
    }
  });

  it("11 nama peran hantu dari §19.2 ditolak", () => {
    const hantu = [
      "superadmin",
      "administrator",
      "assistant",
      "lead",
      "sadm",
      "admn",
      "system admin",
      "super admin",
    ];
    for (const h of hantu) {
      expect(peranTakDikenal(h, "SYSTEM")).toBe(true);
      expect(peranTakDikenal(h, "PROJECT")).toBe(true);
    }
  });

  it("string kosong ditolak — deny-by-default, §19.6 aturan 3", () => {
    expect(peranTakDikenal("", "PROJECT")).toBe(true);
    expect(peranTakDikenal(null, "PROJECT")).toBe(true);
  });

  it("`developer` sah di PROJECT tetapi TIDAK di SYSTEM", () => {
    expect(peranTakDikenal("developer", "PROJECT")).toBe(false);
    expect(peranTakDikenal("developer", "SYSTEM")).toBe(true);
  });
});
