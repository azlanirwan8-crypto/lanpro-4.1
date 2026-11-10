/**
 * Perutean garis ortogonal ala draw.io (#833).
 *
 * SEBAB BERKAS INI ADA. `routing.ts` memakai graf keterlihatan sudut rintangan,
 * dan rusuk graf itu boleh DIAGONAL. Selama ini lapisan gambar menambal itu
 * dengan menyisipkan sudut siku belakangan (`FlowchartEdges.tsx`, mode
 * orthogonal). Hasilnya garis memang terlihat siku, tetapi letak belokannya
 * disintesis tanpa melihat rintangan, dan garis yang ditarik pengguna memakai
 * polyline apa adanya. draw.io tidak begitu: rutenya ortogonal SEJAK AWAL,
 * sudutnya membulat, dan segmen pertama/terakhir selalu keluar-masuk tegak
 * lurus terhadap sisi bentuk.
 *
 * Berkas ini memisahkan tiga hal yang dulu bercampur di komponen:
 *
 *  1. `ortogonalDariTitik` — mengubah titik-titik apa pun menjadi polyline yang
 *     SELURUH segmennya horizontal atau vertikal, sambil menghormati arah port.
 *  2. `ruteOrtogonal` — rute otomatis: ambil jalur `findSmartRoute` yang sudah
 *     menghindari bentuk, luruskan, lalu VALIDASI. Bila hasil pelurusan memotong
 *     bentuk (bisa terjadi di sela dua rintangan), cari jalur di kisi ortogonal.
 *  3. `pathDOrtogonal` — bentuk `d` SVG dengan sudut membulat (fillet), seperti
 *     `rounded=1` draw.io.
 *
 * Seluruh fungsi murni: tanpa React, DOM, jaringan, atau state global.
 */

import type { FlowNode, Point } from "../types";
import { ukuranBentukEfektif } from "../constants";
import { findSmartRoute, memotongInteriorKotak } from "./routing";

type Arah = { x: number; y: number };
type TitikBerarah = Point & { dir?: Arah };
type KotakRintangan = { x1: number; y1: number; x2: number; y2: number };

const PADDING = 26;
const KORIDOR = 200;
const STUB = 25;

const bulat = (n: number) => Math.round(n * 100) / 100;
const sama = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const sumbuDari = (d?: Arah): "h" | "v" | null =>
  !d ? null : d.x !== 0 ? "h" : d.y !== 0 ? "v" : null;
const sumbuRuas = (a: Point, b: Point): "h" | "v" | null =>
  a.y === b.y ? "h" : a.x === b.x ? "v" : null;

const JARAK_KEMBAR = 4;
const TOLERANSI_SEGARIS = 2;
const LANGKAH_SNAP = 5;

/** Buang titik kembar dan titik yang hanya meneruskan garis lurus. */
function rampingkan(titik: Point[]): Point[] {
  const keluar: Point[] = [];
  for (const p of titik) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const akhir = keluar[keluar.length - 1];
    if (akhir && sama(akhir, p)) continue;
    keluar.push({ x: bulat(p.x), y: bulat(p.y) });
  }
  for (let i = keluar.length - 2; i >= 1; i--) {
    const a = keluar[i - 1];
    const b = keluar[i];
    const c = keluar[i + 1];
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) keluar.splice(i, 1);
  }
  // #834 — pembersihan di atas bisa menyisakan dua titik yang kini berimpit
  // (a→b→a berubah menjadi a→a). Tanpa lintasan kedua, segmen nol panjang itu
  // ikut menggambar gagang yang bertumpuk.
  const bersih: Point[] = [];
  for (const p of keluar) {
    const akhir = bersih[bersih.length - 1];
    if (akhir && sama(akhir, p)) continue;
    bersih.push(p);
  }
  return bersih;
}

/**
 * #834 — waypoint MANUSIA, bukan simpul router.
 *
 * Model lama menyimpan seluruh hasil rute setiap kali garis disentuh. Akibatnya
 * satu seretan menulis lima-enam tekukan, dan lapisan gambar memasang satu
 * lingkaran ungu pada tiap-tiapnya. Di sini daftar itu dikecilkan: titik nyaris
 * kembar (jarak < 4 px) digabung, titik yang menyimpang ≤ 2 px dari garis lurus
 * dibuang, dan koordinatnya disnap ke kisi 5 px supaya dua garis tidak lahir
 * berjarak satu piksel.
 */
export function rapikanWaypoints(titik: Point[]): Point[] {
  const keluar: Point[] = [];
  for (const p of titik) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const q = {
      x: Math.round(p.x / LANGKAH_SNAP) * LANGKAH_SNAP,
      y: Math.round(p.y / LANGKAH_SNAP) * LANGKAH_SNAP,
    };
    const akhir = keluar[keluar.length - 1];
    if (akhir && Math.hypot(akhir.x - q.x, akhir.y - q.y) < JARAK_KEMBAR) continue;
    keluar.push(q);
  }
  for (let i = keluar.length - 2; i >= 1; i--) {
    const a = keluar[i - 1];
    const b = keluar[i];
    const c = keluar[i + 1];
    const acx = c.x - a.x;
    const acy = c.y - a.y;
    const panjang = Math.hypot(acx, acy);
    if (panjang === 0) continue;
    const jarak = Math.abs((b.x - a.x) * acy - (b.y - a.y) * acx) / panjang;
    const diAntara = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) >= 0;
    if (jarak <= TOLERANSI_SEGARIS && diAntara) keluar.splice(i, 1);
  }
  const bersih: Point[] = [];
  for (const p of keluar) {
    const akhir = bersih[bersih.length - 1];
    if (akhir && Math.hypot(akhir.x - p.x, akhir.y - p.y) < JARAK_KEMBAR) continue;
    bersih.push(p);
  }
  return bersih;
}

/** Jarak titik ke ruas garis, dipakai untuk memilih segmen yang disentuh. */
export function jarakTitikKeSegmen(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const panjang = dx * dx + dy * dy;
  if (panjang === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / panjang;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Segmen yang paling dekat dengan sebuah titik; -1 bila di luar toleransi. */
export function indeksSegmenTerdekat(p: Point, jalur: Point[], toleransi = Infinity): number {
  let indeks = -1;
  let terdekat = Infinity;
  for (let i = 0; i < jalur.length - 1; i++) {
    const d = jarakTitikKeSegmen(p, jalur[i], jalur[i + 1]);
    if (d < terdekat) {
      terdekat = d;
      indeks = i;
    }
  }
  return terdekat <= toleransi ? indeks : -1;
}

/** Posisi proyeksi sebuah titik di sepanjang jalur (satuan panjang). */
function posisiSepanjang(p: Point, jalur: Point[]): number {
  let terbaik = Infinity;
  let posisi = 0;
  let jelajah = 0;
  for (let i = 0; i < jalur.length - 1; i++) {
    const a = jalur[i];
    const b = jalur[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const panjang = Math.hypot(dx, dy);
    if (panjang === 0) continue;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (panjang * panjang);
    t = Math.max(0, Math.min(1, t));
    const jarak = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (jarak < terbaik) {
      terbaik = jarak;
      posisi = jelajah + t * panjang;
    }
    jelajah += panjang;
  }
  return posisi;
}

/**
 * #834 — sisipkan SATU tekukan tanpa menyeret seluruh rute ke dalam model.
 *
 * Urutannya ditentukan oleh posisinya di sepanjang jalur yang sedang terlihat,
 * bukan oleh indeks segmen: daftar waypoint kini lebih pendek daripada jalur,
 * jadi indeks keduanya tidak lagi sepadan.
 */
export function sisipTekukan(waypoints: Point[], baru: Point, jalur: Point[]): Point[] {
  const daftar = waypoints.map((w) => ({ p: { x: w.x, y: w.y }, s: posisiSepanjang(w, jalur) }));
  daftar.push({ p: baru, s: posisiSepanjang(baru, jalur) });
  daftar.sort((a, b) => a.s - b.s);
  return rapikanWaypoints(daftar.map((d) => d.p));
}

/**
 * Polyline yang SELURUH segmennya horizontal/vertikal.
 *
 * Aturan sudut, berurutan menurut kekuatannya:
 *  - pasangan TERAKHIR mengikuti arah port tujuan (garis masuk tegak lurus sisi);
 *  - pasangan PERTAMA mengikuti arah port asal;
 *  - pasangan yang bersebelahan dengan stub keluar/masuk berbelok tegak lurus;
 *  - sisanya bergantian sumbu, supaya tidak lahir pola S yang bergelombang.
 */
export function ortogonalDariTitik(
  titik: Point[],
  dirAwal?: Arah,
  dirAkhir?: Arah,
  /** `false` mempertahankan titik yang segaris: tekukan manual harus tetap jadi simpul. */
  rapikan = true
): Point[] {
  const bersih: Point[] = [];
  for (const p of titik) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (!bersih.length || !sama(bersih[bersih.length - 1], p)) bersih.push({ x: p.x, y: p.y });
  }
  if (bersih.length <= 1) return rampingkan(bersih);

  const n = bersih.length;
  const hasil: Point[] = [bersih[0]];
  let sumbuTerakhir: "h" | "v" | null = null;

  const dorong = (p: Point) => {
    if (!sama(hasil[hasil.length - 1], p)) hasil.push({ x: p.x, y: p.y });
  };

  // Dua port yang menghadap sumbu SAMA (kanan ke kiri, atas ke bawah) butuh DUA
  // belokan bila ujungnya tidak segaris. Satu belokan saja memaksa salah satu
  // ujung masuk menyamping ke sisi bentuknya.
  const sumbuAwal = sumbuDari(dirAwal);
  const sumbuAkhir = sumbuDari(dirAkhir);
  if (n === 2 && sumbuAwal && sumbuAwal === sumbuAkhir && !sumbuRuas(bersih[0], bersih[1])) {
    const a = bersih[0];
    const b = bersih[n - 1];
    if (sumbuAwal === "h") {
      const x = bulat((a.x + b.x) / 2);
      dorong({ x, y: a.y });
      dorong({ x, y: b.y });
    } else {
      const y = bulat((a.y + b.y) / 2);
      dorong({ x: a.x, y });
      dorong({ x: b.x, y });
    }
    dorong(b);
    return rapikan ? rampingkan(hasil) : hasil;
  }

  for (let i = 1; i < n; i++) {
    const a = bersih[i - 1];
    const b = bersih[i];
    const awal = i === 1;
    const akhir = i === n - 1;
    const sumbu = sumbuRuas(a, b);
    const mintaAwal = awal ? sumbuDari(dirAwal) : null;
    const mintaAkhir = akhir ? sumbuDari(dirAkhir) : null;

    // Ruas yang sudah sejajar cukup diteruskan, kecuali arah port menuntut
    // sumbu lain: garis yang masuk dari sisi atas bentuk tidak boleh datang
    // menyamping hanya karena titik sebelumnya kebetulan segaris.
    const salahAwal = !!mintaAwal && sumbu !== null && mintaAwal !== sumbu;
    const salahAkhir = !!mintaAkhir && sumbu !== null && mintaAkhir !== sumbu;
    if (!salahAwal && !salahAkhir && sumbu) {
      dorong(b);
      sumbuTerakhir = sumbu;
      continue;
    }

    let gerakPertama: "h" | "v";
    if (mintaAkhir) {
      // `corner -> b` harus sumbu yang diminta port tujuan.
      gerakPertama = mintaAkhir === "h" ? "v" : "h";
    } else if (mintaAwal) {
      // `a -> corner` harus sumbu yang diminta port asal.
      gerakPertama = mintaAwal;
    } else if (i === 2 && sumbuDari(dirAwal)) {
      // Dari stub asal: berbelok tegak lurus terhadap arah keluar.
      gerakPertama = sumbuDari(dirAwal) === "h" ? "v" : "h";
    } else if (i === n - 2 && sumbuDari(dirAkhir)) {
      // Menuju stub tujuan: datang tegak lurus terhadap arah masuk.
      gerakPertama = sumbuDari(dirAkhir) === "h" ? "v" : "h";
    } else if (sumbuTerakhir === "h") {
      gerakPertama = "v";
    } else if (sumbuTerakhir === "v") {
      gerakPertama = "h";
    } else {
      gerakPertama = "h";
    }

    const sudut = gerakPertama === "h" ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
    dorong(sudut);
    dorong(b);
    sumbuTerakhir = gerakPertama === "h" ? "v" : "h";
  }

  return rapikan ? rampingkan(hasil) : hasil;
}

/**
 * Titik-titik manual setelah SATU SEGMEN digeser (#833, diperkecil di #834).
 *
 * draw.io memperlakukan segmen sebagai benda: menyeret segmen horizontal ke
 * atas/bawah menggeser KEDUA ujungnya, dan sisa jalur dirutekan ulang. Yang
 * disimpan HANYA ujung ruas itu — paling banyak DUA titik. Model lama
 * mengembalikan seluruh simpul rute, sehingga satu seretan langsung mengubah
 * garis menjadi belasan tekukan manual dan belasan lingkaran ungu.
 *
 * Ujung yang menempel pada bentuk (indeks 0 dan terakhir) tidak pernah ikut
 * bergeser — ia jangkar port. Waypoint lama yang berimpit dengan ujung ruas
 * ikut berpindah; waypoint lain dipertahankan di urutannya.
 *
 * `null` bila segmen tidak bisa digeser (diagonal) atau jarinya tidak bergerak.
 */
export function waypointsSetelahGeserSegmen(
  jalur: Point[],
  indeks: number,
  dx: number,
  dy: number,
  waypoints: Point[] = []
): Point[] | null {
  if (jalur.length < 2 || indeks < 0 || indeks >= jalur.length - 1) return null;
  const a = jalur[indeks];
  const b = jalur[indeks + 1];
  const horizontal = a.y === b.y;
  const vertikal = a.x === b.x;
  if (!horizontal && !vertikal) return null;

  const gx = horizontal ? 0 : dx;
  const gy = horizontal ? dy : 0;
  if (gx === 0 && gy === 0) return null;

  if (jalur.length === 2) {
    // Satu ruas langsung antara dua port: geseran melahirkan dua tekukan yang
    // membuat jalur berbentuk Z, bukan tidak terjadi apa-apa.
    return rapikanWaypoints([
      { x: bulat(a.x + gx), y: bulat(a.y + gy) },
      { x: bulat(b.x + gx), y: bulat(b.y + gy) },
    ]);
  }

  const daftar = waypoints.map((w) => ({
    p: { x: w.x, y: w.y },
    s: posisiSepanjang(w, jalur),
  }));
  for (const i of [indeks, indeks + 1]) {
    if (i <= 0 || i >= jalur.length - 1) continue;
    const asal = jalur[i];
    const pindah = { x: bulat(asal.x + gx), y: bulat(asal.y + gy) };
    const cocok = daftar.find((d) => Math.hypot(d.p.x - asal.x, d.p.y - asal.y) <= 0.75);
    if (cocok) cocok.p = pindah;
    else daftar.push({ p: pindah, s: posisiSepanjang(asal, jalur) });
  }
  daftar.sort((x, y) => x.s - y.s);
  return rapikanWaypoints(daftar.map((d) => d.p));
}

/** Kotak rintangan dengan pelebaran yang SAMA dengan `routing.ts`. */
function kotakRintangan(
  nodes: FlowNode[],
  fromId: string,
  toId: string,
  a: Point,
  b: Point
): KotakRintangan[] {
  const x1Koridor = Math.min(a.x, b.x) - KORIDOR;
  const x2Koridor = Math.max(a.x, b.x) + KORIDOR;
  const y1Koridor = Math.min(a.y, b.y) - KORIDOR;
  const y2Koridor = Math.max(a.y, b.y) + KORIDOR;
  const daftar: KotakRintangan[] = [];
  for (const n of nodes) {
    if (n.id === fromId || n.id === toId) continue;
    const ukuran = ukuranBentukEfektif(n);
    const k = {
      x1: n.x - PADDING,
      y1: n.y - PADDING,
      x2: n.x + ukuran.width + PADDING,
      y2: n.y + ukuran.height + PADDING,
    };
    if (k.x2 < x1Koridor || k.x1 > x2Koridor || k.y2 < y1Koridor || k.y1 > y2Koridor) continue;
    daftar.push(k);
  }
  return daftar;
}

function menembus(points: Point[], kotak: KotakRintangan[]): boolean {
  for (let i = 1; i < points.length; i++) {
    for (const k of kotak) {
      if (memotongInteriorKotak(points[i - 1], points[i], k)) return true;
    }
  }
  return false;
}

/**
 * Jalur cadangan di kisi ortogonal. Dipakai hanya ketika hasil pelurusan
 * memotong rintangan; grafnya dibatasi pada koordinat yang memang penting
 * (ujung, stub, dan tepi rintangan) supaya tidak meledak di papan padat.
 */
function ruteJaringan(
  start: TitikBerarah,
  end: TitikBerarah,
  fromId: string,
  toId: string,
  nodes: FlowNode[]
): Point[] | null {
  const kotak = kotakRintangan(nodes, fromId, toId, start, end);
  if (kotak.length === 0 || kotak.length > 30) return null;

  const stub = (p: TitikBerarah): Point => ({
    x: p.x + (p.dir?.x || 0) * STUB,
    y: p.y + (p.dir?.y || 0) * STUB,
  });
  const stubAwal = stub(start);
  const stubAkhir = stub(end);

  const xs = Array.from(
    new Set([start.x, stubAwal.x, end.x, stubAkhir.x, ...kotak.flatMap((k) => [k.x1, k.x2])])
  ).sort((a, b) => a - b);
  const ys = Array.from(
    new Set([start.y, stubAwal.y, end.y, stubAkhir.y, ...kotak.flatMap((k) => [k.y1, k.y2])])
  ).sort((a, b) => a - b);
  if (xs.length > 40 || ys.length > 40 || xs.length * ys.length > 1400) return null;

  const diDalam = (x: number, y: number) =>
    kotak.some((k) => x > k.x1 + 1 && x < k.x2 - 1 && y > k.y1 + 1 && y < k.y2 - 1);

  const kunci = (x: number, y: number) => `${x},${y}`;
  const nomor = new Map<string, number>();
  const vx: number[] = [];
  const vy: number[] = [];
  for (const x of xs) {
    for (const y of ys) {
      if (diDalam(x, y)) continue;
      nomor.set(kunci(x, y), vx.length);
      vx.push(x);
      vy.push(y);
    }
  }

  const tetangga: number[][] = vx.map(() => []);
  const sambung = (i: number, j: number) => {
    if (i === j) return;
    if (
      menembus(
        [
          { x: vx[i], y: vy[i] },
          { x: vx[j], y: vy[j] },
        ],
        kotak
      )
    )
      return;
    tetangga[i].push(j);
    tetangga[j].push(i);
  };
  for (let xi = 0; xi < xs.length; xi++) {
    for (let yi = 0; yi + 1 < ys.length; yi++) {
      const a = nomor.get(kunci(xs[xi], ys[yi]));
      const b = nomor.get(kunci(xs[xi], ys[yi + 1]));
      if (a !== undefined && b !== undefined) sambung(a, b);
    }
  }
  for (let yi = 0; yi < ys.length; yi++) {
    for (let xi = 0; xi + 1 < xs.length; xi++) {
      const a = nomor.get(kunci(xs[xi], ys[yi]));
      const b = nomor.get(kunci(xs[xi + 1], ys[yi]));
      if (a !== undefined && b !== undefined) sambung(a, b);
    }
  }

  const iAwal = nomor.get(kunci(start.x, start.y));
  const iAkhir = nomor.get(kunci(end.x, end.y));
  if (iAwal === undefined || iAkhir === undefined) return null;

  // Kunci ujung pada port: segmen pertama/terakhir tidak boleh langsung
  // menyimpang ke samping bentuk.
  const iStubAwal = nomor.get(kunci(stubAwal.x, stubAwal.y));
  const iStubAkhir = nomor.get(kunci(stubAkhir.x, stubAkhir.y));
  const asliAwal = tetangga[iAwal];
  const asliAkhir = tetangga[iAkhir];
  if (iStubAwal !== undefined && tetangga[iAwal].includes(iStubAwal)) tetangga[iAwal] = [iStubAwal];
  if (iStubAkhir !== undefined && tetangga[iAkhir].includes(iStubAkhir))
    tetangga[iAkhir] = [iStubAkhir];

  const jumlah = vx.length;
  const jarak = new Float64Array(jumlah).fill(Infinity);
  const asal = new Int32Array(jumlah).fill(-1);
  const selesai = new Uint8Array(jumlah);
  jarak[iAwal] = 0;
  const ANGGARAN = 8000;
  let dipakai = 0;

  for (;;) {
    let u = -1;
    let terdekat = Infinity;
    for (let i = 0; i < jumlah; i++) {
      if (!selesai[i] && jarak[i] < terdekat) {
        terdekat = jarak[i];
        u = i;
      }
    }
    if (u === -1 || u === iAkhir) break;
    if (dipakai >= ANGGARAN) break;
    selesai[u] = 1;
    for (const v of tetangga[u]) {
      if (selesai[v]) continue;
      dipakai++;
      const d = Math.hypot(vx[u] - vx[v], vy[u] - vy[v]);
      let penalti = 0;
      if (asal[u] !== -1) {
        const pu = asal[u];
        const ax = vx[u] - vx[pu];
        const ay = vy[u] - vy[pu];
        const bx = vx[v] - vx[u];
        const by = vy[v] - vy[u];
        const ma = Math.hypot(ax, ay);
        const mb = Math.hypot(bx, by);
        if (ma > 0.1 && mb > 0.1 && (ax * bx + ay * by) / (ma * mb) < 0.95) penalti = 35;
      }
      const alt = jarak[u] + d + penalti;
      if (alt < jarak[v]) {
        jarak[v] = alt;
        asal[v] = u;
      }
    }
  }

  // Pulihkan penguncian ujung supaya tidak mengubah graf milik pemanggil.
  tetangga[iAwal] = asliAwal;
  tetangga[iAkhir] = asliAkhir;

  if (jarak[iAkhir] === Infinity) return null;
  const jalur: Point[] = [];
  for (let c = iAkhir; c !== -1; c = asal[c]) jalur.unshift({ x: vx[c], y: vy[c] });
  return rampingkan(jalur);
}

/**
 * Rute otomatis ortogonal. `findSmartRoute` tetap dipanggil — ia yang tahu
 * cara menghindari bentuk, dan pemanggilnya (beserta test cache #521/#543)
 * bergantung pada fakta itu. Tugas berkas ini hanya meluruskan keluarannya.
 */
export function ruteOrtogonal(
  start: TitikBerarah,
  end: TitikBerarah,
  fromNodeId: string,
  toNodeId: string,
  nodes: FlowNode[]
): Point[] {
  const kasar = findSmartRoute(start, end, fromNodeId, toNodeId, nodes);
  const lurus = ortogonalDariTitik(kasar, start.dir, end.dir);
  const kotak = kotakRintangan(nodes, fromNodeId, toNodeId, start, end);
  if (!menembus(lurus, kotak)) return lurus;

  const jaringan = ruteJaringan(start, end, fromNodeId, toNodeId, nodes);
  if (jaringan && !menembus(jaringan, kotak)) return jaringan;
  return lurus;
}

/**
 * `d` SVG dengan sudut membulat. Hanya untuk jalur ortogonal; radius dipangkas
 * ke setengah segmen terpendek di tiap sudut supaya dua belokan yang berdekatan
 * tidak saling memakan.
 */
export function pathDOrtogonal(points: Point[], radius = 10): string {
  const p = rampingkan(points);
  if (p.length === 0) return "";
  if (p.length === 1) return `M ${p[0].x} ${p[0].y}`;

  const bagian: string[] = [`M ${p[0].x} ${p[0].y}`];
  for (let i = 1; i < p.length - 1; i++) {
    const sebelumnya = p[i - 1];
    const kini = p[i];
    const berikut = p[i + 1];
    const masuk = Math.hypot(kini.x - sebelumnya.x, kini.y - sebelumnya.y);
    const keluar = Math.hypot(berikut.x - kini.x, berikut.y - kini.y);
    const r = Math.min(radius, masuk / 2, keluar / 2);
    if (r < 0.5) {
      bagian.push(`L ${kini.x} ${kini.y}`);
      continue;
    }
    const ux = (kini.x - sebelumnya.x) / masuk;
    const uy = (kini.y - sebelumnya.y) / masuk;
    const vx = (berikut.x - kini.x) / keluar;
    const vy = (berikut.y - kini.y) / keluar;
    const titikMasuk = { x: bulat(kini.x - ux * r), y: bulat(kini.y - uy * r) };
    const titikKeluar = { x: bulat(kini.x + vx * r), y: bulat(kini.y + vy * r) };
    bagian.push(`L ${titikMasuk.x} ${titikMasuk.y}`);
    bagian.push(`Q ${kini.x} ${kini.y} ${titikKeluar.x} ${titikKeluar.y}`);
  }
  const akhir = p[p.length - 1];
  bagian.push(`L ${akhir.x} ${akhir.y}`);
  return bagian.join(" ");
}
