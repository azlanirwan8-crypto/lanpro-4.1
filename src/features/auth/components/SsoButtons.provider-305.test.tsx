/**
 * Regresi #305 — tombol SSO ditentukan BACKEND, bukan penyaring di frontend.
 *
 * Riwayatnya penting supaya tidak diulang. #197 memasang
 * `hasil.filter((p) => p !== "microsoft")` di komponen ini karena backend
 * melaporkan microsoft terkonfigurasi sementara alur OIDC-nya belum siap:
 * tombolnya ada, kliknya gagal, dan pemilik proyek yang menemukannya.
 *
 * Penyaring itu dihapus di #305. Penjaganya kini di tempat yang benar —
 * `providerTersedia()` di backend hanya memulangkan provider yang client id
 * DAN secret-nya terisi. Test ini mengunci konsekuensinya dari dua arah:
 *
 *   1. Provider yang DIPULANGKAN backend harus tampil, termasuk microsoft.
 *      Ini yang MERAH terhadap kode sebelum #305.
 *   2. Provider yang TIDAK dipulangkan backend tidak boleh tampil.
 *      Ini yang menjaga keluhan #197 tidak kembali: selama kredensial Azure
 *      belum diisi, tombolnya tetap tidak muncul.
 *
 * Yang TIDAK diuji di sini: apakah alur OIDC-nya berhasil. Itu perilaku
 * backend dan tidak bisa diamati dari komponen ini.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { SsoButtons } from "./SsoButtons";
import { ambilProviderSso, type ProviderSso } from "../services/sso.service";

jest.mock("../services/sso.service", () => ({
  ...jest.requireActual("../services/sso.service"),
  ambilProviderSso: jest.fn(),
}));

const ambilProviderSsoMock = ambilProviderSso as jest.MockedFunction<typeof ambilProviderSso>;

const pasangProvider = (daftar: ProviderSso[]) =>
  ambilProviderSsoMock.mockResolvedValue(daftar as never);

describe("#305 tombol SSO mengikuti daftar provider dari backend", () => {
  beforeEach(() => {
    ambilProviderSsoMock.mockReset();
  });

  it("menampilkan Microsoft ketika backend memulangkannya", async () => {
    pasangProvider(["google", "microsoft"]);

    render(<SsoButtons mode="login" />);

    await waitFor(() => {
      expect(screen.getByText(/Microsoft/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Google/i)).toBeInTheDocument();
  });

  it("TIDAK menampilkan Microsoft ketika backend tidak memulangkannya", async () => {
    pasangProvider(["google"]);

    render(<SsoButtons mode="login" />);

    await waitFor(() => {
      expect(screen.getByText(/Google/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Microsoft/i)).not.toBeInTheDocument();
  });

  it("tidak menampilkan apa pun ketika tidak ada provider terkonfigurasi", async () => {
    pasangProvider([]);

    const { container } = render(<SsoButtons mode="login" />);

    await waitFor(() => {
      expect(ambilProviderSsoMock).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("berlaku sama di mode daftar, bukan hanya mode login", async () => {
    pasangProvider(["microsoft"]);

    render(<SsoButtons mode="daftar" />);

    await waitFor(() => {
      expect(screen.getByText(/Microsoft/i)).toBeInTheDocument();
    });
  });
});
