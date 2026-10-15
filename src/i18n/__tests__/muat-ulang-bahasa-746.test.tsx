/**
 * @jest-environment jsdom
 *
 * #746 — "ganti bahasa tadi saya masih ketemu error tidak bisa di tekan"
 * (pemilik proyek, 15 Okt 2026).
 *
 * #603 sudah membuat kegagalan itu BERSUARA. Yang belum: suaranya menyuruh
 * pengguna menekan Ctrl+Shift+R, dan di ponsel tombol itu tidak ada — jadi
 * produk menawarkan satu-satunya jalan keluar kepada orang yang tidak bisa
 * menjalankannya, sementara menekan tombolnya lagi mengulang kegagalan yang
 * sama selamanya. Penyebab kegagalan yang paling umum adalah HTML basi yang
 * menunjuk hash berkas lama; hanya HTML baru yang menyembuhkannya.
 *
 * Yang diuji di sini adalah keputusan pemilik proyek: MUAT ULANG SEKALI, lalu
 * selesaikan penukarannya sendiri. Sekali — bukan berulang: bendera sessionStorage
 * membuat percobaan kedua jatuh ke toast, jadi tidak ada lingkaran muat ulang.
 */
jest.mock("../locales/id", () => {
  throw new Error("Failed to fetch chunk id-legacy.js (404)");
});
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import i18n, { selesaikanBahasaTertunda, tukarBahasa } from "../index";
import { LanguageSwitcher } from "../LanguageSwitcher";

const BENDERA = "bahasa-muat-ulang";
const TUNDA = "bahasa-tunda";

describe("Tombol bahasa saat kamusnya tidak tiba (#746)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.mocked(toast.error).mockClear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    await i18n.changeLanguage("en");
  });

  it("kegagalan pertama dijawab dengan muat ulang, bukan dengan toast yang tidak bisa dijalankan di HP", async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("language-switcher"));

    // Niatnya dicatat SEBELUM halaman hilang, supaya sesudah muat ulang
    // penukaran bisa diselesaikan tanpa pengguna menekan apa pun lagi.
    await waitFor(() => expect(window.sessionStorage.getItem(TUNDA)).toBe("id"));
    expect(window.sessionStorage.getItem(BENDERA)).toBe("1");
    expect(jest.mocked(toast.error)).not.toHaveBeenCalled();
  });

  it("tetap tidak menyimpan preferensi yang kamusnya tidak pernah tiba (penjaga #603)", async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("language-switcher"));
    await waitFor(() => expect(window.sessionStorage.getItem(BENDERA)).toBe("1"));

    // Niat boleh menunggu di sessionStorage; kunci preferensi `bahasa` tidak.
    expect(window.localStorage.getItem("bahasa") || "").not.toBe("id");
    expect(i18n.resolvedLanguage).toBe("en");
  });

  it("kegagalan kedua diucapkan ke layar, dan tidak memuat ulang lagi", async () => {
    window.sessionStorage.setItem(BENDERA, "1");

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("language-switcher"));

    await waitFor(() => expect(jest.mocked(toast.error)).toHaveBeenCalledTimes(1));
    const pesan = String(jest.mocked(toast.error).mock.calls[0][0]);
    // Kalimat lama menyuruh Ctrl+Shift+R — di ponsel itu bukan instruksi.
    expect(pesan).not.toContain("Ctrl+Shift+R");
    expect(pesan.toLowerCase()).toContain("language");
  });
});

describe("Menyelesaikan penukaran sesudah muat ulang (#746)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("memulangkan null bila tidak ada yang tertunda — jalur biasa tidak terpengaruh", async () => {
    await expect(selesaikanBahasaTertunda()).resolves.toBeNull();
  });

  it("memakai bahasa tertunda lalu menyimpannya bila kamusnya terbukti ada", async () => {
    window.sessionStorage.setItem(TUNDA, "en");
    window.sessionStorage.setItem(BENDERA, "1");
    await i18n.changeLanguage("id");

    await expect(selesaikanBahasaTertunda()).resolves.toBe(true);
    expect(window.localStorage.getItem("bahasa")).toBe("en");
    // Bendera dilepas: kegagalan BERIKUTNYA boleh mencoba muat ulang lagi.
    expect(window.sessionStorage.getItem(BENDERA)).toBeNull();
    expect(window.sessionStorage.getItem(TUNDA)).toBeNull();
  });

  it("memulangkan false dan tidak menyimpan apa pun bila kamusnya masih gagal", async () => {
    window.sessionStorage.setItem(TUNDA, "id");
    window.sessionStorage.setItem(BENDERA, "1");

    await expect(selesaikanBahasaTertunda()).resolves.toBe(false);
    expect(window.localStorage.getItem("bahasa") || "").not.toBe("id");
    // Bendera SENGAJA tidak dilepas: inilah yang mencegah lingkaran muat ulang.
    expect(window.sessionStorage.getItem(BENDERA)).toBe("1");
    expect(window.sessionStorage.getItem(TUNDA)).toBeNull();
  });

  it("tidak menerima nilai sessionStorage yang bukan bahasa dikenal", async () => {
    window.sessionStorage.setItem(TUNDA, "javascript:alert(1)");
    await expect(selesaikanBahasaTertunda()).resolves.toBeNull();
  });
});

describe("Kontrak tukarBahasa (#746)", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("tidak pernah menolak — penolakan changeLanguage dipulangkan sebagai false", async () => {
    // Inilah yang membuat tombolnya mati tanpa jejak: penolakan keluar sebagai
    // unhandled rejection sementara `finally` sudah melepas keadaan sibuk, jadi
    // layar tidak pernah diberi tahu apa pun.
    jest.spyOn(i18n, "changeLanguage").mockRejectedValueOnce(new Error("backend menolak"));

    await expect(tukarBahasa("en")).resolves.toBe(false);
  });
});
