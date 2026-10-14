import { useState, useEffect, useRef, useCallback } from "react";
import { useTemaAplikasi } from "./useTemaAplikasi";
import { POLA_BAWAAN, type PolaPapan } from "../features/flowchart/types";

/**
 * useFlowchartCanvas
 * Manages canvas viewport state: pan/zoom, theme, grid snapping
 * Handles wheel zoom and pan mechanics
 */

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3.0;
const ZOOM_AWAL = 0.9;
/** #534 — "100%" dan "skala awal" adalah dua hal berbeda dan dulu tertukar. */
const ZOOM_SERATUS = 1;
const PAN_AWAL = { x: 50, y: 50 };
const MARGIN_PAS = 40;

const batasZoom = (nilai: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nilai));

/**
 * #662 — lama tween untuk zoom yang dipicu tombol dan pintasan.
 *
 * 150 ms ada di tengah rentang yang diminta tiket (120-180 ms): cukup pendek
 * supaya papan tidak terasa berlumpur saat pengguna menekan tombol berulang,
 * cukup panjang supaya lompatannya terbaca sebagai gerakan. Roda tetikus dan
 * cubit SENGAJA tidak memakai ini — lihat `geserZoom` versus `geserZoomHalus`.
 */
export const ANIMASI_ZOOM_MS = 150;

const MEDIA_GERAK_KURANG = "(prefers-reduced-motion: reduce)";

const mediaGerakKurang = (): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(MEDIA_GERAK_KURANG)
    : null;

/**
 * #662(c) — `MotionConfig reducedMotion="user"` (#641) hanya memerintah
 * komponen `motion/react`; tween di berkas ini jalan lewat
 * `requestAnimationFrame` sendiri, jadi ia harus membaca preferensinya sendiri.
 */
const bacaGerakKurang = () => mediaGerakKurang()?.matches ?? false;

/** easeOutCubic: cepat di awal, tenang di akhir — terasa seperti tuas, bukan robot. */
const haluskan = (t: number) => 1 - Math.pow(1 - t, 3);

export interface Viewport {
  zoom: number;
  pan: { x: number; y: number };
}

export interface Batas {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * #635 — jaga-jaga terakhir setelah menempel: kalau `batas` sudah seluruhnya
 * muat di layar, TIDAK ADA yang berubah. Miro dan draw.io menaruh hasil tempel
 * di bawah kursor (#626 sudah memperbaikinya di papan ini), jadi geser otomatis
 * hanya boleh terjadi kalau hasilnya memang keluar layar — bukan tiap kali.
 */
function batasMuatDiLayar(
  batas: Batas,
  layar: { zoom: number; pan: { x: number; y: number }; lebar: number; tinggi: number }
): boolean {
  if (layar.lebar <= 0 || layar.tinggi <= 0) return true; // belum ada ukuran untuk dipercaya
  const kiri = layar.pan.x + batas.x * layar.zoom;
  const kanan = layar.pan.x + (batas.x + batas.width) * layar.zoom;
  const atas = layar.pan.y + batas.y * layar.zoom;
  const bawah = layar.pan.y + (batas.y + batas.height) * layar.zoom;
  return kiri >= 0 && atas >= 0 && kanan <= layar.lebar && bawah <= layar.tinggi;
}

/**
 * #534 #618 — skala dan geser supaya `batas` muat seluruhnya di kanvas.
 *
 * Ditulis sebagai fungsi murni karena papan ini di-zoom lewat `transform: scale()`
 * pada wadah DIV (`FlowchartContainer.tsx:4018`), bukan lewat viewBox SVG, jadi
 * angkanya tidak bisa diverifikasi dari render jsdom. Papan kosong (null)
 * dikembalikan ke keadaan awal, bukan ke titik (0,0) yang kosong.
 */
export function hitungPasKeLayar(
  batas: Batas | null,
  kanvas: { lebar: number; tinggi: number },
  margin: number = MARGIN_PAS
): { zoom: number; pan: { x: number; y: number } } {
  if (!batas || kanvas.lebar <= 0 || kanvas.tinggi <= 0) {
    return { zoom: ZOOM_AWAL, pan: { ...PAN_AWAL } };
  }
  const lebarIsi = Math.max(1, batas.width);
  const tinggiIsi = Math.max(1, batas.height);
  const skala = batasZoom(
    Math.min((kanvas.lebar - 2 * margin) / lebarIsi, (kanvas.tinggi - 2 * margin) / tinggiIsi)
  );
  return {
    zoom: skala,
    pan: {
      x: (kanvas.lebar - lebarIsi * skala) / 2 - batas.x * skala,
      y: (kanvas.tinggi - tinggiIsi * skala) / 2 - batas.y * skala,
    },
  };
}

/**
 * #635 #637 — geser supaya `batas` terlihat. ZOOM TIDAK PERNAH berubah: yang
 * berubah hanya ketika pengguna sendiri menekan "pas ke layar" (#618) atau
 * menggulir. Kelompok yang lebih lebar dari layar akan terpotong simetris di
 * kedua sisinya — sama seperti Miro dan Figma, yang juga tidak mengubah skala
 * orang saat menempel. Sudah muat seluruhnya = tidak ada yang berubah.
 */
export function hitungTampilDiLayar(
  batas: Batas,
  kanvas: { lebar: number; tinggi: number },
  layar: { zoom: number; pan: { x: number; y: number } }
): { zoom: number; pan: { x: number; y: number } } {
  if (kanvas.lebar <= 0 || kanvas.tinggi <= 0) {
    return { zoom: layar.zoom, pan: { ...layar.pan } };
  }
  if (batasMuatDiLayar(batas, { ...layar, ...kanvas })) {
    return { zoom: layar.zoom, pan: { ...layar.pan } };
  }
  const lebarIsi = Math.max(1, batas.width);
  const tinggiIsi = Math.max(1, batas.height);
  const skala = layar.zoom;
  return {
    zoom: skala,
    pan: {
      x: (kanvas.lebar - lebarIsi * skala) / 2 - batas.x * skala,
      y: (kanvas.tinggi - tinggiIsi * skala) / 2 - batas.y * skala,
    },
  };
}

export function useFlowchartCanvas() {
  // Canvas Viewport Pan & Zoom
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>(PAN_AWAL);
  const [zoomLevel, setZoomLevel] = useState<number>(ZOOM_AWAL);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tema papan ikut tema aplikasi (#547) — tidak ada lagi state "miro"/"blueprint"
  // yang bisa menyimpang dari terang/gelapnya aplikasi.
  const canvasTheme = useTemaAplikasi();
  const [isSnapToGrid, setIsSnapToGrid] = useState<boolean>(true);
  /**
   * #613 — pola latar dipilih pengguna per papan; warna tetap ikut tema
   * aplikasi, jadi dua hal yang dulu berkelahi (#547) tidak bersatu lagi.
   */
  const [polaPapan, setPolaPapan] = useState<PolaPapan>(POLA_BAWAAN);

  // Canvas container ref for event listeners
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);

  // Elemen kanvas disimpan DUA kali: sebagai ref (dipakai semua perhitungan
  // koordinat di pemanggil) dan sebagai state (dipakai efek di bawah sebagai
  // deps). Ref saja tidak cukup — efek hanya jalan sekali pada mount, padahal
  // kanvas baru ter-render setelah editor dibuka, jadi `container` masih null,
  // efek keluar lebih awal, dan listener wheel tidak pernah terpasang. Itulah
  // sebab papan tidak bisa di-zoom sama sekali.
  const [kanvas, setKanvas] = useState<HTMLDivElement | null>(null);
  const pasangKanvas = useCallback((el: HTMLDivElement | null) => {
    canvasContainerRef.current = el;
    setKanvas(el);
  }, []);

  // Nilai viewport terkini, dibaca oleh penangan yang dipasang sekali. Ditulis
  // pada setiap render supaya tidak membaca state basi.
  const viewport = useRef({ zoom: zoomLevel, pan: panOffset });
  viewport.current = { zoom: zoomLevel, pan: panOffset };

  /**
   * Hitung tujuan zoom+pan TANPA menerapkannya: zoom dipotong ke batasnya, lalu
   * geseran dikoreksi supaya satu titik layar tetap di tempatnya. `titik`
   * relatif ke pojok kiri-atas kanvas; bila kosong, tengah kanvas. Tanpa koreksi
   * geser ini, skala selalu tumbuh dari kiri-atas sehingga isi papan melompat
   * menjauh dari kursor setiap kali pengguna memperbesar.
   *
   * Dipisahkan dari penerapnya untuk #662: satu tujuan yang sama bisa diterapkan
   * seketika (roda tetikus, cubit) atau digerakkan (tombol, pintasan).
   * Menghitungnya dua kali akan membuat titik jangkar tween berbeda dari titik
   * jangkar hasil akhirnya, dan papan terlihat bergeser dua kali.
   */
  const tujuanZoom = useCallback((target: number, titik?: { x: number; y: number }) => {
    const { zoom: lama, pan } = viewport.current;
    const baru = batasZoom(target);
    if (baru === lama) return null;
    const el = canvasContainerRef.current;
    const acuan = titik ?? (el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : null);
    const r = baru / lama;
    const panBaru = acuan
      ? { x: acuan.x - (acuan.x - pan.x) * r, y: acuan.y - (acuan.y - pan.y) * r }
      : pan;
    return { zoom: baru, pan: panBaru };
  }, []);

  const terapkanViewport = useCallback((v: Viewport) => {
    setZoomLevel(v.zoom);
    setPanOffset(v.pan);
    // Dua peristiwa gulir bisa tiba sebelum React sempat render. Tanpa nilai
    // sasaran ditulis ulang ke ref ini, peristiwa kedua masih membaca zoom lama
    // sehingga langkah pertama hilang — gulir cepat terasa "nyangkut".
    viewport.current = v;
  }, []);

  const rafZoom = useRef<number | null>(null);

  const hentikanAnimasiZoom = useCallback(() => {
    if (rafZoom.current !== null) {
      cancelAnimationFrame(rafZoom.current);
      rafZoom.current = null;
    }
  }, []);

  // Loop yang tidak berhenti adalah kegagalan yang tidak terlihat di test: papan
  // terus berkedip sesudah tab ditutup. Tween-nya dihentikan saat unmount.
  useEffect(() => hentikanAnimasiZoom, [hentikanAnimasiZoom]);

  const gerakKurangRef = useRef<boolean>(bacaGerakKurang());

  useEffect(() => {
    const mq = mediaGerakKurang();
    if (!mq) return;
    const ubah = () => {
      gerakKurangRef.current = mq.matches;
      hentikanAnimasiZoom();
    };
    ubah();
    mq.addEventListener("change", ubah);
    return () => mq.removeEventListener("change", ubah);
  }, [hentikanAnimasiZoom]);

  /**
   * #662 — terapkan tujuan lewat tween `ANIMASI_ZOOM_MS`.
   *
   * Mode gerak-kurang melompat langsung ke nilai akhir: satu nilai, bukan
   * rangkaian. `tujuan` dihitung SEBELUM tween dimulai dan `dari` dibaca sekali
   * di awal, jadi menekan tombol dua kali di tengah gerakan menghitung ulang
   * dari posisi saat itu — tidak ada antrean tween yang saling menimpa.
   */
  const animasikanZoom = useCallback(
    (tujuan: Viewport | null) => {
      if (!tujuan) return;
      const dari = viewport.current;
      if (gerakKurangRef.current || tujuan.zoom === dari.zoom) {
        hentikanAnimasiZoom();
        terapkanViewport(tujuan);
        return;
      }
      hentikanAnimasiZoom();
      if (typeof requestAnimationFrame !== "function") {
        terapkanViewport(tujuan);
        return;
      }
      let mulai: number | null = null;
      const langkah = (kini: number) => {
        if (mulai === null) mulai = kini;
        const t = Math.min(1, (kini - mulai) / ANIMASI_ZOOM_MS);
        const e = haluskan(t);
        terapkanViewport({
          zoom: dari.zoom + (tujuan.zoom - dari.zoom) * e,
          pan: {
            x: dari.pan.x + (tujuan.pan.x - dari.pan.x) * e,
            y: dari.pan.y + (tujuan.pan.y - dari.pan.y) * e,
          },
        });
        rafZoom.current = t < 1 ? requestAnimationFrame(langkah) : null;
      };
      rafZoom.current = requestAnimationFrame(langkah);
    },
    [hentikanAnimasiZoom, terapkanViewport]
  );

  /**
   * Pasang zoom SEKETIKA. Ini jalur roda tetikus, cubit trackpad, dan seretan:
   * peristiwa itu datang bertubi-tubi puluhan kali per detik, dan tween di
   * atasnya akan terasa terlambat serta membuat papan berenang di bawah kursor.
   */
  const aturZoom = useCallback(
    (target: number, titik?: { x: number; y: number }) => {
      hentikanAnimasiZoom();
      terapkanViewport(tujuanZoom(target, titik) ?? viewport.current);
    },
    [hentikanAnimasiZoom, terapkanViewport, tujuanZoom]
  );

  /** Kalikan zoom saat ini dengan `faktor`, terpotong 0.2x–3x. Seketika. */
  const geserZoom = useCallback(
    (faktor: number, titik?: { x: number; y: number }) => {
      aturZoom(viewport.current.zoom * faktor, titik);
    },
    [aturZoom]
  );

  /**
   * #662 — `geserZoom` untuk aksi DISKRET: tombol plus/minus di dock dan di
   * bilah kanvas, serta pintasan `+`/`-`. Satu penekanan adalah satu langkah
   * yang punya awal dan akhir, jadi ia digerakkan. Jangkarnya tengah kanvas,
   * bukan kursor, karena aksi ini memang tidak punya kursor.
   */
  const geserZoomHalus = useCallback(
    (faktor: number) => {
      animasikanZoom(tujuanZoom(viewport.current.zoom * faktor));
    },
    [animasikanZoom, tujuanZoom]
  );

  // Wheel event handler for zoom and pan
  useEffect(() => {
    if (!kanvas) return;
    const container = kanvas;

    const handleWheel = (e: WheelEvent) => {
      // Prevent browser default scroll/zoom
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const titik = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (e.shiftKey) {
        // Shift + gulir = geser horizontal (Miro)
        setPanOffset((prev) => ({ x: prev.x - (e.deltaY || e.deltaX) * 0.8, y: prev.y }));
        return;
      }
      if (e.deltaX && !e.ctrlKey && !e.metaKey) {
        // Dua jari trackpad yang bergerak menyamping: geser, bukan zoom.
        setPanOffset((prev) => ({
          x: prev.x - e.deltaX * 0.8,
          y: prev.y - e.deltaY * 0.8,
        }));
        return;
      }
      // Gulir biasa, Ctrl+gulir, dan cubit trackpad = zoom ke arah kursor.
      // Faktor diekspontakan supaya satu notch mouse dan satu sapuan trackpad
      // terasa sama; deltaMode Line/Page (Firefox) dinormalkan ke piksel.
      const perPiksel = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const langkah = Math.max(-140, Math.min(140, e.deltaY * perPiksel));
      geserZoom(Math.exp(-langkah * 0.0022), titik);
    };

    // Non-passive listener to allow preventDefault
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [kanvas, geserZoom]);

  // Start canvas panning (called from mouse down handlers)
  const startCanvasPanning = (clientX: number, clientY: number) => {
    setIsPanning(true);
    isPanningRef.current = true;
    setPanStart({
      x: clientX - panOffset.x,
      y: clientY - panOffset.y,
    });
  };

  // Update pan offset during mouse move
  const updatePanOffset = (clientX: number, clientY: number) => {
    if (!isPanning) return;
    setPanOffset({
      x: clientX - panStart.x,
      y: clientY - panStart.y,
    });
  };

  // Stop canvas panning
  const stopCanvasPanning = () => {
    setIsPanning(false);
    isPanningRef.current = false;
  };

  // Toggle grid snapping
  const toggleGridSnap = () => {
    setIsSnapToGrid((prev) => !prev);
  };

  // #662 — aksi tombol, jadi digerakkan.
  const resetZoom = () => {
    animasikanZoom(tujuanZoom(ZOOM_AWAL));
  };

  // Reset pan to origin
  const resetPan = () => {
    setPanOffset(PAN_AWAL);
  };

  // Reset both zoom and pan
  const resetCanvas = () => {
    setZoomLevel(ZOOM_AWAL);
    setPanOffset(PAN_AWAL);
  };

  /**
   * #618 — padanan "zoom to fit" Miro/draw.io. `batas` dihitung pemanggil dari
   * seluruh bentuk di papan; kanvas dibaca dari ref supaya angka viewport yang
   * dipakai adalah yang sedang tampil, bukan asumsi.
   *
   * #662 — `animasi` dinyalakan HANYA oleh tombol/pintasan. Pemanggilan saat
   * diagram pertama kali dimuat membiarkannya mati: menganimasikan papan yang
   * baru terbuka berarti pengguna menonton papan menyesuaikan diri alih-alih
   * langsung melihat isinya.
   */
  const pasKeLayar = (batas: Batas | null, animasi = false) => {
    const el = canvasContainerRef.current;
    const hasil = hitungPasKeLayar(batas, {
      lebar: el?.clientWidth ?? 0,
      tinggi: el?.clientHeight ?? 0,
    });
    if (animasi) animasikanZoom(hasil);
    else {
      hentikanAnimasiZoom();
      terapkanViewport(hasil);
    }
  };

  /** #534 — tombol persentase meminta 100%, bukan skala awal. #662 — digerakkan. */
  const skalaSeratus = () => animasikanZoom(tujuanZoom(ZOOM_SERATUS));

  /**
   * #635 — menjamin `batas` terlihat setelah menempel. viewport dibaca dari REF
   * (`viewport.current`), bukan state penutup: penangan tempel bisa berasal dari
   * render sebelumnya, dan zoom/pan basi justru menghasilkan posisi yang salah.
   * Sudah muat seluruhnya = tidak ada yang diubah, jadi tempel di bawah kursor
   * (#626) tidak pernah membuat papan bergeser sendiri.
   */
  const tampilDiLayar = (batas: Batas) => {
    const el = canvasContainerRef.current;
    const kanvas = { lebar: el?.clientWidth ?? 0, tinggi: el?.clientHeight ?? 0 };
    const layar = { zoom: viewport.current.zoom, pan: { ...viewport.current.pan } };
    const hasil = hitungTampilDiLayar(batas, kanvas, layar);
    if (hasil.zoom === layar.zoom && hasil.pan.x === layar.pan.x && hasil.pan.y === layar.pan.y) {
      return; // sudah terlihat: papan tidak boleh bergeser sendiri
    }
    setZoomLevel(hasil.zoom);
    setPanOffset(hasil.pan);
    viewport.current = { zoom: hasil.zoom, pan: hasil.pan };
  };

  // Apply grid snap to coordinate
  const applyGridSnap = (value: number, gridSize: number = 10): number => {
    if (!isSnapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  return {
    // State
    panOffset,
    zoomLevel,
    isPanning,
    // Titik awal geser. Dibutuhkan pemanggil yang menangani sendiri gerak mouse
    // untuk menghitung selisih posisi.
    panStart,
    canvasTheme,
    polaPapan,
    setPolaPapan,
    isSnapToGrid,

    // Refs
    canvasContainerRef,
    isPanningRef,
    // Ref callback untuk elemen kanvas. Memasang ini, BUKAN canvasContainerRef,
    // pada JSX adalah yang membuat listener wheel ikut terpasang saat kanvas
    // muncul. canvasContainerRef tetap terisi dan tetap dipakai membaca geometri.
    pasangKanvas,

    // Setters (for external control)
    setPanOffset,
    // setIsPanning dan setPanStart sebelumnya tidak diekspor, padahal
    // FlowchartContainer men-destructure setIsPanning dan memakai panStart.
    // Akibatnya setIsPanning bernilai undefined dan panStart tidak terdefinisi,
    // sehingga menggeser kanvas melempar error saat dijalankan.
    setIsPanning,
    setPanStart,
    setIsSnapToGrid,

    // Handlers
    aturZoom,
    geserZoom,
    geserZoomHalus,
    startCanvasPanning,
    updatePanOffset,
    stopCanvasPanning,
    toggleGridSnap,
    resetZoom,
    resetPan,
    resetCanvas,
    pasKeLayar,
    tampilDiLayar,
    skalaSeratus,
    applyGridSnap,
  };
}
