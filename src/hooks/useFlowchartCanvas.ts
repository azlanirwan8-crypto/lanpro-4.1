import { useState, useEffect, useRef, useCallback } from "react";
import { useTemaAplikasi } from "./useTemaAplikasi";

/**
 * useFlowchartCanvas
 * Manages canvas viewport state: pan/zoom, theme, grid snapping
 * Handles wheel zoom and pan mechanics
 */

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3.0;
const ZOOM_AWAL = 0.9;
const PAN_AWAL = { x: 50, y: 50 };

const batasZoom = (nilai: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nilai));

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
   * Pasang zoom sambil menahan satu titik layar tetap di tempatnya. `titik`
   * relatif ke pojok kiri-atas kanvas; bila kosong, tengah kanvas. Tanpa koreksi
   * geser ini, skala selalu tumbuh dari kiri-atas sehingga isi papan melompat
   * menjauh dari kursor setiap kali pengguna memperbesar.
   */
  const aturZoom = useCallback((target: number, titik?: { x: number; y: number }) => {
    const { zoom: lama, pan } = viewport.current;
    const baru = batasZoom(target);
    if (baru === lama) return;
    const el = canvasContainerRef.current;
    const acuan = titik ?? (el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : null);
    const r = baru / lama;
    const panBaru = acuan
      ? { x: acuan.x - (acuan.x - pan.x) * r, y: acuan.y - (acuan.y - pan.y) * r }
      : pan;
    setZoomLevel(baru);
    setPanOffset(panBaru);
    // Dua peristiwa gulir bisa tiba sebelum React sempat render. Tanpa nilai
    // sasaran ditulis ulang ke ref ini, peristiwa kedua masih membaca zoom lama
    // sehingga langkah pertama hilang — gulir cepat terasa "nyangkut".
    viewport.current = { zoom: baru, pan: panBaru };
  }, []);

  /** Kalikan zoom saat ini dengan `faktor`, terpotong 0.2x–3x. */
  const geserZoom = useCallback(
    (faktor: number, titik?: { x: number; y: number }) => {
      aturZoom(viewport.current.zoom * faktor, titik);
    },
    [aturZoom]
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

  // Reset zoom to default
  const resetZoom = () => {
    aturZoom(ZOOM_AWAL);
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
    startCanvasPanning,
    updatePanOffset,
    stopCanvasPanning,
    toggleGridSnap,
    resetZoom,
    resetPan,
    resetCanvas,
    applyGridSnap,
  };
}
