/**
 * Regresi layar Daftar manual — item #171.
 * Dipisahkan dari #164 supaya tidak dikerjakan diam-diam di luar itemnya.
 *
 * #171 — Dua tempat mengeraskan teks Indonesia di jalur pendaftaran manual:
 *        `RegisterScreen.tsx` (galat sebaris saat mengetik) dan seluruh sepuluh
 *        pesan di `registrationSchema` Zod. Layar auth punya pemilih bahasa,
 *        jadi pengguna English menerima kalimat Indonesia begitu ia salah isi.
 *
 * Skema Zod adalah konstanta tingkat modul, sehingga `t()` tidak bisa dipanggil
 * di sana — hasilnya akan membeku pada bahasa saat modul dimuat. Karena itu
 * pesannya berisi KUNCI i18n dan diterjemahkan saat galat dipetakan, pola yang
 * sudah dipakai `evaluatePasswordStrength` di berkas yang sama.
 *
 * Test berjalan dalam bahasa English; dalam bahasa Indonesia bug ini tidak
 * kelihatan sebab teks kerasnya sama dengan terjemahannya.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import i18n from "../../i18n";
import { RegisterScreen } from "./RegisterScreen";
import { registrationSchema } from "../../lib/registrationSchema";

const props = {
  onRegister: jest.fn().mockResolvedValue({ success: true }),
  onBackToLogin: jest.fn(),
};

describe("#171 galat layar Daftar ikut bahasa aktif", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage("id");
  });

  it("pesan Zod tampil dalam bahasa English saat form kosong dikirim", async () => {
    const { container } = render(<RegisterScreen {...props} />);

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument();
    });
    expect(screen.getByText("Invalid email format (example: user@gmail.com)")).toBeInTheDocument();
    expect(screen.getByText("Username may contain letters only")).toBeInTheDocument();
    // Zod memulangkan beberapa isu untuk satu kolom dan pemetaannya menimpa,
    // jadi yang tampil adalah isu TERAKHIR pada path itu — bukan yang pertama.
    expect(
      screen.getByText("Password must contain at least 1 special symbol (@$!%*?&)")
    ).toBeInTheDocument();

    // Kunci mentah tidak boleh bocor ke layar bila terjemahannya hilang.
    expect(screen.queryByText(/regValidation\./)).not.toBeInTheDocument();
    // Kalimat Indonesia yang lama tidak boleh muncul dalam mode English.
    expect(screen.queryByText("Nama minimal 3 karakter")).not.toBeInTheDocument();
  });

  it("galat sebaris username tampil dalam bahasa English", async () => {
    render(<RegisterScreen {...props} />);

    const kolom = screen.getAllByRole("textbox")[2];
    fireEvent.change(kolom, { target: { value: "azlan1" } });

    await waitFor(() => {
      expect(screen.getByText("Username may contain letters only")).toBeInTheDocument();
    });
    expect(screen.queryByText("Username hanya boleh berupa huruf")).not.toBeInTheDocument();
  });

  it("dalam bahasa Indonesia kalimatnya tetap Indonesia", async () => {
    await i18n.changeLanguage("id");
    const { container } = render(<RegisterScreen {...props} />);

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("Nama minimal 3 karakter")).toBeInTheDocument();
    });
    expect(screen.getByText("Username hanya boleh berupa huruf")).toBeInTheDocument();
    expect(
      screen.getByText("Password harus mengandung minimal 1 simbol khusus (@$!%*?&)")
    ).toBeInTheDocument();
  });
});

/**
 * Penjaga yang sama semangatnya dengan `src/i18n/__tests__/kunci-dinamis.test.ts`:
 * gerbang #135 hanya memindai `t("...")` literal, sedangkan kunci di skema Zod
 * sampai ke `t()` lewat variabel. Kunci yang hilang di sini tidak memerahkan uji
 * mana pun — layar cuma menampilkan "regValidation.nameMin" mentah-mentah.
 */
describe("#171 kunci pesan skema benar-benar ada di kedua kamus", () => {
  const adaKunci = (bahasa: "id" | "en", kunci: string) => {
    const bundel = i18n.getResourceBundle(bahasa, "translation") as Record<
      string,
      Record<string, string>
    >;
    const [blok, nama] = kunci.split(".");
    const nilai = bundel[blok]?.[nama];
    return typeof nilai === "string" && nilai.trim() !== "";
  };

  it("setiap pesan skema berupa kunci regValidation.* yang ada di id dan en", () => {
    const hasil = registrationSchema.safeParse({
      name: "",
      email: "bukan-email",
      username: "1",
      password: "x",
    });
    expect(hasil.success).toBe(false);

    const kunci = hasil.success ? [] : hasil.error.issues.map((i) => i.message);
    expect(kunci.length).toBeGreaterThan(0);

    const kurang: string[] = [];
    for (const k of kunci) {
      expect(k).toMatch(/^regValidation\./);
      for (const bahasa of ["id", "en"] as const) {
        if (!adaKunci(bahasa, k)) kurang.push(`${bahasa}:${k}`);
      }
    }
    expect(kurang).toEqual([]);
  });
});
