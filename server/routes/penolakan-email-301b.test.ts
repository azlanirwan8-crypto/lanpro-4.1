/**
 * ISSUE-301(b) — penolakan senyap.
 *
 * DILAPORKAN pemilik proyek 31 Agu 2026, satu kalimat yang sama dengan (a):
 * "ketika user di approve/di tolak masuk juga ke email". Bagian (a) menutup
 * sisi persetujuan. Sisi penolakan belum ada sama sekali: status `rejected`
 * memblokir login lewat `middleware/auth.ts:102`, tetapi tidak ada apa pun
 * yang memberi tahu orangnya. Dari sisi pengguna, akunnya sekadar berhenti
 * bekerja tanpa penjelasan.
 *
 * SATU STATUS, DUA ARTI — dan inilah yang membuat teks emailnya tidak boleh
 * satu macam. Dropdown di `UserDetailView.tsx:2648` memberi label
 * "Ditangguhkan / Ditolak" untuk satu nilai `rejected` yang sama. Artinya
 * ditentukan status SEBELUMNYA, bukan status barunya:
 *
 *   - `pending`  -> `rejected` = pendaftaran yang ditolak. Orangnya belum
 *     pernah punya akses, dan yang perlu ia tahu adalah pendaftarannya tidak
 *     dilanjutkan.
 *   - `approved` -> `rejected` = akun aktif yang dinonaktifkan. Orangnya sudah
 *     bekerja memakai akun itu, dan mengiriminya "pendaftaran Anda ditolak"
 *     akan terbaca sebagai pesan yang salah alamat.
 *
 * Membedakan keduanya tidak butuh data baru: `oldUser.status` sudah ada di
 * tangan pada titik yang sama.
 *
 * ALASAN PENOLAKAN SENGAJA TIDAK DISEBUT. Tidak ada kolom yang menyimpannya
 * di mana pun, jadi teks apa pun yang menyinggung alasan hanya bisa mengarang.
 *
 * POLA MOCK-nya mengikuti `aktivasi-email-301.test.ts` — termasuk kedua
 * jebakan yang dicatat di sana (`db.query` langsung dipakai middleware, dan
 * `resetMocks: true` yang menghapus implementasi di factory).
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
import {
  kirimEmailAktivasiAkun,
  kirimEmailPenolakanAkun,
  kirimEmailLatarBelakang,
} from "../services/email.service";
import { userRepository } from "../repositories/user.repository";

const ID_TARGET = "usr-88";
const envAsli = process.env;

const buatApp = () => {
  const app = express();
  app.use(express.json());
  app.use(userRoutes);
  return app;
};

/** Mengubah status lewat rute sungguhan, apa adanya seperti yang dikirim UI. */
const ubahStatus = (status: string) => {
  mockTokenAktif = jwt.sign({ id: "usr-admin", uid: "usr-admin", role: "admin" }, getJwtSecret(), {
    expiresIn: "1h",
  });
  return request(buatApp())
    .put(`/api/users/${ID_TARGET}`)
    .set("Authorization", `Bearer ${mockTokenAktif}`)
    .send({ status });
};

const targetBerstatus = (status: string) => {
  (userRepository.findByIdOrUid as jest.Mock).mockResolvedValue({
    id: ID_TARGET,
    status,
    email: "siti@contoh.test",
    username: "siti",
    displayName: "Siti",
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...envAsli, JWT_SECRET: "rahasia-uji-301b-1234567890" };
  mockKueri.mockResolvedValue([[]]);
  mockDbQuery.mockImplementation(async () => [
    [{ currentSessionToken: mockTokenAktif, role: "admin", status: "approved" }],
  ]);
  (kirimEmailAktivasiAkun as jest.Mock).mockResolvedValue({ success: true });
  (kirimEmailPenolakanAkun as jest.Mock).mockResolvedValue({ success: true });
  (kirimEmailLatarBelakang as jest.Mock).mockResolvedValue(undefined);
  targetBerstatus("pending");
  (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);
});

afterAll(() => {
  process.env = envAsli;
});

describe("#301(b) email penolakan / penonaktifan akun", () => {
  it("MERAH sebelum perbaikan: pending -> rejected mengirim email pendaftaran ditolak", async () => {
    const res = await ubahStatus("rejected");

    expect(res.status).toBe(200);
    expect(kirimEmailPenolakanAkun).toHaveBeenCalledTimes(1);
    expect((kirimEmailPenolakanAkun as jest.Mock).mock.calls[0][0]).toMatchObject({
      email: "siti@contoh.test",
      jenis: "pendaftaran_ditolak",
    });
  });

  it("approved -> rejected memakai jenis penonaktifan, BUKAN penolakan pendaftaran", async () => {
    targetBerstatus("approved");

    const res = await ubahStatus("rejected");

    expect(res.status).toBe(200);
    expect((kirimEmailPenolakanAkun as jest.Mock).mock.calls[0][0]).toMatchObject({
      jenis: "akun_dinonaktifkan",
    });
  });

  it("ejaan lama 'active' juga terbaca sebagai penonaktifan", async () => {
    targetBerstatus("active");

    await ubahStatus("rejected");

    expect((kirimEmailPenolakanAkun as jest.Mock).mock.calls[0][0]).toMatchObject({
      jenis: "akun_dinonaktifkan",
    });
  });

  it("yang SUDAH rejected tidak dikirimi email lagi saat datanya disunting", async () => {
    targetBerstatus("rejected");

    const res = await ubahStatus("rejected");

    // 200 harus ikut dituntut: bila rutenya gagal, "tidak terpanggil" jadi
    // hijau karena alasan yang salah.
    expect(res.status).toBe(200);
    expect(kirimEmailPenolakanAkun).not.toHaveBeenCalled();
  });

  it("persetujuan tidak memicu email penolakan", async () => {
    const res = await ubahStatus("approved");

    expect(res.status).toBe(200);
    expect(kirimEmailPenolakanAkun).not.toHaveBeenCalled();
    expect(kirimEmailAktivasiAkun).toHaveBeenCalledTimes(1);
  });

  it("pengirimannya lewat kirimEmailLatarBelakang, bukan panggilan telanjang", async () => {
    await ubahStatus("rejected");

    // #277: janji yang tidak di-await menghilang tanpa jejak di serverless.
    expect(kirimEmailLatarBelakang).toHaveBeenCalledTimes(1);
    expect((kirimEmailLatarBelakang as jest.Mock).mock.calls[0][1]).toContain("siti@contoh.test");
  });
});
