/**
 * Auto-routing garis penghubung antar node.
 *
 * Diekstrak apa adanya dari FlowchartContainer.tsx (Fase 3 — Anti-God-Object).
 * Seluruh fungsi di sini murni: tidak menyentuh React, DOM, jaringan, maupun
 * state global. Input sama menghasilkan output sama.
 */

import type { FlowNode, Point } from "../types";
import { ukuranBentukEfektif } from "../constants";

/** Apakah dua ruas garis saling berpotongan (termasuk kasus kolinear/bersentuhan). */
export function isSegmentIntersectingSegment(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const crossProduct = (a: Point, b: Point, c: Point) => {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  };

  const onSegment = (p: Point, q: Point, r: Point) => {
    return (
      q.x >= Math.min(p.x, r.x) &&
      q.x <= Math.max(p.x, r.x) &&
      q.y >= Math.min(p.y, r.y) &&
      q.y <= Math.max(p.y, r.y)
    );
  };

  const d1 = crossProduct(p1, p2, q1);
  const d2 = crossProduct(p1, p2, q2);
  const d3 = crossProduct(q1, q2, p1);
  const d4 = crossProduct(q1, q2, p2);

  // General intersection where vectors cross
  if (
    ((d1 > 0.001 && d2 < -0.001) || (d1 < -0.001 && d2 > 0.001)) &&
    ((d3 > 0.001 && d4 < -0.001) || (d3 < -0.001 && d4 > 0.001))
  ) {
    return true;
  }

  // Endpoints touch or collinear overlap
  if (Math.abs(d1) < 0.001 && onSegment(p1, q1, p2)) return true;
  if (Math.abs(d2) < 0.001 && onSegment(p1, q2, p2)) return true;
  if (Math.abs(d3) < 0.001 && onSegment(q1, p1, q2)) return true;
  if (Math.abs(d4) < 0.001 && onSegment(q1, p2, q2)) return true;

  return false;
}

/**
 * Apakah sebuah ruas garis memotong ATAU MENYENGGOL sebuah persegi.
 *
 * #544 meninggalkan fungsi ini tanpa pemanggil produksi: perutean dan penanda
 * "terganggu" pindah ke `memotongInteriorKotak`. Ia tetap ada (dan tetap
 * diekspor) karena `routing.test.ts` memakainya sebagai PENGGARIS YANG LEBIH
 * KETAT untuk pertanyaan "apakah garis yang digambar menutupi bentuk?" — sebuah
 * garis yang berjalan tepat di tepi bentuk adalah cacat visual, walau secara
 * geometri tidak masuk ke dalamnya. Jangan dihapus sebagai "dead code".
 */
export function isSegmentIntersectingRect(
  p1: Point,
  p2: Point,
  rect: { x1: number; y1: number; x2: number; y2: number }
) {
  // Check if either point is strictly inside the obstacle rectangle with a small inset for safety
  const buffer = 1;
  const isPointInside = (p: Point) => {
    return (
      p.x >= rect.x1 + buffer &&
      p.x <= rect.x2 - buffer &&
      p.y >= rect.y1 + buffer &&
      p.y <= rect.y2 - buffer
    );
  };

  if (isPointInside(p1) || isPointInside(p2)) {
    return true;
  }

  // Check if the segment intersects any of the 4 borders
  const tl = { x: rect.x1, y: rect.y1 };
  const tr = { x: rect.x2, y: rect.y1 };
  const br = { x: rect.x2, y: rect.y2 };
  const bl = { x: rect.x1, y: rect.y2 };

  if (isSegmentIntersectingSegment(p1, p2, tl, tr)) return true;
  if (isSegmentIntersectingSegment(p1, p2, tr, br)) return true;
  if (isSegmentIntersectingSegment(p1, p2, br, bl)) return true;
  if (isSegmentIntersectingSegment(p1, p2, bl, tl)) return true;

  // Handles cases where the line is inside or fully crosses from collinear lines
  const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  if (isPointInside(midPoint)) {
    return true;
  }

  return false;
}

/**
 * #544 — apakah ruas itu MEMOTONG INTERIOR sebuah kotak.
 *
 * Bedanya dengan `isSegmentIntersectingRect` di atas: MENYENGGOL tidak dihitung.
 * Ruas yang berakhir tepat di sudut, atau yang merapat di sepanjang tepi, boleh
 * lewat - dan itu bukan kompromi visual, sebab kotak yang dipakai perutean sudah
 * diperlebar 26 px dari bentuknya, jadi "menyenggol sudut" berarti lewat 26 px
 * dari sudut bentuk aslinya.
 *
 * KENAPA HARUS TERPISAH. Graf keterlihatan di `findSmartRoute` dibangun DARI
 * titik sudut rintangan itu. Selama menyenggol sudut dianggap terhalang, setiap
 * simpul graf tidak terjangkau dari mana pun, Dijkstra selalu berakhir
 * `dist === Infinity`, dan tidak pernah ada satu pun garis yang memutar -
 * terukur delapan dari delapan geometri terhalang memulangkan garis lurus tembus
 * bentuk (#572). Predikat lama tetap dipakai apa adanya oleh pemanggil yang
 * memang ingin tahu soal sentuhan; yang pindah ke sini hanya perutean dan
 * penanda "terganggu" di FlowchartEdges, sebab rute yang sah sekarang memang
 * menyentuh sudut dan tidak boleh dianggap rusak setiap render.
 */
export function memotongInteriorKotak(
  p1: Point,
  p2: Point,
  rect: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  const buffer = 1;
  const diDalam = (p: Point) =>
    p.x > rect.x1 + buffer &&
    p.x < rect.x2 - buffer &&
    p.y > rect.y1 + buffer &&
    p.y < rect.y2 - buffer;

  if (diDalam(p1) || diDalam(p2)) return true;

  const silangSejati = (a1: Point, a2: Point, b1: Point, b2: Point) => {
    const arah = (o: Point, p: Point, q: Point) =>
      (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
    const lawan = (a: number, b: number) => (a > 0.001 && b < -0.001) || (a < -0.001 && b > 0.001);
    return lawan(arah(a1, a2, b1), arah(a1, a2, b2)) && lawan(arah(b1, b2, a1), arah(b1, b2, a2));
  };

  const tl = { x: rect.x1, y: rect.y1 };
  const tr = { x: rect.x2, y: rect.y1 };
  const br = { x: rect.x2, y: rect.y2 };
  const bl = { x: rect.x1, y: rect.y2 };

  if (silangSejati(p1, p2, tl, tr)) return true;
  if (silangSejati(p1, p2, tr, br)) return true;
  if (silangSejati(p1, p2, br, bl)) return true;
  if (silangSejati(p1, p2, bl, tl)) return true;

  // Ruas yang kedua ujungnya jatuh tepat di tepi tapi melintas di tengah kotak
  // (misalnya sudut ke sudut seberang) tidak tertangkap uji di atas.
  return diDalam({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
}

/**
 * Mencari jalur terpendek antar dua titik sambil menghindari node lain.
 * Memakai Dijkstra di atas graf sudut-sudut rintangan, dengan penalti belokan
 * agar garis tetap rapi dan tidak bergelombang.
 *
 * Item #520 — keluaran fungsi ini WAJIB tetap sama persis dengan versi
 * sebelumnya; yang berubah hanya cara menghitungnya. Dua hal yang membuatnya
 * mahal pada kanvas berisi puluhan bentuk:
 *
 *  1. Setiap tetangga dicari dengan `vertices.find(id)` di dalam loop bersarang
 *     — pencarian linear O(V) per pasangan, padahal urutan simpul sudah menentukan
 *     siapa yang menang bila jarak seri.
 *  2. Setiap uji "ruas ini terhalang?" diperiksa terhadap SEMUA node di kanvas.
 *
 * Perbaikan 1: simpul disimpan sebagai array paralel berindeks, dan indeks
 * pemrosesan dijaga agar sama dengan urutan penyisipan lama (pemilihan simpul
 * terdekat memakai perbandingan `<` ketat, jadi pemenang seri tetap yang
 * pertama masuk). Perbaikan 2: kotak pembatas ruas dibandingkan terhadap kotak
 * pembatas rintangan lebih dulu — bila keduanya terpisah, ruas itu pasti tidak
 * memotong dan kedua ujungnya pasti di luar, jadi uji potong yang mahal bisa
 * dilewati tanpa mengubah hasil.
 */
export function findSmartRoute(
  start: Point & { dir?: { x: number; y: number } },
  end: Point & { dir?: { x: number; y: number } },
  fromNodeId: string,
  toNodeId: string,
  nodes: FlowNode[]
): Point[] {
  // Filter out from/to nodes, define safety boundary margin for shapes
  const padding = 26;
  const obX1: number[] = [];
  const obY1: number[] = [];
  const obX2: number[] = [];
  const obY2: number[] = [];

  // #544 — koridor. Hanya rintangan di sekitar lintasan yang ikut membangun
  // graf. Tanpa ini graf selalu punya 4N simpul dan setiap pasangan simpul
  // diuji terhadap semua N rintangan: begitu grafnya benar-benar terhubung
  // (bukan menyerah seperti sebelum #544), papan 100 bentuk butuh 63 detik
  // untuk satu lintasan. Uji "ikut koridor" dipakai dua kali lipat lebar dari
  // yang dipakai memotong, supaya ruas antar simpul yang terpilih tidak pernah
  // bisa menyentuh rintangan yang tidak ikut diuji.
  const margin = 200;
  const x1Koridor = Math.min(start.x, end.x) - margin;
  const x2Koridor = Math.max(start.x, end.x) + margin;
  const y1Koridor = Math.min(start.y, end.y) - margin;
  const y2Koridor = Math.max(start.y, end.y) + margin;

  for (const n of nodes) {
    if (n.id === fromNodeId || n.id === toNodeId) continue;
    const w = ukuranBentukEfektif(n).width;
    const h = ukuranBentukEfektif(n).height;
    const x1 = n.x - padding;
    const y1 = n.y - padding;
    const x2 = n.x + w + padding;
    const y2 = n.y + h + padding;
    if (x2 < x1Koridor || x1 > x2Koridor || y2 < y1Koridor || y1 > y2Koridor) continue;
    obX1.push(x1);
    obY1.push(y1);
    obX2.push(x2);
    obY2.push(y2);
  }
  const jumlahRintangan = obX1.length;

  /**
   * #544 — anggaran uji keterlihatan per rute, dihitung dalam satuan "ruas ×
   * rintangan". Sekali grafnya benar-benar terhubung, pencariannya bisa
   * menyinggung SEMUA simpul: pada kisi rapat 200 bentuk satu lintasan penuh
   * pernah terukur 25 detik, dan itu berjalan di thread utama setiap kali garis
   * dianggap terganggu. Dengan batas ini rute yang sederhana tetap memutar
   * (delapan dari delapan kasus uji, lihat #572) sementara rute yang paling
   * sulit di papan paling padat berhenti dan memakai garis lurus - penurunan
   * mutu yang terlihat, bukan pembekuan layar yang tidak terlihat.
   */
  const ANGGARAN_UJI = 4000;
  let ujiTerpakai = 0;

  const isBlocked = (p1: Point, p2: Point) => {
    const segX1 = p1.x < p2.x ? p1.x : p2.x;
    const segX2 = p1.x < p2.x ? p2.x : p1.x;
    const segY1 = p1.y < p2.y ? p1.y : p2.y;
    const segY2 = p1.y < p2.y ? p2.y : p1.y;

    for (let i = 0; i < jumlahRintangan; i++) {
      ujiTerpakai++;
      if (segX2 < obX1[i] || segX1 > obX2[i] || segY2 < obY1[i] || segY1 > obY2[i]) continue;
      if (memotongInteriorKotak(p1, p2, { x1: obX1[i], y1: obY1[i], x2: obX2[i], y2: obY2[i] })) {
        return true;
      }
    }
    return false;
  };

  // Quick check: If there's an unobstructed direct line, return it immediately
  if (!isBlocked(start, end)) {
    return [start, end];
  }

  // Create outward stub waypoints to force lines to begin/end with clean orthogonal segments
  const stubOffset = 25;
  const startStub: Point = {
    x: start.x + (start.dir?.x || 0) * stubOffset,
    y: start.y + (start.dir?.y || 0) * stubOffset,
  };
  const endStub: Point = {
    x: end.x + (end.dir?.x || 0) * stubOffset,
    y: end.y + (end.dir?.y || 0) * stubOffset,
  };

  // Build vertices (Start, Stubs, Corner waypoints of obstacle layout, End)
  const vx: number[] = [start.x, startStub.x];
  const vy: number[] = [start.y, startStub.y];

  for (let i = 0; i < jumlahRintangan; i++) {
    vx.push(obX1[i], obX2[i], obX2[i], obX1[i]);
    vy.push(obY1[i], obY1[i], obY2[i], obY2[i]);
  }

  vx.push(endStub.x);
  vy.push(endStub.y);
  const idxEnd = vx.length;
  vx.push(end.x);
  vy.push(end.y);

  const jumlahSimpul = vx.length;
  const dist = new Float64Array(jumlahSimpul).fill(Infinity);
  const prev = new Int32Array(jumlahSimpul).fill(-1);
  const sudah = new Uint8Array(jumlahSimpul);
  dist[0] = 0;

  // Dijkstra Shortest Path Search
  for (;;) {
    let u = -1;
    let minDist = Infinity;
    for (let i = 0; i < jumlahSimpul; i++) {
      if (sudah[i]) continue;
      if (dist[i] < minDist) {
        minDist = dist[i];
        u = i;
      }
    }

    if (u === -1 || u === idxEnd) {
      break;
    }

    // #544 — anggaran habis di tengah pencarian: biarkan jalur lurus yang
    // menang, jangan buat papan membeku.
    if (ujiTerpakai >= ANGGARAN_UJI) {
      break;
    }

    sudah[u] = 1;

    // Explore neighbors
    for (let v = 0; v < jumlahSimpul; v++) {
      if (sudah[v]) continue;

      const ux = vx[u];
      const uy = vy[u];
      const vkx = vx[v];
      const vky = vy[v];

      // Check direct visibility
      if (!isBlocked({ x: ux, y: uy }, { x: vkx, y: vky })) {
        const d = Math.sqrt((ux - vkx) ** 2 + (uy - vky) ** 2);

        // Add a slight turn penalty to discourage unnecessary diagonal bends and maintain beautiful rectangular styling
        let penalty = 0;
        if (prev[u] !== -1) {
          const pu = prev[u];
          // Direction vectors
          const dx1 = ux - vx[pu];
          const dy1 = uy - vy[pu];
          const dx2 = vkx - ux;
          const dy2 = vky - uy;

          const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (mag1 > 0.1 && mag2 > 0.1) {
            const dot = (dx1 * dx2 + dy1 * dy2) / (mag1 * mag2);
            if (dot < 0.95) {
              penalty = 35; // 35px distance penalty to prevent wavy routing
            }
          }
        }

        const alt = dist[u] + d + penalty;
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
        }
      }
    }
  }

  // Reconstruct Path
  if (dist[idxEnd] === Infinity) {
    return [start, startStub, endStub, end];
  }

  const path: Point[] = [];
  for (let c = idxEnd; c !== -1; c = prev[c]) {
    path.unshift({ x: vx[c], y: vy[c] });
  }

  return path;
}
