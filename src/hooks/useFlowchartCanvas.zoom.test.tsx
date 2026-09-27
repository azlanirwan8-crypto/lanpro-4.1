/**
 * Test zoom papan flowchart — item #528.
 *
 * MENGAPA TEST INI ADA. Papan tidak bisa di-zoom sama sekali. Penyebabnya ada
 * di `useFlowchartCanvas`: listener `wheel` dipasang dari efek berdeps `[]`,
 * sementara kanvas baru ter-render SETELAH editor dibuka. Saat efek itu
 * berjalan ref-nya masih null, handler keluar lebih awal, dan listener tidak
 * pernah terpasang — selamanya. Test ini mengunci dua hal yang sebelumnya tidak
 * bisa dibuktikan sama sekali:
 *   1. peristiwa gulir benar-benar SAMPAI ke logika zoom;
 *   2. titik papan yang berada di bawah kursor tidak berpindah setelah zoom.
 * Yang kedua penting: zoom yang hanya mengubah angka skala membuat isi papan
 * melompat dari kiri-atas dan tetap terasa rusak.
 */
import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
import { useFlowchartCanvas } from "./useFlowchartCanvas";

interface Terbaca {
  zoom: number;
  pan: { x: number; y: number };
  geser: (faktor: number, titik?: { x: number; y: number }) => void;
}

/** Kursor selalu dianggap berada di piksel layar (200, 100) kanvas. */
const KURSOR = { x: 200, y: 100 };

const Harness: React.FC<{ pada: (v: Terbaca) => void; dibuka: boolean }> = ({ pada, dibuka }) => {
  const c = useFlowchartCanvas();
  React.useEffect(() => {
    pada({ zoom: c.zoomLevel, pan: c.panOffset, geser: c.geserZoom });
  });
  // Kanvas sengaja baru ada setelah `dibuka`, persis seperti editor aslinya:
  // `isEditorActive` baru bernilai true sesudah pengguna memilih diagram, yaitu
  // SETELAH hook dan efeknya terpasang. Tanpa fase ini bug "listener tidak
  // pernah terpasang" tidak akan pernah terlihat.
  if (!dibuka) return null;
  return <div ref={c.pasangKanvas} data-testid="kanvas" />;
};

const setup = () => {
  let terkini: Terbaca | null = null;
  const { getByTestId, rerender } = render(<Harness dibuka={false} pada={(v) => (terkini = v)} />);
  rerender(<Harness dibuka={true} pada={(v) => (terkini = v)} />);
  const el = getByTestId("kanvas") as HTMLElement;
  // jsdom menaruh kanvas di (0, 0), jadi koordinat layar = koordinat relatif.
  const gulir = (deltaY: number, opsi: Record<string, unknown> = {}) =>
    act(() => {
      fireEvent.wheel(el, { deltaY, clientX: KURSOR.x, clientY: KURSOR.y, ...opsi });
    });
  const nilai = () => terkini as unknown as Terbaca;
  return {
    get zoom() {
      return nilai().zoom;
    },
    get pan() {
      return nilai().pan;
    },
    get geser() {
      return nilai().geser;
    },
    gulir,
    el,
  };
};

/** Titik papan (ruang kanvas) yang sedang berada di bawah satu titik layar. */
const papanDi = (t: Terbaca, x: number, y: number) => ({
  x: (x - t.pan.x) / t.zoom,
  y: (y - t.pan.y) / t.zoom,
});

describe("useFlowchartCanvas — zoom papan (#528)", () => {
  it("menggulir mouse mengubah zoom (dulu: listener tidak pernah terpasang)", () => {
    const t = setup();
    expect(t.zoom).toBe(0.9);

    t.gulir(-100);
    expect(t.zoom).toBeGreaterThan(0.9);

    t.gulir(100);
    t.gulir(100);
    expect(t.zoom).toBeLessThan(0.9);
  });

  it("Ctrl+gulir dan cubit trackpad ikut memzoomkan", () => {
    const t = setup();
    t.gulir(-100, { ctrlKey: true });
    expect(t.zoom).toBeGreaterThan(0.9);
  });

  it("titik di bawah kursor tetap di tempatnya setelah zoom naik-turun", () => {
    const t = setup();
    const sebelum = papanDi(t, KURSOR.x, KURSOR.y);

    t.gulir(-100);
    t.gulir(-120);
    expect(t.zoom).not.toBe(0.9);

    const sesudah = papanDi(t, KURSOR.x, KURSOR.y);
    expect(sesudah.x).toBeCloseTo(sebelum.x, 6);
    expect(sesudah.y).toBeCloseTo(sebelum.y, 6);
  });

  it("tidak bergeser lagi ketika sudah mentok batas bawah", () => {
    const t = setup();
    for (let i = 0; i < 40; i++) t.gulir(100);
    expect(t.zoom).toBe(0.2);

    const terkunci = papanDi(t, KURSOR.x, KURSOR.y);
    for (let i = 0; i < 10; i++) t.gulir(100);
    expect(papanDi(t, KURSOR.x, KURSOR.y)).toEqual(terkunci);
  });

  it("gulir menyamping (trackpad) menggeser papan, bukan mengubah zoom", () => {
    const t = setup();
    const panSemula = { ...t.pan };
    act(() => {
      fireEvent.wheel(t.el, { deltaX: -50, deltaY: 0, clientX: KURSOR.x, clientY: KURSOR.y });
    });
    expect(t.zoom).toBe(0.9);
    expect(t.pan.x).toBeCloseTo(panSemula.x + 50 * 0.8, 6);
  });

  it("Shift+gulir menggeser papan tanpa menyentuh zoom", () => {
    const t = setup();
    const panSemula = { ...t.pan };
    t.gulir(60, { shiftKey: true });
    expect(t.zoom).toBe(0.9);
    expect(t.pan.x).toBeCloseTo(panSemula.x - 60 * 0.8, 6);
  });

  it("dua gulir berturut-turut dalam satu render keduanya terpakai", () => {
    const t = setup();
    act(() => {
      t.geser(1.25);
      t.geser(1.25);
    });
    // Tanpa nilai sasaran ditulis ulang ke ref, panggilan kedua masih membaca
    // zoom 0,9 dan langkah pertama hilang.
    expect(t.zoom).toBeCloseTo(0.9 * 1.25 * 1.25, 6);
  });

  it("tombol zoom menahan tengah kanvas, bukan pojok kiri-atas", () => {
    const t = setup();
    // jsdom memberi ukuran elemen 0, sehingga "tengah kanvas" = (0, 0).
    const tengah = papanDi(t, 0, 0);
    act(() => {
      t.geser(1.25);
    });
    expect(t.zoom).toBeCloseTo(0.9 * 1.25, 6);
    const sesudah = papanDi(t, 0, 0);
    expect(sesudah.x).toBeCloseTo(tengah.x, 6);
    expect(sesudah.y).toBeCloseTo(tengah.y, 6);
  });
});
