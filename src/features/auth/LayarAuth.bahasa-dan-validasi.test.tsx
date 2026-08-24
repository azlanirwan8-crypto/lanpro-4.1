/**
 * Regresi layar autentikasi — item #101 dan #102.
 * Ditemukan oleh /qa pada 21 Agustus 2026.
 * Laporan: .gstack/qa-reports/qa-report-localhost-2026-08-21.md
 *
 * #101 — Layar masuk dan daftar mencampur label Inggris dengan kontrol
 *        Indonesia ("Sign In" bersebelahan dengan "Masuk dengan Google").
 *        Produk ini berbahasa Indonesia; teks kasat mata harus ikut.
 *
 * #102 — Keempat input di layar daftar memakai atribut `required`, sehingga
 *        validasi bawaan peramban ("Please fill out this field." — selalu
 *        Inggris) menyela LEBIH DULU dan `registrationSchema` Zod yang sudah
 *        berpesan Indonesia tidak pernah tercapai. Test kedua di bawah
 *        menjaga jalur Zod itu tetap terjangkau.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";

const propsLogin = {
  onLogin: jest.fn(),
  onRegisterClick: jest.fn(),
};

const propsDaftar = {
  onRegister: jest.fn().mockResolvedValue({ success: true }),
  onBackToLogin: jest.fn(),
};

describe("#101 layar autentikasi berbahasa Indonesia", () => {
  it("layar masuk memakai label Indonesia, bukan Inggris", () => {
    render(<LoginScreen {...propsLogin} />);

    expect(screen.getByRole("heading", { name: "Masuk" })).toBeInTheDocument();
    expect(screen.getByText("Masuk untuk melanjutkan ke Workspace Anda")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Masukkan username Anda")).toBeInTheDocument();
    expect(screen.getByText("Ingat Saya")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lupa Kata Sandi?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daftar" })).toBeInTheDocument();

    // Teks Inggris lama tidak boleh kembali.
    expect(screen.queryByText("Remember Me")).not.toBeInTheDocument();
    expect(screen.queryByText("Forgot Password?")).not.toBeInTheDocument();
    expect(screen.queryByText(/Don't have an account/)).not.toBeInTheDocument();
  });

  it("layar daftar memakai label Indonesia, bukan Inggris", () => {
    render(<RegisterScreen {...propsDaftar} />);

    expect(screen.getByRole("heading", { name: "Buat Akun Baru" })).toBeInTheDocument();
    expect(screen.getByText(/Nama Lengkap/)).toBeInTheDocument();
    expect(screen.getByText(/Alamat Email/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Daftar/ })).toBeInTheDocument();

    expect(screen.queryByText("Full Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Email Address")).not.toBeInTheDocument();
    expect(screen.queryByText("Create New Account")).not.toBeInTheDocument();
    expect(screen.queryByText(/Already have an account/)).not.toBeInTheDocument();
  });
});

describe("#102 validasi layar daftar memakai Zod, bukan bawaan peramban", () => {
  it("tidak ada input yang memakai atribut required", () => {
    const { container } = render(<RegisterScreen {...propsDaftar} />);

    // `required` menyerahkan validasi ke peramban, yang pesannya selalu
    // Inggris dan menyela sebelum Zod sempat jalan.
    expect(container.querySelectorAll("input[required]")).toHaveLength(0);
  });

  it("kirim formulir kosong memunculkan pesan Zod berbahasa Indonesia", async () => {
    render(<RegisterScreen {...propsDaftar} />);

    fireEvent.click(screen.getByRole("button", { name: /Daftar/ }));

    await waitFor(() => {
      expect(screen.getByText("Nama minimal 3 karakter")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Format email tidak valid (contoh: user@gmail.com)")
    ).toBeInTheDocument();
    // Kode menyimpan satu pesan per field, jadi yang tampil untuk password
    // adalah aturan terakhir yang gagal — cukup pastikan pesannya Indonesia.
    expect(screen.getByText(/^Password harus mengandung/)).toBeInTheDocument();

    // Formulir kosong tidak boleh sampai memanggil API pendaftaran.
    expect(propsDaftar.onRegister).not.toHaveBeenCalled();
  });
});
