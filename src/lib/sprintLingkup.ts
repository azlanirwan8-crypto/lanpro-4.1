/**
 * #461 / #462 — mirror aturan server untuk UX Planning (tanpa network).
 */
const ALIAS_AKTIF = new Set(["active", "in_progress", "ongoing", "in progress"]);
const ALIAS_SELESAI = new Set(["completed", "done", "closed"]);

export function adalahSprintAktif(status: string | null | undefined): boolean {
  return ALIAS_AKTIF.has(
    String(status || "")
      .toLowerCase()
      .trim()
  );
}

export function adalahLingkupTerkunci(status: string | null | undefined): boolean {
  const s = String(status || "")
    .toLowerCase()
    .trim();
  return ALIAS_AKTIF.has(s) || ALIAS_SELESAI.has(s);
}
