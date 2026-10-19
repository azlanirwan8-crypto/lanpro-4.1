/**
 * @jest-environment jsdom
 *
 * #765 — "klik Selesai lalu isi catatan".
 *
 * Yang dikunci di sini adalah DUA HAL yang tidak bisa dibuktikan dengan membaca
 * sumber: bahwa popupnya membuka TANPA mengubah status lebih dulu (kalau tidak,
 * pengguna yang menekan Batal meninggalkan baris yang sudah selesai di layar),
 * dan bahwa kembali ke "pending" tetap satu klik — pemilik proyek meminta popup
 * untuk MENANDAI selesai, bukan untuk membalikkannya.
 *
 * Satu keputusan pemilik proyek ikut dikunci di sini: catatan BOLEH kosong
 * (16 Okt 2026). Tombol Simpan tidak boleh dimatikan ketika kotaknya kosong, dan
 * tidak boleh ada validasi yang diam-diam menambah satu langkah pada alur yang
 * sebelumnya satu klik.
 */
import React from "react";
import { render, renderHook, fireEvent, screen, act } from "@testing-library/react";
import { useSelesaiCatatan } from "./lib/selesaiCatatan";
import { ModalCatatanSelesai } from "./components/ModalCatatanSelesai";
import { BarisDiskusi } from "./components/BarisDiskusi";
import { updateDiscussionPoint } from "../../services/meetingService";
import { showSuccessAlert } from "../../lib/sweetalert";
import { suppressDiscussionPointsRefresh } from "../../lib/taskRefreshControl";
import { toast } from "sonner";
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
const mockSukses = showSuccessAlert as jest.Mock;
const mockBeku = suppressDiscussionPointsRefresh as jest.Mock;
const mockGalat = toast.error as jest.Mock;

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

const pasang = (poin: DiscussionPoint) => {
  const points: DiscussionPoint[] = [poin];
  const muatUlang = jest.fn();
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
      muatUlang,
    })
  );
  return { result, points, muatUlang };
};

beforeEach(() => {
  mockUpdate.mockReset().mockResolvedValue({ status: "success" });
  mockSukses.mockReset();
  mockBeku.mockReset();
  mockGalat.mockReset();
});

describe("#765 — memuat popup, bukan langsung menulis status", () => {
  it("poin tertunda: popup terbuka, TIDAK ADA permintaan yang dikirim", () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    expect(result.current.titik?.id).toBe("p1");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(points[0].status).toBe("pending");
  });

  it("kotak catatan terisi catatan yang SUDAH ada — entry point beda, isian sama", () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    expect(result.current.catatan).toBe("Sudah ditelepon dua kali");
  });

  it("Batal menutup popup tanpa menulis apa pun", () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    act(() => result.current.batal());
    expect(result.current.titik).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("poin selesai: kembali ke pending tetap SATU klik dan tidak menyentuh keterangan", async () => {
    const { result, points } = pasang(titik({ status: "completed" }));
    await act(async () => {
      result.current.tekanStatus(points[0]);
    });
    expect(result.current.titik).toBeNull();
    /* #793 — `expect.objectContaining`, bukan objek utuh. Yang dijaga item ini
     * adalah DUA HAL: status ditulis, dan keterangan TIDAK ikut terkirim ketika
     * jalurnya memang tidak menyentuh catatan. Kolom mana lagi yang menumpang
     * pada permintaan itu bukan urusan #765 — dan `tanggalUpdateStatus` sekarang
     * menumpang, dijaga di `tanggalDone-793.test.tsx`. Mengunci objek utuh di
     * sini hanya akan membuat setiap kolom baru menyalakan test yang salah. */
    expect(mockUpdate).toHaveBeenCalledWith(
      "pr-1",
      "m1",
      "p1",
      expect.objectContaining({ status: "pending" }),
      "u1"
    );
    expect(JSON.stringify(mockUpdate.mock.calls[0][3])).not.toContain("keterangan");
  });
});

describe("#765 — menyimpan", () => {
  it("Simpan mengirim status + keterangan, lalu menutup popup", async () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    act(() => result.current.ubahCatatan("Onboarding 12 merchant selesai hari ini"));
    await act(async () => {
      await result.current.simpan();
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      "pr-1",
      "m1",
      "p1",
      expect.objectContaining({
        status: "completed",
        keterangan: "Onboarding 12 merchant selesai hari ini",
      }),
      "u1"
    );
    expect(result.current.titik).toBeNull();
    expect(points[0].status).toBe("completed");
    expect(points[0].keterangan).toBe("Onboarding 12 merchant selesai hari ini");
    expect(mockSukses).toHaveBeenCalled();
  });

  it("catatan boleh kosong — keputusan pemilik proyek 16 Okt 2026", async () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    act(() => result.current.ubahCatatan(""));
    await act(async () => {
      await result.current.simpan();
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      "pr-1",
      "m1",
      "p1",
      expect.objectContaining({ status: "completed", keterangan: "" }),
      "u1"
    );
  });

  it("jendela socket dibekukan selama aksi, seperti mutasi papan lainnya (#711)", async () => {
    const { result, points } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    await act(async () => {
      await result.current.simpan();
    });
    expect(mockBeku).toHaveBeenCalledWith(8000);
  });

  it("server menolak: status DAN catatan kembali, papan dimuat ulang, popup tetap terbuka", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("403"));
    const { result, points, muatUlang } = pasang(titik());
    act(() => result.current.tekanStatus(points[0]));
    act(() => result.current.ubahCatatan("tertulis di layar yang tidak boleh hilang"));
    await act(async () => {
      await result.current.simpan();
    });
    expect(points[0].status).toBe("pending");
    expect(points[0].keterangan).toBe("Sudah ditelepon dua kali");
    expect(muatUlang).toHaveBeenCalled();
    expect(mockGalat).toHaveBeenCalled();
    expect(mockSukses).not.toHaveBeenCalled();
    // Yang diketik masih ada di kotak dan popupnya belum menutup — menolak
    // berarti mengirim ulang, bukan mengetik ulang.
    expect(result.current.titik?.id).toBe("p1");
    expect(result.current.catatan).toBe("tertulis di layar yang tidak boleh hilang");
  });
});

describe("#765 — popupnya sendiri", () => {
  const pasangModal = (props: Partial<React.ComponentProps<typeof ModalCatatanSelesai>> = {}) =>
    render(
      <ModalCatatanSelesai
        concern="30 merchant belum berhasil onboarding"
        catatan="Sudah ditelepon dua kali"
        onCatatan={() => {}}
        onSimpan={() => {}}
        onBatal={() => {}}
        mengirim={false}
        {...props}
      />
    );

  it("satu isian, terisi catatan lama, dan aksinya disebut dengan jelas", () => {
    const onSimpan = jest.fn();
    pasangModal({ onSimpan });
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByDisplayValue("Sudah ditelepon dua kali")).not.toBeNull();
    expect(screen.getByText("30 merchant belum berhasil onboarding")).not.toBeNull();
    fireEvent.click(screen.getByText("discussion.simpanSelesai"));
    expect(onSimpan).toHaveBeenCalled();
  });

  it("kosong tidak membuat Simpan mati", () => {
    pasangModal({ catatan: "" });
    const tombol = screen.getByText("discussion.simpanSelesai").closest("button");
    expect(tombol?.disabled).toBe(false);
  });

  it("menulis di kotak memanggil `onCatatan`, dan Batal dipaskan ke penangan induk", () => {
    const onCatatan = jest.fn();
    const onBatal = jest.fn();
    pasangModal({ onCatatan, onBatal });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "draf" } });
    expect(onCatatan).toHaveBeenCalledWith("draf");
    fireEvent.click(screen.getByText("discussion.cancel"));
    expect(onBatal).toHaveBeenCalled();
  });
});

describe("#765 — pil status desktop sekarang digerbangi izin", () => {
  /**
   * Sebelah sini dari #765, baris desktop merender pil status TANPA pemeriksaan
   * apa pun: pengguna read-only bisa mengkliknya, melihat statusnya berubah di
   * layar, lalu melihatnya berubah kembali ketika papan dimuat ulang setelah
   * server menjawab 403 — dan satu permintaan tulis yang pasti ditolak meluncur
   * ke server. Kartu HP justru sudah digerbangi (oleh `canAdd`, izin yang salah
   * untuk alasan yang benar). Yang diuji di sini: pil tanpa izin tidak bisa
   * menekan apa pun, dan tetap terbaca sebagai status.
   */
  const pasangBaris = (bolehUbahStatus: boolean) => {
    const onToggleStatus = jest.fn();
    const { container } = render(
      <table>
        <tbody>
          <BarisDiskusi
            p={titik()}
            nomor="01"
            assigneeName="AZLAN IRWAN"
            namaPenerima={[{ id: "u1", nama: "AZLAN IRWAN" }]}
            masterData={[]}
            warnaTag={{}}
            jumlahKomentar={0}
            bolehSunting={bolehUbahStatus}
            bolehHapus={bolehUbahStatus}
            bolehUbahStatus={bolehUbahStatus}
            onOpenThread={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            onToggleStatus={onToggleStatus}
          />
        </tbody>
      </table>
    );
    return { container, onToggleStatus };
  };

  it("tanpa izin: pil disabled, dan klik tidak memanggil apa pun", () => {
    const { container, onToggleStatus } = pasangBaris(false);
    const pil = container.querySelector(
      "button[title='discussion.toggleStatus']"
    ) as HTMLButtonElement | null;
    expect(pil).not.toBeNull();
    expect(pil?.disabled).toBe(true);
    fireEvent.click(pil as HTMLButtonElement);
    expect(onToggleStatus).not.toHaveBeenCalled();
    expect(pil?.textContent).toContain("discussion.statusPending");
  });

  it("dengan izin: pil tetap satu klik seperti sebelumnya (#714 tidak dicabut)", () => {
    const { container, onToggleStatus } = pasangBaris(true);
    const pil = container.querySelector(
      "button[title='discussion.toggleStatus']"
    ) as HTMLButtonElement | null;
    expect(pil?.disabled).toBe(false);
    fireEvent.click(pil as HTMLButtonElement);
    expect(onToggleStatus).toHaveBeenCalled();
  });
});
