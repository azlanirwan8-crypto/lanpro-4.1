// Regression: ISSUE-275 — migrasi "berhasil" padahal schema tidak lengkap
// Found by /qa on 2026-08-30
// Report: AUDIT.md §1.1 item #275
//
// Saat insiden #273, GET /api/health-check menjawab {"migrasi":"berhasil"}
// padahal tabel "IntegrationSettings" tidak ada di database. Yang direkam
// hanyalah "runMigrations() selesai tanpa melempar".

import { jalankanMigrasiDenganUlangan, statusMigrasi, resetStatusMigrasi } from "./migrasi-status";

describe("verifikasi schema sesudah migrasi (regresi #275)", () => {
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetStatusMigrasi();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("berstatus gagal saat migrasi sukses TAPI ada tabel hilang", async () => {
    const hasil = await jalankanMigrasiDenganUlangan(async () => {}, {
      verifikasi: async () => ["IntegrationSettings"],
    });

    expect(hasil.status).toBe("gagal");
    expect(hasil.tabelHilang).toEqual(["IntegrationSettings"]);
    expect(hasil.galatTerakhir).toContain("IntegrationSettings");
  });

  it("menyebut nama tabel yang hilang di log, bukan sekadar 'gagal'", async () => {
    await jalankanMigrasiDenganUlangan(async () => {}, {
      verifikasi: async () => ["Users", "Tasks"],
    });

    const dicetak = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(dicetak).toContain("Users");
    expect(dicetak).toContain("Tasks");
    expect(dicetak).toContain("npm run db:migrate");
  });

  it("berstatus berhasil saat migrasi sukses dan tidak ada tabel hilang", async () => {
    const hasil = await jalankanMigrasiDenganUlangan(async () => {}, {
      verifikasi: async () => [],
    });

    expect(hasil.status).toBe("berhasil");
    expect(hasil.tabelHilang).toEqual([]);
    expect(hasil.selesaiPada).not.toBeNull();
  });

  it("tetap berjalan seperti sebelumnya bila verifikasi tidak disuntikkan", async () => {
    const hasil = await jalankanMigrasiDenganUlangan(async () => {});

    expect(hasil.status).toBe("berhasil");
    expect(hasil.tabelHilang).toEqual([]);
  });

  it("tidak memanggil verifikasi bila migrasi sendiri gagal", async () => {
    const verifikasi = jest.fn().mockResolvedValue([]);

    const hasil = await jalankanMigrasiDenganUlangan(
      async () => {
        throw new Error("Connection terminated due to connection timeout");
      },
      { verifikasi, maksPercobaan: 1, jedaAwalMs: 1 }
    );

    expect(hasil.status).toBe("gagal");
    expect(verifikasi).not.toHaveBeenCalled();
  });

  it("mengembalikan salinan tabelHilang, bukan rujukan yang bisa diubah pemanggil", async () => {
    await jalankanMigrasiDenganUlangan(async () => {}, {
      verifikasi: async () => ["Users"],
    });

    const pertama = statusMigrasi();
    pertama.tabelHilang.push("PALSU");

    expect(statusMigrasi().tabelHilang).toEqual(["Users"]);
  });

  it("membersihkan tabelHilang saat status direset", async () => {
    await jalankanMigrasiDenganUlangan(async () => {}, {
      verifikasi: async () => ["Users"],
    });
    resetStatusMigrasi();

    expect(statusMigrasi().tabelHilang).toEqual([]);
    expect(statusMigrasi().status).toBe("belum");
  });
});
