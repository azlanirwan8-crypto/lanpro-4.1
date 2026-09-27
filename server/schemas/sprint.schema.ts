import { z } from "zod";

export const createSprintSchema = z.object({
  name: z.string().min(1, "Nama sprint tidak boleh kosong").max(255, "Nama sprint terlalu panjang"),
  goal: z.string().max(10000, "Tujuan sprint terlalu panjang").optional().nullable(),
  startDate: z.string().max(100).optional().nullable(),
  endDate: z.string().max(100).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
});

export const updateSprintSchema = z.object({
  name: z
    .string()
    .min(1, "Nama sprint tidak boleh kosong")
    .max(255, "Nama sprint terlalu panjang")
    .optional(),
  goal: z.string().max(10000, "Tujuan sprint terlalu panjang").optional().nullable(),
  startDate: z.string().max(100).optional().nullable(),
  endDate: z.string().max(100).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
});
