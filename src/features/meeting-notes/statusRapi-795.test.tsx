/**
 * @jest-environment jsdom
 *
 * #795 — "ini tidak rapi kondisi nya" (pemilik proyek 19 Okt, menunjuk kolom
 * STATUS hasil #792).
 *
 * Dua cacat terukur, keduanya bawaan #792:
 *
 * 1. BADGE KOMENTAR BERGESER. Terukur di peramban pada CSS hasil build lewat
 *    `scratch/harness-795-status.html`: tepi kiri badge duduk di x=76,5 px pada
 *    baris "Selesai" dan x=85,2 px pada baris "Tertunda" — 8,7 px jitter, dan
 *    12,2 px pada bahasa Inggris. Penyebabnya: badge menempel tepat setelah pil,
 *    sementara lebar PIL mengikuti panjang labelnya (54–68,9 px). Jadi yang
 *    bergerigi bukan kebetulan — ia konsekuensi langsung dari `gap-1`.
 *    Keputusan pemilik proyek: badge RATA KE TEPI KANAN sel. Tepi kanannya lalu
 *    tidak lagi bergantung pada lebar pil, dan angka yang berbeda pun ("0", "2",
 *    "12") tetap berpangkal di garis yang sama.
 *
 * 2. DUA CHIP SEBARIS TINGGINYA BEDA — pil 20,5 px, badge 22,5 px. Penyebabnya
 *    konkret: badge memakai `text-xs` (12 px) sementara pil `text-[10px]`, dan
 *    keduanya `py-1`. Ritme vertikal chip rumah sudah dibakukan #779 sebagai
 *    `CHIP_TINGGI` = `py-0.5 border rounded-md font-normal text-[10px]`, dan
 *    `ChipTanggal` memakainya dengan ikon `w-3 h-3`. #792 memindahkan kedua chip
 *    ini TANPA memeriksa ritmenya — itu kelalaian pemindahan, bukan keputusan.
 *
 * jsdom tidak menghitung layout, jadi yang dikunci di sini adalah KELAS yang
 * menghasilkan satu garis itu — pola yang sama dipakai saudara-saudaranya
 * (#765 putaran 3, #779, #786).
 */
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { BarisDiskusi } from "./components/BarisDiskusi";
import type { DiscussionPoint } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "id" } }),
}));

const AKAR = join(__dirname, "..", "..", "..");
const BERKAS = "src/features/meeting-notes/components/BarisDiskusi.tsx";

const titik = (status: "pending" | "completed"): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern: "30 merchant belum berhasil onboarding",
    status,
    authorId: "u1",
  }) as unknown as DiscussionPoint;

const pasang = (status: "pending" | "completed") =>
  render(
    <table>
      <tbody>
        <BarisDiskusi
          p={titik(status)}
          nomor="01"
          assigneeName="AZLAN IRWAN"
          namaPenerima={[{ id: "u1", nama: "AZLAN IRWAN" }]}
          masterData={[]}
          warnaTag={{}}

          petaIsu={{}}
          bukaRincianIsu={() => {}}
          jumlahKomentar={2}
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

/** Kelas pil status (span di dalam tombol) dan kelas badge komentar. */
const keduaChip = (container: HTMLElement) => {
  const sel = container.querySelectorAll("tbody > tr > td")[0];
  const pil = sel.querySelector("button span") as HTMLElement;
  const badge = sel.querySelectorAll("button")[1] as HTMLElement;
  return { sel, pil, badge };
};

describe("#795 — satu garis untuk pil status dan badge komentar", () => {
  it("badge rata ke tepi kanan sel, jadi ia tidak lagi ikut bergeser", () => {
    const { sel } = keduaChip(pasang("pending").container);
    const wadah = sel.firstElementChild as HTMLElement;
    expect(wadah.className).toContain("justify-between");
    expect(wadah.className).toContain("w-full");
  });

  it.each(["pending", "completed"] as const)(
    "kedua chip pada baris %s memakai ritme vertikal rumah #779",
    (status) => {
      const { pil, badge } = keduaChip(pasang(status).container);
      for (const kelas of [pil.className, badge.className]) {
        for (const wajib of ["py-0.5", "rounded-md", "text-[10px]", "border", "leading-none"]) {
          expect(kelas).toContain(wajib);
        }
        // Yang membuat keduanya dulu beda tinggi.
        expect(kelas).not.toMatch(/\bpy-1\b/);
        expect(kelas).not.toMatch(/\btext-xs\b/);
      }
    }
  );

  it("ikon keduanya seukuran ikon chip rumah", () => {
    const { pil, badge } = keduaChip(pasang("pending").container);
    // `ChipTanggal` (#779) memakai `w-3 h-3`; ikon yang lebih besar dari itu
    // menaikkan tinggi chip meski paddingnya sudah standar.
    for (const svg of [pil.querySelector("svg")!, badge.querySelector("svg")!]) {
      expect(svg.getAttribute("class")).toContain("w-3 h-3");
    }
  });

  it("satu-satunya sumber ritme: berkas ini tidak menulis py-1 pada chip depannya", () => {
    const isi = readFileSync(join(AKAR, BERKAS), "utf8").replace(/\r\n/g, "\n");
    const depan = isi.slice(isi.indexOf("flex w-full flex-wrap"), isi.indexOf("{/* No. */}"));
    expect(depan).not.toContain("py-1 ");
    expect(depan).not.toContain("text-xs ");
  });
});
