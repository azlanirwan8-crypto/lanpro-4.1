/**
 * Kanonik metodologi proyek — satu casing untuk seluruh penjaga backend (#311).
 * POST /methodology sudah menyimpan UPPERCASE; jalur edit modal masih Title Case.
 */

export function normalisasiMetodologi(nilai: unknown): string {
  if (nilai == null || nilai === "") return "";
  return String(nilai).trim().toUpperCase();
}

export function adalahWaterfall(nilai: unknown): boolean {
  return normalisasiMetodologi(nilai) === "WATERFALL";
}
