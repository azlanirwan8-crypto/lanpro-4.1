/**
 * Test perilaku `jagaProyek` — §19.8 tahap 4, item #76.
 *
 * Yang diuji di sini adalah URUTAN PEMERIKSAAN §19.6 dan sifat
 * deny-by-default-nya, bukan isi matriks. Isi matriks sudah diadu dengan tabel
 * §19.4/§19.5 di `src/lib/matriksAkses.test.ts`.
 *
 * Adaptor DB dipalsukan supaya test ini tidak membuka koneksi Postgres — §0.3
 * mencatat bagaimana middleware yang menarik adaptor DB membuat 22 test lulus
 * tetapi exit code-nya 1.
 */

// Jest mewajibkan variabel yang dirujuk factory `jest.mock` berawalan `mock`.
const mockKueri = jest.fn();
const mockLepas = jest.fn();

// `getConnection` sengaja fungsi biasa, BUKAN `jest.fn`. Konfigurasi Jest repo
// ini me-reset mock sebelum tiap test, dan reset itu ikut menghapus implementasi
// `jest.fn` di dalam factory — sehingga `getConnection()` mengembalikan
// `undefined` dan SELURUH test gagal dengan pesan yang menyesatkan
// ("next tidak dipanggil"), bukan dengan pesan tentang koneksi.
jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: async () => ({ query: mockKueri, release: mockLepas }) },
}));

import { jagaProyek, jagaHapusProyek, peranProyekEfektif } from "./jagaProyek";

/**
 * Menyiapkan jawaban DB berurutan sesuai tiga mockKueri `jagaProyek`:
 * Users -> Projects -> ProjectMembers.
 */
function siapkanDb(opsi: {
  user?: { id: string; role: string } | null;
  ownerId?: string | null;
  peranAnggota?: string | null;
}) {
  mockKueri.mockReset();
  mockKueri
    .mockResolvedValueOnce([opsi.user ? [{ id: opsi.user.id, role: opsi.user.role }] : []])
    .mockResolvedValueOnce([opsi.ownerId ? [{ ownerId: opsi.ownerId }] : []])
    .mockResolvedValueOnce([opsi.peranAnggota ? [{ role: opsi.peranAnggota }] : []]);
}

function jalankan(mw: any, req: any = {}) {
  const res: any = {
    kode: 0,
    badan: null,
    status(k: number) {
      this.kode = k;
      return this;
    },
    json(b: any) {
      this.badan = b;
      return this;
    },
  };
  const next = jest.fn();
  const permintaan = {
    params: { projectId: "P1" },
    user: { id: "U1" },
    headers: {},
    query: {},
    ...req,
  };
  return mw(permintaan, res, next).then(() => ({ res, next }));
}

beforeEach(() => {
  mockKueri.mockReset();
  mockLepas.mockReset();
});

describe("§19.6 langkah 1 — user tidak dikenali", () => {
  it("tanpa identitas apa pun: 403, dan DB tidak disentuh", async () => {
    const { res, next } = await jalankan(jagaProyek("list", "R"), {
      user: undefined,
      headers: {},
      query: {},
    });
    expect(res.kode).toBe(403);
    expect(next).not.toHaveBeenCalled();
    expect(mockKueri).not.toHaveBeenCalled();
  });

  it("user yang tidak ada di tabel Users: 403", async () => {
    siapkanDb({ user: null });
    const { res, next } = await jalankan(jagaProyek("list", "R"));
    expect(res.kode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("§19.6 langkah 3b — God Mode hanya Administrator", () => {
  it("admin sistem menembus proyek yang bukan miliknya", async () => {
    siapkanDb({ user: { id: "U1", role: "admin" } });
    const { next } = await jalankan(jagaProyek("qa", "D"));
    expect(next).toHaveBeenCalled();
  });

  it("`head` BUKAN God Mode — ia peran sistem tanpa kuasa di dalam proyek", async () => {
    // §19.6 aturan 1. Inilah yang menutup #49: system role tinggi tidak
    // memberi akses ke proyek yang tidak ia anggotai.
    siapkanDb({ user: { id: "U1", role: "head" }, ownerId: "LAIN", peranAnggota: null });
    const { res, next } = await jalankan(jagaProyek("list", "R"));
    expect(res.kode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("§19.6 langkah 3 — pemilik proyek", () => {
  it("pemilik diperlakukan sebagai peran `owner` dan boleh menghapus", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "U1" });
    const { next } = await jalankan(jagaProyek("list", "D"));
    expect(next).toHaveBeenCalled();
  });
});

describe("§19.6 aturan 4 — bukan anggota = 403", () => {
  it("user sah, proyek sah, tetapi tidak terdaftar sebagai anggota", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: null });
    const { res } = await jalankan(jagaProyek("dashboard", "R"));
    expect(res.kode).toBe(403);
  });
});

describe("deny-by-default — inti #76", () => {
  it("viewer TIDAK boleh menghapus — kondisi persis #66", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "viewer" });
    const { res, next } = await jalankan(jagaProyek("list", "D"));
    expect(res.kode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("viewer tetap boleh membaca", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "viewer" });
    const { next } = await jalankan(jagaProyek("list", "R"));
    expect(next).toHaveBeenCalled();
  });

  it("developer TIDAK boleh menghapus di luar wilayah kuasanya — #72", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "developer" });
    const { res } = await jalankan(jagaProyek("wiki", "D"));
    expect(res.kode).toBe(403);
  });

  it("QA boleh menghapus DI modul qa — wilayah kuasanya", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "qa" });
    const { next } = await jalankan(jagaProyek("qa", "D"));
    expect(next).toHaveBeenCalled();
  });

  it("QA TIDAK boleh menghapus di luar modul qa", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "qa" });
    const { res } = await jalankan(jagaProyek("wiki", "D"));
    expect(res.kode).toBe(403);
  });

  it("peran anggota yang tidak dikenal DITOLAK, bukan diloloskan", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "superadmin" });
    const { res } = await jalankan(jagaProyek("list", "R"));
    expect(res.kode).toBe(403);
  });

  it("rute tanpa projectId ditolak — bukan diloloskan seperti penjaga lama", async () => {
    siapkanDb({ user: { id: "U1", role: "user" } });
    const { res } = await jalankan(jagaProyek("list", "R"), { params: {} });
    expect(res.kode).toBe(403);
  });

  it("galat DB menjadi 500, TIDAK PERNAH lolos", async () => {
    mockKueri.mockReset();
    mockKueri.mockRejectedValueOnce(new Error("koneksi putus"));
    const { res, next } = await jalankan(jagaProyek("list", "R"));
    expect(res.kode).toBe(500);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("peran warisan", () => {
  it("`member` dibaca sebagai `developer` — jaring pengaman sesudah migrasi tahap 3", async () => {
    // Migrasi sudah mengubah 7 baris, tetapi kode lama masih bisa menulis
    // `member`. Tanpa ini, baris seperti itu ditolak diam-diam.
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "member" });
    const { next } = await jalankan(jagaProyek("list", "C"));
    expect(next).toHaveBeenCalled();
  });

  it("`member` tetap tidak boleh menghapus — sama seperti developer", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "member" });
    const { res } = await jalankan(jagaProyek("list", "D"));
    expect(res.kode).toBe(403);
  });

  it("pemetaannya eksplisit dan bisa diperiksa sendiri", () => {
    expect(peranProyekEfektif("MEMBER")).toBe("developer");
    expect(peranProyekEfektif("designer")).toBe("developer");
    expect(peranProyekEfektif("qa")).toBe("qa");
    // `head` sengaja TIDAK dipetakan — ia peran sistem, §19.6 aturan 1.
    expect(peranProyekEfektif("head")).toBe("head");
  });
});

describe("koneksi selalu dilepas", () => {
  it("dilepas walau permintaan ditolak", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "viewer" });
    await jalankan(jagaProyek("list", "D"));
    expect(mockLepas).toHaveBeenCalled();
  });
});

describe("jagaHapusProyek — §19.5, menghapus proyek hanya milik Owner", () => {
  it("pemilik proyek boleh menghapus", async () => {
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "U1" });
    const { next } = await jalankan(jagaHapusProyek());
    expect(next).toHaveBeenCalled();
  });

  it("Administrator sistem menembus lewat God Mode", async () => {
    siapkanDb({ user: { id: "U1", role: "admin" } });
    const { next } = await jalankan(jagaHapusProyek());
    expect(next).toHaveBeenCalled();
  });

  it("Project Admin yang BUKAN pemilik TIDAK boleh — pengetatan nyata", async () => {
    // Penjaga lama berbunyi verifyProjectAccess(["admin", "head"]), sehingga
    // anggota berperan `admin` bisa menghapus seluruh proyek. Sekarang tidak.
    siapkanDb({ user: { id: "U1", role: "user" }, ownerId: "LAIN", peranAnggota: "admin" });
    const { res, next } = await jalankan(jagaHapusProyek());
    expect(res.kode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("`head` sistem TIDAK boleh menghapus proyek", async () => {
    siapkanDb({ user: { id: "U1", role: "head" }, ownerId: "LAIN", peranAnggota: null });
    const { res } = await jalankan(jagaHapusProyek());
    expect(res.kode).toBe(403);
  });

  it("tanpa projectId ditolak", async () => {
    siapkanDb({ user: { id: "U1", role: "user" } });
    const { res } = await jalankan(jagaHapusProyek(), { params: {} });
    expect(res.kode).toBe(403);
  });
});
