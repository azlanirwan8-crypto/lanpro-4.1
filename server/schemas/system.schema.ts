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

export const dbQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
});

export const dbConfigSchema = z.object({
  connectionString: z.string().optional(),
});
