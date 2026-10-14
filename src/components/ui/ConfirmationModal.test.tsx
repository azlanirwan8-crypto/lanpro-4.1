import React from "react";
import { render, screen } from "@testing-library/react";
import { ConfirmationModal } from "./ConfirmationModal";

describe("ConfirmationModal", () => {
  it("renders with animated logout icon for logout confirmation", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Logout Akun"
        message="Apakah Anda yakin ingin keluar? Sesi Anda akan diakhiri."
        variant="warning"
      />
    );

    const logoutIcon = screen.getByTestId("animated-logout-icon");
    expect(logoutIcon).toBeInTheDocument();
    expect(screen.getByText("Logout Akun")).toBeInTheDocument();
    expect(
      screen.getByText("Apakah Anda yakin ingin keluar? Sesi Anda akan diakhiri.")
    ).toBeInTheDocument();
  });

  it("renders celebration icon for success info alerts", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Sukses Menyimpan"
        message="Data berhasil disimpan"
        variant="info"
        isAlert={true}
      />
    );

    expect(screen.getByText("Sukses Menyimpan")).toBeInTheDocument();
    expect(screen.getByText("Data berhasil disimpan")).toBeInTheDocument();
  });

  it("supports customIcon when provided", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Perhatian Khusus"
        message="Peringatan penting"
        customIcon={<div data-testid="custom-test-icon">Custom Icon</div>}
      />
    );

    expect(screen.getByTestId("custom-test-icon")).toBeInTheDocument();
    expect(screen.getByText("Perhatian Khusus")).toBeInTheDocument();
  });
});

/**
 * #738 — ikon logout dipilih dari NIAT pengirim, bukan dari ejaan judul.
 *
 * Laporan pemilik proyek 14 Okt: dialog logout berbahasa Inggris membuka
 * dengan ikon TONG SAMPAH. Sebabnya terukur: penciuman judul mengenal
 * "logout"/"keluar"/"sign out" tetapi judul Inggrisnya "Log Out Account" —
 * dua kata terpisah — jadi jatuh ke ikon hapus. Tong sampah menyiratkan ada
 * data terhapus padahal logout tidak menghapus apa pun.
 */
describe("ikon logout tidak ditebak dari ejaan judul (#738)", () => {
  it("judul Inggris dua kata dengan kind eksplisit tetap berikon logout", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Log Out Account"
        message="Are you sure you want to log out? Your session will be ended."
        variant="warning"
        kind="logout"
      />
    );

    expect(screen.getByTestId("animated-logout-icon")).toBeInTheDocument();
    // Modal dirender lewat Portal ke document.body, jadi pencariannya di sana.
    expect(document.querySelector("lord-icon")).toBeNull();
  });

  it("kind eksplisit menang walau judulnya tidak berbau logout sama sekali", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Sampai Jumpa"
        message="Sesi Anda akan diakhiri."
        variant="warning"
        kind="logout"
      />
    );

    expect(screen.getByTestId("animated-logout-icon")).toBeInTheDocument();
  });

  it("jaring pengaman: judul Inggris dua kata TANPA kind pun tidak jatuh ke tong sampah", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Log Out Account"
        message="Are you sure you want to log out?"
        variant="warning"
      />
    );

    expect(screen.getByTestId("animated-logout-icon")).toBeInTheDocument();
    expect(document.querySelector("lord-icon")).toBeNull();
  });

  it("dialog hapus tanpa kind TETAP berikon tong sampah, bukan logout", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Hapus Data"
        message="Data akan hilang permanen."
        variant="danger"
      />
    );

    expect(screen.queryByTestId("animated-logout-icon")).toBeNull();
    expect(document.querySelector("lord-icon")).not.toBeNull();
  });
});
