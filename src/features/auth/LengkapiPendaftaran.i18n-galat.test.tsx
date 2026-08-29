/**
 * Regresi layar Lengkapi Pendaftaran (SSO) — item #164.
 * Ditemukan oleh /design-review pada 24 Agustus 2026.
 *
 * #164 — Dua pesan galat validasi di `CompleteRegistrationScreen` ditulis
 *        langsung sebagai literal Indonesia, tidak lewat `t()`. Seluruh teks
 *        lain di layar itu sudah berkunci i18n, dan layar auth punya pemilih
 *        bahasa di pojok kanan atas — jadi pengguna English tetap menerima
 *        kalimat Indonesia begitu ia mengetik angka.
 *
 * Test ini berjalan dalam bahasa English, sebab dalam bahasa Indonesia bug-nya
 * TIDAK KELIHATAN: teks kerasnya kebetulan sama dengan terjemahannya.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import fs from "fs";

import i18n from "../../i18n";
import { CompleteRegistrationScreen } from "./CompleteRegistrationScreen";

const fsBerkas = (jalur: string) => fs.readFileSync(jalur, "utf8");

const props = {
  email: "azlan@example.com",
  onSelesai: jest.fn(),
  onBatal: jest.fn(),
};

describe("#164 pesan galat Lengkapi Pendaftaran ikut bahasa aktif", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage("id");
  });

  it("karakter terlarang memunculkan galat berbahasa English", async () => {
    render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByRole("textbox");
    fireEvent.change(kolom, { target: { value: "azlan123" } });

    await waitFor(() => {
      expect(
        screen.getByText("Username may contain letters only, max 10 characters")
      ).toBeInTheDocument();
    });

    // Kalimat keras yang lama tidak boleh muncul lagi dalam mode English.
    expect(
      screen.queryByText("Username hanya boleh berupa huruf, maksimal 10 karakter")
    ).not.toBeInTheDocument();
  });

  it("kolom kosong saat dikirim memunculkan galat berbahasa English", async () => {
    const { container } = render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByRole("textbox");
    fireEvent.change(kolom, { target: { value: "" } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText("Username is required")).toBeInTheDocument();
    });

    expect(screen.queryByText("Username wajib diisi")).not.toBeInTheDocument();
  });

  it("dalam bahasa Indonesia kalimatnya tetap Indonesia", async () => {
    await i18n.changeLanguage("id");
    render(<CompleteRegistrationScreen {...props} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "azlan123" } });

    await waitFor(() => {
      expect(
        screen.getByText("Username hanya boleh berupa huruf, maksimal 10 karakter")
      ).toBeInTheDocument();
    });
  });
});

/**
 * #170 (sebagian) — satu layar, satu namespace.
 *
 * Layar ini dulu memanggil empat namespace sekaligus (`completeReg.*`,
 * `rakit.*`, `ui2.*`) dan label utamanya `t("common.username")` — kunci yang tidak
 * menyebutkan apa pun tentang isinya. Kunci lama TIDAK dihapus dari kamus
 * sebab layar lain masih memakainya; yang diperbaiki hanya layar ini.
 */
describe("#170 layar SSO memakai satu namespace yang bermakna", () => {
  it("tidak ada lagi kunci jsx/ui2/rakit di berkas layar ini", () => {
    const berkas = fsBerkas(__dirname + "/CompleteRegistrationScreen.tsx");

    expect(berkas).not.toMatch(/t\("jsx\./);
    expect(berkas).not.toMatch(/t\("ui2\./);
    expect(berkas).not.toMatch(/t\("rakit\./);
  });

  it("setiap kunci completeReg yang dipakai ada di kedua kamus", () => {
    const berkas = fsBerkas(__dirname + "/CompleteRegistrationScreen.tsx");
    const dipakai = [...berkas.matchAll(/t\("(completeReg\.[a-zA-Z0-9_]+)"/g)].map((m) => m[1]);

    expect(dipakai.length).toBeGreaterThan(0);

    const kurang: string[] = [];
    for (const kunci of dipakai) {
      const [blok, nama] = kunci.split(".");
      for (const bahasa of ["id", "en"] as const) {
        const bundel = i18n.getResourceBundle(bahasa, "translation") as Record<
          string,
          Record<string, string>
        >;
        const nilai = bundel[blok]?.[nama];
        if (typeof nilai !== "string" || nilai.trim() === "") kurang.push(`${bahasa}:${kunci}`);
      }
    }
    expect(kurang).toEqual([]);
  });
});
