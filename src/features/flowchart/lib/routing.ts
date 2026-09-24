/**
 * Auto-routing garis penghubung antar node.
 *
 * Diekstrak apa adanya dari FlowchartContainer.tsx (Fase 3 — Anti-God-Object).
 * Seluruh fungsi di sini murni: tidak menyentuh React, DOM, jaringan, maupun
 * state global. Input sama menghasilkan output sama.
 */

import type { FlowNode, Point } from "../types";

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

/** Apakah sebuah ruas garis memotong atau berada di dalam sebuah persegi. */
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

  for (const n of nodes) {
    if (n.id === fromNodeId || n.id === toNodeId) continue;
    const w = n.width || 130;
    const h = n.height || 70;
    obX1.push(n.x - padding);
    obY1.push(n.y - padding);
    obX2.push(n.x + w + padding);
    obY2.push(n.y + h + padding);
  }
  const jumlahRintangan = obX1.length;

  const isBlocked = (p1: Point, p2: Point) => {
    const segX1 = p1.x < p2.x ? p1.x : p2.x;
    const segX2 = p1.x < p2.x ? p2.x : p1.x;
    const segY1 = p1.y < p2.y ? p1.y : p2.y;
    const segY2 = p1.y < p2.y ? p2.y : p1.y;

    for (let i = 0; i < jumlahRintangan; i++) {
      if (segX2 < obX1[i] || segX1 > obX2[i] || segY2 < obY1[i] || segY1 > obY2[i]) continue;
      if (
        isSegmentIntersectingRect(p1, p2, { x1: obX1[i], y1: obY1[i], x2: obX2[i], y2: obY2[i] })
      ) {
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
