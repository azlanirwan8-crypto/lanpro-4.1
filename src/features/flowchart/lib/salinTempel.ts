/**
 * Salin-tempel papan flowchart (#582).
 *
 * Dulu seleksi dan salinan adalah SATU array (`copiedNodes` di
 * useFlowchartSelection.ts): sapuan marquee menulisnya, klik di mana pun
 * menghapusnya, dan Ctrl+C atas seleksi marquee hanya membunyikan toast
 * "disalin" tanpa menyimpan apa pun. Akibatnya Ctrl+V diam — dilaporkan
 * pemilik proyek 30 Sep: "copy paste flow kenapa tidak bisa".
 *
 * Di sini tidak ada React dan tidak ada state, jadi bentuk keluaran salinan
 * bisa dikunci test tanpa membuka papan di peramban.
 */
import type { FlowEdge, FlowNode } from "../types";

/** Isi clipboard papan: bentuk yang disalin dan panah di antarannya. */
export interface SalinanPapan {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface TitikPapan {
  x: number;
  y: number;
}

const LEBAR_BAWAAN = 130;
const TINGGI_BAWAAN = 70;
const BATAS_PAPAN = { xMin: 10, yMin: 10, xMax: 3500, yMax: 2800 };

let pencetakReplika = 0;

const idReplika = (asal: string) =>
  `${asal}-c-${(++pencetakReplika).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * Panah hanya ikut tersalin kalau KEDUA ujungnya ikut diseleksi. Salinan
 * dideep-copy: tanpa itu, bentuk hasil salin masih menunjuk ke objek yang
 * sama dengan papan, sehingga menyeret bentuk asal ikut menggeser clipboard.
 */
export function kumpulkanSalinan(seleksi: FlowNode[], semuaEdge: FlowEdge[]): SalinanPapan {
  const idBentuk = new Set(seleksi.map((n) => n.id));
  const panahIkut = semuaEdge.filter((e) => idBentuk.has(e.fromNodeId) && idBentuk.has(e.toNodeId));
  return JSON.parse(JSON.stringify({ nodes: seleksi, edges: panahIkut })) as SalinanPapan;
}

function sudut(kumpulan: FlowNode[]) {
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  for (const n of kumpulan) {
    xMin = Math.min(xMin, n.x);
    yMin = Math.min(yMin, n.y);
    xMax = Math.max(xMax, n.x + (n.width || LEBAR_BAWAAN));
    yMax = Math.max(yMax, n.y + (n.height || TINGGI_BAWAAN));
  }
  return { xMin, yMin, xMax, yMax };
}

/**
 * Repelika salinan dengan id segar.
 *
 * `posisi` adalah titik ruang papan tempat POJOK KIRI-ATAS kelompok mendarat;
 * tanpa itu replika bergeser 30px — dulu itu satu-satunya perilaku, jadi
 * menempel dua kali menindih hasil pertama persis di tempat yang sama dan
 * terlihat seperti Ctrl+V tidak berfungsi.
 */
export function hasilTempel(salinan: SalinanPapan, posisi?: TitikPapan | null): SalinanPapan {
  if (!salinan.nodes.length) return { nodes: [], edges: [] };

  const { xMin, yMin, xMax, yMax } = sudut(salinan.nodes);
  const geserX = posisi ? Math.round(posisi.x - xMin) : 30;
  const geserY = posisi ? Math.round(posisi.y - yMin) : 30;

  // Kelompok dijaga tetap utuh di dalam papan: yang dijepit adalah geseran
  // seluruh kelompok, bukan tiap bentuk, supaya panah tidak ikut tertebas.
  const dx = Math.max(BATAS_PAPAN.xMin - xMin, Math.min(BATAS_PAPAN.xMax - xMax, geserX));
  const dy = Math.max(BATAS_PAPAN.yMin - yMin, Math.min(BATAS_PAPAN.yMax - yMax, geserY));

  const petaId = new Map<string, string>();
  const nodes = salinan.nodes.map((n) => {
    const id = idReplika(n.id);
    petaId.set(n.id, id);
    return { ...n, id, x: n.x + dx, y: n.y + dy };
  });

  const edges = salinan.edges.map((e) => ({
    ...e,
    id: idReplika(e.id),
    fromNodeId: petaId.get(e.fromNodeId) ?? e.fromNodeId,
    toNodeId: petaId.get(e.toNodeId) ?? e.toNodeId,
  }));

  return { nodes, edges };
}
