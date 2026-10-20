/**
 * @jest-environment jsdom
 *
 * #799 — chip "Konteks / Tag" Poin Diskusi membuka RINCIAN isunya.
 *
 * Pemilik proyek menunjuk kolom ini lewat tangkapan layar 20 Okt: "ini juga
 * linked ke issue nya bisa di klik, cek lagi". Chip-nya sudah menunjuk isu
 * NYATA sejak #703 dan sudah berona ikut prioritas isu sejak #765 — tetapi
 * tidak pernah bisa dibuka, karena Meeting Notes tidak pernah memegang objek
 * isunya: `fetchTasks` di `DiscussionPointsTable.tsx` membuang Task-nya dan
 * hanya menyisakan `{id, label, prioritas}` untuk dropdown, dan
 * `AppRoutes.tsx:281-293` tidak menyodorkan satu pun setter rincian isu ke
 * modul ini.
 *
 * Yang dikunci di bawah, berurutan sesuai risiko:
 *  (1) chip dengan isu HIDUP adalah tombol dan memanggil `bukaRincianIsu`
 *      dengan Task yang benar — bukan dengan id, bukan dengan label;
 *  (2) chip dengan isu yang SUDAH DIHAPUS tetap tampil (labelnya snapshot)
 *      tetapi TIDAK menjadi tombol. Pintu palsu lebih buruk dari tidak ada
 *      pintu: klik yang diam-diam tidak menghasilkan apa pun terbaca sebagai
 *      aplikasi yang rusak;
 *  (3) lencana `label-chip` + `--lbr` tetap di SPAN di dalam tombol, bukan
 *      pindah ke tombol. Itu kontrak #765, dan `papanTampilan-765.test.tsx`
 *      membacanya sebagai `tbody td:nth-child(5) span`.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { BarisDiskusi } from "./components/BarisDiskusi";
import { DiscussionPointMobileCardView } from "./components/DiscussionPointMobileCardView";
import type { DiscussionPoint, Task } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    // `judul` ikut dikembalikan supaya test bisa membuktikan tooltip menyebut
    // ISUNYA, bukan hanya kunci kamus.
    t: (key: string, params?: { judul?: string }) =>
      params?.judul ? `${key}:${params.judul}` : key,
    i18n: { language: "id" },
  }),
}));

const ISU = {
  id: "i1",
  key: "WMIR-162",
  title: "Enhancement Onboarding",
  priority: "medium",
} as unknown as Task;

const titik = (lebih: Partial<DiscussionPoint> = {}): DiscussionPoint =>
  ({
    id: "p1",
    meetingId: "m1",
    concern: "Tiga puluh merchant belum dimigrasi ulang",
    keterangan: "Sisa 30 merchant",
    tindakanLanjut: "Follow up eksekusi",
    tags: [{ id: "i1", label: "Enhancement Onboarding" }],
    assigneeIds: ["u1"],
    status: "pending",
    authorId: "u1",
    ...lebih,
  }) as unknown as DiscussionPoint;

const WARNA = { i1: "#F59E0B" };

const pasangBaris = (props: Record<string, unknown> = {}) => {
  const bukaRincianIsu = jest.fn();
  render(
    <table>
      <tbody>
        <BarisDiskusi
          p={titik()}
          nomor="01"
          assigneeName="Belum ditugaskan"
          namaPenerima={[{ id: "u1", nama: "Azlan Irwan" }]}
          masterData={[]}
          warnaTag={WARNA}
          petaIsu={{ i1: ISU }}
          bukaRincianIsu={bukaRincianIsu}
          jumlahKomentar={0}
          bolehSunting
          bolehHapus
          bolehUbahStatus
          onOpenThread={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleStatus={() => {}}
          {...(props as object)}
        />
      </tbody>
    </table>
  );
  return { bukaRincianIsu };
};

const pasangKartu = (props: Record<string, unknown> = {}) => {
  const bukaRincianIsu = jest.fn();
  render(
    <DiscussionPointMobileCardView
      points={[titik()]}
      projectMembers={[]}
      masterData={[]}
      warnaTag={WARNA}
      petaIsu={{ i1: ISU }}
      bukaRincianIsu={bukaRincianIsu}
      onOpenThread={() => {}}
      onEditPoint={() => {}}
      onDeletePoint={() => {}}
      onToggleStatus={() => {}}
      canEdit={() => true}
      canDelete={() => true}
      canToggleStatus={() => true}
      {...(props as object)}
    />
  );
  return { bukaRincianIsu };
};

const chip = () => screen.getByRole("button", { name: /Enhancement Onboarding/ });

describe("chip tag di baris papan (#799)", () => {
  it("isunya hidup: chipnya tombol dan membuka rincian isu ITU", () => {
    const { bukaRincianIsu } = pasangBaris();
    expect(chip().tagName).toBe("BUTTON");
    fireEvent.click(chip());
    expect(bukaRincianIsu).toHaveBeenCalledTimes(1);
    // Yang dikirim adalah TASK-nya, bukan id dan bukan label.
    expect(bukaRincianIsu).toHaveBeenCalledWith(ISU);
  });

  it("isunya sudah dihapus: chip tetap tampil, pintu TIDAK dibuat", () => {
    const { bukaRincianIsu } = pasangBaris({ petaIsu: {} });
    expect(screen.getAllByText("Enhancement Onboarding").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Enhancement Onboarding/ })).toBeNull();
    expect(bukaRincianIsu).not.toHaveBeenCalled();
  });

  it("lencana warna tetap span di DALAM tombol — kontrak #765 tidak berpindah", () => {
    pasangBaris();
    const lencana = chip().querySelector("span") as HTMLElement;
    expect(lencana.className).toContain("label-chip");
    expect(lencana.style.getPropertyValue("--lbr")).toBe("#F59E0B");
    // Tombolnya sendiri sengaja tidak membawa warna: kalau tidak, ia mewarisi
    // rona ganda dan `audit:warna` kehilangan satu-satunya tempat sumbernya.
    expect(chip().className).not.toContain("label-chip");
  });

  it("tooltipnya menyebut isu yang akan dibuka", () => {
    pasangBaris();
    expect(chip().getAttribute("title")).toBe("discussion.bukaRincianIsu:Enhancement Onboarding");
  });

  it("tanpa tag sama sekali tidak ada pintu yang menganggur", () => {
    const { bukaRincianIsu } = pasangBaris({ p: titik({ tags: [] }) });
    expect(screen.queryAllByRole("button", { name: /Enhancement Onboarding/ })).toHaveLength(0);
    expect(bukaRincianIsu).not.toHaveBeenCalled();
  });
});

describe("chip tag di kartu HP (#799)", () => {
  it("permukaan HP tidak tertinggal — pintunya sama", () => {
    const { bukaRincianIsu } = pasangKartu();
    fireEvent.click(chip());
    expect(bukaRincianIsu).toHaveBeenCalledWith(ISU);
  });

  it("isu yang sudah dihapus juga tidak jadi pintu palsu di kartu", () => {
    pasangKartu({ petaIsu: {} });
    expect(screen.queryByRole("button", { name: /Enhancement Onboarding/ })).toBeNull();
    expect(screen.getAllByText("Enhancement Onboarding").length).toBeGreaterThan(0);
  });

  it("lencananya tetap span berona prioritas", () => {
    pasangKartu();
    const lencana = chip().querySelector("span") as HTMLElement;
    expect(lencana.className).toContain("label-chip");
    expect(lencana.style.getPropertyValue("--lbr")).toBe("#F59E0B");
  });
});

describe("yang TIDAK boleh ikut jadi pintu (#799)", () => {
  /**
   * Keputusan pemilik proyek 20 Okt: hanya papan dan kartu HP. Chip di dalam
   * `PemilihJamak` adalah KONTROL FORM — ia duduk di dalam `<button>` pemicu
   * pemilih jamak, dan klik di sana berarti cabut tag. Menjadikannya pintu
   * merusak cara orang memasang tag, dan itu bukan yang diminta.
   */
  it("chip pilihan di PemilihJamak tetap kontrol form", () => {
    const pemilih = readFileSync(join(__dirname, "components/PemilihJamak.tsx"), "utf8");
    expect(pemilih).not.toContain("bukaRincianIsu");
  });

  it("dua setter rincian isu dirangkai sekali, tidak diwariskan mentah", () => {
    const pintu = readFileSync(join(__dirname, "lib/petaIsu.ts"), "utf8");
    expect(pintu).toMatch(/setSelectedTaskForDetail\(task\)/);
    expect(pintu).toMatch(/setIsTaskDetailModalOpen\(true\)/);
  });

  it("modulnya memakai daftar isu miliknya sendiri, bukan irisan paginasi store", () => {
    const papan = readFileSync(join(__dirname, "DiscussionPointsTable.tsx"), "utf8");
    expect(papan).toMatch(/setDaftarIsu\(daftar\.filter/);
    expect(papan).not.toMatch(/useAppStore\(\(s\)\s*=>\s*s\.tasks\)/);
  });
});
