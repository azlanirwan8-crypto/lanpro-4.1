import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import { WebAppsDropdown } from "./WebAppsDropdown";

/** Item `<a>` di panel — namanya produk, jadi dicari lewat penggalan. */
const item = (nama: string) => screen.getByRole("menuitem", { name: new RegExp(nama, "i") });

describe("WebAppsDropdown", () => {
  it("merender tombol trigger aplikasi web apps", () => {
    render(<WebAppsDropdown />);
    const trigger = screen.getByRole("button", { name: /web apps/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("membuka dan menutup dropdown saat trigger diklik", async () => {
    render(<WebAppsDropdown />);
    const trigger = screen.getByRole("button", { name: /web apps/i });

    // Klik untuk membuka
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Maps Cabang")).toBeInTheDocument();

    const link = item("Maps Cabang");
    expect(link).toHaveAttribute("href", "https://match-sepia.vercel.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    // Klik lagi untuk menutup — panel #672 menutup dengan animasi keluar
    // (AnimatePresence di TopbarMenuPortal), jadi kepergiannya ditunggu.
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByText("Maps Cabang")).not.toBeInTheDocument());
  });

  it("menutup dropdown saat menekan tombol Escape", async () => {
    render(<WebAppsDropdown />);
    const trigger = screen.getByRole("button", { name: /web apps/i });

    fireEvent.click(trigger);
    expect(screen.getByText("Maps Cabang")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Maps Cabang")).not.toBeInTheDocument());
  });
});

/**
 * #804 — Sentil masuk sebagai aplikasi web kedua.
 *
 * Yang dikunci di sini bukan cuma "ada dua baris": test lama memakai
 * `getByRole("menuitem")` TUNGGAL, jadi menambah entri kedua dulu membuat suite
 * ini merah sebelum menambah apa pun. Karena itu kedua tautan diuji terpisah
 * lengkap dengan `href`-nya — supaya entri berikutnya tidak bisa menimpa baris
 * di atasnya tanpa memerahkan test.
 */
describe("WebAppsDropdown — dua aplikasi (#804)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("id");
  });

  const buka = () => {
    render(<WebAppsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: /web apps/i }));
  };

  it("Maps Cabang dan Sentil sama-sama punya tautan luarnya sendiri", () => {
    buka();

    // Dua `<a role=menuitem>` dalam satu panel — inilah yang membuat test lama
    // merah: ia memakai getByRole("menuitem") tunggal.
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);

    expect(item("Maps Cabang")).toHaveAttribute("href", "https://match-sepia.vercel.app/");
    expect(item("Sentil")).toHaveAttribute("href", "https://sentil-eight.vercel.app/");

    for (const nama of ["Maps Cabang", "Sentil"]) {
      expect(item(nama)).toHaveAttribute("target", "_blank");
      expect(item(nama)).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("penanda jumlah di kepala panel ikut dua", () => {
    buka();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  /**
   * HARNESS PEKA. Test di atas boleh lulus karena satu alasan palsu: kalau
   * panel selalu memuat angka "2" apa pun isinya. Daftar satu entri di bawah
   * membuktikan kedua klaim itu benar-benar dibaca dari datanya — Sentil hilang
   * dan penandanya turun ke 1.
   */
  it("satu entri saja membuat Sentil dan penanda '2' ikut hilang", () => {
    render(
      <WebAppsDropdown
        apps={[{ id: "maps-cabang", name: "Maps Cabang", url: "https://match-sepia.vercel.app/" }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /web apps/i }));

    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(screen.queryByRole("menuitem", { name: /sentil/i })).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("deskripsi keduanya datang dari kamus, bukan teks keras", async () => {
    buka();
    expect(screen.getByText("Sistem Peta & Lokasi Cabang")).toBeInTheDocument();
    expect(screen.getByText("Analisis Sentimen Review")).toBeInTheDocument();

    await i18n.changeLanguage("en");
    expect(screen.getByText("Branch Map & Location System")).toBeInTheDocument();
    expect(screen.getByText("Review sentiment analysis")).toBeInTheDocument();
    expect(screen.queryByText("Sistem Peta & Lokasi Cabang")).not.toBeInTheDocument();
    expect(screen.queryByText("Analisis Sentimen Review")).not.toBeInTheDocument();
  });
});
