/**
 * #457 — Iris tipis: edge dependency Gantt dari LinkedTasks (blocks / is_blocked_by).
 * Bukan critical path — hanya pasangan yang terlihat di renderedRows dan punya tanggal.
 */

export type GanttLinkRingkas = {
  targetTaskId: string;
  relationType?: string;
};

export type GanttTaskRingkas = {
  id: string;
  startDate?: unknown;
  endDate?: unknown;
  linkedTasks?: GanttLinkRingkas[];
};

export type GanttRowRingkas = {
  task: GanttTaskRingkas;
};

export type GanttDepEdge = {
  id: string;
  fromId: string;
  toId: string;
  fromIndex: number;
  toIndex: number;
};

/**
 * Normalisasi: hanya panah blocker → blocked.
 * - `blocks`: from = task pemilik link, to = target
 * - `is_blocked_by`: from = target, to = task pemilik (inverse)
 * Dedup by fromId→toId.
 */
export function kumpulkanEdgeBlocks(
  rows: GanttRowRingkas[],
  semuaTasks: GanttTaskRingkas[] = []
): GanttDepEdge[] {
  const indexById = new Map<string, number>();
  rows.forEach((r, i) => indexById.set(r.task.id, i));

  const punyaTanggal = (t: GanttTaskRingkas | undefined) => !!(t && t.startDate && t.endDate);

  const taskById = new Map<string, GanttTaskRingkas>();
  for (const t of semuaTasks) taskById.set(t.id, t);
  for (const r of rows) taskById.set(r.task.id, r.task);

  const seen = new Set<string>();
  const edges: GanttDepEdge[] = [];

  const tambah = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = indexById.get(fromId);
    const toIndex = indexById.get(toId);
    if (fromIndex == null || toIndex == null) return;
    const fromTask = taskById.get(fromId);
    const toTask = taskById.get(toId);
    if (!punyaTanggal(fromTask) || !punyaTanggal(toTask)) return;
    const key = `${fromId}->${toId}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ id: key, fromId, toId, fromIndex, toIndex });
  };

  for (const row of rows) {
    const links = row.task.linkedTasks || [];
    for (const link of links) {
      const targetId = link.targetTaskId;
      if (!targetId) continue;
      const rel = (link.relationType || "").toLowerCase();
      if (rel === "blocks") {
        tambah(row.task.id, targetId);
      } else if (rel === "is_blocked_by") {
        tambah(targetId, row.task.id);
      }
    }
  }

  return edges;
}

/**
 * Tinggi satu baris roadmap. SATU-SATUNYA angka yang boleh dipakai untuk
 * tinggi baris — panel membacanya lewat inline style, bukan kelas Tailwind,
 * supaya lajur kiri (Item & Hierarki), lajur Gantt, dan geometri garis
 * dependensi tidak bisa berbeda pendapat lagi.
 *
 * #608 — dulu 56 px. Pemilik proyek 04 Okt: "bisa didekatkan lagi nggak jarak
 * barisnya, ini masih kelihatan jauh, coba standarnya table gimana agar clean
 * dan enak, cek di project management roadmap lain". 56 px itu 1,4x–1,75x
 * kerapatan daftar isu di aplikasi ini sendiri (baris `py-1.5` ≈ 34-38 px) dan
 * di atas kerapatan roadmap Jira/Linear/ClickUp yang duduk di 32-44 px. 40 px
 * masih menampung dua chip label setinggi 20 px dengan ruang 10 px di atas dan
 * bawahnya, dan tetap terbaca satu baris per isu.
 */
export const GANTT_ROW_PX = 40;

/** Path siku orthogonal dalam viewBox x=0..100 (%), y=px. */
export function pathSikuDep(x1: number, y1: number, x2: number, y2: number): string {
  const mid = x1 + Math.max(2, (x2 - x1) / 2);
  if (Math.abs(y1 - y2) < 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
}
