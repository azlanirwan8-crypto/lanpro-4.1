/**
 * #583 — tab Detail. Empat blok yang sama, sekarang dalam mode baca, karena
 * orang membuka papan untuk membaca alasannya, bukan untuk menebak isinya dari
 * kolom yang kosong.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlowchartDetail } from "./FlowchartDetail";

const penuh = {
  masalah: "Merchant mengecek transaksi QRIS secara manual",
  titikNyeri: "Aplikasi harus dibuka saat volume transaksi tinggi",
  cara: "Voice notification otomatis menyebut nominal",
  manfaat: "Konfirmasi pembayaran lebih cepat",
};

describe("FlowchartDetail — empat blok dalam mode baca (#583)", () => {
  it("memuat keempat blok apa adanya, baru baru tetap baris baru", () => {
    const { container } = render(
      <FlowchartDetail konteks={penuh} kategori="Test Plan" onEdit={jest.fn()} />
    );

    for (const teks of Object.values(penuh)) {
      expect(screen.getByText(teks)).toBeTruthy();
    }
    expect(screen.getByText("Test Plan")).toBeTruthy();
    expect(screen.queryByText("Belum diisi")).toBeNull();
    // Baris baru di dalam teks pengguna tidak boleh dilipat jadi satu baris.
    const blok = container.querySelector("section p");
    expect(blok?.className).toContain("whitespace-pre-line");
  });

  it("blok yang belum diisi berkata begitu, bukan menghilang diam-diam", () => {
    render(
      <FlowchartDetail
        konteks={{ ...penuh, titikNyeri: "", cara: "", manfaat: "" }}
        onEdit={jest.fn()}
      />
    );

    expect(screen.getAllByText("Belum diisi")).toHaveLength(3);
  });

  it("tombol Sunting Detail memanggil jalur edit yang sama dengan daftar", () => {
    const onEdit = jest.fn();
    render(<FlowchartDetail konteks={penuh} onEdit={onEdit} />);

    fireEvent.click(screen.getByText(/Sunting Detail/i));
    expect(onEdit).toHaveBeenCalled();
  });
});
