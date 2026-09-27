import { z } from "zod";

export const createDiscussionPointSchema = z.object({
  parentPointId: z.string().max(100).optional().nullable(),
  parent_point_id: z.string().max(100).optional().nullable(),
  assignTo: z.string().max(100).optional().nullable(),
  assignee_id: z.string().max(100).optional().nullable(),
  concern: z.string().max(10000, "Uraian concern terlalu panjang").optional().nullable(),
  fitur: z.string().max(255).optional().nullable(),
  feature_id: z.string().max(100).optional().nullable(),
  system: z.string().max(255).optional().nullable(),
  system_id: z.string().max(100).optional().nullable(),
  surrounding: z.string().max(255).optional().nullable(),
  surrounding_id: z.string().max(100).optional().nullable(),
  keterangan: z.string().max(10000, "Keterangan terlalu panjang").optional().nullable(),
  tindakanLanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  tindakan_lanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  targetDate: z.string().max(100).optional().nullable(),
  target_date: z.string().max(100).optional().nullable(),
  tanggalUpdateStatus: z.string().max(100).optional().nullable(),
  authorId: z.string().max(100).optional().nullable(),
});

export const updateDiscussionPointSchema = z.object({
  parentPointId: z.string().max(100).optional().nullable(),
  parent_point_id: z.string().max(100).optional().nullable(),
  assignTo: z.string().max(100).optional().nullable(),
  assignee_id: z.string().max(100).optional().nullable(),
  concern: z.string().max(10000, "Uraian concern terlalu panjang").optional().nullable(),
  fitur: z.string().max(255).optional().nullable(),
  feature_id: z.string().max(100).optional().nullable(),
  system: z.string().max(255).optional().nullable(),
  system_id: z.string().max(100).optional().nullable(),
  surrounding: z.string().max(255).optional().nullable(),
  surrounding_id: z.string().max(100).optional().nullable(),
  keterangan: z.string().max(10000, "Keterangan terlalu panjang").optional().nullable(),
  tindakanLanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  tindakan_lanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  targetDate: z.string().max(100).optional().nullable(),
  target_date: z.string().max(100).optional().nullable(),
  tanggalUpdateStatus: z.string().max(100).optional().nullable(),
});

export const createCommentSchema = z.object({
  commentText: z
    .string()
    .min(1, "Teks komentar wajib diisi")
    .max(5000, "Teks komentar terlalu panjang"),
  userId: z.string().max(100).optional(),
  userName: z.string().max(100).optional(),
});

export const updateCommentSchema = z.object({
  commentText: z
    .string()
    .min(1, "Teks komentar wajib diisi")
    .max(5000, "Teks komentar terlalu panjang"),
});
