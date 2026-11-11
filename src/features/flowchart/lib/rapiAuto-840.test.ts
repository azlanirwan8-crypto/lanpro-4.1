/**
 * #840 — kunci sifat penataan otomatis, bukan kunci "rasanya rapi".
 *
 * Auto-align lama punya tiga cacat yang terukur dari kode (lihat kepala
 * `rapiAuto.ts`): level diambil dari jalur PERTAMA bukan jalur TERPANJANG,
 * urutan dalam kolom buta persilangan, dan gap 260/150 buta ukuran bentuk.
 * Test ini sengaja tidak mengunci angka kolom sebagai kebenaran tetap — yang
 * dikunci adalah HUBUNGAN antar posisi (siapa di kanan siapa, siapa di bawah
 * siapa), jarak minimum antar tepi bentuk, dan kestabilan hasil. Hubungan itu
 * tetap benar kalau konstanta jarak dinaikkan; angka mentah berubah setiap kali
 * ada yang "merapikan" spacing dan test pun menjadi tembok.
 *
 * Fungsi murni di lingkungan `node`: tanpa React, tanpa DOM, tanpa toast. Tidak
 * ada satu pun test di sini yang menyentuh FlowchartContainer.
 */
import {
  JARAK_BARIS,
  JARAK_KOLOM,
  JARAK_KOMPONEN,
  MARGIN,
  tataLetakBertingkat,
  type GarisLetak,
  type SimpulLetak,
} from "./rapiAuto";

type Kotak = { x1: number; y1: number; x2: number; y2: number };
type Posisi = { x: number; y: number };

const garis = (daftar: [string, string][]): GarisLetak[] =>
  daftar.map(([fromNodeId, toNodeId]) => ({ fromNodeId, toNodeId }));

const tata = (ids: string[], daftar: [string, string][]) =>
  tataLetakBertingkat(
    ids.map((id) => ({ id })),
    garis(daftar)
  );

const kotak = (p: Posisi, u = { width: 130, height: 70 }): Kotak => ({
  x1: p.x,
  y1: p.y,
  x2: p.x + u.width,
  y2: p.y + u.height,
});

/** true bila dua kotak saling menutupi; tepi yang bersentuhan belum termasuk */
const tindih = (a: Kotak, b: Kotak) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

const semuaKotak = (m: Map<string, Posisi>) => [...m.values()].map((p) => kotak(p));

/** tidak ada sepasang pun yang tumpang-tindih */
const tanpaTindih = (m: Map<string, Posisi>) => {
  const daftar = semuaKotak(m);
  for (let i = 0; i < daftar.length; i++)
    for (let j = i + 1; j < daftar.length; j++) expect(tindih(daftar[i], daftar[j])).toBe(false);
};

const sumbuY = (m: Map<string, Posisi>, id: string) => m.get(id)!.y + 35;

/** titik tengah satu set simpul pada sumbu Y */
const tengah = (m: Map<string, Posisi>, ids: string[]) => {
  const nilai = ids.map((id) => sumbuY(m, id));
  return (Math.min(...nilai) + Math.max(...nilai)) / 2;
};

describe("#840 — tataLetakBertingkat", () => {
  it("setiap simpul dapat posisi finite di dalam margin, dan tidak ada yang bertumpuk", () => {
    const ids = ["a", "b", "c", "d", "terasing"];
    const hasil = tata(ids, [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
    ]);
    expect(hasil.size).toBe(ids.length);
    [...hasil.values()].forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(MARGIN);
      expect(p.y).toBeGreaterThanOrEqual(MARGIN);
    });
    tanpaTindih(hasil);
  });

  it("papan kosong tidak menghasilkan posisi apa pun (bukan (0,0) palsu)", () => {
    expect(tataLetakBertingkat([], []).size).toBe(0);
  });

  it("level diambil dari jalur TERPANJANG, bukan jalur pertama yang ditemukan", () => {
    // a→b→d dan a→d. Auto-align lama menaruh d sedekat mungkin ke a, sehingga
    // garis a→d menjadi anak panah yang menunjuk ke kiri.
    const hasil = tata(
      ["a", "b", "d"],
      [
        ["a", "b"],
        ["b", "d"],
        ["a", "d"],
      ]
    );
    const x = (id: string) => hasil.get(id)!.x;
    expect(x("a")).toBe(MARGIN);
    expect(x("b")).toBeGreaterThan(x("a"));
    expect(x("d")).toBeGreaterThan(x("b"));
  });

  it("semua garis mengarah ke kanan, termasuk pada graf berlian", () => {
    const daftar: [string, string][] = [
      ["mulai", "kiri"],
      ["mulai", "kanan"],
      ["kiri", "selesai"],
      ["kanan", "selesai"],
    ];
    const hasil = tata(["mulai", "kiri", "kanan", "selesai"], daftar);
    for (const [dari, ke] of daftar) expect(hasil.get(ke)!.x).toBeGreaterThan(hasil.get(dari)!.x);
    // dua cabang duduk di kolom yang sama, terpisah minimal tinggi bentuk + JARAK_BARIS
    expect(hasil.get("kiri")!.x).toBe(hasil.get("kanan")!.x);
    expect(Math.abs(hasil.get("kiri")!.y - hasil.get("kanan")!.y)).toBeGreaterThanOrEqual(
      70 + JARAK_BARIS
    );
  });

  it("siklus tidak membuat level naik tanpa batas dan tidak menumpuk di satu titik", () => {
    const hasil = tata(
      ["p", "q", "r", "masuk"],
      [
        ["masuk", "p"],
        ["p", "q"],
        ["q", "r"],
        ["r", "p"],
      ]
    );
    const x = (id: string) => hasil.get(id)!.x;
    expect(x("p")).toBeLessThan(x("q"));
    expect(x("q")).toBeLessThan(x("r"));
    tanpaTindih(hasil);
  });

  it("jarak antar kolom diukur dari TEPI bentuk, bukan titik kiri-atas", () => {
    const hasil = tataLetakBertingkat(
      [
        { id: "besar", width: 400, height: 70 },
        { id: "kecil", width: 130, height: 70 },
        { id: "lanjut", width: 130, height: 70 },
      ],
      [
        { fromNodeId: "besar", toNodeId: "kecil" },
        { fromNodeId: "kecil", toNodeId: "lanjut" },
      ]
    );
    const a = kotak(hasil.get("besar")!, { width: 400, height: 70 });
    const b = kotak(hasil.get("kecil")!);
    const c = kotak(hasil.get("lanjut")!);
    // angka lama 260 dari titik kiri-atas meninggalkan celah 60 px di sini,
    // dan bentuk 400 lebar sudah pasti saling menindih
    expect(b.x1 - a.x2).toBeGreaterThanOrEqual(JARAK_KOLOM);
    expect(c.x1 - b.x2).toBeGreaterThanOrEqual(JARAK_KOLOM);
  });

  it("kolom yang lebih pendek ditengahkan terhadap kolom tertinggi", () => {
    const hasil = tata(
      ["a", "b", "c", "d"],
      [
        ["a", "b"],
        ["a", "c"],
        ["b", "d"],
        ["c", "d"],
      ]
    );
    expect(Math.abs(sumbuY(hasil, "a") - tengah(hasil, ["b", "c"]))).toBeLessThanOrEqual(1);
    expect(Math.abs(sumbuY(hasil, "d") - tengah(hasil, ["b", "c"]))).toBeLessThanOrEqual(1);
  });

  it("komponen yang tidak terhubung disusun ke bawah, tidak menyelinap ke kolom nol", () => {
    const hasil = tata(
      ["a", "b", "x", "y"],
      [
        ["a", "b"],
        ["x", "y"],
      ]
    );
    const a = kotak(hasil.get("a")!);
    const b = kotak(hasil.get("b")!);
    const x = kotak(hasil.get("x")!);
    const y = kotak(hasil.get("y")!);
    expect(x.y1 - a.y2).toBeGreaterThanOrEqual(JARAK_KOMPONEN);
    expect(y.y1).toBeGreaterThan(b.y2);
    expect(hasil.get("x")!.x).toBe(MARGIN);
    expect(hasil.get("y")!.x).toBeGreaterThan(hasil.get("x")!.x);
    tanpaTindih(hasil);
  });

  it("urutan dalam kolom ditekan untuk mengurangi persilangan, bukan mengikuti id", () => {
    // Tanpa simpul akar, tiga pasang n→m adalah tiga komponen terpisah dan
    // tidak ada yang bisa disilangkan. Dengan satu akar, kolom n dan kolom m
    // jadi satu graf; urutan id (m1,m2,m3) di kolom m menghasilkan DUA
    // persilangan, urutan (m3,m1,m2) menghasilkan NOL.
    const daftar: [string, string][] = [
      ["r", "n1"],
      ["r", "n2"],
      ["r", "n3"],
      ["n1", "m3"],
      ["n2", "m1"],
      ["n3", "m2"],
    ];
    const hasil = tata(["r", "n1", "n2", "n3", "m1", "m2", "m3"], daftar);
    expect(hasil.get("n1")!.x).toBe(hasil.get("n2")!.x);
    expect(hasil.get("m1")!.x).toBeGreaterThan(hasil.get("n1")!.x);
    expect(hasil.get("m3")!.y).toBeLessThan(hasil.get("m1")!.y);
    expect(hasil.get("m1")!.y).toBeLessThan(hasil.get("m2")!.y);
    // kolom n tetap mengikuti urutan akarnya, tidak diacak-acak
    expect(hasil.get("n1")!.y).toBeLessThan(hasil.get("n2")!.y);
    expect(hasil.get("n2")!.y).toBeLessThan(hasil.get("n3")!.y);
  });

  it("hasil tidak berubah bila urutan array nodes diacak", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const daftar: [string, string][] = [
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
      ["c", "d"],
      ["d", "e"],
      ["d", "f"],
    ];
    const potret = (m: Map<string, Posisi>) =>
      Object.fromEntries([...m.entries()].sort((p, q) => p[0].localeCompare(q[0])));
    const maju = tata(ids, daftar);
    expect(potret(tata([...ids].reverse(), daftar))).toEqual(potret(maju));
    expect(potret(tata(["e", "a", "f", "b", "d", "c"], daftar))).toEqual(potret(maju));
  });

  it("menata ulang papan yang sudah rapi tidak memindahkannya (idempoten)", () => {
    const nodes: SimpulLetak[] = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges: GarisLetak[] = [
      { fromNodeId: "a", toNodeId: "b" },
      { fromNodeId: "a", toNodeId: "c" },
      { fromNodeId: "b", toNodeId: "d" },
      { fromNodeId: "c", toNodeId: "d" },
    ];
    const pertama = tataLetakBertingkat(nodes, edges);
    const ditataUlang: SimpulLetak[] = nodes.map((n) => ({ ...n, ...pertama.get(n.id)! }));
    const kedua = tataLetakBertingkat(ditataUlang, edges);
    expect([...kedua.entries()].sort()).toEqual([...pertama.entries()].sort());
  });
});
