/**
 * Test tween zoom diskret — item #662.
 *
 * MENGAPA TEST INI ADA. Tombol plus/minus di dock, tombol di bilah kanvas, dan
 * pintasan `+`/`-` dulu memanggil `geserZoom`, yang memasang nilai akhir dalam
 * satu frame. Papan "melompat" 11% sekaligus tanpa petunjuk ke mana ia bergerak
 * — persis keluhan di tiket. Perbaikannya adalah tween 150 ms, dan dua hal di
 * dalamnya mudah rusak tanpa terlihat:
 *
 *   1. Tween yang tidak benar-benar menghasilkan nilai antara. Bila `e` selalu
 *      1 atau frame tidak pernah dijadwalkan, papan tetap melompat dan seluruh
 *      perubahan ini tidak ada gunanya. Test "rangkaian nilai" menguncinya.
 *   2. Tween yang TIDAK menghormati `prefers-reduced-motion`. Ini bukan selera:
 *      #641 dan #642 sudah menetapkan aturannya untuk papan ini, dan animasi
 *      yang dipaksakan pada pengguna yang meminta gerak kurang adalah regresi
 *      aksesibilitas. Test "satu nilai" menguncinya.
 *
 * Roda tetikus dan cubit SENGAJA tidak ikut di-tween (peristiwa itu datang
 * puluhan kali per detik; tween di atasnya membuat papan terasa terlambat dan
 * berenang di bawah kursor). Test ketiga mengunci bahwa jalur itu tetap seketika
 * walau tween sedang tersedia — kalau suatu hari seseorang menyamakan keduanya,
 * yang rusak adalah rasa papan, dan itu tidak kelihatan di build.
 *
 * Berekstensi `.tsx` supaya masuk proyek Jest "jsdom": hook-nya memasang ref ke
 * elemen DOM.
 */
import React from "react";
import { render, act } from "@testing-library/react";
import { useFlowchartCanvas, ANIMASI_ZOOM_MS } from "./useFlowchartCanvas";

interface Terbaca {
  zoom: number;
  halus: (faktor: number) => void;
  seketika: (faktor: number) => void;
}

/**
 * Jam `requestAnimationFrame` tiruan. jsdom tidak memasangnya (Jest tidak
 * menjalankan lingkungan jsdom dengan `pretendToBeVisual`), jadi tanpa ini
 * `animasikanZoom` jatuh ke cabang cadangan "terapkan langsung" dan test tidak
 * bisa membedakan tween dari lompatan.
 *
 * Satu frame = satu `act`, supaya setiap nilai antara benar-benar di-commit dan
 * terekam. Menjalankan beberapa frame dalam satu `act` akan menggabungkan
 * render dan menyembunyikan justru hal yang diuji.
 *
 * Dipasang per test dan dilepas di `afterAll`, bukan `afterEach`: pembersihan
 * otomatis Testing Library melepas komponen SESUDAH `afterEach` berkas ini, dan
 * pelepasan itu memanggil `cancelAnimationFrame`. Menghapus globalnya lebih dulu
 * membuat pembersihan melempar ReferenceError.
 */
let antrean: Array<{ id: number; cb: FrameRequestCallback }> = [];
let idBerikutnya = 1;

const pasangRaf = () => {
  antrean = [];
  global.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = idBerikutnya++;
    antrean.push({ id, cb });
    return id;
  };
  global.cancelAnimationFrame = (id: number) => {
    antrean = antrean.filter((a) => a.id !== id);
  };
};

const lepasRaf = () => {
  delete (global as Partial<typeof global>).requestAnimationFrame;
  delete (global as Partial<typeof global>).cancelAnimationFrame;
};

/** Frame yang sedang menunggu. Lebih dari 1 berarti ada tween bertumpuk. */
const menunggu = () => antrean.length;

/** Jalankan frame berturut-turut dari `langkahMs` sampai `totalMs`. */
const majukan = (totalMs: number, langkahMs = 50) => {
  for (let kini = langkahMs; kini <= totalMs; kini += langkahMs) {
    const jalan = antrean;
    antrean = [];
    if (!jalan.length) return;
    act(() => {
      jalan.forEach((a) => a.cb(kini));
    });
  }
};

/**
 * `prefers-reduced-motion`. Stub bawaan setup.jsdom selalu `matches: false`.
 * Dipasang lewat assignment biasa, bukan `defineProperty`: stub itu didefinisikan
 * tanpa `configurable`, jadi mendefinisikannya ulang melempar TypeError.
 */
const pasangGerakKurang = (kurang: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: kurang,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

const Harness: React.FC<{ pada: (v: Terbaca) => void; dibuka: boolean }> = ({ pada, dibuka }) => {
  const c = useFlowchartCanvas();
  React.useEffect(() => {
    pada({ zoom: c.zoomLevel, halus: c.geserZoomHalus, seketika: c.geserZoom });
  });
  if (!dibuka) return null;
  return <div ref={c.pasangKanvas} data-testid="kanvas" />;
};

/**
 * Setiap `zoomLevel` yang pernah di-commit, berurutan. Inilah "rangkaian nilai"
 * yang diminta tiket: satu aksi tombol harus menghasilkan lebih dari satu.
 */
const setup = (gerakKurang = false) => {
  pasangGerakKurang(gerakKurang);

  const riwayat: number[] = [];
  let terkini: Terbaca | null = null;
  const pada = (v: Terbaca) => {
    terkini = v;
    if (riwayat[riwayat.length - 1] !== v.zoom) riwayat.push(v.zoom);
  };
  const { rerender, unmount } = render(<Harness dibuka={false} pada={pada} />);
  rerender(<Harness dibuka={true} pada={pada} />);

  const nilai = () => terkini as unknown as Terbaca;
  return {
    riwayat,
    unmount,
    get zoom() {
      return nilai().zoom;
    },
    /** Satu penekanan tombol plus/minus. Memulai rekaman baru. */
    tekanHalus(faktor: number) {
      riwayat.length = 0;
      act(() => {
        nilai().halus(faktor);
      });
    },
    tekanSeketika(faktor: number) {
      riwayat.length = 0;
      act(() => {
        nilai().seketika(faktor);
      });
    },
  };
};

const ZOOM_AWAL = 0.9;
/** Cukup jauh melewati akhir tween: 150 ms + satu langkah frame. */
const LEWAT_AKHIR = ANIMASI_ZOOM_MS + 50;

describe("useFlowchartCanvas — tween zoom diskret (#662)", () => {
  beforeEach(pasangRaf);
  afterAll(() => {
    lepasRaf();
    pasangGerakKurang(false);
  });

  it("satu aksi tombol menghasilkan RANGKAIAN nilai, lalu berhenti tepat di tujuan", () => {
    const t = setup();
    expect(t.zoom).toBe(ZOOM_AWAL);

    t.tekanHalus(1.25);
    // Menekan tombol hanya menjadwalkan frame; belum ada nilai yang dipasang.
    expect(t.riwayat).toHaveLength(0);
    expect(menunggu()).toBe(1);

    majukan(LEWAT_AKHIR);

    const tujuan = ZOOM_AWAL * 1.25;
    expect(t.riwayat.length).toBeGreaterThan(2);
    // Setiap nilai antara benar-benar DI ANTARA awal dan tujuan. Tanpa ini,
    // tween yang melompat ke akhir lalu "bergetar" tetap lulus hitungan.
    t.riwayat.slice(0, -1).forEach((z) => {
      expect(z).toBeLessThan(tujuan);
    });
    // Naik monoton: tidak ada frame yang mundur.
    for (let i = 1; i < t.riwayat.length; i++) {
      expect(t.riwayat[i]).toBeGreaterThanOrEqual(t.riwayat[i - 1]);
    }
    expect(t.zoom).toBeCloseTo(tujuan, 10);
  });

  it("tween selesai tidak meninggalkan frame yang terus berjalan", () => {
    const t = setup();
    t.tekanHalus(1.25);
    majukan(LEWAT_AKHIR);
    expect(menunggu()).toBe(0);

    const sesudah = t.zoom;
    majukan(500);
    expect(t.zoom).toBe(sesudah);
  });

  it("mode gerak-kurang menghasilkan SATU nilai, langsung ke tujuan", () => {
    const t = setup(true);

    t.tekanHalus(1.25);
    majukan(LEWAT_AKHIR);

    expect(t.riwayat).toHaveLength(1);
    expect(t.zoom).toBeCloseTo(ZOOM_AWAL * 1.25, 10);
    expect(menunggu()).toBe(0);
  });

  it("roda tetikus tetap seketika walau tween tersedia", () => {
    const t = setup();

    t.tekanSeketika(1.25);

    expect(t.riwayat).toHaveLength(1);
    expect(t.zoom).toBeCloseTo(ZOOM_AWAL * 1.25, 10);
    expect(menunggu()).toBe(0);
  });

  it("menekan tombol di tengah gerakan menghitung ulang dari posisi saat itu", () => {
    const t = setup();

    t.tekanHalus(1.25);
    // Dua frame: yang pertama hanya menandai waktu mulai, yang kedua bergerak.
    majukan(100);
    const separuh = t.zoom;
    expect(separuh).toBeGreaterThan(ZOOM_AWAL);
    expect(separuh).toBeLessThan(ZOOM_AWAL * 1.25);

    t.tekanHalus(1.25);
    // Tween lama dibatalkan, bukan diantrekan. Dua tween hidup sekaligus akan
    // saling menimpa nilai dan papan terlihat bergetar.
    expect(menunggu()).toBe(1);

    majukan(LEWAT_AKHIR);
    expect(t.zoom).toBeCloseTo(separuh * 1.25, 6);
  });

  it("unmount menghentikan loop, tidak ada frame yang jalan sesudahnya", () => {
    const t = setup();

    t.tekanHalus(1.25);
    expect(menunggu()).toBe(1);

    t.unmount();
    expect(menunggu()).toBe(0);
    // Bila pembersihan gagal, `majukan` di sini memanggil setState pada komponen
    // yang sudah dilepas dan React mencetak peringatan "not wrapped in act".
    majukan(LEWAT_AKHIR);
  });
});
