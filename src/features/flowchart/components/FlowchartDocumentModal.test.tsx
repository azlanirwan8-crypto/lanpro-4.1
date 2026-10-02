/**
 * #583 — modal metadata flowchart.
 *
 * Yang dijaga di sini justru yang DIHAPUS: pemilik proyek meminta External Link
 * dan Architecture Description dibuang dan diganti empat blok yang ia tulis di
 * slide (Problem Statement, Pain Point, How, Benefit). Tanpa test, field lama
 * punya cara sendiri untuk kembali — ia masih hidup di kolom `link` dan
 * `description` pada baris database.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlowchartDocumentModal } from "./FlowchartDocumentModal";
import { KONTEKS_KOSONG } from "../types";

const props = (over: Record<string, unknown> = {}) => ({
  open: true,
  modalMode: "create" as const,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
  flowName: "",
  setFlowName: jest.fn(),
  flowCategory: "Panduan",
  setFlowCategory: jest.fn(),
  opsiKategoriDokumen: [{ id: "Panduan", label: "Panduan" }],
  flowEpicId: "",
  setFlowEpicId: jest.fn(),
  availableEpics: [{ id: "e1", key: "PRJ-3", title: "Pembayaran QRIS" }],
  flowKonteks: KONTEKS_KOSONG,
  setFlowKonteks: jest.fn(),
  ...over,
});

describe("FlowchartDocumentModal — empat blok detail (#583)", () => {
  it("menanyakan empat blok slide, bukan tautan eksternal atau deskripsi arsitektur", () => {
    render(<FlowchartDocumentModal {...props()} />);

    for (const judul of ["Problem Statement", "Pain Point", "How", "Benefit"]) {
      expect(screen.getByText(judul)).toBeTruthy();
    }
    expect(screen.queryByText(/Tautan Eksternal|External Link/i)).toBeNull();
    expect(screen.queryByText(/Deskripsi Arsitektur|Architecture Description/i)).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("Linked Epic tetap mengisi dari epic issue list papan ini", async () => {
    render(<FlowchartDocumentModal {...props()} />);

    // Pilihan dropdown baru dirender saat terbuka (CommonComponents:336).
    const pemicu = screen.getAllByText(/Hubungkan dengan Epic/i)[0].closest("button");
    fireEvent.click(pemicu as HTMLElement);

    expect(await screen.findByText("[PRJ-3] Pembayaran QRIS")).toBeTruthy();
  });

  it("tanpa epic di papan, petunjuknya jujur — bukan dropdown kosong tanpa sebab", () => {
    render(<FlowchartDocumentModal {...props({ availableEpics: [] })} />);

    expect(screen.getByText(/Belum ada epic/i)).toBeTruthy();
  });

  it("setiap blok menulis bidangnya sendiri, tidak ada yang menimpa tetangganya", () => {
    const setFlowKonteks = jest.fn();
    render(<FlowchartDocumentModal {...props({ setFlowKonteks })} />);

    const kotak = [
      [/Apa yang sedang dialami/i, "masalah"],
      [/paling membebani/i, "titikNyeri"],
      [/Bagaimana alur ini/i, "cara"],
      [/Yang lebih baik/i, "manfaat"],
    ] as const;

    for (const [petunjuk, kunci] of kotak) {
      setFlowKonteks.mockClear();
      fireEvent.change(screen.getByPlaceholderText(petunjuk), {
        target: { value: "isi-" + kunci },
      });
      expect(setFlowKonteks).toHaveBeenCalledWith({
        ...KONTEKS_KOSONG,
        [kunci]: "isi-" + kunci,
      });
    }
  });
});
