/**
 * Pas-ke-layar papan flowchart — item #534 + #618.
 *
 * MENGAPA TEST INI ADA. "Setel ulang" dulu selalu kembali ke `{x:50,y:50}` dan
 * skala 0,9 tanpa melihat bentuk ada di mana (`useFlowchartCanvas.ts` lama), jadi
 * papan yang bentuknya duduk di pojok kanan-bawah "direset" menjadi LAYAR
 * KOSONG. Tombol persentase memakai angka yang sama untuk arti yang berbeda:
 * `aturZoom(1)` = 100%, `resetZoom()` = 0,9. Test ini mengunci satu sumber angka
 * dan satu aksi "lihat semua isi" dengan posisi layar yang dihitung, bukan
 * screenshot — papan ini di-zoom lewat `transform: scale()` pada DIV, sehingga
 * jsdom tidak bisa membuktikan hasil rendernya.
 */
import { hitungPasKeLayar, type Batas } from "./useFlowchartCanvas";

const KANVAS = { lebar: 800, tinggi: 600 };

/** Posisi layar satu titik papan: persis rumus wrapper `pan + skala * user`. */
const layar = (hasil: { zoom: number; pan: { x: number; y: number } }, b: Batas) => ({
  kiri: hasil.pan.x + b.x * hasil.zoom,
  kanan: hasil.pan.x + (b.x + b.width) * hasil.zoom,
  atas: hasil.pan.y + b.y * hasil.zoom,
  bawah: hasil.pan.y + (b.y + b.height) * hasil.zoom,
});

describe("hitungPasKeLayar (#534 #618)", () => {
  it("papan yang isinya di pojok kanan-bawah tetap SELURUHNYA terlihat setelah pas-ke-layar", () => {
    // Kasus yang dilaporkan: satu bentuk di sekitar (2800, 2200) pada papan 3500x2800.
    const b: Batas = { x: 2800, y: 2200, width: 140, height: 70 };
    const hasil = hitungPasKeLayar(b, KANVAS);
    const l = layar(hasil, b);

    // Isi lebih kecil daripada layar -> skala mentok batas atas 3, dan sisanya
    // dibagi rata: kiri = (800 - 140*3) / 2 = 190, atas = (600 - 70*3) / 2 = 195.
    expect(hasil.zoom).toBe(3);
    expect(l.kiri).toBeCloseTo(190, 6);
    expect(l.atas).toBeCloseTo(195, 6);
    expect(l.kanan).toBeLessThanOrEqual(KANVAS.lebar);
    expect(l.bawah).toBeLessThanOrEqual(KANVAS.tinggi);
  });

  it("lima bentuk yang tersebar muat dengan margen, dan terpusat", () => {
    // Bbox gabungan: x 100..1.600, y 80..900  -> 1.500 x 820.
    const b: Batas = { x: 100, y: 80, width: 1500, height: 820 };
    const hasil = hitungPasKeLayar(b, KANVAS);
    const l = layar(hasil, b);

    // Terbatas LEBAR: (800 - 80) / 1500 = 0,48 — lebih kecil daripada tinggi
    // (600 - 80) / 820 = 0,634, jadi inilah yang dipakai.
    expect(hasil.zoom).toBeCloseTo(720 / 1500, 6);
    expect(l.kiri).toBeCloseTo(40, 6);
    expect(l.kanan).toBeCloseTo(KANVAS.lebar - 40, 6);
    // Sisa ruang vertikal dibagi rata.
    expect(l.atas).toBeCloseTo(KANVAS.tinggi - l.bawah, 6);
  });

  it("papan kosong kembali ke keadaan awal, bukan ke titik (0,0) yang kosong", () => {
    expect(hitungPasKeLayar(null, KANVAS)).toEqual({ zoom: 0.9, pan: { x: 50, y: 50 } });
    // Ukuran kanvas belum terbaca (0) juga tidak boleh menghasilkan NaN.
    expect(
      hitungPasKeLayar({ x: 0, y: 0, width: 10, height: 10 }, { lebar: 0, tinggi: 0 }).zoom
    ).toBe(0.9);
  });

  it("skala tidak pernah keluar rentang 0,2-3 dan tidak pernah NaN", () => {
    const superLebar = hitungPasKeLayar({ x: 0, y: 0, width: 40000, height: 40000 }, KANVAS);
    expect(superLebar.zoom).toBe(0.2);
    const setitik = hitungPasKeLayar({ x: 500, y: 500, width: 0, height: 0 }, KANVAS);
    expect(setitik.zoom).toBe(3);
    expect(Number.isFinite(setitik.pan.x)).toBe(true);
    expect(Number.isNaN(setitik.pan.y)).toBe(false);
  });
});
