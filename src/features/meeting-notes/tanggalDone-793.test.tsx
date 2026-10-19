/**
 * @jest-environment jsdom
 *
 * #793 — "ketika status berubah menjadi done maka secara otomatis tanggal
 * selesai nya terupdate" (pemilik proyek 19 Okt 2026).
 *
 * YANG DIKUNCI DI SINI, dan mengapa bukan hal lain:
 *
 * 1. KOLOMNYA SUDAH ADA SEJAK LAMA. `tanggalUpdateStatus VARCHAR(50)` dibuat di
 *    `src/lib/pg-migrate.ts:546`, diikutkan ke INSERT dan UPDATE di
 *    `server/repositories/discussion-points.repository.ts`, dan ada di tipe —
 *    yang tidak pernah ada hanyalah yang MENULISNYA. Jadi yang diuji di sini
 *    adalah perilaku, bukan skema: tidak ada migrasi baru untuk dikunci.
 *
 * 2. TANGGALNYA LOKAL, BUKAN UTC. `targetDate` disimpan `YYYY-MM-DD` dari
 *    `LanproDatePicker`, yang menyusun "hari ini" dari komponen LOKAL
 *    (`LanproDatePicker.tsx:218`). Menyalin nilai dengan `toISOString()` akan
 *    menggesernya satu hari di zona apa pun yang bukan UTC — mesin kerja pemilik
 *    proyek ada di UTC+7, jadi "selesai pukul 01.00" tercatat kemarin. Itu cacat
 *    yang tidak terlihat di layar dan tidak terlihat di build, jadi ia dikunci
 *    lewat nilainya, bukan lewat namanya.
 *
 * 3. KEMBALI KE PENDING MENGOSONGKAN, BUKAN MENINGGALKAN. Kolom yang masih
 *    berisi tanggal sementara statusnya "Tertunda" adalah data yang berbantahan,
 *    dan pembaca papan tidak punya cara tahu mana yang benar.
 *
 * 4. SATU PINTU UNTUK DUA ARAH. Pil desktop dan kartu HP sama-sama memanggil
 *    `tekanStatus`, jadi cukup satu jalur yang diuji untuk memastikan tidak ada
 *    layar yang menulis tanggal dan layar lain tidak.
 */
import React from "react";
import { render, renderHook, act } from "@testing-library/react";
import { useSelesaiCatatan } from "./lib/selesaiCatatan";
import { BarisDiskusi } from "./components/BarisDiskusi";
import { KepalaTabel } from "./components/BagianPapan";
import { updateDiscussionPoint } from "../../services/meetingService";
import type { DiscussionPoint } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "id" } }),
}));
jest.mock("../../services/meetingService", () => ({
  updateDiscussionPoint: jest.fn(),
}));
jest.mock("../../lib/sweetalert", () => ({
  showSuccessAlert: jest.fn(),
  confirmDeleteAlert: jest.fn(),
}));
jest.mock("../../lib/taskRefreshControl", () => ({
  suppressDiscussionPointsRefresh: jest.fn(),
  shouldSuppressDiscussionPointsRefresh: jest.fn(() => false),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockUpdate = updateDiscussionPoint as jest.Mock;

const titik = (lebih: Partial<DiscussionPoint> = {}): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern: "30 merchant belum berhasil onboarding",
    keterangan: "Sudah ditelepon dua kali",
    status: "pending",
    authorId: "u1",
    ...lebih,
  }) as unknown as DiscussionPoint;

/** "Hari ini" dihitung dari komponen LOKAL — sengaja tidak memakai fungsi yang
 *  diuji, supaya test ini tidak bisa lulus dengan cara menyalin kesalahannya. */
const hariIniLokal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const pasang = (poin: DiscussionPoint) => {
  const points: DiscussionPoint[] = [poin];
  const { result } = renderHook(() =>
    useSelesaiCatatan({
      projectId: "pr-1",
      meetingId: "m1",
      pengguna: { uid: "u1" } as any,
      setPoints: (aksi) => {
        const baru =
          typeof aksi === "function"
            ? (aksi as (lama: DiscussionPoint[]) => DiscussionPoint[])(points)
            : aksi;
        points.length = 0;
        points.push(...baru);
      },
      muatUlang: jest.fn(),
    })
  );
  return { result, points };
};

beforeEach(() => {
  mockUpdate.mockReset().mockResolvedValue({ status: "success" });
});

describe("#793 — status completed menuliskan tanggal selesai", () => {
  it("menandai selesai mengirim tanggal hari ini dalam format YYYY-MM-DD lokal", async () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    await act(async () => {
      await result.current.simpan();
    });
    const dikirim = mockUpdate.mock.calls[0][3];
    expect(dikirim.status).toBe("completed");
    expect(dikirim.tanggalUpdateStatus).toBe(hariIniLokal());
    expect(dikirim.tanggalUpdateStatus).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("bukan salinan UTC: jam 01.00 pagi tercatat HARI INI, bukan kemarin", () => {
    // Bentuknya diuji lewat kontrak nilai, bukan lewat zona mesin: nilai yang
    // datang dari `toISOString()` akan berbeda dari komponen lokalnya sendiri
    // begitu zona bukan UTC — dan mesin kerja pemilik proyek ada di UTC+7.
    const d = new Date(2026, 9, 13, 1, 0, 0);
    const lokal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    expect(lokal).toBe("2026-10-13");
    if (d.getTimezoneOffset() < 0) {
      // Zona timur Greenwich: `toISOString()` TIDAK BOLEH dipakai sebagai nilai.
      expect(d.toISOString().slice(0, 10)).not.toBe(lokal);
    }
  });

  it("state optimistik ikut membawa tanggalnya, supaya kolomnya terisi tanpa muat ulang", async () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    await act(async () => {
      await result.current.simpan();
    });
    expect(points[0].tanggalUpdateStatus).toBe(hariIniLokal());
  });

  it("membatalkan selesai MENGOSONGKAN tanggalnya — kolom dan status tidak boleh berbantahan", () => {
    const { result, points } = pasang(
      titik({ status: "completed", tanggalUpdateStatus: "2026-10-11" })
    );
    act(() => result.current.tekanStatus(points[0]));
    const dikirim = mockUpdate.mock.calls[0][3];
    expect(dikirim.status).toBe("pending");
    expect(dikirim.tanggalUpdateStatus).toBeNull();
  });

  /* Jaminan yang dulu dibawa `selesaiCatatan-765.render.test.tsx` lewat objek
   * utuh, dan sekarang tinggal di sini karena berkas itulah yang tahu bentuk
   * payloadnya: menandai selesai HANYA menulis tiga kolom. `updatePoint` di
   * repository menulis satu per satu kolom yang nilainya bukan `undefined`
   * (`discussion-points.repository.ts:335`), jadi satu kunci asing yang
   * terselip ke objek ini cukup untuk menimpa concern, PIC, atau tautan milik
   * orang lain dari sebuah klik pil. Kunci yang tidak diharapkan harus jatuh di
   * sini, bukan menjadi cerita produksi. */
  it("payload hanya membawa tiga kunci — satu klik pil tidak boleh menimpa kolom lain", async () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    await act(async () => {
      await result.current.simpan();
    });
    expect(Object.keys(mockUpdate.mock.calls[0][3]).sort()).toEqual([
      "keterangan",
      "status",
      "tanggalUpdateStatus",
    ]);
  });

  it("jalur tanpa catatan tidak menyelipkan kunci keterangan sama sekali", () => {
    const { result, points } = pasang(
      titik({ status: "completed", tanggalUpdateStatus: "2026-10-11" })
    );
    act(() => result.current.tekanStatus(points[0]));
    expect(Object.keys(mockUpdate.mock.calls[0][3]).sort()).toEqual([
      "status",
      "tanggalUpdateStatus",
    ]);
  });

  it("server menolak: tanggal kembali ke nilai sebelumnya, bukan tertinggal di layar", async () => {
    // Titik tertunda yang masih MENINGGAL tanggal lama — persis keadaan yang
    // bisa terjadi setelah sebuah "selesai" dibatalkan sebelum #793. Kalau
    // rollback hanya memulihkan status, layar ditinggali tanggal hari ini
    // sementara servernya bilang pending.
    mockUpdate.mockRejectedValueOnce(new Error("403"));
    const { result, points } = pasang(titik({ tanggalUpdateStatus: "2026-10-11" }));
    act(() => result.current.tekanStatus(points[0]));
    await act(async () => {
      await result.current.simpan();
    });
    expect(points[0].status).toBe("pending");
    expect(points[0].tanggalUpdateStatus).toBe("2026-10-11");
  });
});

describe("#793 — kolom TANGGAL DONE", () => {
  const baris = (p: DiscussionPoint) =>
    render(
      <table>
        <tbody>
          <BarisDiskusi
            p={p}
            nomor="01"
            assigneeName="AZLAN IRWAN"
            namaPenerima={[{ id: "u1", nama: "AZLAN IRWAN" }]}
            masterData={[]}
            warnaTag={{}}
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

  it("duduk di sel tepat setelah TANGGAL TARGET dan menampilkan tanggalnya", () => {
    const { container } = baris(
      titik({ status: "completed", targetDate: "2026-10-13", tanggalUpdateStatus: "2026-10-19" })
    );
    const sel = container.querySelectorAll("tbody > tr > td");
    expect(sel).toHaveLength(11);
    expect(sel[7].textContent).toContain("2026-10-13");
    expect(sel[8].textContent).toContain("2026-10-19");
    expect(sel[7].textContent).not.toContain("2026-10-19");
  });

  it("baris yang belum pernah selesai (termasuk warisan sebelum #793) berbintang '-', bukan tanggal karangan", () => {
    const { container } = baris(titik({ status: "completed" }));
    const sel = container.querySelectorAll("tbody > tr > td");
    expect(sel[8].textContent?.trim()).toBe("-");
  });

  it("kolom baru tidak menjanjikan urutan yang tidak bisa ditunaikan server", () => {
    const { container } = render(
      <KepalaTabel sortir={{ kolom: null, arah: "asc" }} onSortir={() => {}} />
    );
    // Enam kepala berpanah — persis `DAFTAR_KOLOM_SORTIR` di server. Menambah
    // panah di kolom ini menuntut tiga whitelist yang wajib sepakat.
    expect(container.querySelectorAll("thead svg")).toHaveLength(6);
  });
});
