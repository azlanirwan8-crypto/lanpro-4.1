/**
 * #583 dan #718 — modal metadata flowchart.
 *
 * Dua hal dijaga di sini, dan keduanya adalah hal yang pernah DICABUT.
 *
 * #583 membuang "External Link" dan "Architecture Description" dan menggantinya
 * dengan empat blok yang pemilik proyek tulis di slide-nya (Problem Statement,
 * Pain Point, How, Benefit). Tanpa test, field lama punya cara sendiri untuk
 * kembali — ia masih hidup di kolom `link` dan `description` pada baris database.
 *
 * #718 membalik keputusan #583 pada SATU titiknya: pemilik proyek 13 Okt minta
 * "linked to epic" menjadi "linked to issue, jadi semua issue bukan hanya epic
 * saja". Test lama mengunci kata "epic" di empat tempat, jadi ia ditulis ulang
 * bersama keputusannya — bukan dilemahkan.
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
  opsiTautanIsu: [{ id: "e1", key: "PRJ-3", title: "Pembayaran QRIS", type: "epic" }],
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
});

describe("#718 — tautannya ke ISU, bukan hanya ke epic", () => {
  it("semua jenis isu masuk, bukan hanya yang berjenis epic", async () => {
    render(
      <FlowchartDocumentModal
        {...props({
          opsiTautanIsu: [
            { id: "e1", key: "PRJ-3", title: "Pembayaran QRIS", type: "Epic" },
            { id: "b1", key: "WMIR-167", title: "Report EDC", type: "bug" },
            { id: "s1", key: "PRJ-4", title: "Transaksi NFC", type: "story" },
          ],
        })}
      />
    );

    // Pilihan dropdown baru dirender saat terbuka (CommonComponents:336).
    const pemicu = screen
      .getAllByText(/Hubungkan dengan isu|Connect with an issue/i)[0]
      .closest("button");
    fireEvent.click(pemicu as HTMLElement);

    // Yang lama membuang dua baris terakhir tanpa memberi tahu siapa pun.
    expect(await screen.findByText("[PRJ-3] Pembayaran QRIS")).toBeTruthy();
    expect(screen.getByText("[WMIR-167] Report EDC")).toBeTruthy();
    expect(screen.getByText("[PRJ-4] Transaksi NFC")).toBeTruthy();
  });

  it("label dan petunjuk tidak lagi mengklaim epik", () => {
    render(<FlowchartDocumentModal {...props()} />);

    expect(screen.getByText(/Isu Terkait|Linked Issue/i)).toBeTruthy();
    expect(screen.queryByText(/Linked Epic|Link Epic/i)).toBeNull();
  });

  it("tanpa isu di proyek, petunjuknya jujur — bukan dropdown kosong tanpa sebab", () => {
    render(<FlowchartDocumentModal {...props({ opsiTautanIsu: [] })} />);

    expect(screen.getByText(/Belum ada isu|No issue in this project/i)).toBeTruthy();
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

  // #587 — pemilik proyek: "terlalu kecil ui modal nya... document category nya
  // juga tidak sama besar desainnya". `cn()` hanya merangkai kelas (tanpa
  // tailwind-merge) dan pemicu StyledDropdown selalu membawa px-1.5 py-0.5
  // bawaannya, jadi yang bisa dikunci hanyalah tingginya.
  it("semua kontrol satu-baris memakai tinggi yang sama, termasuk kedua dropdown", () => {
    const { container } = render(<FlowchartDocumentModal {...props()} />);

    const pemicu = Array.from(container.querySelectorAll("button")).filter((b) =>
      /Panduan|Hubungkan dengan isu|Connect with an issue/i.test(b.textContent || "")
    );
    expect(pemicu.length).toBe(2);

    const nama = container.querySelector('input[type="text"]') as HTMLElement;
    for (const kendali of [nama, ...pemicu]) {
      expect(kendali.className).toContain("h-10");
      expect(kendali.className).toContain("text-sm");
    }
  });

  it("baris isu membawa penanda jenisnya sendiri dan jumlahnya disebut di petunjuk", async () => {
    render(
      <FlowchartDocumentModal
        {...props({
          opsiTautanIsu: [
            { id: "e1", key: "PRJ-3", title: "Pembayaran QRIS", type: "epic" },
            { id: "e2", key: "WMIR-166", title: "Onboarding EDC", type: "story" },
          ],
        })}
      />
    );

    expect(screen.getByText(/2 isu/i)).toBeTruthy();

    fireEvent.click(
      screen.getAllByText(/Hubungkan dengan isu/i)[0].closest("button") as HTMLElement
    );
    const baris = (await screen.findByText("[PRJ-3] Pembayaran QRIS")).closest(
      "button"
    ) as HTMLElement;
    // Ikon jenis di kiri baris — pembedanya, bukan hanya kata "isu".
    expect(baris.querySelector("svg")).toBeTruthy();
  });
});
