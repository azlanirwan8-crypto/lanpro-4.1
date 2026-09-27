/**
 * #461 / #462 — aturan lingkup & satu sprint aktif.
 * Status kanonik: planned | active | completed (alias aktif ikut dashboard).
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

function adalahSprintSelesai(status: string | null | undefined): boolean {
  return ALIAS_SELESAI.has(
    String(status || "")
      .toLowerCase()
      .trim()
  );
}

/** Lingkup terkunci: tidak boleh menambah/mengurangi tugas tanpa unlockScope. */
export function adalahLingkupTerkunci(status: string | null | undefined): boolean {
  return adalahSprintAktif(status) || adalahSprintSelesai(status);
}

/**
 * #461 — tolak pindah sprintId bila sumber atau tujuan terkunci,
 * kecuali unlockScope (alur tutup sprint).
 */
export function cekPindahLingkupSprint(opts: {
  statusLama: string | null | undefined;
  statusBaru: string | null | undefined;
  /** null = backlog */
  sprintIdLama: string | null | undefined;
  sprintIdBaru: string | null | undefined;
  unlockScope?: boolean;
}): { ok: true } | { ok: false; code: string; message: string } {
  if (opts.unlockScope) return { ok: true };

  const lama = opts.sprintIdLama || null;
  const baru = opts.sprintIdBaru || null;
  if (lama === baru) return { ok: true };

  if (lama && adalahLingkupTerkunci(opts.statusLama)) {
    return {
      ok: false,
      code: "srv.sprint_lingkup_terkunci",
      message:
        "Lingkup sprint terkunci (aktif/selesai). Pindahkan tugas saat menutup sprint, atau kembalikan sprint ke planned.",
    };
  }

  if (baru && adalahLingkupTerkunci(opts.statusBaru)) {
    return {
      ok: false,
      code: "srv.sprint_lingkup_terkunci_tujuan",
      message:
        "Tidak bisa menambah tugas ke sprint yang sedang aktif atau sudah selesai (penguncian lingkup).",
    };
  }

  return { ok: true };
}
