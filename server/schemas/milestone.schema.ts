import { z } from "zod";

export const createMilestoneSchema = z.object({
  name: z
    .string()
    .min(1, "Nama milestone tidak boleh kosong")
    .max(255, "Nama milestone terlalu panjang"),
  description: z.string().max(10000, "Deskripsi milestone terlalu panjang").optional().nullable(),
  dueDate: z.string().max(100).optional().nullable(),
  sprintIds: z.array(z.string()).optional(),
});

export const updateMilestoneSchema = z.object({
  name: z
    .string()
    .min(1, "Nama milestone tidak boleh kosong")
    .max(255, "Nama milestone terlalu panjang")
    .optional(),
  description: z.string().max(10000, "Deskripsi milestone terlalu panjang").optional().nullable(),
  dueDate: z.string().max(100).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  sprintIds: z.array(z.string()).optional(),
});
