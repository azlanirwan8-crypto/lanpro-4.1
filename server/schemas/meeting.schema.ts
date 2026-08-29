import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z
    .string()
    .min(1, "Judul rapat tidak boleh kosong")
    .max(255, "Judul rapat maksimal 255 karakter"),
  description: z.string().max(10000, "Deskripsi rapat terlalu panjang").optional().nullable(),
  meetingLink: z.string().max(2048, "Tautan rapat terlalu panjang").optional().nullable(),
  authorId: z.string().max(100).optional().nullable(),
  fileData: z.string().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
});

export const updateMeetingSchema = z.object({
  title: z
    .string()
    .min(1, "Judul rapat tidak boleh kosong")
    .max(255, "Judul rapat maksimal 255 karakter")
    .optional(),
  description: z.string().max(10000, "Deskripsi rapat terlalu panjang").optional().nullable(),
  meetingLink: z.string().max(2048, "Tautan rapat terlalu panjang").optional().nullable(),
  transcript: z.string().optional().nullable(),
  aiSummary: z
    .union([z.string(), z.record(z.string(), z.any())])
    .optional()
    .nullable(),
  fileData: z.string().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
});

export const analyzeTranscriptSchema = z.object({
  transcript: z.string().min(1, "Transkrip tidak boleh kosong"),
  meetingLink: z.string().max(2048).optional().nullable(),
});

export const analyzeVideoSchema = z.object({
  videoPath: z.string().min(1, "Path video tidak boleh kosong"),
  systemPrompt: z.string().optional(),
  prompt: z.string().optional(),
  enableVisual: z.boolean().optional(),
});

export const analyzeMeetingSchema = z.object({
  media_type: z.string().optional(),
  gemini_file_uri: z.string().optional(),
  transcript: z.string().optional(),
});

export const cancelMeetingAnalysisSchema = z.object({
  reason: z.string().optional(),
});
