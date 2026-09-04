/**
 * Filter anti-halu bersama untuk notulen AI (#320 unggah/live, #440 tempel).
 *
 * Klaim UNVERIFIED tanpa kutipan transkrip dibuang. Duplikasi filter di dua
 * jalur adalah utang — satu fungsi ini yang dipakai keduanya.
 */

export function filterKlaimTerverifikasi(
  items: unknown,
  claimKeys: string[]
): Record<string, unknown>[] {
  return (Array.isArray(items) ? items : []).filter((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const baris = item as Record<string, unknown>;
    const status = String(baris.status_bukti || "").toUpperCase();
    const bukti = String(baris.bukti_cuplikan || "").trim();
    if (status === "UNVERIFIED" && !bukti) return false;
    return claimKeys.some((k) => String(baris[k] || "").trim());
  });
}

/** Skema jalur tempel/sunting (`analyze-transcript`), bukan skema pipeline unggah. */
export function saringHasilAnalisisTempel(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...parsed,
    poin_diskusi_tambahan: filterKlaimTerverifikasi(parsed.poin_diskusi_tambahan, [
      "concern",
      "tindakanLanjut",
    ]),
    next_plan: filterKlaimTerverifikasi(parsed.next_plan, ["tahapan", "deskripsi"]),
    notulen_rapat: filterKlaimTerverifikasi(parsed.notulen_rapat, ["topik", "pembahasan"]),
  };
}
