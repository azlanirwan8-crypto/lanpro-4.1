/**
 * Regresi ISSUE-296 — kata sandi sementara wajib kedaluwarsa dan wajib diganti.
 * Diminta pemilik proyek 30 Agu 2026.
 * Laporan: .gstack/qa-reports/qa-report-lanpro-2026-08-30.md
 *
 * Yang dijaga: kata sandi sementara yang sudah lewat 2 jam TIDAK boleh
 * meloloskan login, dan yang masih berlaku harus menandai bahwa penggunanya
 * wajib mengganti kata sandi. Keduanya perilaku, bukan keberadaan kolom.
 */

const mockKueri = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: mockKueri,
      release: () => undefined,
    }),
  },
}));

import { handleUserAuthentication } from "./auth.service";
import { hashPassword } from "../helpers/hash";

const KATA_SANDI = "SementaraAbc1";

function barisPengguna(tambahan: Record<string, unknown> = {}) {
  return {
    id: "u-1",
    uid: "u-1",
    username: "budi",
    email: "budi@contoh.id",
    displayName: "Budi",
    status: "approved",
    passwordHash: hashPassword(KATA_SANDI),
    tempPasswordExpiresAt: null,
    mustChangePassword: false,
    ...tambahan,
  };
}

/** Query pertama = SELECT user; sisanya (audit log) dibiarkan kosong. */
function siapkan(baris: any) {
  mockKueri.mockReset();
  mockKueri.mockImplementation(async (sql: string) => {
    if (/SELECT \* FROM Users/i.test(sql)) return [[baris]];
    return [[]];
  });
}

describe("#296 kata sandi sementara", () => {
  it("menolak kata sandi sementara yang sudah kedaluwarsa", async () => {
    const tigaJamLalu = new Date(Date.now() - 3 * 60 * 60 * 1000);
    siapkan(barisPengguna({ tempPasswordExpiresAt: tigaJamLalu, mustChangePassword: true }));

    const hasil = await handleUserAuthentication("budi", KATA_SANDI);

    expect(hasil.success).toBe(false);
    // Pesannya TIDAK boleh "kata sandi salah" -- itu menyesatkan, sebab kata
    // sandinya benar; yang habis adalah masa berlakunya.
    expect((hasil as any).code).toBe("auth.tempPasswordExpired");
  });

  it("meloloskan kata sandi sementara yang masih berlaku, dan menandai wajib ganti", async () => {
    const satuJamLagi = new Date(Date.now() + 60 * 60 * 1000);
    siapkan(barisPengguna({ tempPasswordExpiresAt: satuJamLagi, mustChangePassword: true }));

    const hasil = await handleUserAuthentication("budi", KATA_SANDI);

    expect(hasil.success).toBe(true);
    expect((hasil as any).user.mustChangePassword).toBe(true);
  });

  it("tidak mengganggu kata sandi tetap (kolom kedaluwarsa NULL)", async () => {
    siapkan(barisPengguna());

    const hasil = await handleUserAuthentication("budi", KATA_SANDI);

    expect(hasil.success).toBe(true);
    expect((hasil as any).user.mustChangePassword).toBe(false);
  });

  it("kata sandi salah tetap ditolak sebagai kata sandi salah, bukan kedaluwarsa", async () => {
    const tigaJamLalu = new Date(Date.now() - 3 * 60 * 60 * 1000);
    siapkan(barisPengguna({ tempPasswordExpiresAt: tigaJamLalu, mustChangePassword: true }));

    const hasil = await handleUserAuthentication("budi", "SalahTotal9");

    expect(hasil.success).toBe(false);
    expect((hasil as any).code).not.toBe("auth.tempPasswordExpired");
  });
});
