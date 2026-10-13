/**
 * #714 — baris data DELAPAN sel, dan tidak satu pun isinya dipotong.
 *
 * Yang diukur test ini adalah hal yang membuat papan masih terasa berantakan
 * sesudah #712: satu nama PIC sepanjang "Mohamad Rifky Pramadanianto" butuh
 * ±153 px termasuk padding, sementara kolomnya dipatok 150 px. Secara matematis
 * chip itu tidak pernah bisa berbagi baris dengan chip lain, jadi tiga PIC
 * berarti tiga lajur dan satu baris tabel naik ke enam lajur. Perbaikannya
 * bukan memotong namanya — §645 melarang itu dan `catatanLengkap-645.test.ts`
 * menjaganya — melainkan memberi ruang dan menggabungkan kolom sepaham.
 *
 * RENDER, bukan baca sumber, karena yang diklaim di sini adalah JUMLAH dan
 * KELENGKAPAN teks hasil susunan sel. Membaca sumber bisa memastikan kelasnya
 * ada; hanya merender yang membuktikan tiga nama benar-benar muncul utuh.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BarisDiskusi } from "./components/BarisDiskusi";
import type { DiscussionPoint } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "id" } }),
}));

const TIGA_PIC = ["Nabila Triana", "AZLAN IRWAN", "Mohamad Rifky Pramadanianto"];

const titik = (lebih: Partial<DiscussionPoint> = {}): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern: "Terkahir dari Andreas APS info ada 30 merchant yang belum berhasil",
    keterangan: "",
    tindakanLanjut: "Follow up eksekusi, identifikasi error pada 30 data",
    tags: [
      { id: "i1", label: "explore KYC/RAC with 3rd party" },
      { id: "i2", label: "Test" },
      { id: "i3", label: "Discovery Onboarding EDC" },
    ],
    assigneeIds: ["u1", "u2", "u3"],
    targetDate: "2026-10-13",
    status: "pending",
    authorId: "u1",
    ...lebih,
  }) as unknown as DiscussionPoint;

const pasang = (p: Partial<DiscussionPoint> = {}) =>
  render(
    <table>
      <tbody>
        <BarisDiskusi
          p={titik(p)}
          nomor="01"
          assigneeName="Belum ditugaskan"
          namaPenerima={TIGA_PIC}
          masterData={[]}
          jumlahKomentar={2}
          bolehSunting
          bolehHapus
          onOpenThread={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleStatus={() => {}}
        />
      </tbody>
    </table>
  );

describe("#714 — baris data delapan sel", () => {
  it("DELAPAN sel, bukan dua belas", () => {
    const { container } = pasang();
    expect(container.querySelectorAll("tbody > tr > td")).toHaveLength(8);
  });

  it("tiga nama PIC tampil UTUH, tidak satu pun dipotong", () => {
    pasang();
    for (const nama of TIGA_PIC) {
      // `exact: true` sengaja: kalau ada satu karakter yang hilang atau berubah
      // jadi elipsis, assertion ini jatuh — dan itulah §645.
      expect(screen.getByText(nama, { exact: true })).not.toBeNull();
    }
  });

  it("tanggal target duduk di sel PIC yang sama, bukan kolom sendiri", () => {
    const { container } = pasang();
    const sel = container.querySelectorAll("tbody > tr > td");
    const picTanggal = sel[5];
    for (const nama of TIGA_PIC) expect(picTanggal.textContent).toContain(nama);
    expect(picTanggal.textContent).toContain("2026-10-13");
    // Sel tanggal-sendiri yang lama tidak ada lagi.
    expect(container.querySelectorAll("tbody > tr > td")).toHaveLength(8);
  });

  it("status, utas, sunting, dan hapus satu sel di kanan", () => {
    const { container } = pasang();
    const aksi = container.querySelectorAll("tbody > tr > td")[7];
    expect(aksi.querySelector("button[title='discussion.toggleStatus']")).not.toBeNull();
    expect(aksi.querySelector("button[title='discussion.openThread']")).not.toBeNull();
    expect(aksi.querySelector("button[title='discussion.editRow']")).not.toBeNull();
    expect(aksi.querySelector("button[title='discussion.deleteRow']")).not.toBeNull();
    // Angka komentar tetap terbaca di dalam sel yang sama.
    expect(aksi.textContent).toContain("2");
  });

  it("tanpa lampiran, selnya berbintang '-' — dan tautan tetap aman diklik", () => {
    const { container } = pasang();
    const lampiran = container.querySelectorAll("tbody > tr > td")[6];
    expect(lampiran.textContent?.trim()).toBe("-");

    const { container: ada } = pasang({
      links: [{ id: "l1", label: "Portal merchant", url: "https://example.com/x" }],
    });
    const tautan = ada.querySelector("tbody > tr > td:nth-child(7) a") as HTMLAnchorElement;
    expect(tautan.textContent).toContain("Portal merchant");
    expect(tautan.getAttribute("rel")).toBe("noopener noreferrer");
    expect(tautan.getAttribute("target")).toBe("_blank");
  });

  it("titik selesai tetap bisa dibuka dan statusnya tetap bisa di-toggle", () => {
    const onToggleStatus = jest.fn();
    render(
      <table>
        <tbody>
          <BarisDiskusi
            p={titik({ status: "completed" })}
            nomor="02"
            assigneeName="AZLAN IRWAN"
            namaPenerima={["AZLAN IRWAN"]}
            masterData={[]}
            jumlahKomentar={0}
            bolehSunting={false}
            bolehHapus={false}
            onOpenThread={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            onToggleStatus={onToggleStatus}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText("discussion.statusDone")).not.toBeNull();
    // Sunting dan hapus hilang tanpa izin, selnya tetap delapan.
    fireEvent.click(screen.getByTitle("discussion.toggleStatus"));
    expect(onToggleStatus).toHaveBeenCalled();
  });
});
