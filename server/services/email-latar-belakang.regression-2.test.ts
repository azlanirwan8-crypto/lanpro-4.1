// Regression: ISSUE-300 — email pendaftaran gagal senyap di Vercel
// Found by /qa on 2026-08-31
// Report: AUDIT.md §1.2 item #300
//
// kirimEmailLatarBelakang() dulu mengembalikan void, jadi pemanggilnya tidak
// bisa menunggunya walau mau. Di lambda Vercel respons yang dikirim lebih dulu
// membekukan instance, soket ke Resend mati, dan `fetch` gagal tanpa sempat
// melapor. Dua hal yang dijaga di sini: kontrak Promise fungsinya, dan
// kenyataan bahwa SETIAP pemanggil benar-benar menunggunya.

import fs from "fs";
import path from "path";

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn(), end: jest.fn() },
}));

import { kirimEmailLatarBelakang } from "./email.service";

describe("kirimEmailLatarBelakang — kontrak Promise (regresi #300)", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it("mengembalikan Promise, bukan undefined", () => {
    const hasil = kirimEmailLatarBelakang(Promise.resolve({ success: true }), "apa pun");
    expect(hasil).toBeInstanceOf(Promise);
  });

  it("BELUM selesai selama pengiriman masih berjalan", async () => {
    let tuntaskan: (v: any) => void = () => {};
    const pengiriman = new Promise<any>((r) => {
      tuntaskan = r;
    });

    let sudahSelesai = false;
    const menunggu = kirimEmailLatarBelakang(pengiriman, "Email pendaftaran").then(() => {
      sudahSelesai = true;
    });

    // Inilah momen saat lambda dulu dibekukan: respons sudah dikirim padahal
    // pengiriman belum tuntas.
    await new Promise((r) => setTimeout(r, 0));
    expect(sudahSelesai).toBe(false);

    tuntaskan({ success: true, messageId: "resend-1" });
    await menunggu;
    expect(sudahSelesai).toBe(true);
  });

  it("selesai tanpa menolak walau pengiriman gagal", async () => {
    await expect(
      kirimEmailLatarBelakang(Promise.resolve({ success: false, error: "fetch failed" }), "SSO")
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("selesai tanpa menolak walau promise-nya ditolak", async () => {
    await expect(
      kirimEmailLatarBelakang(Promise.reject(new Error("boom")), "SSO")
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

// Kontrak Promise saja tidak cukup: pemanggil tetap bisa melepasnya begitu
// saja dan cacatnya kembali persis seperti semula, tanpa satu tes pun gagal.
describe("setiap pemanggil menunggu pengirimannya (regresi #300)", () => {
  const akar = path.resolve(__dirname, "..", "..");
  const berkas = [
    "server/routes/auth.routes.ts",
    "server/routes/user.routes.ts",
    "server/services/sso.service.ts",
    "server/services/emailBroadcast.service.ts",
  ];

  const POLA_PANGGILAN = /(^|[^.\w])kirimEmailLatarBelakang\s*\(/;

  function adalahKomentar(teks: string) {
    const t = teks.trim();
    return t.startsWith("*") || t.startsWith("//") || t.startsWith("/*");
  }

  function barisKode(isi: string) {
    return isi.split("\n").map((teks, nomor) => ({ teks, nomor: nomor + 1 }));
  }

  // Komentar menyebut nama fungsi ini tanpa memanggilnya; tanpa penyaringan
  // ini penjagaannya menghitung dokumentasi sebagai pemanggil.
  function panggilan(isi: string) {
    return barisKode(isi).filter(({ teks }) => !adalahKomentar(teks) && POLA_PANGGILAN.test(teks));
  }

  it.each(berkas)("%s tidak memanggilnya tanpa await", (relatif) => {
    const isi = fs.readFileSync(path.join(akar, relatif), "utf8");
    const baris = barisKode(isi);

    // Ditunggu bisa berarti dua bentuk sah: `await kirimEmail...` langsung,
    // atau dikumpulkan lewat `.push(` untuk ditunggu bersama sesudahnya.
    // Bentuk kedua memakai dua baris, jadi baris sebelumnya ikut diperiksa.
    const dilepas = panggilan(isi).filter(({ teks, nomor }) => {
      if (/await\s+kirimEmailLatarBelakang/.test(teks)) return false;
      const sebelumnya = baris
        .slice(0, nomor - 1)
        .reverse()
        .find((b) => b.teks.trim() !== "" && !adalahKomentar(b.teks));
      return !(sebelumnya && /\.push\(\s*$/.test(sebelumnya.teks));
    });

    expect(dilepas.map((d) => `${relatif}:${d.nomor} → ${d.teks.trim()}`)).toEqual([]);
  });

  it("mengumpulkan yang di-push lalu menunggunya dengan Promise.all", () => {
    const isi = fs.readFileSync(
      path.join(akar, "server/services/emailBroadcast.service.ts"),
      "utf8"
    );
    // Dikumpulkan tapi tidak pernah ditunggu sama saja dengan dilepas.
    expect(isi).toContain("await Promise.all(pengiriman)");
  });

  it("menemukan lima pemanggil — penjagaan ini tidak boleh kosong", () => {
    const total = berkas.reduce((n, relatif) => {
      const isi = fs.readFileSync(path.join(akar, relatif), "utf8");
      return n + panggilan(isi).length;
    }, 0);
    expect(total).toBe(5);
  });
});
