/**
 * @jest-environment jsdom
 *
 * #603 — "icon ganti bahasa tidak bisa di klik kembali", dilaporkan lagi 03 Okt.
 *
 * Yang sudah dibuktikan terpisah (`LanguageSwitcher.klik-balik.test.tsx`): jalur
 * klik dua arah HIDUP — klik pertama ke English, klik kedua kembali ke Indonesia,
 * kamus benar-benar mendarat. Jadi yang diuji di sini adalah satu-satunya jalan
 * lain yang membuat tombol itu TERLIHAT mati: berkas kamus tidak datang.
 *
 * Sebelum #603 keadaan itu bisu total. `changeLanguage` tidak memantul,
 * `fallbackLng: "en"` menahan layar tetap berbahasa Inggris, dan jejaknya hanya
 * `console.warn`. Sekarang tombolnya wajib berkata ke layar — dan TIDAK boleh
 * menyimpan pilihan yang gagal, karena menyimpannya berarti muat berikutnya ikut
 * rusak.
 */
jest.mock("../locales/id", () => {
  throw new Error("Failed to fetch chunk id-legacy.js (404)");
});
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import i18n from "../index";
import { LanguageSwitcher } from "../LanguageSwitcher";

describe("LanguageSwitcher saat kamus tujuannya tidak datang (#603)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    jest.mocked(toast.error).mockClear();
    await i18n.changeLanguage("en");
  });

  it("memperingatkan di layar, bukan diam-diam tetap Inggris", async () => {
    const catat = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(i18n.resolvedLanguage).toBe("en");

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("language-switcher"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    const pesan = String(jest.mocked(toast.error).mock.calls[0][0]);
    expect(pesan.toLowerCase()).toContain("language");
    // Yang diminta pengguna ada di pesan itu: apa yang harus dilakukan.
    expect(pesan).toContain("Ctrl+Shift+R");
    catat.mockRestore();
  });

  it("pilihan yang gagal tidak disimpan ke perangkat", async () => {
    const catat = jest.spyOn(console, "warn").mockImplementation(() => {});
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("language-switcher"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    expect(window.localStorage.getItem("bahasa") || "").not.toBe("id");
    expect(i18n.resolvedLanguage).toBe("en");
    catat.mockRestore();
  });
});
