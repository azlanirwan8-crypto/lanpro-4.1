/**
 * Regresi aksesibilitas layar Lengkapi Pendaftaran (SSO) — item #167.
 * Ditemukan `/design-review` 24 Agustus 2026, satu telaah dengan #164.
 *
 * #167 — Blok galat muncul di antara kolom dan tombol tanpa `role="alert"`
 *        maupun `aria-live`, dan kolomnya tidak pernah mendapat `aria-invalid`
 *        atau `aria-describedby`. Bagi pengguna pembaca layar, mengetik
 *        karakter terlarang menghasilkan karakter yang hilang diam-diam DAN
 *        pesan yang tidak pernah dibacakan — dua kegagalan senyap sekaligus.
 *
 * Labelnya juga tidak terikat ke kolom (tidak ada `htmlFor`/`id`), sehingga
 * `getByLabelText` tidak menemukannya. Test pertama di bawah menjaga ikatan itu.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { CompleteRegistrationScreen } from "./CompleteRegistrationScreen";

const props = {
  email: "azlan@example.com",
  onSelesai: jest.fn(),
  onBatal: jest.fn(),
};

describe("#167 galat layar SSO terdengar oleh pembaca layar", () => {
  it("label terikat ke kolom username", () => {
    render(<CompleteRegistrationScreen {...props} />);
    expect(screen.getByLabelText(/Nama Pengguna/)).toBeInTheDocument();
  });

  it("kolom bersih tidak ditandai tidak sah dan tidak ada alert", () => {
    render(<CompleteRegistrationScreen {...props} />);

    expect(screen.getByLabelText(/Nama Pengguna/)).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("galat diumumkan lewat role=alert dan kolom ditandai aria-invalid", async () => {
    render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByLabelText(/Nama Pengguna/);
    fireEvent.change(kolom, { target: { value: "azlan123" } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Username hanya boleh berupa huruf, maksimal 10 karakter"
      );
    });
    expect(kolom).toHaveAttribute("aria-invalid", "true");
  });

  it("aria-describedby kolom menunjuk ke elemen galat yang benar-benar ada", async () => {
    render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByLabelText(/Nama Pengguna/);
    fireEvent.change(kolom, { target: { value: "azlan123" } });

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    const ids = (kolom.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);

    // Setiap id yang disebut harus benar-benar ada — `aria-describedby` yang
    // menunjuk ke elemen hantu dibaca sebagai TIDAK ADA keterangan sama sekali.
    const teks = ids
      .map((id) => document.getElementById(id))
      .map((el) => {
        expect(el).not.toBeNull();
        return el?.textContent ?? "";
      })
      .join(" ");

    expect(teks).toContain("Username hanya boleh berupa huruf, maksimal 10 karakter");
  });

  it("galat hilang begitu kolom diperbaiki", async () => {
    render(<CompleteRegistrationScreen {...props} />);

    const kolom = screen.getByLabelText(/Nama Pengguna/);
    fireEvent.change(kolom, { target: { value: "azlan123" } });
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    // Nilainya harus BEDA dari isi kolom sekarang. Penyaringan senyap sudah
    // memangkas "azlan123" menjadi "azlan" (lihat #168), jadi mengetik ulang
    // "azlan" tidak memicu perubahan apa pun dan galatnya memang bertahan.
    fireEvent.change(kolom, { target: { value: "azlanb" } });

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(kolom).toHaveAttribute("aria-invalid", "false");
  });
});
