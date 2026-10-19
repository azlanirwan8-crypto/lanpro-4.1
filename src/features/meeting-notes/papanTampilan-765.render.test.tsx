/**
 * @jest-environment jsdom
 *
 * #765 putaran 2 — empat permintaan pemilik proyek sesudah tangkapan layar 16 Okt.
 *
 * (1) "header table harus ada desc, asc". Versi pertama papan ini menampilkan
 *     panahnya HANYA saat hover. Di layar sentuh — dan di rekaman layar — hover
 *     itu tidak ada, jadi affordancenya terbaca nol. Yang diuji: panahnya ADA di
 *     DOM dan tidak sedang disembunyikan.
 * (2) "konteks / tag yang dipilih harus mengikuti warna priority nya".
 * (3) "pic nama nya kalau bisa ikut warna jika ada" — rona yang sama dengan
 *     avatarnya, yaitu hash dari ID orang (`getUserAvatarHex` sejajar indeks
 *     dengan `getUserAvatarColors`), bukan dari namanya, supaya orang yang sama
 *     tidak berubah warna di layar yang berbeda. #769 menurunkan NADANYA: chip
 *     memakai `.label-chip` (latar 13 %, garis 34 %, teks netral) atas heksa itu,
 *     bukan blok pekat `bg-*-700` + teks putih yang ditolak pemilik proyek
 *     ("warna pic nya kasar ... harus clean dan smooth", 17 Okt).
 * (4) "paragraf nya harus rata kiri kanan".
 *
 * RENDER, bukan baca sumber, karena (1)-(3) adalah hal yang dilihat pengguna:
 * sebuah kelas bisa saja ada di berkas dan tetap tidak menghasilkan apa pun di
 * layar. jsdom memang tidak menghitung layout — jadi yang bisa dibuktikan di
 * sini adalah ELEMEN dan KELAS/STYLE-nya datang, bukan bahwa tingginya persis
 * 4 baris; itu pemeriksaan tab bersih (§15.3) di layar pemilik proyek.
 */
import React from "react";
import { render } from "@testing-library/react";
import { KepalaTabel } from "./components/BagianPapan";
import { BarisDiskusi } from "./components/BarisDiskusi";
import { DiscussionPointMobileCardView } from "./components/DiscussionPointMobileCardView";
import { getUserAvatarHex } from "../../components/ui/UserAvatar";
import type { DiscussionPoint } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "id" } }),
}));

const titik = (lebih: Partial<DiscussionPoint> = {}): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern:
      "Terkahir dari Andreas APS info ada 30 merchant yang belum berhasil dilakukan migrasi ulang",
    keterangan: "Info terkini tgl 13 Oktober 2026 sisa 30 merchant",
    tindakanLanjut: "Follow up eksekusi, identifikasi error pada 30 data",
    tags: [{ id: "i1", label: "Enhancement Onboarding" }],
    assigneeIds: ["u1", "u2"],
    status: "pending",
    authorId: "u1",
    ...lebih,
  }) as unknown as DiscussionPoint;

const TUNGGAL = { kolom: null, arah: "asc" } as const;

const pasangBaris = (warnaTag: Record<string, string> = {}) =>
  render(
    <table>
      <tbody>
        <BarisDiskusi
          p={titik()}
          nomor="01"
          assigneeName="Belum ditugaskan"
          namaPenerima={[
            { id: "u1", nama: "Azlan Irawan" },
            { id: "u2", nama: "Nabila Triana" },
          ]}
          masterData={[]}
          warnaTag={warnaTag}
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

describe("#765 — panah urutan selalu terlihat di kepala tabel", () => {
  it("enam kepala membawa penanda urutan, dan tidak satu pun disembunyikan", () => {
    const { container } = render(<KepalaTabel sortir={TUNGGAL} onSortir={() => {}} />);
    const panah = Array.from(container.querySelectorAll("thead svg"));
    // Enam kolom yang bisa diurut; tiga sisanya (Konteks/Tag, PIC, Lampiran)
    // memang tidak punya nilai tunggal di basis data untuk diurut.
    expect(panah).toHaveLength(6);
    for (const svg of panah) {
      const kelas = svg.getAttribute("class") || "";
      expect(kelas).not.toContain("opacity-0");
    }
  });

  it("SETIAP kepala sortir adalah baris flex berkapital besar — bukan button polos (#765 putaran 3)", () => {
    /* Putaran 2 hanya memasang kelas baris-flex pada kolom "No". Lima kepala
     * lainnya dirender `<button>` polos, dan karena `display` default button
     * adalah inline-block dengan lebar shrink-to-fit, panahnya jatuh ke BARIS
     * KEDUA begitu label memenuhi kolom — terukur di peramban: ikon duduk di
     * y=23,1 px dari puncak sel, bukan 15,6 px seperti yang flex. Cacat kedua
     * ikut ketahuan dari screenshot yang sama: preflight Tailwind memberi
     * `button { text-transform: none }`, jadi kepala sortir tercetak
     * "Catatan / Keterangan" sementara kepala biasa "KONTEKS / TAG" — satu
     * baris kepala dengan dua kapital. jsdom tidak menghitung layout, jadi yang
     * dikunci di sini adalah KELAS yang menghasilkan satu baris itu, untuk
     * KEENAM tombol sekaligus: tidak boleh ada yang tertinggal lagi. */
    const { container } = render(<KepalaTabel sortir={TUNGGAL} onSortir={() => {}} />);
    const tombol = Array.from(container.querySelectorAll("thead th button"));
    expect(tombol).toHaveLength(6);
    for (const b of tombol) {
      const kelas = b.getAttribute("class") || "";
      expect(kelas).toContain("flex");
      expect(kelas).toContain("items-center");
      expect(kelas).toContain("gap-1");
      expect(kelas).toContain("uppercase");
      // Panahnya anak tombol yang sama — kalau ia keluar, ia turun baris lagi.
      expect(b.querySelector("svg")).not.toBeNull();
    }
  });

  it("kolom yang sedang aktif menunjuk arahnya, bukan hanya warnanya", () => {
    const { container, rerender } = render(<KepalaTabel sortir={TUNGGAL} onSortir={() => {}} />);
    const sebelum = Array.from(container.querySelectorAll("thead svg")).map((s) =>
      s.getAttribute("class")
    );
    rerender(<KepalaTabel sortir={{ kolom: "keterangan", arah: "desc" }} onSortir={() => {}} />);
    const sesudah = Array.from(container.querySelectorAll("thead svg")).map((s) =>
      s.getAttribute("class")
    );
    // Setidaknya satu panah berubah jadi penanda aktif (primer) — dan `aria-sort`
    // pindah ke kolom yang benar.
    expect(sesudah.some((k) => (k || "").includes("text-primary"))).toBe(true);
    expect(sebelum.some((k) => (k || "").includes("text-primary"))).toBe(false);
    const kepala = Array.from(container.querySelectorAll("thead th"));
    expect(kepala[3].getAttribute("aria-sort")).toBe("descending");
  });
});

/* #792 — angka `nth-child` di bawah adalah POSISI SEL, dan ia bergeser satu
 * ke kanan karena kolom status menyisip di depan. Yang diuji tetap sama:
 * chip isu di sel kelimanya, chip PIC di sel ketujuhnya. */
describe("#765 — chip tag dan PIC berwarna", () => {
  it("chip isu memakai `label-chip` dengan hex prioritas dari pemanggil", () => {
    const { container } = pasangBaris({ i1: "#B3261E" });
    const chip = Array.from(container.querySelectorAll("tbody td:nth-child(5) span")).find((s) =>
      (s.textContent || "").includes("Enhancement Onboarding")
    ) as HTMLElement;
    expect(chip.className).toContain("label-chip");
    expect(chip.getAttribute("style")).toContain("--lbr");
    expect(chip.getAttribute("style")).toContain("#B3261E");
  });

  it("tanpa prioritas diketahui, chip jatuh ke warna merek — bukan warna acak", () => {
    const { container } = pasangBaris({});
    const chip = Array.from(container.querySelectorAll("tbody td:nth-child(5) span")).find((s) =>
      (s.textContent || "").includes("Enhancement Onboarding")
    ) as HTMLElement;
    expect(chip.className).not.toContain("label-chip");
    expect(chip.className).toContain("bg-primary/10");
    expect(chip.getAttribute("style")).toBeNull();
  });

  it("chip PIC memakai warna avatar milik ID orangnya, bukan namanya", () => {
    const { container } = pasangBaris();
    const chip = Array.from(container.querySelectorAll("tbody td:nth-child(7) span")).find((s) =>
      (s.textContent || "").includes("Nabila Triana")
    ) as HTMLElement;
    const heksa = getUserAvatarHex("u2");
    expect(chip.className).toContain("label-chip");
    expect(chip.style.getPropertyValue("--lbr")).toBe(heksa);
    // Nadanya lembut: tidak ada lagi blok pekat palet di chip PIC (#769).
    expect(chip.className).not.toMatch(/bg-[a-z]+-\d{2,3}/);
  });

  it("kartu HP berperilaku sama dengan papan (#645: satu field, satu perilaku)", () => {
    const { container } = render(
      <DiscussionPointMobileCardView
        points={[titik()]}
        projectMembers={[{ uid: "u1", displayName: "Azlan Irawan" } as any]}
        masterData={[]}
        warnaTag={{ i1: "#B3261E" }}
        onOpenThread={() => {}}
        onEditPoint={() => {}}
        onDeletePoint={() => {}}
        onToggleStatus={() => {}}
        canEdit={() => true}
        canDelete={() => true}
        canToggleStatus={() => true}
      />
    );
    const chip = Array.from(container.querySelectorAll("span")).find((s) =>
      (s.textContent || "").includes("Enhancement Onboarding")
    ) as HTMLElement;
    expect(chip.className).toContain("label-chip");
    expect(chip.getAttribute("style")).toContain("--lbr");
    const pic = Array.from(container.querySelectorAll("span")).find(
      (s) => (s.textContent || "").trim() === "Azlan Irawan"
    ) as HTMLElement;
    // #769 — kartu HP memakai chip yang LEMBUT sama seperti papan (#645: satu
    // perilaku untuk data yang sama), atas rona orang yang sama dengan avatarnya.
    expect(pic.className).toContain("label-chip");
    expect(pic.style.getPropertyValue("--lbr")).toBe(getUserAvatarHex("u1"));
    expect(pic.className).not.toMatch(/bg-[a-z]+-\d{2,3}/);
  });
});

describe("#765 — paragraf rata kiri-kanan", () => {
  it("papan menggulir setiap sel teks, dan tidak satu pun memotong teksnya (#645)", () => {
    const { container } = pasangBaris();
    const sel = container.querySelectorAll("tbody > tr > td");
    // #792 — Concern, Notes, dan Follow-up kini duduk di sel 2, 3, 5.
    for (const indeks of [2, 3, 5]) {
      const kotak = sel[indeks].querySelector("div") as HTMLElement;
      expect(kotak.className).toContain("text-justify");
      expect(kotak.className).toContain("whitespace-pre-wrap");
      expect(kotak.className).toContain("max-h-16");
      expect(kotak.className).not.toContain("line-clamp");
      expect(kotak.className).not.toContain("truncate");
    }
    // Teksnya masih utuh — justify tidak membuang satu kata pun.
    expect(sel[2].textContent).toContain("30 merchant yang belum berhasil");
  });

  it("kartu HP ikut rata kanan-kiri", () => {
    const { container } = render(
      <DiscussionPointMobileCardView
        points={[titik()]}
        projectMembers={[]}
        masterData={[]}
        warnaTag={{}}
        onOpenThread={() => {}}
        onEditPoint={() => {}}
        onDeletePoint={() => {}}
        onToggleStatus={() => {}}
        canEdit={() => true}
        canDelete={() => true}
        canToggleStatus={() => true}
      />
    );
    const kotak = Array.from(container.querySelectorAll("div")).filter((d) =>
      (d.getAttribute("class") || "").includes("text-justify")
    );
    expect(kotak.length).toBeGreaterThanOrEqual(2);
  });
});
