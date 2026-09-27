/**
 * Regresi ISSUE-301(a) — email aktivasi akun tidak pernah terkirim.
 *
 * DILAPORKAN pemilik proyek 31 Agu 2026: "ketika user di approve/di tolak
 * masuk juga ke email". Menelusurinya menemukan bahwa emailnya SUDAH dibangun
 * sejak #261 — yang tidak pernah jalan adalah pemicunya.
 *
 * AKAR MASALAHNYA. `user.routes.ts` menyalakan pengiriman hanya bila status
 * baru sama dengan `"active"`. Tetapi kanon status akun di aplikasi ini adalah
 * `approved` / `pending` / `rejected` (`src/types/user.ts:76`, dan
 * didokumentasikan di `docx.service.ts:582`). Admin yang menyetujui lewat UI
 * mengirim `"approved"`: dropdown di `UserDetailView.tsx:2646` memberi opsi
 * ber-id `approved`, baris 1281 menaruhnya apa adanya di `payload.status`, dan
 * `users.service.ts` mem-PUT-nya tanpa pemetaan apa pun. Backend tidak
 * menormalkan di mana pun. Jadi kondisinya SELALU salah pada satu-satunya
 * jalur yang benar-benar dipakai manusia.
 *
 * KENAPA TIDAK ADA YANG SADAR. `middleware/auth.ts:102` menerima `active`
 * MAUPUN `approved`, sehingga pengguna yang disetujui tetap bisa login dan
 * tidak ada satu pun gejala yang terlihat. Yang hilang cuma emailnya — dan
 * tidak ada yang mengeluh soal email yang tidak pernah mereka tahu ada.
 *
 * YANG DIJAGA DI SINI adalah PERILAKU rutenya, bukan teks sumbernya: rute
 * sungguhan dijalankan lewat supertest dan yang dituntut adalah pengirimnya
 * benar-benar terpanggil. Tes berbasis teks akan tetap hijau seandainya
 * kondisinya ditulis benar tapi tidak pernah tereksekusi.
 *
 * KENAPA `active` IKUT DIJAGA. Memperbaiki `approved` dengan cara MENGGANTI
 * `active` hanya memindahkan bug-nya, bukan menutupnya: baris lama di
 * database dan pemanggil internal masih memakai ejaan itu. Keduanya harus
 * diterima, persis seperti `middleware/auth.ts` sudah lakukan.
 *
 * DUA JEBAKAN MOCK yang masing-masing memakan satu putaran, dicatat supaya
 * tidak diulang:
 *
 * (1) `middleware/auth.ts` memakai `db.query(...)` LANGSUNG, bukan
 *     `db.getConnection()`. Mock yang hanya menyediakan `getConnection`
 *     membuat `db.query` undefined, dan `TypeError`-nya dilempar di dalam
 *     callback `jwt.verify` sehingga muncul sebagai 500 berbadan KOSONG —
 *     terlihat seperti galat rute, padahal belum sampai ke rutenya.
 *
 * (2) `jest.config.js` menyetel `resetMocks: true`, yang MENGHAPUS
 *     implementasi setiap `jest.fn()` sebelum tiap tes — termasuk yang
 *     ditulis di dalam factory `jest.mock`. `jest.fn(async () => ...)` di
 *     factory karena itu memulangkan `undefined` saat dipanggil. Implementasi
 *     wajib dipasang ulang di `beforeEach`, dan itulah sebabnya test lain di
 *     repo ini memakai pola `mockKueri` alih-alih menaruh perilaku di factory.
 */

/** Token yang sedang dipakai; harus sama dengan `currentSessionToken` di DB. */
let mockTokenAktif = "";

const mockKueri = jest.fn();
/** Dipakai `middleware/auth.ts` untuk memeriksa sesi tunggal. */
const mockDbQuery = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: mockDbQuery,
    getConnection: async () => ({
      query: mockKueri,
      release: () => undefined,
    }),
  },
}));

jest.mock("../services/email.service", () => ({
  __esModule: true,
  kirimEmailAktivasiAkun: jest.fn().mockResolvedValue({ success: true }),
  // #301(b) — rute yang sama kini juga memanggil pengirim penolakan. Tanpa
  // baris ini ia `undefined`, dan `TypeError`-nya muncul sebagai 500 pada
  // kasus "penolakan tidak memicu email aktivasi" — terlihat seperti rutenya
  // rusak, padahal mock-nya yang tertinggal.
  kirimEmailPenolakanAkun: jest.fn().mockResolvedValue({ success: true }),
  kirimEmailLatarBelakang: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../services/audit.service", () => ({
  __esModule: true,
  createAuditLog: jest.fn(),
}));

jest.mock("../repositories/user.repository", () => ({
  __esModule: true,
  userRepository: {
    findByIdOrUid: jest.fn(),
    updateUser: jest.fn().mockResolvedValue(undefined),
  },
}));

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import userRoutes from "./user.routes";
import { getJwtSecret } from "../middleware/auth";
import { kirimEmailAktivasiAkun, kirimEmailLatarBelakang } from "../services/email.service";
import { userRepository } from "../repositories/user.repository";

const ID_TARGET = "usr-77";
const envAsli = process.env;

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.use(userRoutes);
  return app;
};

/**
 * Menyetujui pengguna dengan nilai status apa adanya, persis seperti yang
 * dikirim UI: tanpa pemetaan, tanpa normalisasi.
 */
const setujui = (status: string) => {
  mockTokenAktif = jwt.sign({ id: "usr-admin", uid: "usr-admin", role: "admin" }, getJwtSecret(), {
    expiresIn: "1h",
  });
  return request(buatApp())
    .put(`/api/users/${ID_TARGET}`)
    .set("Authorization", `Bearer ${mockTokenAktif}`)
    .send({ status });
};

beforeEach(() => {
  jest.clearAllMocks();
  // `getJwtSecret()` sengaja MELEMPAR bila variabelnya kosong (bukan memakai
  // nilai cadangan), jadi tanpa baris ini keempat kasus gagal karena token
  // tidak bisa dibuat — merah karena alasan yang salah, bukan karena bug-nya.
  process.env = { ...envAsli, JWT_SECRET: "rahasia-uji-301-1234567890" };
  mockKueri.mockResolvedValue([[]]);
  // Dibaca saat DIPANGGIL, bukan saat dipasang: `mockTokenAktif` baru terisi
  // di dalam `setujui()`, sesudah beforeEach selesai.
  // #347: authenticateJWT mengecek TokenBlacklist dulu; baris non-kosong di situ = 401.
  mockDbQuery.mockImplementation(async (sql: string) => {
    if (String(sql).includes("TokenBlacklist")) return [[]];
    return [[{ currentSessionToken: mockTokenAktif, role: "admin", status: "approved" }]];
  });
  (kirimEmailAktivasiAkun as jest.Mock).mockResolvedValue({ success: true });
  (kirimEmailLatarBelakang as jest.Mock).mockResolvedValue(undefined);
  (userRepository.findByIdOrUid as jest.Mock).mockResolvedValue({
    id: ID_TARGET,
    status: "pending",
    email: "budi@contoh.test",
    username: "budi",
    displayName: "Budi",
  });
  (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);
});

afterAll(() => {
  process.env = envAsli;
});

describe("#301(a) email aktivasi pada persetujuan pendaftaran", () => {
  it("MERAH sebelum perbaikan: status 'approved' dari UI harus memicu email", async () => {
    const res = await setujui("approved");

    expect(res.status).toBe(200);
    expect(kirimEmailAktivasiAkun).toHaveBeenCalledTimes(1);
    expect((kirimEmailAktivasiAkun as jest.Mock).mock.calls[0][0]).toMatchObject({
      email: "budi@contoh.test",
    });
  });

  it("ejaan lama 'active' tetap memicu email — perbaikannya menambah, bukan mengganti", async () => {
    const res = await setujui("active");

    expect(res.status).toBe(200);
    expect(kirimEmailAktivasiAkun).toHaveBeenCalledTimes(1);
  });

  it("pengguna yang SUDAH aktif tidak dikirimi email lagi saat datanya disunting", async () => {
    (userRepository.findByIdOrUid as jest.Mock).mockResolvedValue({
      id: ID_TARGET,
      status: "approved",
      email: "budi@contoh.test",
      username: "budi",
      displayName: "Budi",
    });

    const res = await setujui("approved");

    // Statusnya harus 200 juga — kalau rutenya gagal, "tidak terpanggil" jadi
    // hijau karena alasan yang salah.
    expect(res.status).toBe(200);
    // Menyunting nama atau departemen pengguna aktif tidak boleh mengirim
    // ulang "selamat akun Anda aktif". Email berulang tanpa sebab adalah cara
    // tercepat membuat orang berhenti mempercayai kiriman sistem.
    expect(kirimEmailAktivasiAkun).not.toHaveBeenCalled();
  });

  it("penolakan tidak memicu email aktivasi", async () => {
    const res = await setujui("rejected");

    expect(res.status).toBe(200);
    expect(kirimEmailAktivasiAkun).not.toHaveBeenCalled();
  });
});
