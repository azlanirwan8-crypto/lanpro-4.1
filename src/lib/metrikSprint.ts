/**
 * #464 — satuan burndown/progress: poin bila totalPoints > 0, else hitungan tugas.
 * Selaras SprintSection (#313) dan AUDIT §24.2 / §24.5#6.
 */
export type SatuanMetrikSprint = "points" | "tasks";

export function metrikSprintHybrid(all: { storyPoints?: number | null; done: boolean }[]): {
  satuan: SatuanMetrikSprint;
  total: number;
  done: number;
  remaining: number;
  progressPct: number;
} {
  const totalPoints = all.reduce((acc, t) => acc + (Number(t.storyPoints) || 0), 0);
  if (totalPoints > 0) {
    const donePoints = all
      .filter((t) => t.done)
      .reduce((acc, t) => acc + (Number(t.storyPoints) || 0), 0);
    const remaining = Math.max(0, totalPoints - donePoints);
    return {
      satuan: "points",
      total: totalPoints,
      done: donePoints,
      remaining,
      progressPct: Math.round((donePoints / totalPoints) * 100),
    };
  }
  const total = all.length;
  const done = all.filter((t) => t.done).length;
  return {
    satuan: "tasks",
    total,
    done,
    remaining: Math.max(0, total - done),
    progressPct: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** Bobot satu tugas untuk burndown (poin atau 1). */
export function bobotTugasBurndown(
  task: { storyPoints?: number | null },
  satuan: SatuanMetrikSprint
): number {
  if (satuan === "points") return Number(task.storyPoints) || 0;
  return 1;
}
