import React from "react";
import { render, screen } from "@testing-library/react";
import { ConfirmationModal } from "./ConfirmationModal";

describe("ConfirmationModal", () => {
  it("renders with animated logout icon for logout confirmation", () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Logout Akun"
        message="Apakah Anda yakin ingin keluar dari LanPro? Sesi Anda akan diakhiri."
        variant="warning"
      />
    );

    const logoutIcon = screen.getByTestId("animated-logout-icon");
    expect(logoutIcon).toBeInTheDocument();
    expect(screen.getByText("Logout Akun")).toBeInTheDocument();
    expect(
      screen.getByText("Apakah Anda yakin ingin keluar dari LanPro? Sesi Anda akan diakhiri.")
    ).toBeInTheDocument();
  });

  it("renders celebration icon for success info alerts", () => {
    const { container } = render(
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
