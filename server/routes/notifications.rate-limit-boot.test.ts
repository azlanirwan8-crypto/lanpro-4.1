/**
 * Regresi — `express-rate-limit` menolak konfigurasi `keyGenerator` yang
 * jatuh ke `req.ip` mentah, dan menolaknya SAAT `rateLimit(...)` DIPANGGIL,
 * bukan saat ada permintaan masuk.
 *
 * Ditemukan 29 Agu 2026 lewat `npm run dev` sungguhan, bukan test: begitu
 * server dinyalakan, memuat `notifications.routes.ts` melempar
 * `ValidationError: ERR_ERL_KEY_GEN_IPV6` dan seluruh berkas rute gagal
 * diimpor — semua endpoint notifikasi mati sejak boot, meski gerbang
 * `#258` (`notifications.otorisasi-258.test.ts`) 8/8 hijau.
 *
 * KENAPA GERBANG SEBELUMNYA TIDAK MENANGKAP INI. Test #258 selalu memasang
 * `req.user` di setiap kasus (`pasangApp({ id: ... })`), sehingga
 * `keyGenerator`-nya SELALU pulang di klausa pertama (`req.user?.id`) dan
 * jalur fallback ke `req.ip` tidak pernah benar-benar ditempuh. Yang gagal
 * bukan LOGIKA fallback-nya — itu tidak pernah dieksekusi sama sekali — yang
 * gagal adalah VALIDASI KONFIGURASI saat modul dimuat, sebelum permintaan
 * apa pun tiba. Test manapun yang memasang mock sebelum impor tidak akan
 * pernah melihat ini.
 *
 * `db.ts` TETAP di-mock (sama seperti berkas test lain di folder ini) —
 * itu bukan menyembunyikan bug-nya. Bug aslinya berasal dari `rateLimit(...)`
 * sendiri saat modul dimuat, bukan dari apa pun yang menyentuh database, jadi
 * memock koneksi database tidak mengubah apakah bug ini tertangkap. Tanpa
 * mock ini, mengimpor modul memicu percobaan koneksi Postgres sungguhan yang
 * bocor sebagai open handle setelah Jest selesai.
 */

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(async () => [[]]),
    getConnection: jest.fn(async () => ({
      query: jest.fn(async () => [[]]),
      release: jest.fn(),
    })),
  },
  query: jest.fn(async () => [[]]),
}));

describe("Boot: notifications.routes tidak melempar saat diimpor", () => {
  it("modul berhasil dimuat tanpa ValidationError dari express-rate-limit", () => {
    expect(() => {
      require("./notifications.routes");
    }).not.toThrow();
  });

  it("keyGenerator memakai ipKeyGenerator untuk fallback IP, bukan req.ip mentah", () => {
    // Bukti tekstual sebagai lapis kedua: pemeriksaan express-rate-limit
    // sendiri berbasis toString() fungsinya, jadi ini menjaga bentuknya
    // tidak diam-diam kembali ke pola yang salah.
    const fs = require("fs");
    const isi = fs.readFileSync(require.resolve("./notifications.routes.ts"), "utf8");
    expect(isi).toMatch(/ipKeyGenerator\(req\.ip\)/);
    expect(isi).not.toMatch(/\|\|\s*req\.ip\s*[,)]/);
  });
});
