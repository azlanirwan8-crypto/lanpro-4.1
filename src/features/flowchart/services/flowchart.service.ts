/**
 * Lapisan akses data Flowchart.
 *
 * Diekstrak dari FlowchartContainer.tsx (Fase 3 — Anti-God-Object).
 *
 * Satu-satunya tempat komponen Flowchart berbicara dengan backend. Komponen
 * tidak lagi menyusun URL atau membentuk body request sendiri.
 *
 * Flowchart disimpan di tabel Documents dengan `type: "flowchart"`; struktur
 * node dan edge-nya diserialisasi sebagai JSON ke dalam kolom `canvasData`.
 * Detail penyandian itu sengaja dikurung di file ini.
 *
 * Item #136 — sebelumnya payload menumpang kolom `description`, sehingga
 * daftar Dokumentasi (yang menampilkan description sebagai subjudul untuk
 * SEMUA dokumen) memuntahkan JSON mentah ke layar. Kini `description` kembali
 * menjadi deskripsi manusia dan ikut disimpan; dulu ia selalu tertimpa
 * payload, jadi apa pun yang diketik pengguna terbuang diam-diam.
 */

import { apiRequest } from "../../../lib/api";
import type { FlowchartData } from "../types";

/** Bentuk baris Documents yang dikembalikan backend. */
interface DocumentRow {
  id: string;
  title: string;
  description?: string;
  canvasData?: string;
  type?: string;
  link?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Mengenali string yang berbentuk payload kanvas, bukan deskripsi manusia. */
function isCanvasPayload(nilai?: string): boolean {
  const s = (nilai || "").trimStart();
  return s.startsWith("{") && s.includes('"nodes"');
}

/** Membongkar node/edge dari payload kanvas. */
function parseFlowPayload(payloadMentah?: string): { nodes: any[]; edges: any[] } {
  try {
    const payload = JSON.parse(payloadMentah || "{}");
    return { nodes: payload.nodes || [], edges: payload.edges || [] };
  } catch {
    return { nodes: [], edges: [] };
  }
}

/** Mengubah baris Documents menjadi FlowchartData yang dipakai UI. */
function toFlowchartData(doc: DocumentRow): FlowchartData {
  // Baris yang belum tersentuh migrasi #136 masih menyimpan payload di
  // `description`. Dibaca sebagai cadangan supaya diagram lama tetap terbuka
  // walau backfill belum sempat berjalan di lingkungan itu.
  const payloadLama = isCanvasPayload(doc.description) ? doc.description : undefined;
  const { nodes, edges } = parseFlowPayload(doc.canvasData || payloadLama);
  return {
    id: doc.id,
    name: doc.title,
    category: "Panduan",
    // Jangan pernah teruskan payload kanvas sebagai deskripsi manusia.
    description: payloadLama ? "" : (doc.description ?? ""),
    nodes,
    edges,
    theme: "miro",
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toLocaleDateString("id-ID")
      : new Date().toLocaleDateString("id-ID"),
    createdBy: doc.createdBy || "Administrator",
    lastEditedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toLocaleString("id-ID")
      : new Date().toLocaleString("id-ID"),
    externalUrl: doc.link || "",
  };
}

/** Menyandikan node/edge menjadi payload kolom canvasData. */
function encodeFlowPayload(flow: Pick<FlowchartData, "nodes" | "edges">): string {
  return JSON.stringify({ nodes: flow.nodes, edges: flow.edges });
}

/**
 * Mengambil seluruh flowchart milik sebuah proyek.
 * Mengembalikan array kosong bila backend tidak mengirim data yang valid.
 */
export async function fetchFlowcharts(projectId: string): Promise<FlowchartData[]> {
  const res: any = await apiRequest(`/api/projects/${projectId}/documents`);
  if (!res?.data || !Array.isArray(res.data)) return [];
  return res.data.filter((doc: DocumentRow) => doc.type === "flowchart").map(toFlowchartData);
}

/** Membuat flowchart baru di backend. */
export async function createFlowchart(
  projectId: string,
  flow: Pick<
    FlowchartData,
    "name" | "nodes" | "edges" | "externalUrl" | "createdBy" | "description"
  >
): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/documents`, {
    method: "POST",
    body: {
      title: flow.name,
      description: flow.description || null,
      canvasData: encodeFlowPayload(flow),
      type: "flowchart",
      link: flow.externalUrl || null,
      createdBy: flow.createdBy,
    },
  });
}

/** Memperbarui metadata dan isi flowchart yang sudah ada. */
export async function updateFlowchart(
  projectId: string,
  flowId: string,
  data: {
    name: string;
    nodes: any[];
    edges: any[];
    externalUrl?: string;
    description?: string;
  }
): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/documents/${flowId}`, {
    method: "PUT",
    body: {
      title: data.name,
      description: data.description ?? null,
      canvasData: encodeFlowPayload({ nodes: data.nodes, edges: data.edges }),
      link: data.externalUrl || null,
    },
  });
}

/** Menghapus flowchart di backend. */
export async function deleteFlowchart(projectId: string, flowId: string): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/documents/${flowId}`, {
    method: "DELETE",
  });
}
