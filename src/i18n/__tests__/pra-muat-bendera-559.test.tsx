/**
 * @jest-environment jsdom
 *
 * #559 — kamus Indonesia TIDAK ikut potongan awal (keputusan #515), jadi ia
 * harus sudah diminta sebelum jari pengguna angkat dari tombol bendera.
 *
 * Suite jsdom berjalan dalam bahasa Indonesia (`src/test/bahasa-uji.ts`), jadi
 * kamusnya sudah ada di memori sejak awal dan "sudah termuat" tidak bisa
 * dipakai sebagai bukti. Yang diuji di sini adalah wiring-nya: kursor masuk ->
 * `praMuatKamus(bahasa tujuan)` dipanggil, dan klik -> pilihan disimpan.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const praMuatKamus = jest.fn();
const simpanBahasa = jest.fn();
/** #603 — komponen kini memverifikasi hasil tukar lewat fungsi ini. */
const tukarBahasa = jest.fn().mockResolvedValue(true);

jest.mock("../index", () => ({
  praMuatKamus: (b: string) => praMuatKamus(b),
  simpanBahasa: (b: string) => simpanBahasa(b),
  tukarBahasa: (b: string) => tukarBahasa(b),
}));

import { LanguageSwitcher } from "../LanguageSwitcher";
// Instansinya sama dengan yang diinisialisasi `src/test/setup.jsdom.ts`;
// `../index` sendiri sudah diganti mock di atas, jadi tidak bisa dipakai lagi.
import i18n from "i18next";

describe("LanguageSwitcher — pra-muat kamus tujuan (#559)", () => {
  beforeEach(() => {
    praMuatKamus.mockClear();
    simpanBahasa.mockClear();
    tukarBahasa.mockClear();
    tukarBahasa.mockResolvedValue(true);
    i18n.changeLanguage("en");
  });

  it("menarik kamus bahasa tujuan begitu kursor menyentuh bendera", () => {
    render(<LanguageSwitcher />);
    const btn = screen.getByTestId("language-switcher");

    expect(i18n.resolvedLanguage).toBe("en");
    fireEvent.pointerEnter(btn);

    expect(praMuatKamus).toHaveBeenCalledWith("id");
  });

  it("klik menyimpan bahasa tujuan, bukan bahasa yang sedang tampil", async () => {
    render(<LanguageSwitcher />);
    const btn = screen.getByTestId("language-switcher");

    fireEvent.click(btn);

    // Bendera yang tampil = bahasa SEKARANG (Inggris), jadi tujuannya Indonesia.
    // #603: pilihan baru disimpan SESUDAH tukarnya terbukti berhasil, jadi
    // tunggu satu tick.
    expect(tukarBahasa).toHaveBeenCalledWith("id");
    await waitFor(() => expect(simpanBahasa).toHaveBeenCalledWith("id"));
  });
});
