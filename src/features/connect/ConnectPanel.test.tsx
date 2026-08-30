import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnectPanel } from "./ConnectPanel";
import * as connectService from "./services/connect.service";

jest.mock("./services/connect.service", () => ({
  fetchDbConfig: jest.fn().mockResolvedValue({
    status: "success",
    data: {
      host: "localhost",
      port: 5432,
      user: "app_user",
      password: "app_password",
      database: "app_database",
    },
  }),
  testDbConfig: jest.fn().mockResolvedValue({
    status: "success",
    message: "Koneksi berhasil",
  }),
  saveDbConfig: jest.fn().mockResolvedValue({
    status: "success",
    message: "Konfigurasi berhasil disimpan",
  }),
}));

describe("ConnectPanel — #271 Konfirmasi Pergantian DB Live", () => {
  beforeEach(() => {
    (connectService.fetchDbConfig as jest.Mock).mockResolvedValue({
      status: "success",
      data: {
        host: "localhost",
        port: 5432,
        user: "app_user",
        password: "app_password",
        database: "app_database",
      },
    });
    (connectService.testDbConfig as jest.Mock).mockResolvedValue({
      status: "success",
      message: "Koneksi berhasil",
    });
    (connectService.saveDbConfig as jest.Mock).mockResolvedValue({
      status: "success",
      message: "Konfigurasi berhasil disimpan",
    });
  });

  it("memuat konfigurasi database awal saat dibuka", async () => {
    render(<ConnectPanel />);
    await waitFor(() => {
      expect(connectService.fetchDbConfig).toHaveBeenCalled();
    });
  });

  it("membuka ConfirmationModal saat tombol Simpan & Terapkan diklik", async () => {
    render(<ConnectPanel />);
    await waitFor(() => {
      expect(connectService.fetchDbConfig).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole("button", { name: /Simpan & Terapkan/i });
    fireEvent.click(saveButton);

    // Modal muncul dengan pesan peringatan
    expect(screen.getByText("Konfirmasi Ganti Koneksi Database")).toBeInTheDocument();
    expect(
      screen.getByText(/Apakah Anda yakin ingin menerapkan konfigurasi database ini\?/i)
    ).toBeInTheDocument();

    // API saveDbConfig belum terpanggil sebelum konfirmasi
    expect(connectService.saveDbConfig).not.toHaveBeenCalled();

    // Klik tombol konfirmasi di dalam modal
    const confirmButton = screen.getByRole("button", { name: "Ya, Terapkan Koneksi" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(connectService.saveDbConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "localhost",
          database: "app_database",
        })
      );
    });
  });

  it("tidak memanggil saveDbConfig bila modal dibatalkan", async () => {
    render(<ConnectPanel />);
    await waitFor(() => {
      expect(connectService.fetchDbConfig).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole("button", { name: /Simpan & Terapkan/i });
    fireEvent.click(saveButton);

    expect(screen.getByText("Konfirmasi Ganti Koneksi Database")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Batal" });
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Konfirmasi Ganti Koneksi Database")).not.toBeInTheDocument();
    expect(connectService.saveDbConfig).not.toHaveBeenCalled();
  });
});
