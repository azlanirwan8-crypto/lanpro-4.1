/**
 * #315 — skema query daftar sesi admin + notifikasi.
 */
import { z } from "zod";
import { listSearchQuerySchema, paginationQuerySchema } from "./pagination.schema";

/** GET /api/admin/sessions */
export const sessionListQuerySchema = listSearchQuerySchema.extend({
  status: z.string().max(64).optional(),
  userId: z.string().max(128).optional(),
});

/** GET /api/admin/users/:userId/activities */
export const userActivitiesQuerySchema = paginationQuerySchema;

/** GET /api/users/:userId/notifications — pagination ringan opsional */
export const notificationsListQuerySchema = paginationQuerySchema;

export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;
