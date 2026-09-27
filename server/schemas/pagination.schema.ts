import { z } from "zod";
import { MAX_LIMIT } from "../lib/pagination";

/** Query pagination opsional — dipakai bersama filter modul lain. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

/** Pagination + pencarian teks untuk daftar modul. */
export const listSearchQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(200).optional(),
});

/** Daftar dokumen: pagination + search + filter tipe. */
export const documentListQuerySchema = listSearchQuerySchema.extend({
  type: z.string().max(255).optional(),
});

/** Daftar QA test case: pagination + search + suite. */
export const qaCaseListQuerySchema = listSearchQuerySchema.extend({
  suiteId: z.string().max(255).optional(),
});

/** Daftar tugas Issue List: pagination root + search (#318). */
export const taskListQuerySchema = listSearchQuerySchema.extend({
  rootsOnly: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ListSearchQuery = z.infer<typeof listSearchQuerySchema>;
