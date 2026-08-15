/**
 * Test status migrasi.
 *
 * Yang dikunci: kegagalan migrasi tidak boleh senyap lagi. Cacat aslinya
 * (item #39) adalah `try/catch` yang hanya memanggil console.warn, sehingga
 * server menyala seolah sehat sementara tabel yang dibutuhkan tidak terbentuk.
 * Sudah terjadi dua kali di repo ini.
 */
import { jalankanMigrasiDenganUlangan, statusMigrasi, resetStatusMigrasi } from "./migrasi-status";

beforeEach(() => {
  resetStatusMigrasi();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("jalankanMigrasiDenganUlangan", () => {
  it("berhasil pada percobaan pertama bila migrasi lancar", async () => {
    const jalankan = jest.fn(async () => {});
    const hasil = await jalankanMigrasiDenganUlangan(jalankan);

    expect(jalankan).toHaveBeenCalledTimes(1);
    expect(hasil.status).toBe("berhasil");
    expect(hasil.percobaan).toBe(1);
    expect(hasil.galatTerakhir).toBeNull();
  });

  it("MENGULANG lalu berhasil — kasus Neon yang lambat bangun", async () => {
    let ke = 0;
    const jalankan = jest.fn(async () => {
      ke++;
      if (ke < 3) throw new Error("Connection terminated due to connection timeout");
    });

    const hasil = await jalankanMigrasiDenganUlangan(jalankan, { jedaAwalMs: 1 });

    expect(jalankan).toHaveBeenCalledTimes(3);
    expect(hasil.status).toBe("berhasil");
    expect(hasil.percobaan).toBe(3);
  });

  it("menyerah setelah batas percobaan dan menandai status GAGAL", async () => {
    const jalankan = jest.fn(async () => {
      throw new Error("timeout terus");
    });

    const hasil = await jalankanMigrasiDenganUlangan(jalankan, {
      maksPercobaan: 2,
      jedaAwalMs: 1,
    });

    expect(jalankan).toHaveBeenCalledTimes(2);
    expect(hasil.status).toBe("gagal");
    expect(hasil.galatTerakhir).toContain("timeout terus");
  });

  it("memakai console.error saat menyerah — BUKAN console.warn", async () => {
    // Peringatan tenggelam di antara log lain. Itulah yang membuat kegagalan
    // sebelumnya tidak terlihat selama berjam-jam.
    const jalankan = async () => {
      throw new Error("gagal");
    };
    await jalankanMigrasiDenganUlangan(jalankan, { maksPercobaan: 1, jedaAwalMs: 1 });

    expect(console.error).toHaveBeenCalled();
    const pesan = (console.error as jest.Mock).mock.calls.flat().join(" ");
    expect(pesan).toContain("GAGAL");
  });

  it("TIDAK melempar — server harus tetap menyala", async () => {
    const jalankan = async () => {
      throw new Error("gagal");
    };
    await expect(
      jalankanMigrasiDenganUlangan(jalankan, { maksPercobaan: 1, jedaAwalMs: 1 })
    ).resolves.toBeDefined();
  });

  it("statusnya bisa dibaca setelah selesai", async () => {
    await jalankanMigrasiDenganUlangan(async () => {});
    const s = statusMigrasi();
    expect(s.status).toBe("berhasil");
    expect(s.selesaiPada).toBeTruthy();
  });

  it("statusMigrasi mengembalikan salinan, bukan rujukan", async () => {
    await jalankanMigrasiDenganUlangan(async () => {});
    const s = statusMigrasi();
    s.status = "gagal";
    expect(statusMigrasi().status).toBe("berhasil");
  });
});
