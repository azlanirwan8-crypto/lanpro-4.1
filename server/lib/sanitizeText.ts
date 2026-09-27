/**
 * #348 — sanitasi teks pengguna sebelum disimpan (server).
 * Memakai pustaka `xss` yang sudah ada; jangan reinstall DOMPurify tanpa keputusan.
 */
import xss from "xss";

/** Opsi ketat: strip hampir semua tag HTML dari field teks biasa. */
const OPSIONAL_STRIP = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
} as const;

export function sanitizeUserText(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";
  return xss(String(nilai), OPSIONAL_STRIP as any);
}

/** Untuk field opsional: undefined tetap undefined (tidak dipaksa string kosong). */
export function sanitizeOptionalText(nilai: unknown): string | undefined {
  if (nilai === undefined) return undefined;
  if (nilai === null) return undefined;
  return sanitizeUserText(nilai);
}
