import { z } from "zod";

export const testEmailSchema = z.object({
  targetEmail: z.string().email("Alamat email tujuan tidak valid atau kosong"),
});

export const whatsappBroadcastConfigSchema = z.object({
  scheduleDays: z
    .array(z.string().regex(/^[1-7]$/, "Hari tidak valid"))
    .min(1, "Pilih minimal satu hari untuk jadwal broadcast"),
  scheduleTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid, gunakan HH:MM"),
  recipientIds: z.array(z.string()).optional(),
  messageTemplate: z.string().optional(),
});

export const emailIntegrationConfigSchema = z.object({
  provider: z.enum(["smtp", "resend"]).optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.union([z.number(), z.string()]).optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPass: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  senderEmail: z.string().max(255).optional(),
  senderName: z.string().max(255).optional(),
  apiKey: z.string().optional(),
  subjectTemplate: z.string().optional(),
  bodyTemplate: z.string().optional(),
});

/**
 * Item #259 — batas panjang ditambahkan; skema aslinya (#247) tidak
 * membatasi panjang `query` sama sekali. Pemeriksa SQL di
 * `db-admin.routes.ts` (satu statement, awalan SELECT/SHOW/DESCRIBE, tanpa
 * kata kunci terlarang) tetap pertahanan utamanya — batas ini cuma mencegah
 * string raksasa lolos sampai ke sana.
 */
export const dbQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Query is required")
    .max(5000, "Query terlalu panjang (maksimum 5000 karakter)"),
});

/**
 * Item #259 — batas panjang ditambahkan pada `dbConfigSchema` yang sudah
 * dibuat #247 tetapi tidak pernah dipasang di rute mana pun (skema yatim).
 * Dipakai di dua rute: uji koneksi (`/api/system/db-config`, tidak
 * mengubah apa pun) dan tukar-sambung LANGSUNG (`/api/system/db-config/save`,
 * `force: true` — koneksi produksi berpindah seketika). Keduanya
 * `verifyGlobalAdmin`, tapi itu bukan alasan untuk menerima string tak
 * berbatas pada rute yang bisa memutus koneksi database yang sedang aktif.
 */
export const dbConfigSchema = z.object({
  connectionString: z
    .string()
    .max(500, "Connection string terlalu panjang (maksimum 500 karakter)")
    .optional(),
});
