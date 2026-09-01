/**
 * Status terminal tugas (#313).
 * Sumber kebenaran: MasterData type=status dengan isTerminal=true.
 * Mencocokkan code ATAU label (data lama sering simpan label).
 */

export type StatusMasterLike = {
  type?: string;
  label?: string;
  code?: string | null;
  isTerminal?: boolean | number | null;
};

/** Seed sementara bila kolom isTerminal belum terisi di DB. UAT = terminal (keputusan #313). */
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

/**
 * Kumpulan kunci terminal (code + label, dinormalisasi).
 * Bila ada baris status dengan isTerminal terdefinisi, hanya yang true dipakai.
 * Bila belum ada flag sama sekali → fallback seed (migrasi belum jalan).
 */
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

/** Helper lama berbasis substring — sengaja untuk tes MERAH #313. */
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
