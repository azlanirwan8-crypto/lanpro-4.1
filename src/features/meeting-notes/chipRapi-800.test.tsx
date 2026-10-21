/**
 * #800 — chip tag Poin Diskusi harus rata kiri, seragam, dan tidak menyembunyikan apa pun.
 *
 * Pemilik proyek 20 Okt, sesudah #799 mendarat: "kok label nya tidak rapi
 * begini, cek lagi harus rapi dan clean".
 *
 * AKAR PERTAMA ADALAH REGRESI SAYA SENDIRI, dan ini alasan test ini ada. #799
 * membungkus lencana dengan `<button>`. Preflight Tailwind v4 mereset box model,
 * padding, border, latar dan radius button — TETAPI TIDAK `text-align`. Center
 * bawaan peramban karena itu tetap hidup dan memusatkan teks di dalam chip:
 * makin pendek judulnya, makin jauh ia menjorok ke kanan. Itulah "tangga" pada
 * tangkapan layar.
 *
 * Terukur pada kolom 200 px (168 px isi) dengan delapan judul isu asli, memakai
 * CSS hasil build lewat `scratch/harness-800-rapi-chip.html` dan
 * `scratch/harness-800-sweep-plafon.html`:
 *   SEBELUM  text-align center · jitter tepi kiri teks 24,5 px · lima lebar
 *            chip berbeda (110,4 / 131 / 134,6 / 136,1 / 174) · selisih tepi
 *            kanan 63,6 px · sel 245,5 px
 *   SESUDAH  text-align left · jitter 0 · satu lebar (174) · selisih 0
 *
 * AKAR KEDUA sudah ada sebelum #799: `flex-wrap` pada kolom selebar 168 px.
 *
 * Yang TIDAK jadi solusi, dan dikunci di sini supaya tidak dicoba lagi: plafon
 * `max-h-16 overflow-y-auto` seperti sel prosa #708. Pernah dipasang, lalu
 * diukur — satu chip tag 14,8–44,3 px tingginya, jadi jendela 64 px hanya
 * memuat SATU dari delapan tag (146 px pun hanya tiga). Menyembunyikan tag bukan
 * kerapian; pemilik proyek memilih baris tinggi daripada tag hilang.
 */
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { BarisDiskusi } from "./components/BarisDiskusi";
import { DiscussionPointMobileCardView } from "./components/DiscussionPointMobileCardView";
import type { DiscussionPoint, Task } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "id" } }),
}));

const baca = (relatif: string) =>
  readFileSync(join(__dirname, relatif), "utf8").replace(/\r\n/g, "\n");

const ISU = { id: "i1", title: "Enhancement Onboarding", priority: "medium" } as unknown as Task;

const titik = (lebih: Partial<DiscussionPoint> = {}): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern: "Tiga puluh merchant belum dimigrasi",
    keterangan: "Sisa 30 merchant",
    tindakanLanjut: "Follow up",
    tags: [{ id: "i1", label: "Enhancement Onboarding" }],
    assigneeIds: ["u1"],
    status: "pending",
    authorId: "u1",
    ...lebih,
  }) as unknown as DiscussionPoint;

/**
 * `querySelector("button")` pada baris ini MENEMUKAN PIL STATUS lebih dulu, lalu
 * tombol utas — keduanya memang button dan keduanya punya `title`. Yang dicari
 * di sini chip tag, jadi dipilih lewat teks isinya.
 */
const tombolChip = (root: Element) =>
  [...root.querySelectorAll("button")].find((b) =>
    (b.textContent || "").includes("Enhancement Onboarding")
  ) as HTMLButtonElement | undefined;

describe("regresi text-align pada button chip (#800)", () => {
  it("button chip desktop membawa text-left, bukan mengandalkan warisan", () => {
    const { container } = render(
      <table>
        <tbody>
          <BarisDiskusi
            p={titik()}
            nomor="01"
            assigneeName="-"
            namaPenerima={[]}
            masterData={[]}
            warnaTag={{ i1: "#F59E0B" }}
            petaIsu={{ i1: ISU }}
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
    const tombol = tombolChip(container) as HTMLButtonElement;
    expect(tombol).toBeTruthy();
    expect(tombol.getAttribute("class")).toContain("text-left");
    expect(tombol.getAttribute("class")).toContain("w-full");
  });

  it("kartu HP ikut dibetulkan — bug yang sama, layar yang sama sekali berbeda", () => {
    const { container } = render(
      <DiscussionPointMobileCardView
        points={[titik()]}
        projectMembers={[]}
        masterData={[]}
        warnaTag={{ i1: "#F59E0B" }}
        petaIsu={{ i1: ISU }}
        bukaRincianIsu={() => {}}
        onOpenThread={() => {}}
        onEditPoint={() => {}}
        onDeletePoint={() => {}}
        onToggleStatus={() => {}}
        canEdit={() => true}
        canDelete={() => true}
        canToggleStatus={() => true}
      />
    );
    const tombol = tombolChip(container) as HTMLButtonElement;
    expect(tombol).toBeTruthy();
    expect(tombol.getAttribute("class")).toContain("text-left");
  });
});

describe("susunan chip desktop (#800)", () => {
  const papan = baca("components/BarisDiskusi.tsx");
  /** Potongan wilayah tag, supaya tidak mengunci kelas yang kebetulan sama di
   *  sel lain pada baris yang sama. */
  const wilayah = (() => {
    const mulai = papan.indexOf("Context / Tags");
    const akhir = papan.indexOf("{p.fitur", mulai);
    return papan.slice(mulai, akhir);
  })();

  it("satu chip per baris dan dirata-lebar, bukan flex-wrap", () => {
    expect(wilayah).toContain("flex flex-col gap-1 items-stretch");
    expect(wilayah).not.toContain("flex flex-wrap gap-1 items-center");
  });

  it("TANPA jendela gulir: plafon pernah dipasang, diukur, dan terbukti menyembunyikan 7 dari 8 tag", () => {
    expect(wilayah).not.toMatch(/max-h-\d+\s+overflow-y-auto/);
    expect(wilayah).not.toContain("overflow-y-auto");
  });
});
