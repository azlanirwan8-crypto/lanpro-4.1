/**
 * @jest-environment jsdom
 *
 * #563 — modal tenggat saat login pertama. Yang dikunci di sini:
 *  - tidak ada tugas = tidak ada modal sama sekali (bukan modal kosong);
 *  - barisnya menyebut judul + sisa/lewat hari, TANPA kode tugas (aturan #562);
 *  - "Mengerti" menutupnya, dan penjaga sesi membuat muat ulang tidak menagih
 *    dua kali — tapi penjaga itu hanya boleh berlaku per sesi, bukan selamanya.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../lib/api", () => ({ apiRequest: jest.fn() }));

import { apiRequest } from "../lib/api";
import { ModalTenggatLogin } from "./ModalTenggatLogin";

const ISI = [
  {
    id: "t-1",
    judul: "Perbaiki sinkronisasi jam perangkat",
    status: "In Progress",
    proyek: "LanPro 4.1",
    tanggal: "2026-09-22",
    selisihHari: -7,
    terlambat: true,
  },
  {
    id: "t-2",
    judul: "Formulir laporan harian",
    status: "To Do",
    proyek: "LanPro 4.1",
    tanggal: "2026-09-30",
    selisihHari: 1,
    terlambat: false,
  },
];

describe("ModalTenggatLogin (#563)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    (apiRequest as jest.Mock).mockImplementation(async () => ({
      status: "success",
      data: (globalThis as any).__tenggat ?? [],
    }));
  });

  it("tidak muncul kalau tidak ada yang perlu dilaporkan", async () => {
    (globalThis as any).__tenggat = [];
    const { container } = render(<ModalTenggatLogin sudahLogin />);
    await new Promise((r) => setTimeout(r, 25));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("menampilkan judul tugas dan sisa harinya, tanpa kode tugas", async () => {
    (globalThis as any).__tenggat = ISI;
    const { container } = render(<ModalTenggatLogin sudahLogin />);

    await waitFor(() => expect(container.querySelector('[role="dialog"]')).toBeTruthy());
    const teks = container.textContent || "";
    expect(teks).toContain("Perbaiki sinkronisasi jam perangkat");
    expect(teks).toContain("lewat 7 hari");
    expect(teks).toContain("sisa 1 hari");
    expect(teks).not.toContain("LNP-");
    expect(teks).not.toContain("WMIR-");
    expect(container.querySelector('[role="dialog"]')).toHaveAttribute("aria-modal", "true");
  });

  it("tutup permanen untuk sesi ini, dan tidak menagih lagi saat dimuat ulang", async () => {
    (globalThis as any).__tenggat = ISI;
    const pertama = render(<ModalTenggatLogin sudahLogin />);
    await waitFor(() => expect(pertama.container.querySelector('[role="dialog"]')).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Mengerti" }));
    await waitFor(() => expect(pertama.container.querySelector('[role="dialog"]')).toBeNull());
    expect(sessionStorage.getItem("lanpro_tenggat_login")).toBe("1");

    // Kontrak penjaga sesi = TIDAK ADA permintaan kedua. Mengandalkan "dialognya
    // belum muncul lagi" saja bisa lulus karena waktu tunggu, bukan karena aturannya.
    (apiRequest as jest.Mock).mockClear();
    const kedua = render(<ModalTenggatLogin sudahLogin />);
    await new Promise((r) => setTimeout(r, 25));
    expect(apiRequest).not.toHaveBeenCalled();
    expect(kedua.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("diam saat endpoint-nya gagal — layar login tidak ikut rusak", async () => {
    (apiRequest as jest.Mock).mockImplementation(async () => {
      throw new Error("500");
    });
    const { container } = render(<ModalTenggatLogin sudahLogin />);
    await new Promise((r) => setTimeout(r, 25));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
