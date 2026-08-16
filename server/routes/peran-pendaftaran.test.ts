/**
 * Test PERILAKU untuk #91b: peran tidak boleh diminta dari body.
 *
 * KENAPA INI PERLU, padahal sisi frontend sudah dikunci.
 *
 * `useAuth.pintu-belakang.test.ts` mengunci pola berbahaya di berkas frontend.
 * Itu menjaga satu jalan masuk, bukan aturannya. Endpoint pendaftaran ini
 * PUBLIK — ia berada di luar gerbang autentikasi `/api/*`, karena kalau tidak,
 * tidak ada yang bisa mendaftar. Siapa pun bisa memanggilnya dengan `curl`,
 * tanpa menyentuh frontend sama sekali.
 *
 * Jadi yang wajib dibuktikan di sini adalah perilaku SERVER-nya: permintaan
 * pendaftaran yang meminta `role: "admin"` menghasilkan pengguna berperan
 * `user`, bukan `admin`.
 *
 * Sebelum #91b, `insertRole = role || "user"` mengambilnya mentah dari body.
 * Statusnya dipaksa PENDING sehingga akun itu belum bisa masuk — tetapi yang
 * menyetujui melihat daftar tunggu, bukan kolom peran, dan satu klik "approve"
 * menjadikannya Administrator sistem lengkap dengan God Mode lintas proyek.
 */

const mockKueri = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: async () => ({ query: mockKueri, release: () => undefined }) },
}));

jest.mock("../middleware/socketAuth", () => ({
  __esModule: true,
  roomPengguna: () => "room",
  sidikToken: () => "sidik",
}));

import express from "express";
import request from "supertest";
import authRoutes from "./auth.routes";

/**
 * Kolom `role` pada `INSERT INTO Users`, dibaca dari parameter kuerinya.
 *
 * Mengembalikan `null` bila INSERT tidak pernah terjadi. Bedakan keduanya saat
 * test ini merah: `null` berarti permintaannya DITOLAK sebelum sampai ke DB —
 * dua test di sini sempat merah begitu karena usernamenya melanggar aturan
 * validasi (maksimal 10 karakter, huruf saja), bukan karena perannya salah.
 */
function peranYangDitulis(): string | null {
  for (const panggilan of mockKueri.mock.calls) {
    const sql = String(panggilan[0] || "");
    if (!/INSERT INTO Users/i.test(sql)) continue;
    // Urutan kolomnya: id, uid, username, nama_lengkap, email, displayName,
    // photoURL, role, status, ... — `role` ada di indeks ke-7.
    const nilai = panggilan[1] as any[];
    return nilai ? String(nilai[7]) : null;
  }
  return null;
}

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authRoutes);
  return app;
};

/**
 * Menyiapkan DB palsu untuk SATU permintaan.
 *
 * Sengaja dipanggil di dalam tiap test, bukan lewat `beforeEach`. Konfigurasi
 * Jest repo ini memakai `resetMocks: true`, dan menyiapkan nilai kembalian di
 * `beforeEach` membuat sebagian test kehilangan penyiapannya secara tidak
 * konsisten — dua dari tiga test sempat melaporkan "INSERT tidak pernah
 * terjadi" padahal INSERT-nya terjadi.
 *
 * Semua kueri pemeriksaan (username/email sudah dipakai?) menjawab kosong,
 * sehingga alurnya sampai ke INSERT.
 */
function siapkanDb() {
  mockKueri.mockReset();
  mockKueri.mockResolvedValue([[]]);
}

describe("#91b peran tidak boleh diminta dari body", () => {
  it("pendaftar TANPA token yang meminta `role: admin` tetap jadi `user`", async () => {
    siapkanDb();
    await request(buatApp()).post("/api/auth/register").send({
      username: "penyusup",
      password: "KataSandi1@Kuat",
      email: "penyusup@contoh.test",
      fullName: "Penyusup Satu",
      name: "Penyusup Satu",
      role: "admin",
    });

    const peran = peranYangDitulis();
    expect(peran).not.toBe("admin");
    expect(peran).toBe("user");
  });

  it("token SAMPAH tidak memberi hak lebih — tetap `user`", async () => {
    // Kegagalan verifikasi token harus berarti "bukan admin", bukan "lewati
    // pemeriksaan". Arah kegagalan yang salah di sini justru membuka pintunya.
    siapkanDb();
    await request(buatApp())
      .post("/api/auth/register")
      .set("Authorization", "Bearer token-yang-tidak-sah")
      .send({
        username: "penyusupb",
        password: "KataSandi1@Kuat",
        email: "penyusup2@contoh.test",
        fullName: "Penyusup Dua",
        name: "Penyusup Dua",
        role: "admin",
      });

    expect(peranYangDitulis()).toBe("user");
  });

  it("pendaftaran biasa tanpa `role` tetap berjalan dan jadi `user`", async () => {
    // Pengetatan tidak boleh mematikan pendaftaran yang sah.
    siapkanDb();
    await request(buatApp()).post("/api/auth/register").send({
      username: "userbaru",
      password: "KataSandi1@Kuat",
      email: "baru@contoh.test",
      fullName: "Pengguna Baru",
      name: "Pengguna Baru",
    });

    expect(peranYangDitulis()).toBe("user");
  });
});
