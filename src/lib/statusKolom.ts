/**
 * #382 — kunci kolom status ke `code` bila ada, tetap cocok dengan `label`
 * lama di task.status (data warisan).
 */
export type StatusLike = { code?: string | null; label?: string | null };

export function statusColumnKey(status: StatusLike): string {
  const code = (status.code || "").trim();
  if (code) return code;
  return (status.label || "").trim();
}

export function statusKeysForLookup(status: StatusLike): string[] {
  const code = (status.code || "").trim();
  const label = (status.label || "").trim();
  const keys: string[] = [];
  if (code) keys.push(code);
  if (label && label !== code) keys.push(label);
  if (keys.length === 0 && label) keys.push(label);
  return keys;
}

export function tasksForStatusLane<T extends { id: string }>(
  grouped: Record<string, T[]>,
  laneKey: string,
  status: StatusLike
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const k of statusKeysForLookup(status)) {
    for (const t of grouped[`${laneKey}:${k}`] || []) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

export function taskMatchesStatus(
  taskStatus: string | null | undefined,
  status: StatusLike
): boolean {
  const ts = (taskStatus || "").trim().toLowerCase();
  if (!ts) return false;
  return statusKeysForLookup(status).some((k) => k.toLowerCase() === ts);
}

/** Saat drop, tulis `code` bila MasterData punya; fallback label/raw. */
export function resolveStatusWriteValue(
  rawFromDroppable: string,
  masterStatuses: StatusLike[]
): string {
  const raw = (rawFromDroppable || "").trim();
  const hit = masterStatuses.find((s) => {
    const code = (s.code || "").trim();
    const label = (s.label || "").trim();
    return code === raw || label === raw;
  });
  if (!hit) return raw;
  return (hit.code || hit.label || raw).trim();
}
