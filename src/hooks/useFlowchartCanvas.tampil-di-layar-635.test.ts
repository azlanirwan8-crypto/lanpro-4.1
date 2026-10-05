/**
 * Hasil tempel harus LANGSUNG terlihat — item #635.
 *
 * MENGAPA TEST INI ADA. Keluhan pemilik proyek 05 Okt, setelah menempel salinan
 * dari draw.io: "gambar sudah di paste, tapi ngak keliatan, ternyata jauh ke
 * bawah susah saya cari nya... kan harusnya seperti di miro atau di drawio,
 * jika paste langsung view tampil tanpa cari dimana dia". Papan ini di-zoom
 * lewat `transform: scale()` pada DIV, jadi jsdom tidak bisa membuktikan hasil
 * rendernya; yang bisa dikunci adalah ANGKA geseran yang dipakai untuk menulis
 * transform itu — dan itu justru seluruh isi perbaikan.
 */
import { hitungTampilDiLayar, type Batas } from "./useFlowchartCanvas";

const KANVAS = { lebar: 800, tinggi: 600 };
const LAYAR = { zoom: 0.9, pan: { x: 50, y: 50 } };

/** Posisi layar satu titik papan: persis rumus wrapper `pan + skala * user`. */
const diLayar = (hasil: { zoom: number; pan: { x: number; y: number } }, b: Batas) => ({
  kiri: hasil.pan.x + b.x * hasil.zoom,
  kanan: hasil.pan.x + (b.x + b.width) * hasil.zoom,
  atas: hasil.pan.y + b.y * hasil.zoom,
  bawah: hasil.pan.y + (b.y + b.height) * hasil.zoom,
});

describe("hitungTampilDiLayar (#635)", () => {
  it("kelompok yang mendarat jauh di bawah layar digeser sampai SELURUHNYA terlihat", () => {
    // Kasus yang dilaporkan: hasil tempel di y=2.400 sementara yang terlihat
    // hanya y 0..611 (pan.y 50, zoom 0,9).
    const b: Batas = { x: 1200, y: 2400, width: 400, height: 300 };
    const hasil = hitungTampilDiLayar(b, KANVAS, LAYAR);
    const l = diLayar(hasil, b);

    expect(l.kiri).toBeGreaterThanOrEqual(0);
    expect(l.atas).toBeGreaterThanOrEqual(0);
    expect(l.kanan).toBeLessThanOrEqual(KANVAS.lebar);
    expect(l.bawah).toBeLessThanOrEqual(KANVAS.tinggi);
  });

  it("geserannya memusatkan kelompok, dan zoom TIDAK berubah (0,9 tetap 0,9)", () => {
    const b: Batas = { x: 1200, y: 2400, width: 400, height: 300 };
    const hasil = hitungTampilDiLayar(b, KANVAS, LAYAR);
    const l = diLayar(hasil, b);

    // Kelompok muat di zoom 0,9 ((800-80)/400 = 1,8 dan (600-80)/300 = 1,733,
    // keduanya lebih besar dari 0,9), jadi #635 hanya boleh MENURUNKAN zoom —
    // tidak pernah menaikkan. Sisa ruang dibagi rata: kiri 220 = 800-580.
    expect(hasil.zoom).toBe(0.9);
    expect(hasil.pan).toEqual({ x: -860, y: -1995 });
    expect(l.kiri).toBeCloseTo(220, 6);
    expect(l.kanan).toBeCloseTo(KANVAS.lebar - 220, 6);
    expect(l.atas).toBeCloseTo(165, 6);
    expect(l.bawah).toBeCloseTo(KANVAS.tinggi - 165, 6);
  });

  it("hasil tempel yang sudah terlihat tidak menggeser apa pun", () => {
    // Tempel di bawah kursor (#626) tidak boleh membuat papan melompat.
    const b: Batas = { x: 100, y: 100, width: 200, height: 100 };
    expect(hitungTampilDiLayar(b, KANVAS, LAYAR)).toEqual({ zoom: 0.9, pan: { x: 50, y: 50 } });
  });

  it("kelompok yang lebih besar dari layar membuat zoom TURUN, bukan naik", () => {
    // (600-80)/3.000 = 0,173 -> mentok batas bawah 0,2; 0,4 tetap turun.
    const b: Batas = { x: 0, y: 5000, width: 4000, height: 3000 };
    const hasil = hitungTampilDiLayar(b, KANVAS, { zoom: 0.4, pan: { x: 0, y: 0 } });
    expect(hasil.zoom).toBe(0.2);

    // Grup yang pas-pasan: (800-80)/3.000 = 0,24, jadi 0,3 diturunkan ke 0,24.
    const pas = hitungTampilDiLayar({ x: 0, y: 0, width: 3000, height: 1000 }, KANVAS, {
      zoom: 0.3,
      pan: { x: 0, y: 0 },
    });
    expect(pas.zoom).toBeCloseTo(0.24, 6);
  });

  it("kanvas yang belum terukur tidak menggeser dan tidak menghasilkan NaN", () => {
    const b: Batas = { x: 1200, y: 2400, width: 400, height: 300 };
    const hasil = hitungTampilDiLayar(b, { lebar: 0, tinggi: 0 }, LAYAR);
    expect(hasil).toEqual({ zoom: 0.9, pan: { x: 50, y: 50 } });
    expect(Number.isFinite(hasil.pan.x)).toBe(true);
    expect(Number.isNaN(hasil.pan.y)).toBe(false);
  });
});
