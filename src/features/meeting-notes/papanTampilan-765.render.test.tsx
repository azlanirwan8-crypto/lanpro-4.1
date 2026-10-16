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
 * (3) "pic nama nya kalau bisa ikut warna jika ada" — warna yang sama dengan
 *     avatarnya, yaitu hash dari ID orang (`getUserAvatarColors`), bukan dari
 *     namanya, supaya orang yang sama tidak berubah warna di layar yang berbeda.
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
import { getUserAvatarColors } from "../../components/ui/UserAvatar";
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
    expect(kepala[2].getAttribute("aria-sort")).toBe("descending");
  });
});

describe("#765 — chip tag dan PIC berwarna", () => {
  it("chip isu memakai `label-chip` dengan hex prioritas dari pemanggil", () => {
    const { container } = pasangBaris({ i1: "#B3261E" });
    const chip = Array.from(container.querySelectorAll("tbody td:nth-child(4) span")).find((s) =>
      (s.textContent || "").includes("Enhancement Onboarding")
    ) as HTMLElement;
    expect(chip.className).toContain("label-chip");
    expect(chip.getAttribute("style")).toContain("--lbr");
    expect(chip.getAttribute("style")).toContain("#B3261E");
  });

  it("tanpa prioritas diketahui, chip jatuh ke warna merek — bukan warna acak", () => {
    const { container } = pasangBaris({});
    const chip = Array.from(container.querySelectorAll("tbody td:nth-child(4) span")).find((s) =>
      (s.textContent || "").includes("Enhancement Onboarding")
    ) as HTMLElement;
    expect(chip.className).not.toContain("label-chip");
    expect(chip.className).toContain("bg-primary/10");
    expect(chip.getAttribute("style")).toBeNull();
  });

  it("chip PIC memakai warna avatar milik ID orangnya, bukan namanya", () => {
    const { container } = pasangBaris();
    const chip = Array.from(container.querySelectorAll("tbody td:nth-child(6) span")).find((s) =>
      (s.textContent || "").includes("Nabila Triana")
    ) as HTMLElement;
    const warna = getUserAvatarColors("u2");
    for (const kelas of [warna.bg, warna.text, warna.border]) {
      expect(chip.className).toContain(kelas);
    }
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
    expect(pic.className).toContain(getUserAvatarColors("u1").bg);
  });
});

describe("#765 — paragraf rata kiri-kanan", () => {
  it("papan menggulir setiap sel teks, dan tidak satu pun memotong teksnya (#645)", () => {
    const { container } = pasangBaris();
    const sel = container.querySelectorAll("tbody > tr > td");
    for (const indeks of [1, 2, 4]) {
      const kotak = sel[indeks].querySelector("div") as HTMLElement;
      expect(kotak.className).toContain("text-justify");
      expect(kotak.className).toContain("whitespace-pre-wrap");
      expect(kotak.className).toContain("max-h-16");
      expect(kotak.className).not.toContain("line-clamp");
      expect(kotak.className).not.toContain("truncate");
    }
    // Teksnya masih utuh — justify tidak membuang satu kata pun.
    expect(sel[1].textContent).toContain("30 merchant yang belum berhasil");
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
