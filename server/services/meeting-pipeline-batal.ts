/**
 * #441 — batal analisis vs pekerja latar.
 *
 * POST cancel mereset upload_status ke IDLE. Pipeline yang sudah jalan harus
 * berhenti menulis COMPLETED/FAILED.
 */

export class PipelineDibatalkanError extends Error {
  constructor() {
    super("PIPELINE_DIBATALKAN");
    this.name = "PipelineDibatalkanError";
  }
}

export function pipelineDibatalkan(status: unknown): boolean {
  return String(status || "").toUpperCase() === "IDLE";
}

export function updateMenyentuhBaris(hasil: { affectedRows?: number; rowCount?: number }): boolean {
  return (hasil?.affectedRows ?? 0) > 0 || (hasil?.rowCount ?? 0) > 0;
}
