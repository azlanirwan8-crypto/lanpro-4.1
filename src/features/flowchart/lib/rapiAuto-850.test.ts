/**
 * #850 — "Rapikan Otomatis" tidak boleh membuang susunan yang sudah dibuat
 * pengguna dengan tangannya sendiri.
 *
 * GEJALA. Pemilik proyek 11 Nov 2026: papan yang sudah dirapikan masih terasa
 * berantakan, dan sebagian cabang bertukar tempat setiap kali tombolnya ditekan.
 * #840 menata papan dari NOL: urutan dalam kolom diacak menurut id, lalu heuristik
 * median diadopsi selama persilangannya TIDAK bertambah (`<=`). Pada papan yang
 * sudah disusun manusia itu dua kesalahan sekaligus — id tidak tahu apa pun tentang
 * "cabang Ya di atas, cabang Tidak di bawah", dan imbang pun median boleh menang.
 *
 * Yang dikunci di sini: seed posisi, aturan "median hanya menang kalau jumlah
 * silangnya benar-benar turun", dan batas-batasnya — papan tanpa koordinat tetap
 * disusun seperti #840, dan menyemai dari y TIDAK boleh mengubah kolom tempat
 * sebuah simpul duduk.
 */
import {
  JARAK_KOLOM,
  MARGIN,
  tataLetakBertingkat,
  type GarisLetak,
  type SimpulLetak,
} from "./rapiAuto";

const garis = (daftar: [string, string][]): GarisLetak[] =>
  daftar.map(([fromNodeId, toNodeId]) => ({ fromNodeId, toNodeId }));

const letakan = (daftar: [id: string, y?: number][], edges: [string, string][]) =>
  tataLetakBertingkat(
    daftar.map<SimpulLetak>(([id, y]) => ({ id, width: 130, height: 70, y })),
    garis(edges)
  );

describe("rapiAuto — susunan tangan pengguna disimpan (#850)", () => {
  const CABANG: [string, number | undefined][] = [
    ["awal", 200],
    ["z-ya", 100],
    ["a-tidak", 400],
  ];
  const TEPI: [string, string][] = [
    ["awal", "z-ya"],
    ["awal", "a-tidak"],
  ];

  it("cabang yang ditaruh di ATAS tetap di atas, walaupun id-nya huruf z", () => {
    const hasil = letakan(CABANG, TEPI);
    expect(hasil.get("z-ya")!.y).toBeLessThan(hasil.get("a-tidak")!.y);
  });

  it("semai posisi tidak mengubah KOLOM tiap simpul — hanya barisnya", () => {
    const hasil = letakan(CABANG, TEPI);
    // Kedua cabang duduk di kolom yang sama, apa pun tinggi tangan mereka:
    // yang boleh bergerak hanya urutan vertikal di dalam kolom itu.
    expect(hasil.get("z-ya")!.x).toBe(hasil.get("a-tidak")!.x);
    expect(hasil.get("awal")!.x).toBe(MARGIN);
    expect(hasil.get("z-ya")!.x - MARGIN).toBe(JARAK_KOLOM + 130);
  });

  it("dua simpul pada tinggi yang sama didaftar menurut id — tetap deterministik", () => {
    const hasil = letakan(
      [
        ["awal", 200],
        ["z", 150],
        ["a", 150],
      ],
      [
        ["awal", "z"],
        ["awal", "a"],
      ]
    );
    expect(hasil.get("a")!.y).toBeLessThan(hasil.get("z")!.y);
  });

  it("hasil tidak bergantung urutan array nodes", () => {
    const a = letakan(CABANG, TEPI);
    const b = tataLetakBertingkat(
      [...CABANG].reverse().map(([id, y]) => ({ id, width: 130, height: 70, y })),
      garis(TEPI)
    );
    expect(Object.fromEntries(b)).toEqual(Object.fromEntries(a));
  });

  it("papan tanpa koordinat kembali ke urutan id seperti #840", () => {
    const hasil = tataLetakBertingkat(
      [{ id: "awal" }, { id: "z-ya" }, { id: "a-tidak" }],
      garis(TEPI)
    );
    expect(hasil.get("a-tidak")!.y).toBeLessThan(hasil.get("z-ya")!.y);
  });

  it("median masih boleh menang kalau jumlah silangnya benar-benar turun", () => {
    // Pemilik papan menaruh C di atas D, tapi tepinya A→D dan B→C: susunan
    // tangan itu menghasilkan satu silang dan median menghasilkan nol.
    const hasil = letakan(
      [
        ["A", 100],
        ["B", 400],
        ["C", 100],
        ["D", 400],
      ],
      [
        ["A", "D"],
        ["B", "C"],
      ]
    );
    expect(hasil.get("D")!.y).toBeLessThan(hasil.get("C")!.y);
  });

  it("silang imbang berarti urutan tangan yang dipakai, median kalah", () => {
    // Dua ujung dari satu induk: jumlah silang 0 di kedua susunan, jadi tidak
    // ada alasan ukur untuk memindahkan apa pun yang sudah ditaruh pengguna.
    const hasil = letakan(
      [
        ["pintu", 200],
        ["z-di-atas", 100],
        ["a-di-bawah", 400],
      ],
      [
        ["pintu", "z-di-atas"],
        ["pintu", "a-di-bawah"],
      ]
    );
    expect(hasil.get("z-di-atas")!.y).toBeLessThan(hasil.get("a-di-bawah")!.y);
  });

  it("papan yang sudah rapi tidak berpindah sama sekali saat dirapikan lagi", () => {
    const pertama = letakan(CABANG, TEPI);
    const sudahDirapikan = [...pertama.entries()].map(([id, p]) => ({
      id,
      width: 130,
      height: 70,
      y: p.y,
    }));
    const kedua = tataLetakBertingkat(sudahDirapikan, garis(TEPI));
    expect(Object.fromEntries(kedua)).toEqual(Object.fromEntries(pertama));
  });
});
