/**
 * #600 — bentuk URL yang boleh dibingkai Google.
 *
 * KENAPA ADA. Panel pratinjau Dokumentasi menampilkan halaman "This content is
 * blocked. Contact the site owner to fix the issue." milik Google untuk sebuah
 * tautan Sheets yang sudah dibagi "Siapa pun dengan tautan". Halaman itu bukan
 * galat LanPro: ia dimunculkan Google karena yang dipasang ke `<iframe>` adalah
 * URL EDITOR (`/edit`, `/view`), dan editor menolak dibingkai. `getEmbedUrl`
 * yang lama hanya menulis ulang URL yang mengandung `/edit` — jadi setiap bentuk
 * lain lolos apa adanya ke iframe.
 *
 * Daftar di bawah disusun dari bentuk tautan yang benar-benar dihasilkan Google
 * di tombol "Share" / "Copy link" (Drive, Sheets, Docs, Slides, Forms, akun
 * ganda, dan hasil "Publish to web").
 */
import { urlSematanGoogle } from "./embedUrl";

const ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
const ID_PUBLIKASI = "2PACX-1vR8y7pQZ0d1LxYZaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789";

describe("urlSematanGoogle — Sheets (#600)", () => {
  it("mengubah tiap bentuk tautan lembar jadi /preview", () => {
    const bentuk = [
      `https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`,
      `https://docs.google.com/spreadsheets/d/${ID}/view?usp=drive_link`,
      `https://docs.google.com/spreadsheets/d/${ID}`,
      `https://docs.google.com/spreadsheets/u/1/d/${ID}/edit`,
      `https://docs.google.com/spreadsheets/d/${ID}/mobile/edit`,
    ];
    bentuk.forEach((url) => {
      expect(urlSematanGoogle(url)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/preview`);
    });
  });

  it("mengenali awalan akun di kedua sisi nama aplikasi", () => {
    // Google memancarkan keduanya: `/spreadsheets/u/0/d/...` dan `/document/u/1/d/...`.
    expect(urlSematanGoogle(`https://docs.google.com/spreadsheets/u/0/d/${ID}/edit`)).toBe(
      `https://docs.google.com/spreadsheets/d/${ID}/preview`
    );
    expect(urlSematanGoogle(`https://docs.google.com/document/u/1/d/${ID}/edit`)).toBe(
      `https://docs.google.com/document/d/${ID}/preview`
    );
  });

  it("memakai ?authuser tanpa menambah gid yang tidak diminta", () => {
    expect(
      urlSematanGoogle(`https://docs.google.com/spreadsheets/d/${ID}/edit?authuser=1#gid=0`)
    ).toBe(`https://docs.google.com/spreadsheets/d/${ID}/preview#gid=0`);
  });

  it("mempertahankan lembar yang dipilih (#gid) — bentuk lama membuangnya", () => {
    expect(
      urlSematanGoogle(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=1234567890`)
    ).toBe(`https://docs.google.com/spreadsheets/d/${ID}/preview#gid=1234567890`);
  });

  it("idempoten: hasil yang sudah benar tidak diubah lagi", () => {
    const sudah = `https://docs.google.com/spreadsheets/d/${ID}/preview`;
    expect(urlSematanGoogle(sudah)).toBe(sudah);
    expect(urlSematanGoogle(`https://docs.google.com/document/d/${ID}/preview`)).toBe(
      `https://docs.google.com/document/d/${ID}/preview`
    );
  });
});

describe("urlSematanGoogle — aplikasi Google lain (#600)", () => {
  it("Docs dan Slides ke bentuk sematannya masing-masing", () => {
    expect(urlSematanGoogle(`https://docs.google.com/document/d/${ID}/edit`)).toBe(
      `https://docs.google.com/document/d/${ID}/preview`
    );
    expect(urlSematanGoogle(`https://docs.google.com/presentation/d/${ID}/edit?usp=sharing`)).toBe(
      `https://docs.google.com/presentation/d/${ID}/embed?start=false&loop=false&delayms=3000`
    );
  });

  it("Forms memakai viewform?embedded", () => {
    expect(urlSematanGoogle(`https://docs.google.com/forms/d/${ID}/viewform`)).toBe(
      `https://docs.google.com/forms/d/${ID}/viewform?embedded=true`
    );
  });

  it("tautan Drive (file/d/.../view dan open?id=) ke penampil Drive", () => {
    expect(urlSematanGoogle(`https://drive.google.com/file/d/${ID}/view?usp=sharing`)).toBe(
      `https://drive.google.com/file/${ID}/preview`
    );
    expect(urlSematanGoogle(`https://drive.google.com/open?id=${ID}`)).toBe(
      `https://drive.google.com/file/${ID}/preview`
    );
  });
});

describe("urlSematanGoogle — yang TIDAK boleh disentuh (#600)", () => {
  it("hasil Publish to web dibiarkan: ID publikasi bukan ID berkas", () => {
    const pub = `https://docs.google.com/spreadsheets/d/e/${ID_PUBLIKASI}/pubhtml?gid=0`;
    expect(urlSematanGoogle(pub)).toBe(pub);
    const embed = `https://docs.google.com/spreadsheets/d/e/${ID_PUBLIKASI}/pub?output=embed`;
    expect(urlSematanGoogle(embed)).toBe(embed);
  });

  it("bukan Google, bukan https, dan bukan URL — dipulangkan apa adanya", () => {
    const selainGoogle = "https://example.com/laporan-keuangan.xlsx";
    expect(urlSematanGoogle(selainGoogle)).toBe(selainGoogle);
    const http = `http://docs.google.com/spreadsheets/d/${ID}/edit`;
    expect(urlSematanGoogle(http)).toBe(http);
    const teks = "nanti saya tempel linknya";
    expect(urlSematanGoogle(teks)).toBe(teks);
    expect(urlSematanGoogle("")).toBe("");
    expect(urlSematanGoogle(undefined)).toBe("");
  });

  it("ID yang terlalu pendek untuk dipercaya tidak dikarang jadi URL sematan", () => {
    const aneh = "https://docs.google.com/spreadsheets/d/abc/edit";
    expect(urlSematanGoogle(aneh)).toBe(aneh);
  });

  it("sifat umum: tidak ada satu pun hasil yang masih menunjuk ke editor", () => {
    const semua = [
      `https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`,
      `https://docs.google.com/spreadsheets/d/${ID}/view`,
      `https://docs.google.com/spreadsheets/u/0/d/${ID}/edit#gid=7`,
      `https://docs.google.com/document/d/${ID}/edit`,
      `https://docs.google.com/presentation/d/${ID}/edit`,
      `https://docs.google.com/forms/d/${ID}/prefill?foo=bar`,
      `https://drive.google.com/file/d/${ID}/view`,
      `https://docs.google.com/spreadsheets/d/e/${ID_PUBLIKASI}/pubhtml`,
    ];
    semua.forEach((url) => {
      const hasil = urlSematanGoogle(url);
      expect(hasil).not.toMatch(/\/(edit|view)\b/);
      expect(hasil).toMatch(/\/(preview|embed|viewform|pubhtml)/);
    });
  });
});
