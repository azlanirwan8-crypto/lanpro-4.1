/**
 * Regresi penyaringan kolom username — item #168.
 * Ditemukan `/design-review` 24 Agustus 2026, dibuktikan lewat test saat #167.
 *
 * #168 — Kedua layar pendaftaran menjalankan
 *        `nilai.replace(/[^a-zA-Z]/g, "").slice(0, 10)` pada SETIAP ketikan,
 *        jadi karakter terlarang lenyap sebelum sempat terlihat. Bagi pengguna,
 *        papan ketiknya seperti rusak: galat menjelaskan sesudahnya, tetapi
 *        karakternya sudah hilang. Efek sampingnya terbukti saat #167 —
 *        mengetik ulang nilai yang "benar" tidak memicu perubahan apa pun,
 *        sehingga galat lama bertahan di layar.
 *
 * Perbaikannya: kolom menampilkan apa yang diketik, galat menjelaskan apa yang
 * salah, dan pengiriman ditolak selama nilainya belum sah. Tidak ada karakter
 * yang hilang diam-diam.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { CompleteRegistrationScreen } from "./CompleteRegistrationScreen";
import { RegisterScreen } from "./RegisterScreen";
import { kirimLengkapiPendaftaran, ambilProviderSso } from "./services/sso.service";

// Modul ini di-mock UTUH, jadi fungsi lain yang dipakai layar daftar harus
// ikut disediakan — tanpa itu `SsoButtons` melempar saat dirender.
jest.mock("./services/sso.service", () => ({
  kirimLengkapiPendaftaran: jest.fn(),
  ambilProviderSso: jest.fn().mockResolvedValue([]),
  urlMulaiSso: jest.fn(() => "/api/auth/oidc/google/start?mode=daftar"),
}));

const mockKirim = kirimLengkapiPendaftaran as jest.MockedFunction<typeof kirimLengkapiPendaftaran>;

const props = {
  email: "azlan@example.com",
  onSelesai: jest.fn(),
  onBatal: jest.fn(),
};

describe("#168 kolom username tidak menghapus ketikan diam-diam", () => {
  beforeEach(() => {
    mockKirim.mockResolvedValue({ berhasil: true, pesan: "ok" });
  });

  afterEach(() => jest.clearAllMocks());

  it("angka yang diketik TETAP terlihat di kolom", async () => {
    render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByLabelText(/Nama Pengguna/) as HTMLInputElement;
    fireEvent.change(kolom, { target: { value: "azlan123" } });

    expect(kolom.value).toBe("azlan123");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("nilai lebih dari 10 huruf tetap terlihat dan ditandai salah", async () => {
    render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByLabelText(/Nama Pengguna/) as HTMLInputElement;
    fireEvent.change(kolom, { target: { value: "azlanirwanpanjang" } });

    expect(kolom.value).toBe("azlanirwanpanjang");
    expect(kolom).toHaveAttribute("aria-invalid", "true");
  });

  it("nilai tidak sah TIDAK pernah terkirim ke backend", async () => {
    const { container } = render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByLabelText(/Nama Pengguna/);
    fireEvent.change(kolom, { target: { value: "azlan123" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mockKirim).not.toHaveBeenCalled();
  });

  it("memperbaiki nilai membersihkan galat tanpa mengetik ulang seluruhnya", async () => {
    render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByLabelText(/Nama Pengguna/);
    fireEvent.change(kolom, { target: { value: "azlan123" } });
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    // Menghapus angkanya saja — inilah yang dulu tidak mungkin, sebab kolom
    // sudah berisi "azlan" sehingga peristiwanya tidak pernah terpicu (#167).
    fireEvent.change(kolom, { target: { value: "azlan" } });

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(kolom).toHaveAttribute("aria-invalid", "false");
  });

  it("nilai sah tetap terkirim seperti biasa", async () => {
    const { container } = render(<CompleteRegistrationScreen {...props} />);

    fireEvent.change(screen.getByLabelText(/Nama Pengguna/), { target: { value: "azlan" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(mockKirim).toHaveBeenCalledWith("azlan"));
  });
});

describe("#168 layar Daftar manual juga tidak menghapus ketikan", () => {
  const propsDaftar = {
    onRegister: jest.fn().mockResolvedValue({ success: true }),
    onBackToLogin: jest.fn(),
  };

  beforeEach(() => {
    // Konfigurasi Jest repo ini mengembalikan implementasi mock antar test,
    // jadi nilainya dipasang ulang di sini, bukan sekali di pabrik mock.
    (ambilProviderSso as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  it("angka yang diketik TETAP terlihat dan ditandai salah", async () => {
    render(<RegisterScreen {...propsDaftar} />);

    const kolom = screen.getAllByRole("textbox")[2] as HTMLInputElement;
    fireEvent.change(kolom, { target: { value: "azlan1" } });

    expect(kolom.value).toBe("azlan1");
    await waitFor(() =>
      expect(screen.getByText("Username hanya boleh berupa huruf")).toBeInTheDocument()
    );
  });

  it("panjangnya tetap dibatasi peramban lewat maxLength, bukan penghapusan senyap", () => {
    render(<RegisterScreen {...propsDaftar} />);

    const kolom = screen.getAllByRole("textbox")[2] as HTMLInputElement;
    expect(kolom).toHaveAttribute("maxLength", "10");
  });

  it("nilai tak sah tidak pernah sampai ke onRegister", async () => {
    const { container } = render(<RegisterScreen {...propsDaftar} />);

    const kolom = screen.getAllByRole("textbox")[2];
    fireEvent.change(kolom, { target: { value: "azlan1" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByText("Username hanya boleh berupa huruf")).toBeInTheDocument()
    );
    expect(propsDaftar.onRegister).not.toHaveBeenCalled();
  });
});
