/**
 * #815 — daftar ditutup tanpa menelan klik pertama.
 *
 * Sebelum ini `StyledDropdown` menutup daftarnya lewat lapisan
 * `<div className="fixed inset-0 z-[9999]">` yang memanggil `stopPropagation`.
 * Lapisan itu memang menutup daftar, tetapi klik pertama ke header, notifikasi,
 * atau tombol lain berhenti di situ: pengguna harus mengklik dua kali. Test ini
 * mengunci dua hal sekaligus — daftar TERTUTUP oleh `pointerdown` di luar, dan
 * peristiwa yang sama TIDAK ditahan sehingga sasaran tetap bereaksi.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StyledDropdown } from "./CommonComponents";

const PILIHAN = [
  { id: "proses", label: "Proses" },
  { id: "panduan", label: "Panduan" },
];

const buka = () => fireEvent.click(screen.getByRole("button", { name: /proses/i }));

describe("StyledDropdown — klik di luar (#815)", () => {
  it("menutup daftar pada pointerdown di luar dan membiarkan klik itu sampai ke sasaran", () => {
    const diKlik = jest.fn();
    const pointerDown = jest.fn();
    render(
      <div>
        <StyledDropdown masterData={[]} value="proses" onChange={jest.fn()} options={PILIHAN} />
        <button type="button" onClick={diKlik} onPointerDown={pointerDown}>
          Simpan
        </button>
      </div>
    );

    buka();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    const luar = screen.getByRole("button", { name: "Simpan" });
    fireEvent.pointerDown(luar);

    // Daftar sudah tertutup SEBELUM klik sasaran berjalan.
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    // Peristiwanya tidak ditahan: handler pointerdown milik sasaran tetap jalan.
    expect(pointerDown).toHaveBeenCalledTimes(1);

    fireEvent.click(luar);
    expect(diKlik).toHaveBeenCalledTimes(1);
  });

  it("tidak menutup saat pointerdown terjadi di dalam panel", () => {
    render(
      <StyledDropdown masterData={[]} value="proses" onChange={jest.fn()} options={PILIHAN} />
    );

    buka();
    fireEvent.pointerDown(screen.getByRole("option", { name: "Panduan" }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("klik pemicu tetap menutup daftar — pemicu dikecualikan dari penutup luar", () => {
    render(
      <StyledDropdown masterData={[]} value="proses" onChange={jest.fn()} options={PILIHAN} />
    );

    buka();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // `pointerdown` pada pemicu tidak boleh menutup lebih dulu, karena `onClick`
    // pemicu akan membukanya lagi dan daftar tidak pernah bisa ditutup.
    fireEvent.pointerDown(screen.getByRole("button", { name: /proses/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    buka();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
