/**
 * #834 — model waypoint dikecilkan supaya garis tidak lahir penuh lingkaran.
 *
 * Tiga hal dikunci di sini: waypoint manusia dirapikan (snap 5 px, kembar <4 px
 * digabung, simpangan ≤2 px dari garis lurus dibuang), sisip tekukan hanya
 * menambah SATU titik di urutan yang benar, dan geser segmen menyimpan paling
 * banyak DUA titik meskipun rutenya punya banyak belokan.
 */
import {
  indeksSegmenTerdekat,
  rapikanWaypoints,
  sisipTekukan,
  waypointsSetelahGeserSegmen,
} from "./ruteOrtogonal";
import type { Point } from "../types";

describe("#834 rapikanWaypoints", () => {
  it("menyandikan koordinat ke kisi 5 px", () => {
    expect(rapikanWaypoints([{ x: 103, y: 77 }])).toEqual([{ x: 105, y: 75 }]);
  });

  it("menggabung titik yang berjarak kurang dari 4 px", () => {
    expect(
      rapikanWaypoints([
        { x: 100, y: 100 },
        { x: 102, y: 102 },
        { x: 200, y: 100 },
      ])
    ).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]);
  });

  it("membuang titik yang menyimpang ≤2 px dari garis lurus", () => {
    expect(
      rapikanWaypoints([
        { x: 0, y: 100 },
        { x: 100, y: 101 },
        { x: 200, y: 100 },
      ])
    ).toEqual([
      { x: 0, y: 100 },
      { x: 200, y: 100 },
    ]);
  });

  it("mempertahankan belokan yang nyata", () => {
    expect(
      rapikanWaypoints([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ])
    ).toHaveLength(3);
  });

  it("diam terhadap NaN, tidak menulis titik palsu", () => {
    expect(rapikanWaypoints([{ x: NaN, y: 10 }])).toEqual([]);
  });
});

describe("#834 sisipTekukan", () => {
  const jalur: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ];

  it("menambah tepat satu titik, bukan seluruh rute", () => {
    const hasil = sisipTekukan([], { x: 50, y: 0 }, jalur);
    expect(hasil).toEqual([{ x: 50, y: 0 }]);
  });

  it("menaruh titik baru di urutan posisinya di sepanjang jalur", () => {
    const hasil = sisipTekukan([{ x: 250, y: 100 }], { x: 50, y: 0 }, jalur);
    expect(hasil).toEqual([
      { x: 50, y: 0 },
      { x: 250, y: 100 },
    ]);
  });

  it("titik lama tetap ada setelah sisip", () => {
    const hasil = sisipTekukan([{ x: 50, y: 0 }], { x: 250, y: 100 }, jalur);
    expect(hasil).toContainEqual({ x: 50, y: 0 });
    expect(hasil).toContainEqual({ x: 250, y: 100 });
  });
});

describe("#834 waypointsSetelahGeserSegmen — maksimal dua titik", () => {
  const jalur: Point[] = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 500, y: 300 },
  ];

  it("ruas tengah menyimpan dua ujungnya", () => {
    expect(waypointsSetelahGeserSegmen(jalur, 1, 25, 999)).toEqual([
      { x: 325, y: 100 },
      { x: 325, y: 300 },
    ]);
  });

  it("ruas yang menyentuh port menyimpan satu ujung", () => {
    expect(waypointsSetelahGeserSegmen(jalur, 0, 0, 40)).toEqual([{ x: 300, y: 140 }]);
    expect(waypointsSetelahGeserSegmen(jalur, 2, 0, 40)).toEqual([{ x: 300, y: 340 }]);
  });

  it("waypoint lama yang berimpit dengan ujung ruas ikut berpindah, yang lain tetap", () => {
    const lama = [{ x: 300, y: 100 }];
    const hasil = waypointsSetelahGeserSegmen(jalur, 1, 25, 0, lama);
    expect(hasil).toEqual([
      { x: 325, y: 100 },
      { x: 325, y: 300 },
    ]);
  });

  it("tidak pernah mengembalikan lebih dari dua titik", () => {
    for (let i = 0; i < jalur.length - 1; i++) {
      const hasil = waypointsSetelahGeserSegmen(jalur, i, 10, 10);
      expect(hasil === null || hasil.length <= 2).toBe(true);
    }
  });
});

describe("#834 indeksSegmenTerdekat", () => {
  it("menemukan segmen yang dilewati titik dan menolak yang jauh", () => {
    const jalur: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    expect(indeksSegmenTerdekat({ x: 50, y: 3 }, jalur, 10)).toBe(0);
    expect(indeksSegmenTerdekat({ x: 103, y: 50 }, jalur, 10)).toBe(1);
    expect(indeksSegmenTerdekat({ x: 50, y: 50 }, jalur, 10)).toBe(-1);
  });
});
