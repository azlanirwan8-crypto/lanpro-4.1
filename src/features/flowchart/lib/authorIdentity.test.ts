/**
 * Regression: Item #268 — ikon Edit flowchart membuka kanvas baca-saja.
 * Ditemukan lewat /qa 29 Agustus 2026 dari laporan pemilik proyek.
 *
 * Yang dikunci di sini adalah kasus yang dulu GAGAL: dokumen yang datang dari
 * server menyimpan id di `createdBy` (bukan nama), sementara pemeriksaan lama
 * mencocokkan satu nilai itu ke enam field identitas sekaligus. Ketika
 * pencocokannya meleset, `canModifyFlowchart` memulangkan false, tombol Edit
 * dan Hapus hilang, dan kanvas terbuka baca-saja — yang terbaca sebagai "klik
 * edit malah ke detail".
 */
import { apakahPembuat } from "./authorIdentity";

const pengguna = {
  id: "u-123",
  uid: "uid-999",
  username: "azlan",
  email: "azlan@contoh.id",
  displayName: "Azlan Irwan",
};

describe("apakahPembuat", () => {
  it("mengenali pembuat lewat id — bentuk yang dipulangkan server sejak #268", () => {
    expect(apakahPembuat({ createdBy: "u-123", createdByName: "Azlan Irwan" }, pengguna)).toBe(
      true
    );
  });

  it("mengenali pembuat lewat uid, bukan hanya id", () => {
    expect(apakahPembuat({ createdBy: "uid-999" }, pengguna)).toBe(true);
  });

  it("tetap mengenali baris LAMA yang menyimpan nama di kolom id", () => {
    // Dibuat sebelum #268: backend belum punya kolom nama terpisah, sehingga
    // `createdBy` bisa berisi nama tampilan. Membuang jalur ini akan membuat
    // seluruh flowchart lama mendadak tidak bisa diedit pembuatnya sendiri.
    expect(apakahPembuat({ createdBy: "Azlan Irwan" }, pengguna)).toBe(true);
    expect(apakahPembuat({ createdBy: "azlan" }, pengguna)).toBe(true);
  });

  it("mengenali pembuat lewat kolom nama ketika id tidak cocok", () => {
    expect(apakahPembuat({ createdBy: "", createdByName: "azlan@contoh.id" }, pengguna)).toBe(true);
  });

  it("tidak terpengaruh beda huruf besar-kecil dan spasi di tepi", () => {
    expect(apakahPembuat({ createdBy: "  U-123  " }, pengguna)).toBe(true);
    expect(apakahPembuat({ createdByName: "  AZLAN IRWAN " }, pengguna)).toBe(true);
  });

  it("menolak pengguna lain", () => {
    expect(apakahPembuat({ createdBy: "u-lain", createdByName: "Budi" }, pengguna)).toBe(false);
  });

  it("menolak ketika jejak pembuatnya kosong — bukan memulangkan true karena sama-sama kosong", () => {
    expect(apakahPembuat({ createdBy: "", createdByName: null }, pengguna)).toBe(false);
    expect(apakahPembuat({}, pengguna)).toBe(false);
  });

  it("menolak ketika sesi penggunanya kosong atau field identitasnya kosong", () => {
    expect(apakahPembuat({ createdBy: "u-123" }, null)).toBe(false);
    expect(apakahPembuat({ createdBy: "u-123" }, {})).toBe(false);
    // Sesi tanpa id tetapi punya nama kosong: jangan sampai string kosong di
    // kedua sisi dianggap cocok.
    expect(apakahPembuat({ createdBy: "" }, { id: "", displayName: "" })).toBe(false);
  });

  it("menolak dokumen null tanpa melempar", () => {
    expect(apakahPembuat(null, pengguna)).toBe(false);
    expect(apakahPembuat(undefined, pengguna)).toBe(false);
  });
});
