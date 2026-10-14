/**
 * #716 — kartu HP tidak boleh menyembunyikan berkas non-gambar.
 *
 * `DiscussionPointMobileCardView` memfilter `p.files` HANYA yang mimetype-nya
 * image, lalu blok lampirannya hanya merender `tautan` dan `gambar`. Papan
 * desktop memecah berkas menjadi dua sejak #704 dan menampilkan yang
 * bukan-gambar sebagai chip bernama (`BarisDiskusi.tsx`). Akibatnya satu PDF
 * atau XLSX yang menempel pada titik diskusi terbaca di layar kerja tetapi
 * HILANG total di layar HP — padahal justru di situ titik diskusi biasanya
 * dibaca ulang setelah rapat. Aturan yang dilanggar adalah #645: satu field,
 * satu perilaku, dua tampilan.
 *
 * RENDER, bukan baca sumber: yang diklaim di sini adalah teks nama berkasnya
 * sungguh muncul di DOM, bukan bahwa sebuah variabel dihitung.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { DiscussionPointMobileCardView } from "./components/DiscussionPointMobileCardView";
import type { DiscussionPoint } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "id" } }),
}));

const berkas = (lebih: Record<string, unknown>) =>
  ({ id: "f" + Math.random().toString(36).slice(2), url: "", name: "", ...lebih }) as never;

const titik = (lebih: Partial<DiscussionPoint> = {}): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern: "Sosialisasi tarif MDR 0,6 persen ke 30 merchant",
    keterangan: "",
    tindakanLanjut: "",
    tags: [],
    links: [],
    files: [],
    status: "pending",
    authorId: "u1",
    ...lebih,
  }) as unknown as DiscussionPoint;

const pasang = (p: Partial<DiscussionPoint>) =>
  render(
    <DiscussionPointMobileCardView
      points={[titik(p)]}
      projectMembers={[]}
      masterData={[]}
      onOpenThread={() => {}}
      onEditPoint={() => {}}
      onDeletePoint={() => {}}
      onToggleStatus={() => {}}
      canEdit={() => true}
      canDelete={() => true}
      canToggleStatus={false}
      currentUserId="u1"
    />
  );

describe("kartu HP menampilkan berkas non-gambar (#716)", () => {
  it("satu PDF saja sudah cukup untuk memunculkan blok lampiran dan namanya", () => {
    pasang({
      files: [
        berkas({
          name: "Laporan-MDR-Oktober-2026.pdf",
          mimetype: "application/pdf",
          url: "https://x/1.pdf",
        }),
      ],
    });
    const chip = screen.getByText("Laporan-MDR-Oktober-2026.pdf");
    expect(chip).toBeInTheDocument();
    expect(chip.closest("a")).toHaveAttribute("href", "https://x/1.pdf");
  });

  it("gambar tetap gambar, dan berkas lain jadi chip bernama di kartu yang sama", () => {
    pasang({
      files: [
        berkas({ name: "foto-whitelabel.png", mimetype: "image/png", url: "https://x/a.png" }),
        berkas({
          originalName: "Rincian Tarif.xlsx",
          mimetype: "application/vnd.ms-excel",
          url: "https://x/b.xlsx",
        }),
      ],
    });
    expect(screen.getByAltText("foto-whitelabel.png")).toBeInTheDocument();
    expect(screen.getByText("Rincian Tarif.xlsx")).toBeInTheDocument();
  });

  it("chip berkas memakai rel yang sama dengan tautan buatan pengguna lain", () => {
    pasang({
      files: [berkas({ name: "kontrak.pdf", mimetype: "application/pdf", url: "https://x/c.pdf" })],
    });
    const tautan = screen.getByText("kontrak.pdf").closest("a");
    expect(tautan).toHaveAttribute("rel", "noopener noreferrer");
    expect(tautan).toHaveAttribute("target", "_blank");
  });

  it("nama berkas muncul UTUH, tidak dipotong (#645)", () => {
    const panjang =
      "Rekapitulasi-kendala-onboarding-merchant-EDC-wilayah-jabodetabek-periode-oktober-2026.pdf";
    pasang({
      files: [berkas({ name: panjang, mimetype: "application/pdf", url: "https://x/d.pdf" })],
    });
    expect(screen.getByText(panjang)).toBeInTheDocument();
  });

  it("titik diskusi tanpa lampiran dan tanpa tautan tidak mendapat blok kosong", () => {
    const { container } = pasang({ files: [], links: [] });
    expect(container.querySelector('a[rel="noopener noreferrer"]')).toBeNull();
  });

  it("tautan jamak tetap dirender bersama berkas (#704 tidak mundur)", () => {
    pasang({
      links: [
        { id: "l1", url: "https://dashboard.merchant.id", label: "Dashboard merchant" },
      ] as never,
      files: [
        berkas({ name: "lampiran.pdf", mimetype: "application/pdf", url: "https://x/e.pdf" }),
      ],
    });
    expect(screen.getByText("Dashboard merchant")).toBeInTheDocument();
    expect(screen.getByText("lampiran.pdf")).toBeInTheDocument();
  });
});
