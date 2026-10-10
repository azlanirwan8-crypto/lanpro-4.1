/**
 * Regresi kontras layar Lengkapi Pendaftaran (SSO) — item #165.
 * Ditemukan `/design-review` 24 Agustus 2026.
 *
 * #165 — Banner biru layar auth berposisi ABSOLUT, jadi ia keluar dari alur dan
 *        pemusatan kartu di `AuthLayout` mengabaikan tingginya. Layar login dan
 *        daftar tidak terganggu sebab keduanya duduk di atas kartu `bg-surface`
 *        yang legap. Layar SSO tidak punya kartu sama sekali, sehingga judul dan
 *        subjudulnya ter-render LANGSUNG di atas banner `primary-surface`.
 *
 * Angkanya dihitung dari token `src/index.css`, bukan ditaksir dari tangkapan
 * layar. Test pertama mendokumentasikan kegagalannya supaya alasan item ini
 * tidak hilang; test kedua menjaga perbaikannya.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";

import { CompleteRegistrationScreen } from "./CompleteRegistrationScreen";

const AKAR_SRC = path.resolve(__dirname, "../..");
const css = fs.readFileSync(path.join(AKAR_SRC, "index.css"), "utf8");

/**
 * Token yang sama dideklarasikan dua kali: blok pertama tema terang, blok kedua
 * tema gelap. Urutan kemunculan itulah yang membedakannya.
 */
const token = (nama: string): { terang: string; gelap: string } => {
  const pola = new RegExp("--color-" + nama + ":[ ]*(#[0-9a-fA-F]{6})", "g");
  const semua = [...css.matchAll(pola)].map((m) => m[1]);

  expect(semua.length).toBeGreaterThanOrEqual(2);
  return { terang: semua[0], gelap: semua[1] };
};

const luminansi = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};

const rasio = (a: string, b: string) => {
  const [x, y] = [luminansi(a), luminansi(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const props = {
  email: "azlan@example.com",
  onSelesai: jest.fn(),
  onBatal: jest.fn(),
};

describe("#165 teks layar SSO tidak duduk di atas banner", () => {
  /**
   * KOREKSI 10 Okt (#679): bagian mode gelap dari test ini sebelumnya mengunci
   * KEADAAN CACAT — `expect(...).toBeLessThan(4.5)` dengan komentar "nyaris
   * lolos, tetapi tetap di bawah 4,5:1". Angka itu benar pada waktunya (#adb5bd
   * di atas #405189 = 3,67:1), tetapi ia bukan persyaratan, melainkan bukti
   * sejarah: yang membuat #165 ada adalah mode TERANG, tempat pasangan yang sama
   * hanya 1,01:1. Setelah tangga teks gelap dinaikkan #679, pasangan itu jadi
   * 5,10:1 dan testnya merah — merah yang menegurnya, bukan menegur kodenya.
   *
   * Arah assertion gelap sekarang dibalik dan dijaga pada nilai barunya, supaya
   * "gelap sudah lolos AA" tidak lagi bisa diam-diam merosot kembali. Bagian
   * terang dibiarkan mengunci kegagalan apa adanya: itulah alasan layar SSO kini
   * WAJIB duduk di atas kartu `bg-surface`, dan itu dijaga dua test di bawah.
   */
  it("teks di atas banner: terang tetap tidak terbaca, gelap kini lolos AA (#679)", () => {
    const banner = token("primary-surface");
    const sekunder = token("content-secondary");

    // Mode terang: praktis tidak terbaca sama sekali, dan itu tidak berubah.
    expect(rasio(sekunder.terang, banner.terang)).toBeLessThan(1.5);
    // Mode gelap: #ced4da di atas #405189 = 5,10:1 sejak #679.
    expect(rasio(sekunder.gelap, banner.gelap)).toBeGreaterThanOrEqual(4.5);
  });

  it("di atas surface kartu, kedua tema lulus AA dengan lega", () => {
    const surface = token("surface");
    const sekunder = token("content-secondary");
    const kuat = token("content-strong");

    for (const tema of ["terang", "gelap"] as const) {
      expect(rasio(sekunder[tema], surface[tema])).toBeGreaterThanOrEqual(4.5);
      expect(rasio(kuat[tema], surface[tema])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("pembungkus layar SSO memakai surface kartu, bukan latar tembus", () => {
    const { container } = render(<CompleteRegistrationScreen {...props} />);

    const pembungkus = container.firstElementChild as HTMLElement;
    expect(pembungkus).not.toBeNull();
    expect(pembungkus.className).toContain("bg-surface");
  });

  it("layar sukses juga duduk di atas surface kartu", () => {
    // Layar sukses adalah cabang render yang BERBEDA, jadi memperbaiki satu
    // cabang saja meninggalkan yang lain tetap tembus.
    const berkas = fs.readFileSync(path.join(__dirname, "CompleteRegistrationScreen.tsx"), "utf8");
    const jumlah = (berkas.match(/bg-surface\b/g) || []).length;
    expect(jumlah).toBeGreaterThanOrEqual(2);
  });
});
