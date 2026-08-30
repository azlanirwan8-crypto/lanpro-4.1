// Regression: ISSUE-278 — URL aplikasi tidak bisa diubah dari UI
// Found by /qa on 2026-08-30
// Report: AUDIT.md §1.2 item #278
//
// Keempat template email dulu membaca process.env.APP_URL langsung, sehingga
// pergantian domain menuntut ubah env var lalu deploy ulang — dan sampai itu
// dilakukan, setiap tautan di dalam email menunjuk domain lama tanpa gejala.

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn(), end: jest.fn() },
}));

const mockGetConfig = jest.fn();
jest.mock("./integrationSettings.service", () => ({
  __esModule: true,
  getEmailIntegrationConfig: (...args: any[]) => mockGetConfig(...args),
  saveEmailIntegrationConfig: jest.fn(),
}));

import { ambilAppUrl } from "./email.service";

describe("ambilAppUrl (regresi #278)", () => {
  const envAsli = process.env;

  beforeEach(() => {
    process.env = { ...envAsli };
    mockGetConfig.mockReset();
  });

  afterAll(() => {
    process.env = envAsli;
  });

  it("memakai nilai basis data, mengalahkan env APP_URL", async () => {
    process.env.APP_URL = "https://domain-lama.test";
    mockGetConfig.mockResolvedValue({ appUrl: "https://domain-baru.test" });

    await expect(ambilAppUrl()).resolves.toBe("https://domain-baru.test");
  });

  it("jatuh ke env APP_URL bila kolom basis data kosong", async () => {
    process.env.APP_URL = "https://dari-env.test";
    mockGetConfig.mockResolvedValue({ appUrl: "" });

    await expect(ambilAppUrl()).resolves.toBe("https://dari-env.test");
  });

  it("jatuh ke env APP_URL bila basis data tidak terbaca", async () => {
    process.env.APP_URL = "https://dari-env.test";
    mockGetConfig.mockRejectedValue(new Error("koneksi putus"));

    await expect(ambilAppUrl()).resolves.toBe("https://dari-env.test");
  });

  it("memakai localhost bila basis data kosong dan env tidak disetel", async () => {
    delete process.env.APP_URL;
    mockGetConfig.mockResolvedValue({ appUrl: "" });

    await expect(ambilAppUrl()).resolves.toBe("http://localhost:3000");
  });

  it("membuang garis miring di akhir supaya tautan tidak berakhir ganda", async () => {
    mockGetConfig.mockResolvedValue({ appUrl: "https://lanpro.my.id///" });

    await expect(ambilAppUrl()).resolves.toBe("https://lanpro.my.id");
  });

  it("mengabaikan spasi di sekitar nilai basis data", async () => {
    process.env.APP_URL = "https://dari-env.test";
    mockGetConfig.mockResolvedValue({ appUrl: "   " });

    await expect(ambilAppUrl()).resolves.toBe("https://dari-env.test");
  });
});
