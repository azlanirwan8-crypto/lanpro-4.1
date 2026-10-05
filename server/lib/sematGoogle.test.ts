/**
 * #633 — penguji kelayakan sematan Google.
 *
 * Yang diuji di sini adalah KEPUTUSAN, bukan jaringan: klasifikasi status,
 * dan pagar host yang membuat rute ini tidak berubah jadi proxy umum.
 */
import { cekSematGoogle, klasifikasiSemat } from "./sematGoogle";
import { urlSematBolehDiuji } from "../../src/features/wiki/embedUrl";

const SEMAT = "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/preview";

describe("pagar host (#633)", () => {
  it("hanya dua host Google lewat https yang boleh diuji", () => {
    expect(urlSematBolehDiuji(SEMAT)).toBe(true);
    expect(
      urlSematBolehDiuji("https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVw/preview")
    ).toBe(true);
    expect(urlSematBolehDiuji("http://docs.google.com/x")).toBe(false);
    expect(urlSematBolehDiuji("https://docs.google.com.evil.test/preview")).toBe(false);
    expect(urlSematBolehDiuji("https://evil.test/?next=docs.google.com")).toBe(false);
    expect(urlSematBolehDiuji("")).toBe(false);
    expect(urlSematBolehDiuji("bukan-url")).toBe(false);
  });

  it("host yang tidak diizinkan tidak pernah dikirim ke jaringan", async () => {
    const ambil = jest.fn() as unknown as jest.Mock;
    const hasil = await cekSematGoogle("http://127.0.0.1:3000/admin", {
      fetchImpl: ambil as never,
    });
    expect(hasil).toEqual({ bisa: false, sebab: "bukan-google" });
    expect(ambil).not.toHaveBeenCalled();
  });
});

describe("klasifikasiSemat (#633)", () => {
  it("200 berarti berkas terbuka untuk siapa pun, jadi iframe juga akan bisa", () => {
    expect(klasifikasiSemat(200)).toEqual({ bisa: true, sebab: "publik" });
  });

  it("lompatan ke halaman login berarti berkas tertutup", () => {
    expect(klasifikasiSemat(302, "https://accounts.google.com/signin")).toEqual({
      bisa: false,
      sebab: "butuh-akses",
    });
    // Respons opaque dari peramban: status 0, tanpa lokasi terbaca.
    expect(klasifikasiSemat(0, null)).toEqual({ bisa: false, sebab: "butuh-akses" });
    expect(klasifikasiSemat(403, null)).toEqual({ bisa: false, sebab: "butuh-akses" });
  });

  it("status lain bukan vonis tertutup", () => {
    expect(klasifikasiSemat(500, null).sebab).toBe("gagal");
  });
});

describe("cekSematGoogle (#633)", () => {
  it("tidak mengikuti redirect dan tidak membawa kredensial", async () => {
    const ambil = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => null },
      body: { cancel: () => Promise.resolve() },
    }) as unknown as typeof fetch;

    await cekSematGoogle(SEMAT, { fetchImpl: ambil });
    const [, opsi] = (ambil as unknown as jest.Mock).mock.calls[0];
    expect(opsi.redirect).toBe("manual");
    expect(opsi.credentials).toBe("omit");
  });

  it("kalau ujiannya sendiri gagal, bingkai TIDAK dicabut", async () => {
    // Panel tidak boleh menghukum berkas yang hanya gagal kita periksa.
    const ambil = jest.fn().mockRejectedValue(new Error("dns mati")) as unknown as typeof fetch;
    expect(await cekSematGoogle(SEMAT, { fetchImpl: ambil })).toEqual({
      bisa: true,
      sebab: "gagal",
    });
  });
});
