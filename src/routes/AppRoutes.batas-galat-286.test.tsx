/**
 * Regresi ISSUE-286 — galat render satu tampilan tidak boleh mengosongkan aplikasi.
 * Ditemukan oleh /qa pada 30 Agu 2026.
 * Laporan: .gstack/qa-reports/qa-report-lanpro-2026-08-30.md
 *
 * Yang dijaga di sini adalah PERILAKU, bukan keberadaan kode: tes ini merender
 * tampilan yang sengaja melempar, lalu menuntut (a) kerangka di sekitarnya
 * masih hidup, (b) pesan "modul gagal dimuat" tampil, dan (c) berpindah
 * tampilan memulihkannya sendiri. Tes yang hanya memeriksa "ErrorBoundary
 * terpasang" akan tetap hijau walau batasnya tidak menahan apa pun.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

const Peledak: React.FC = () => {
  throw new Error("tampilan ini sengaja meledak");
};

const Kerangka: React.FC<{ anak: React.ReactNode }> = ({ anak }) => (
  <div>
    <nav>sidebar-navigasi</nav>
    <main>{anak}</main>
  </div>
);

describe("#286 batas galat per tampilan", () => {
  let konsol: jest.SpyInstance;

  beforeEach(() => {
    // React mencetak galat batas ke konsol; itu wajar dan bukan kegagalan tes.
    konsol = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => konsol.mockRestore());

  it("menahan galat di dalam area tampilan, kerangka tetap hidup", () => {
    render(
      <Kerangka
        anak={
          <ErrorBoundary resetKey="flowchart">
            <Peledak />
          </ErrorBoundary>
        }
      />
    );

    // Inilah inti #286: sebelum perbaikan, galat naik ke akar dan
    // MENGOSONGKAN seluruh pohon, termasuk sidebar.
    expect(screen.getByText("sidebar-navigasi")).toBeInTheDocument();
    expect(screen.getByText("Modul ini gagal dimuat")).toBeInTheDocument();
  });

  it("berpindah tampilan membuang galat tanpa memuat ulang halaman", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="flowchart">
        <Peledak />
      </ErrorBoundary>
    );
    expect(screen.getByText("Modul ini gagal dimuat")).toBeInTheDocument();

    // Pengguna pindah menu: resetKey berubah, anaknya kini sehat.
    rerender(
      <ErrorBoundary resetKey="dashboard">
        <div>isi-dashboard</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("isi-dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Modul ini gagal dimuat")).not.toBeInTheDocument();
  });

  it("tombol Coba lagi merender ulang di tempat, bukan memuat ulang halaman", () => {
    let meledak = true;
    const KadangMeledak: React.FC = () => {
      if (meledak) throw new Error("sekali saja");
      return <div>pulih</div>;
    };

    render(
      <ErrorBoundary resetKey="wiki">
        <KadangMeledak />
      </ErrorBoundary>
    );
    expect(screen.getByText("Modul ini gagal dimuat")).toBeInTheDocument();

    // Dua tombol berbeda, dan yang utama BUKAN muat-ulang: memuat ulang
    // halaman membuang seluruh keadaan aplikasi demi memperbaiki satu panel.
    // (window.location tidak bisa dipalsukan di jsdom — sifat non-configurable
    // — jadi yang dijaga di sini adalah pemulihan di tempat benar-benar
    // terjadi. Kalau tombolnya diam-diam diganti jadi reload, `pulih` tidak
    // akan pernah muncul sebab jsdom tidak merender ulang apa pun.)
    expect(screen.getByText("Muat Ulang Halaman")).toBeInTheDocument();

    meledak = false;
    fireEvent.click(screen.getByText("Coba lagi"));

    expect(screen.getByText("pulih")).toBeInTheDocument();
    expect(screen.queryByText("Modul ini gagal dimuat")).not.toBeInTheDocument();
  });
});
