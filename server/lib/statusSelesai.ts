/**
 * Status terminal tugas (#313) — salinan logika FE di server/lib.
 * Sumber: MasterData type=status + isTerminal.
 * Impor db LAZY di muatKunciTerminal agar tes murni tidak menyentuh pool.
 */

export type StatusMasterLike = {
  type?: string;
  label?: string;
  code?: string | null;
  isTerminal?: boolean | number | null;
};

export const FALLBACK_STATUS_TERMINAL = [
  "done",
  "selesai",
  "uat",
  "completed",
  "resolved",
  "closed",
] as const;

function normalisasiStatus(nilai: unknown): string {
  if (nilai == null) return "";
  return String(nilai).trim().toLowerCase();
}

function flagTerisi(nilai: unknown): boolean {
  return nilai === true || nilai === false || nilai === 1 || nilai === 0;
}

function adalahTerminalFlag(nilai: unknown): boolean {
  return nilai === true || nilai === 1;
}

export function kumpulanTerminal(masterData?: StatusMasterLike[] | null): Set<string> {
  const set = new Set<string>();
  const statuses = (masterData || []).filter((d) => normalisasiStatus(d.type) === "status");
  const adaFlag = statuses.some((d) => flagTerisi(d.isTerminal));

  if (adaFlag) {
    for (const d of statuses) {
      if (!adalahTerminalFlag(d.isTerminal)) continue;
      if (d.code) set.add(normalisasiStatus(d.code));
      if (d.label) set.add(normalisasiStatus(d.label));
    }
    return set;
  }

  for (const s of FALLBACK_STATUS_TERMINAL) set.add(s);
  return set;
}

export function statusSelesai(status: unknown, masterData?: StatusMasterLike[] | null): boolean {
  const n = normalisasiStatus(status);
  if (!n) return false;
  return kumpulanTerminal(masterData).has(n);
}

export function statusSelesaiLamaSubstring(status: unknown): boolean {
  const s = normalisasiStatus(status);
  return (
    s.includes("done") ||
    s.includes("completed") ||
    s.includes("selesai") ||
    s.includes("uat") ||
    s.includes("closed") ||
    s.includes("resolved")
  );
}

/** Muat kunci terminal dari DB (label + code). */
export async function muatKunciTerminal(connectionOpsional?: any): Promise<string[]> {
  let connection = connectionOpsional;
  let harusRelease = false;
  if (!connection) {
    const db = (await import("../../src/lib/db")).default;
    connection = await db.getConnection();
    harusRelease = true;
  }
  try {
    if (!connection || typeof connection.query !== "function") {
      return [...FALLBACK_STATUS_TERMINAL];
    }
    const [rows]: any = await connection.query(
      `SELECT code, label, "isTerminal" AS "isTerminal", type FROM MasterData WHERE type = ?`,
      ["status"]
    );
    return Array.from(kumpulanTerminal(rows || []));
  } catch {
    return [...FALLBACK_STATUS_TERMINAL];
  } finally {
    if (harusRelease && connection && typeof connection.release === "function") {
      connection.release();
    }
  }
}

export function sqlStatusBukanTerminal(ekspresiKolom: string, kunci: string[]): string {
  if (!kunci.length) {
    return `LOWER(${ekspresiKolom}) NOT IN ('done','selesai','uat','completed','resolved','closed')`;
  }
  const list = kunci.map((k) => `'${k.replace(/'/g, "''")}'`).join(",");
  return `LOWER(${ekspresiKolom}) NOT IN (${list})`;
}

export function sqlStatusAdalahTerminal(ekspresiKolom: string, kunci: string[]): string {
  if (!kunci.length) {
    return `LOWER(${ekspresiKolom}) IN ('done','selesai','uat','completed','resolved','closed')`;
  }
  const list = kunci.map((k) => `'${k.replace(/'/g, "''")}'`).join(",");
  return `LOWER(${ekspresiKolom}) IN (${list})`;
}
