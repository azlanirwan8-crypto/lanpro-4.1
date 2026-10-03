/**
 * #603 — bendera bahasa ditekan DUA KALI.
 *
 * Pemilik proyek 03 Okt: "ini icon ganti bahasa tidak bisa di klik kembali".
 * #559 sudah menutup "klik pertama tidak mengubah apa pun" (kamus tujuan ditarik
 * sebelum jari angkat). Yang belum pernah diuji adalah langkah keduanya: kembali
 * ke bahasa awal. Di jalur itu `changeLanguage("id")` bergantung pada muat
 * dinamis `./locales/id`, dan `fallbackLng: "en"` membuat kegagalannya BISU —
 * bahasa bertukar di atas kertas, layar tetap berbahasa Inggris, tombolnya
 * kembali terlihat mati.
 *
 * Test ini menjalankan tombol ASLI dengan kamus ASLI, dan membaca hasil yang
 * benar-benar dipakai layar: `resolvedLanguage` dan teks yang muncul.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18n from "./index";
import { LanguageSwitcher } from "./LanguageSwitcher";

const judul = () => screen.getByTestId("language-switcher").getAttribute("title") || "";

describe("LanguageSwitcher dua arah (#603)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("id");
  });

  it("klik pertama ke English, klik kedua kembali ke Indonesia", async () => {
    render(<LanguageSwitcher />);
    expect(i18n.resolvedLanguage).toBe("id");
    expect(judul()).toContain("Switch to English");

    fireEvent.click(screen.getByTestId("language-switcher"));
    await waitFor(() => expect(i18n.resolvedLanguage).toBe("en"));
    expect(judul()).toContain("Ganti ke Bahasa Indonesia");

    fireEvent.click(screen.getByTestId("language-switcher"));
    await waitFor(() => expect(i18n.resolvedLanguage).toBe("id"));

    // Yang dibaca layar: bukan cuma nama bahasa, tapi kalimat yang benar-benar
    // dipakai komponen saat ini.
    expect(i18n.t("userMenu.profile")).toBe("Profil");
    expect(judul()).toContain("Switch to English");
  });

  it("kamus Indonesia benar-benar ada di memori setelah ditukar kembali", async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("language-switcher"));
    await waitFor(() => expect(i18n.resolvedLanguage).toBe("en"));
    fireEvent.click(screen.getByTestId("language-switcher"));
    await waitFor(() => expect(i18n.resolvedLanguage).toBe("id"));

    expect(i18n.hasResourceBundle("id", "translation")).toBe(true);
    // Kunci yang baru dipindah ke kamus (#602) harus terbaca di DUA bahasa —
    // kalau salah satu kamus kehilangannya, layar menampilkan nama kuncinya.
    ["wiki.dropPdfHint", "flowchart.importClickOrDrop", "toast.tasksBulkDeleted"].forEach((k) => {
      expect(i18n.exists(k)).toBe(true);
      expect(i18n.t(k)).not.toBe(k);
    });
  });
});
