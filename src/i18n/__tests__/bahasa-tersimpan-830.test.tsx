/**
 * @jest-environment jsdom
 *
 * #830 — "di lanpro ini tidak bisa ganti bahasa nya" (pemilik proyek, 09 Nov 2026).
 *
 * Klik pertama dari keadaan bersih memang berjalan. Yang macet adalah klik
 * SESUDAH muat ulang dengan bahasa Indonesia tersimpan. Sebabnya bukan tombolnya:
 * `init()` hanya membawa kamus Inggris, sehingga i18next memulai dengan
 * `language: "id"` tetapi `resolvedLanguage: "en"`.
 *
 * `addResourceBundle` — jalan masuk kamus Indonesia di `siapBahasa` — tidak
 * menghitung ulang `resolvedLanguage`; hanya `changeLanguage` yang melakukannya.
 * Akibatnya layar berbahasa Indonesia sementara tombol bendera membaca
 * `resolvedLanguage`, mengira Inggris yang aktif, lalu menargetkan `"id"` —
 * bahasa yang sudah tampil. Kliknya "berhasil" tanpa mengubah apa pun.
 *
 * Lingkungan jsdom sudah menyiapkan keadaan itu: `src/test/bahasa-uji.ts`
 * menulis `bahasa=id` SEBELUM `../i18n` dimuat, persis seperti peramban yang
 * menyimpan preferensi Indonesia. Berkas ini mengunci keadaan sesudah boot,
 * label tombolnya, dan hasil klik yang benar-benar dibaca layar.
 */
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import i18n, { siapBahasa } from "../index";
import { LanguageSwitcher } from "../LanguageSwitcher";

const judul = () => screen.getByTestId("language-switcher").getAttribute("aria-label") || "";

describe("#830 bahasa tersimpan sesudah muat ulang", () => {
  beforeAll(async () => {
    await siapBahasa;
  });

  // Test pertama sengaja TIDAK menyentuh bahasa: yang dibaca adalah keadaan
  // sesudah boot apa adanya. Pemulihan ke Indonesia di sini hanya untuk
  // kebersihan test berikutnya, bukan untuk menyiapkan yang pertama.
  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage("id");
    window.localStorage.setItem("bahasa", "id");
  });

  it("resolvedLanguage ikut bahasa tersimpan begitu kamusnya tiba", () => {
    expect(i18n.language).toBe("id");
    expect(i18n.resolvedLanguage).toBe("id");
    expect(i18n.t("language.switchTo")).toBe("Ganti ke Bahasa Inggris");
    // Pembaca layar membaca bahasa halaman dari atribut ini.
    expect(document.documentElement.lang).toBe("id");
  });

  it("tombol menargetkan Inggris, bukan bahasa yang sudah tampil", () => {
    render(<LanguageSwitcher />);

    expect(judul()).toBe("Switch to English / Ganti ke Bahasa Inggris");
  });

  it("satu klik sesudah muat ulang benar-benar berpindah ke Inggris", async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("language-switcher"));

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("en"));
    expect(i18n.t("language.switchTo")).toBe("Switch to Indonesian");
    expect(window.localStorage.getItem("bahasa")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
