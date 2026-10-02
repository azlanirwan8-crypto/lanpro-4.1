/**
 * #584 — apa yang boleh masuk ke `href`.
 *
 * Yang diuji di sini adalah keputusan MENOLAK, karena itu satu-satunya bagian
 * yang bisa salah: tautan yang tertolak diam-diam masih bisa dilihat teksnya,
 * sedangkan tautan yang lolos bisa dijalankan.
 */
import { dataUnduhAman, tautanAman } from "./tautanAman";

describe("tautanAman — hanya skema yang hidup (#584)", () => {
  it("menerima http, https, mailto, dan tel", () => {
    expect(tautanAman("https://docs.google.com/document/d/abc")).toBe(
      "https://docs.google.com/document/d/abc"
    );
    expect(tautanAman("http://rpy.my.id/lapor")).toBe("http://rpy.my.id/lapor");
    expect(tautanAman("mailto:ops@perusahaan.id")).toBe("mailto:ops@perusahaan.id");
    expect(tautanAman("tel:+628123456789")).toBe("tel:+628123456789");
  });

  it("menolak skrip, termasuk yang disembunyikan spasi dan besar huruf", () => {
    expect(tautanAman("javascript:alert(1)")).toBeNull();
    expect(tautanAman("  JaVaScRiPt:alert(1)")).toBeNull();
    expect(tautanAman("vbscript:msgbox(1)")).toBeNull();
    expect(tautanAman("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("memasang https pada host polos, tapi tidak pada teks bebas", () => {
    // Baris lama menyimpan tautan tanpa awalan; menolaknya membuat lampiran
    // yang dulu terbuka jadi mati, jadi host polos dilengkapi awalan.
    expect(tautanAman("docs.google.com/abc")).toBe("https://docs.google.com/abc");
    expect(tautanAman("rpy.my.id")).toBe("https://rpy.my.id");
    // Teks bebas dan alamat tanpa host tidak pernah bisa ditebak.
    expect(tautanAman("lihat dokumen di sharepoint")).toBeNull();
    expect(tautanAman("//evil.com/x")).toBeNull();
    expect(tautanAman("")).toBeNull();
    expect(tautanAman(undefined)).toBeNull();
    expect(tautanAman(null)).toBeNull();
  });
});

describe("dataUnduhAman — berkas lama base64 masih bisa diunduh", () => {
  it("menerima data URL berkas nyata, termasuk yang tanpa MIME", () => {
    const pdf = "data:application/pdf;base64,JVBERi0xLjQK";
    expect(dataUnduhAman(pdf)).toBe(pdf);
    // Berkas tanpa ekstensi dikenal disimpan sebagai "data:;base64,..." —
    // menolaknya membuat lampiran lama tidak bisa diunduh sama sekali.
    expect(dataUnduhAman("data:;base64,AAAA")).toBe("data:;base64,AAAA");
  });

  it("menolak data URL yang bisa dieksekusi sebagai dokumen", () => {
    expect(dataUnduhAman("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(dataUnduhAman("data:application/xhtml+xml;base64,PHNjcmlwdD4=")).toBeNull();
  });

  it("menolak nilai yang bukan data URL", () => {
    expect(dataUnduhAman("https://contoh.id/berkas.pdf")).toBeNull();
    expect(dataUnduhAman("javascript:alert(1)")).toBeNull();
    expect(dataUnduhAman(undefined)).toBeNull();
  });
});
