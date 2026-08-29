import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Judul dokumen tidak boleh kosong")
    .max(255, "Judul dokumen terlalu panjang"),
  description: z.string().max(10000, "Deskripsi dokumen terlalu panjang").optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  link: z.string().max(2048).optional().nullable(),
  fileData: z.string().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
  canvasData: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  createdBy: z.string().max(100).optional().nullable(),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Judul dokumen tidak boleh kosong")
    .max(255, "Judul dokumen terlalu panjang")
    .optional(),
  description: z.string().max(10000, "Deskripsi dokumen terlalu panjang").optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  link: z.string().max(2048).optional().nullable(),
  fileData: z.string().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
  canvasData: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});
