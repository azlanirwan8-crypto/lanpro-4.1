// Regression: ISSUE-277 — kegagalan kirim email latar belakang lenyap tanpa jejak
// Found by /qa on 2026-08-30
// Report: AUDIT.md §1.2 item #277
//
// kirimEmail() TIDAK melempar saat gagal, melainkan mengembalikan
// { success: false }. Empat pemanggil non-blocking dulu hanya memasang
// .catch(), sehingga hasil resolved-tapi-gagal tidak pernah diperiksa.

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn(), end: jest.fn() },
}));

import { kirimEmailLatarBelakang } from "./email.service";

const tungguMikrotask = () => new Promise((r) => setTimeout(r, 0));

describe("kirimEmailLatarBelakang (regresi #277)", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("mencatat galat saat hasil resolved dengan success: false", async () => {
    kirimEmailLatarBelakang(
      Promise.resolve({ success: false, error: "connect ETIMEDOUT 216.198.79.1:465" }),
      "Email selamat datang untuk budi@contoh.id"
    );
    await tungguMikrotask();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const pesan = String(errorSpy.mock.calls[0][0]);
    expect(pesan).toContain("Email selamat datang untuk budi@contoh.id");
    expect(pesan).toContain("connect ETIMEDOUT 216.198.79.1:465");
  });

  it("tetap mencatat walau kegagalan tidak menyertakan penyebab", async () => {
    kirimEmailLatarBelakang(Promise.resolve({ success: false }), "Email aktivasi");
    await tungguMikrotask();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain("penyebab tidak dilaporkan");
  });

  it("mencatat galat saat promise ditolak", async () => {
    kirimEmailLatarBelakang(
      Promise.reject(new Error("jaringan putus")),
      "Kata sandi sementara untuk siti@contoh.id"
    );
    await tungguMikrotask();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const pesan = String(errorSpy.mock.calls[0][0]);
    expect(pesan).toContain("Kata sandi sementara untuk siti@contoh.id");
    expect(pesan).toContain("jaringan putus");
  });

  it("diam saat pengiriman berhasil", async () => {
    kirimEmailLatarBelakang(
      Promise.resolve({ success: true, messageId: "smtp-123" }),
      "Email selamat datang"
    );
    await tungguMikrotask();

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("tidak pernah melempar ke pemanggil walau pengiriman ditolak", async () => {
    expect(() =>
      kirimEmailLatarBelakang(Promise.reject(new Error("boom")), "Email apa pun")
    ).not.toThrow();
    await tungguMikrotask();
  });
});
