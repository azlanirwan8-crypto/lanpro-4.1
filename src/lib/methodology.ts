/**
 * Kanonik metodologi proyek — selaras server/lib/methodology.ts (#311).
 * Nilai tersimpan: UPPERCASE (WATERFALL, AGILE, …). Label UI boleh Title Case.
 */

export function normalisasiMetodologi(nilai: unknown): string {
  if (nilai == null || nilai === "") return "";
  return String(nilai).trim().toUpperCase();
}

export function adalahWaterfall(nilai: unknown): boolean {
  return normalisasiMetodologi(nilai) === "WATERFALL";
}
