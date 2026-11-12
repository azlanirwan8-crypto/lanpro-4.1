/**
 * #858 — titik tepi terdekat untuk pratinjau garis.
 *
 * Pratinjau dulu berangkat dari pusat bentuk, jadi garis bantu terlihat keluar
 * dari tengah kotak lalu melompat ke tepi saat garisnya lahir. Fungsi ini
 * memulangkan titik di PERBATASAN bentuk: proyeksi tegak lurus untuk titik di
 * luar, dan tepi terdekat untuk titik di dalam bentuk.
 */
import { titikTepiTerdekat } from "./portCabang";

const bentuk = { id: "n", x: 100, y: 50, width: 200, height: 100 };

describe("#858 titik tepi terdekat", () => {
  it("titik di luar sisi kanan menempel di tepi kanan pada tinggi titiknya", () => {
    expect(titikTepiTerdekat(bentuk, { x: 400, y: 120 })).toEqual({ x: 300, y: 120 });
  });

  it("titik di luar sisi atas menempel di tepi atas pada lebar titiknya", () => {
    expect(titikTepiTerdekat(bentuk, { x: 140, y: -30 })).toEqual({ x: 140, y: 50 });
  });

  it("titik di dalam bentuk diproyeksikan ke tepi TERDEKAT, bukan ke pusat", () => {
    expect(titikTepiTerdekat(bentuk, { x: 290, y: 110 })).toEqual({ x: 300, y: 110 });
    // (110,60) sengaja dihindari: jaraknya ke tepi kiri dan atas SAMA (10 px),
    // jadi hasilnya bergantung urutan pemeriksaan dan test-nya hanya mengunci
    // kebetulan. Di sini tepi kiri jelas lebih dekat.
    expect(titikTepiTerdekat(bentuk, { x: 105, y: 60 })).toEqual({ x: 100, y: 60 });
    expect(titikTepiTerdekat(bentuk, { x: 150, y: 145 })).toEqual({ x: 150, y: 150 });
    expect(titikTepiTerdekat(bentuk, { x: 150, y: 55 })).toEqual({ x: 150, y: 50 });
  });

  it("bentuk tanpa ukuran memakai ukuran cadangan perender yang sama", () => {
    expect(titikTepiTerdekat({ id: "m", x: 0, y: 0 }, { x: 999, y: 30 })).toEqual({
      x: 130,
      y: 30,
    });
  });
});
