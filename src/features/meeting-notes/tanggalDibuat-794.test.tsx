/**
 * @jest-environment jsdom
 *
 * #794 — "oh ya tanggal di created ada kan ini" (pemilik proyek 19 Okt 2026).
 *
 * Jawabannya iya, dan justru itu yang perlu dikunci: `createdAt` SUDAH ada di
 * basis data (`pg-migrate.ts:547`), SUDAH ikut kembali ke klien lewat `SELECT *`
 * di repository, dan SUDAH menjadi kunci urutan di balik kepala kolom "No"
 * (`BagianPapan.tsx`). Yang tidak ada hanyalah tempat membacanya di layar.
 *
 * Yang diuji di sini karena itu bukan kolom baru, melainkan `title`:
 *
 *  1. TANGGALNYA TERBACA, bukan mentah. `createdAt` datang sebagai ISO dengan
 *     jam UTC; menampilkannya apa adanya menghasilkan "2026-10-13T02:58:00.000Z"
 *     di tooltip. Konvensi tanggal yang mengikuti bahasa aktif sudah ada sejak
 *     #722 (`localeTanggal`) dan dipakai ulang di sini, bukan ditulis ulang.
 *  2. TIDAK ADA KOLOM BARU. Mengurutkan atas tanggal dibuat sudah bisa dari
 *     kepala "No" yang memang sudah memikul `createdAt`; kolom kedua atas nilai
 *     yang sama hanya menduplikasi satu kontrol di layar yang sama. Jadi jumlah
 *     sel dan jumlah panah urutan TIDAK BOLEH berubah karena item ini.
 *  3. BARIS TANPA `createdAt` tidak mengarang. Tooltipnya hilang, bukan berisi
 *     tanggal hari ini — `ensureDate()` jatuh ke `new Date()` untuk nilai kosong,
 *     dan itu bukan fakta tentang baris itu.
 */
import React from "react";
import { render } from "@testing-library/react";
import { BarisDiskusi } from "./components/BarisDiskusi";
import type { DiscussionPoint } from "../../types";

jest.mock("react-i18next", () => ({
  // `t` meniru interpolasi: kunci + nilai `date` yang disisipkan, supaya test
  // ini membuktikan TANGGALNYA ikut sampai ke tooltip, bukan cuma namanya.
  useTranslation: () => ({
    t: (key: string, opsi?: { date?: string }) => (opsi?.date ? `${key}=${opsi.date}` : key),
    i18n: { language: "id" },
  }),
}));

const titik = (lebih: Partial<DiscussionPoint> = {}): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern: "30 merchant belum berhasil onboarding",
    status: "pending",
    authorId: "u1",
    ...lebih,
  }) as unknown as DiscussionPoint;

const pasang = (p: DiscussionPoint) =>
  render(
    <table>
      <tbody>
        <BarisDiskusi
          p={p}
          nomor="03"
          assigneeName="AZLAN IRWAN"
          namaPenerima={[{ id: "u1", nama: "AZLAN IRWAN" }]}
          masterData={[]}
          warnaTag={{}}

          petaIsu={{}}
          bukaRincianIsu={() => {}}
          jumlahKomentar={0}
          bolehSunting
          bolehHapus
          bolehUbahStatus
          onOpenThread={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleStatus={() => {}}
        />
      </tbody>
    </table>
  );

describe("#794 — tanggal dibuat terbaca di sel No", () => {
  it("sel No membawa title bertanggal dibuat yang terbaca", () => {
    const { container } = pasang(titik({ createdAt: "2026-10-13T02:58:00.000Z" }));
    const no = container.querySelectorAll("tbody > tr > td")[1];
    expect(no.getAttribute("title")).toContain("discussion.dibuatPada");
    const isinya = no.getAttribute("title") || "";
    // Bukan string ISO mentah: tidak ada `T` pemisah dan tidak ada `Z` zona.
    expect(isinya).not.toMatch(/T\d{2}:\d{2}/);
    expect(isinya).not.toContain("Z");
    expect(isinya).toContain("2026");
  });

  it("tanpa createdAt, tooltipnya tidak ada — bukan tanggal hari ini yang dikarang", () => {
    const { container } = pasang(titik());
    const no = container.querySelectorAll("tbody > tr > td")[1];
    expect(no.getAttribute("title")).toBeNull();
  });

  it("nomor barisnya tetap tampil di sel, tooltip hanya keterangan tambahan", () => {
    const { container } = pasang(titik({ createdAt: "2026-10-13T02:58:00.000Z" }));
    const no = container.querySelectorAll("tbody > tr > td")[1];
    expect(no.textContent).toBe("03");
  });

  it("item ini tidak menambah kolom", () => {
    const { container } = pasang(titik({ createdAt: "2026-10-13T02:58:00.000Z" }));
    // Sebelas sel = keadaan #792 dan #793. Kalau #794 nanti berubah menjadi
    // kolom kedua, angka ini jatuh dan penulisnya harus menjelaskan mengapa satu
    // nilai yang sama perlu dua tempat di layar yang sama.
    expect(container.querySelectorAll("tbody > tr > td")).toHaveLength(11);
  });
});
