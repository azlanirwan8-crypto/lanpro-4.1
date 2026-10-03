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
import type { KonteksFlowchart, FlowchartData, FlowchartDocument } from "../types";
import { adaKonteks } from "../types";

/**
 * Penanda baris papan di tabel Documents — sama dengan `JENIS_PAPAN` di
 * `server/repositories/document.repository.ts`. `src/` tidak bisa mengimpor
 * dari `server/`, jadi keduanya dijaga test `flowchart.service.papan-598.test.ts`.
 */
const JENIS_PAPAN = "flowchart";

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
  documents?: FlowchartDocument[];
  /**
   * #567 — `false` berarti "kosong karena memang kosong". `true` berarti kolomnya
   * ada tapi tidak bisa dibaca, dan papan seperti itu TIDAK BOLEH ditulis balik:
   * satu muat yang rusak cukup untuk menghapus diagram yang benar lewat autosave.
   */
  muatGagal: boolean;
}

/**
 * Membongkar node/edge dari payload kanvas.
 *
 * #567 — dulu SEMUA kegagalan JSON ditelan dan dipulangkan sebagai 0 node, jadi
 * baris yang rusak terasa seperti "papan kosong yang berhasil dimuat" dan lolos
 * sebagai muatan autosave. Kini tiga keadaan dibedakan di lapisan ini, bukan
 * dengan `try` tambahan di pemanggil: kosong (kolomnya tidak ada), terbaca,
 * dan tidak terbaca.
 */
function parseFlowPayload(payloadMentah?: string): IsiKanvas {
  const mentah = (payloadMentah || "").trim();
  if (!mentah) return { nodes: [], edges: [], muatGagal: false };

  let payload: any;
  try {
    payload = JSON.parse(mentah);
  } catch {
    return { nodes: [], edges: [], muatGagal: true };
  }
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.nodes)) {
    return { nodes: [], edges: [], muatGagal: true };
  }

  return {
    nodes: payload.nodes,
    edges: Array.isArray(payload.edges) ? payload.edges : [],
    theme: typeof payload.theme === "string" ? payload.theme : undefined,
    epicTaskId: typeof payload.epicTaskId === "string" ? payload.epicTaskId : undefined,
    konteks: payload.konteks && typeof payload.konteks === "object" ? payload.konteks : undefined,
    documents: Array.isArray(payload.documents)
      ? payload.documents.filter(
          (d: any) => d && typeof d.id === "string" && typeof d.name === "string"
        )
      : undefined,
    muatGagal: false,
  };
}

/**
 * #588 — yang ikut ke basis data HANYA tautan.
 *
 * `fileData` adalah base64 jalur unggah lama: berkas 5 MB menjadi ~6,7 MB teks,
 * dan batas 8 MB #584 akan menolak SELURUH papan — papan itu lalu tidak bisa
 * disimpan lagi di perangkat mana pun. Karena tautannya (mis. SharePoint) sudah
 * bisa dibuka siapa pun yang punya akses, tidak ada alasan mengunggah byte-nya.
 */
function sandiLampiran(dokumen?: FlowchartDocument[]) {
  const tautan = (dokumen || []).filter(
    (d) => d && typeof d.link === "string" && /^https?:\/\//i.test(d.link)
  );
  if (!tautan.length) return undefined;
  return tautan.map((d) => ({
    id: d.id,
    name: d.name,
    link: d.link,
    createdAt: d.createdAt,
    createdBy: d.createdBy,
  }));
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
  const { nodes, edges, theme, epicTaskId, konteks, documents, muatGagal } = parseFlowPayload(
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
    documents,
    muatGagal: muatGagal || undefined,
    versiMuat: doc.updatedAt,
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
  documents?: FlowchartDocument[];
}): string {
  const lampiran = sandiLampiran(flow.documents);
  return JSON.stringify({
    nodes: flow.nodes,
    edges: flow.edges,
    theme: flow.theme || "miro",
    ...(flow.epicTaskId ? { epicTaskId: flow.epicTaskId } : {}),
    // #583 — empat blok detail ikut tersimpan di payload yang sama supaya
    // SETIAP jalur tulis (tombol Simpan, autosave, kirim-saat-keluar) membawanya.
    // Yang tidak ikut terkirim akan hilang saat jalur lain menimpa barisnya.
    ...(adaKonteks(flow.konteks) ? { konteks: flow.konteks } : {}),
    // #588 — tanpa ini, daftar "Tautan Dokumen" hanya hidup di localStorage
    // perangkat: berpindah laptop atau membersihkan cache menghapusnya.
    ...(lampiran ? { documents: lampiran } : {}),
  });
}

/**
 * Mengambil seluruh flowchart milik sebuah proyek.
 * Mengembalikan array kosong bila backend tidak mengirim data yang valid.
 *
 * `type=flowchart` diminta KE SERVER, bukan disaring di sini saja: katalog
 * Dokumentasi kini mengecualikan baris papan (#598), jadi permintaan tanpa
 * jenis tidak akan pernah memulangkan papan. Efek sampingnya enak — daftar ini
 * tidak lagi menarik seluruh dokumen proyek beserta kolom `canvasData`-nya
 * yang berukuran papan.
 */
export async function fetchFlowcharts(projectId: string): Promise<FlowchartData[]> {
  const res: any = await apiRequest(
    `/api/projects/${projectId}/documents?type=${encodeURIComponent(JENIS_PAPAN)}`
  );
  if (!res?.data || !Array.isArray(res.data)) return [];
  return res.data.filter((doc: DocumentRow) => doc.type === JENIS_PAPAN).map(toFlowchartData);
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
    | "documents"
  >
): Promise<string | null> {
  const res: any = await apiRequest(`/api/projects/${projectId}/documents`, {
    method: "POST",
    body: {
      title: flow.name,
      description: flow.description || null,
      canvasData: encodeFlowPayload(flow),
      category: flow.category || null,
      type: JENIS_PAPAN,
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
    /** #568 — stempel yang dibaca terakhir kali; dikirim agar server bisa menolak tab basi. */
    versiDibaca?: string | null;
    externalUrl?: string;
    description?: string;
    category?: string;
    theme?: string;
    epicTaskId?: string;
    konteks?: KonteksFlowchart;
    documents?: FlowchartDocument[];
  }
): Promise<string | null> {
  const res: any = await apiRequest(`/api/projects/${projectId}/documents/${flowId}`, {
    method: "PUT",
    body: {
      versiDibaca: data.versiDibaca ?? null,
      title: data.name,
      description: data.description ?? null,
      canvasData: encodeFlowPayload(data),
      category: data.category ?? null,
      link: data.externalUrl || null,
    },
  });
  // #568 — stempel baru dari server; tanpa ini tab yang sama akan menabrak
  // dirinya sendiri pada kiriman berikutnya.
  return res?.data?.updatedAt ?? null;
}

/** Menghapus flowchart di backend. */
export async function deleteFlowchart(projectId: string, flowId: string): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/documents/${flowId}`, {
    method: "DELETE",
  });
}
