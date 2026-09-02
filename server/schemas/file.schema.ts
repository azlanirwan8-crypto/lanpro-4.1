/**
 * #315 — skema query rute unggah/stream berkas.
 * Magic-bytes tetap di fileSecurity; Zod mengunci query stream.
 */
import { z } from "zod";

/** GET /api/v1/files/secure-stream */
export const fileSecureStreamQuerySchema = z.object({
  file: z.string().min(1).max(255),
  expires: z.string().max(64).optional(),
  token: z.string().min(8).max(2048).optional(),
  uid: z.string().max(128).optional(),
});

export type FileSecureStreamQuery = z.infer<typeof fileSecureStreamQuerySchema>;
