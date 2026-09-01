/**
 * @deprecated #313 — gunakan statusSelesai(status, masterData) dari lib/statusSelesai.
 * Dibiarkan sebagai alias fallback seed agar impor lama tidak putus.
 */
import { FALLBACK_STATUS_TERMINAL } from "./statusSelesai";

export const TERMINAL_STATUSES = [...FALLBACK_STATUS_TERMINAL];
