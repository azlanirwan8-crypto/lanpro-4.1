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
import type { KonteksFlowchart, FlowchartData } from "../types";
import { adaKonteks } from "../types";

/** Bentuk baris Documents yang dikembalikan backend. */
interface DocumentRow {
  id: string;
  title: string;
  description?: string;
  canvasData?: string;
  category?: string;
  type?: string;
  link?: string;
  createdBy?: string;
  createdByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Mengenali string yang berbentuk payload kanvas, bukan deskripsi manusia. */
function isCanvasPayload(nilai?: string): boolean {
  const s = (nilai || "").trimStart();
  return s.startsWith("{") && s.includes('"nodes"');
}

/** Isi payload kolom `canvasData` — milik kami sendiri, jadi boleh bertambah tanpa migrasi. */
interface IsiKanvas {
  nodes: any[];
  edges: any[];
  theme?: string;
  epicTaskId?: string;
  konteks?: Record<string, unknown>;
}

/** Membongkar node/edge dari payload kanvas. */
function parseFlowPayload(payloadMentah?: string): IsiKanvas {
  try {
    const payload = JSON.parse(payloadMentah || "{}");
    return {
      nodes: payload.nodes || [],
      edges: payload.edges || [],
      theme: typeof payload.theme === "string" ? payload.theme : undefined,
      epicTaskId: typeof payload.epicTaskId === "string" ? payload.epicTaskId : undefined,
      konteks: payload.konteks && typeof payload.konteks === "object" ? payload.konteks : undefined,
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

/** Hanya menerima empat blok teks; apa pun yang bukan string dibuang, bukan ditebak. */
function bacaKonteks(mentah?: Record<string, unknown>): KonteksFlowchart | undefined {
  if (!mentah) return undefined;
  const teks = (v: unknown) => (typeof v === "string" ? v : "");
  const hasil: KonteksFlowchart = {
    masalah: teks(mentah.masalah),
    titikNyeri: teks(mentah.titikNyeri),
    cara: teks(mentah.cara),
    manfaat: teks(mentah.manfaat),
  };
  return adaKonteks(hasil) ? hasil : undefined;
}

/**
 * Mengubah baris Documents menjadi FlowchartData yang dipakai UI.
 *
 * #570 — `theme` dulu dikeraskan "miro" di sini padahal `canvasTheme` ikut ke
 * dalam `isiPapan` autosave: mengganti tema memicu kiriman, server menyimpan,
 * dan muat berikutnya kembali ke "miro". Status "Tersimpan" saat itu bohong.
 * Tema dan tautan epic kini ikut tersimpan di payload kanvas.
 */
function toFlowchartData(doc: DocumentRow): FlowchartData {
  // Baris yang belum tersentuh migrasi #136 masih menyimpan payload di
  // `description`. Dibaca sebagai cadangan supaya diagram lama tetap terbuka
  // walau backfill belum sempat berjalan di lingkungan itu.
  const payloadLama = isCanvasPayload(doc.description) ? doc.description : undefined;
  const { nodes, edges, theme, epicTaskId, konteks } = parseFlowPayload(
    doc.canvasData || payloadLama
  );
  return {
    id: doc.id,
    name: doc.title,
    // Item #144 — dulu dikeraskan "Panduan" di sini, sementara `category` juga
    // tidak pernah dikirim saat menyimpan. Akibatnya pilihan pengguna di modal
    // dibuang diam-diam dan SETIAP diagram tampil "Panduan" setelah dimuat
    // ulang. Kosong dibiarkan kosong; yang menampilkan boleh memilih teksnya.
    category: doc.category ?? "",
    // Jangan pernah teruskan payload kanvas sebagai deskripsi manusia.
    description: payloadLama ? "" : (doc.description ?? ""),
    nodes,
    edges,
    theme: theme === "blueprint" ? "blueprint" : "miro",
    epicTaskId: epicTaskId || undefined,
    konteks: bacaKonteks(konteks),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toLocaleDateString("id-ID")
      : new Date().toLocaleDateString("id-ID"),
    createdBy: doc.createdBy || "",
    createdByName: doc.createdByName ?? null,
    lastEditedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toLocaleString("id-ID")
      : new Date().toLocaleString("id-ID"),
    externalUrl: doc.link || "",
  };
}

/** Menyandikan isi papan menjadi payload kolom canvasData. */
function encodeFlowPayload(flow: {
  nodes: any[];
  edges: any[];
  theme?: string;
  epicTaskId?: string;
  konteks?: KonteksFlowchart;
}): string {
  return JSON.stringify({
    nodes: flow.nodes,
    edges: flow.edges,
    theme: flow.theme || "miro",
    ...(flow.epicTaskId ? { epicTaskId: flow.epicTaskId } : {}),
    // #583 — empat blok detail ikut tersimpan di payload yang sama supaya
    // SETIAP jalur tulis (tombol Simpan, autosave, kirim-saat-keluar) membawanya.
    // Yang tidak ikut terkirim akan hilang saat jalur lain menimpa barisnya.
    ...(adaKonteks(flow.konteks) ? { konteks: flow.konteks } : {}),
  });
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

/** Membuat flowchart baru di backend. Mengembalikan id server bila sukses. */
export async function createFlowchart(
  projectId: string,
  flow: Pick<
    FlowchartData,
    | "name"
    | "nodes"
    | "edges"
    | "externalUrl"
    | "createdBy"
    | "description"
    | "category"
    | "theme"
    | "epicTaskId"
    | "konteks"
  >
): Promise<string | null> {
  const res: any = await apiRequest(`/api/projects/${projectId}/documents`, {
    method: "POST",
    body: {
      title: flow.name,
      description: flow.description || null,
      canvasData: encodeFlowPayload(flow),
      category: flow.category || null,
      type: "flowchart",
      link: flow.externalUrl || null,
      createdBy: flow.createdBy,
    },
  });
  return res?.status === "success" && res?.data?.id ? String(res.data.id) : null;
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
    category?: string;
    theme?: string;
    epicTaskId?: string;
    konteks?: KonteksFlowchart;
  }
): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/documents/${flowId}`, {
    method: "PUT",
    body: {
      title: data.name,
      description: data.description ?? null,
      canvasData: encodeFlowPayload(data),
      category: data.category ?? null,
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
