/**
 * screenContext — "mata" untuk LanPro AI Assistant.
 *
 * Saat user membuka flowchart, FlowchartView men-publish snapshot kanvas
 * (nama diagram, daftar bentuk + label, koneksi antar-bentuk, node terpilih)
 * ke registry ini. LiveChatWidget ikut mengirim snapshot tersebut bersama
 * pesan chat, sehingga AI bisa menjawab pertanyaan seperti
 * "flow saya sudah ok belum?" berdasarkan apa yang sedang dibuka user.
 *
 * Ini murni state di memori browser — tidak ada screenshot, tidak ada data
 * yang dikirim ke server sampai user benar-benar mengirim chat.
 */

export interface ScreenNodeSummary {
  id: string;
  type: string;
  label: string;
}

export interface ScreenEdgeSummary {
  fromLabel: string;
  toLabel: string;
  label?: string;
}

export interface ScreenSnapshot {
  /** Nama view aplikasi, mis. "flowchart", "dashboard". */
  view: string;
  /** Judul flowchart yang sedang dibuka editor-nya. */
  flowName: string | null;
  nodes: ScreenNodeSummary[];
  edges: ScreenEdgeSummary[];
  selectedNodeId: string | null;
  updatedAt: number;
}

/** Snapshot dianggap basi setelah 5 menit tanpa update. */
const STALE_MS = 5 * 60 * 1000;
/** Batas ukuran agar prompt tetap hemat token. */
const MAX_NODES = 60;
const MAX_EDGES = 80;
const MAX_LABEL_LEN = 80;

let current: ScreenSnapshot | null = null;

export function setScreenSnapshot(snapshot: ScreenSnapshot): void {
  current = snapshot;
}

export function clearScreenSnapshot(): void {
  current = null;
}

/** Ambil snapshot layar aktif; null jika tidak ada atau sudah basi. */
function getScreenSnapshot(): ScreenSnapshot | null {
  if (!current) return null;
  if (Date.now() - current.updatedAt > STALE_MS) return null;
  return current;
}

const clampLabel = (s: string) => (s || "").replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LEN);

/**
 * Render snapshot jadi teks deskriptif untuk prompt Gemini.
 * Mengembalikan null kalau tidak ada yang layak dikirim.
 */
export function formatScreenContextForAI(snapshot?: ScreenSnapshot | null): string | null {
  const snap = snapshot ?? getScreenSnapshot();
  if (!snap) return null;

  // Snapshot dari klien sudah dipangkas; potong lagi demi keamanan.
  const nodes = snap.nodes.slice(0, MAX_NODES);
  const edges = snap.edges.slice(0, MAX_EDGES);
  if (nodes.length === 0 && edges.length === 0) return null;

  const lines: string[] = [];
  lines.push(`Aplikasi sedang membuka view "${snap.view}".`);
  if (snap.flowName) lines.push(`Nama diagram: "${snap.flowName}".`);
  lines.push(`Jumlah bentuk: ${snap.nodes.length}, jumlah koneksi: ${snap.edges.length}.`);

  lines.push("Bentuk pada kanvas (label [jenis]):");
  for (const n of nodes) {
    lines.push(`- ${clampLabel(n.label) || "(tanpa label)"} [${n.type}]`);
  }

  if (edges.length > 0) {
    lines.push("Koneksi antar-bentuk (dari -> ke):");
    for (const e of edges) {
      const edgeLabel = e.label ? ` : "${clampLabel(e.label)}"` : "";
      lines.push(
        `- ${clampLabel(e.fromLabel) || "?"} -> ${clampLabel(e.toLabel) || "?"}${edgeLabel}`
      );
    }
  }

  if (snap.selectedNodeId) {
    const sel = snap.nodes.find((n) => n.id === snap.selectedNodeId);
    if (sel) {
      lines.push(
        `Node yang sedang dipilih user: "${clampLabel(sel.label) || "(tanpa label)"}" [${sel.type}].`
      );
    }
  }

  return lines.join("\n");
}
