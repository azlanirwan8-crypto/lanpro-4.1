import { z } from "zod";
import { MAX_LIMIT } from "../lib/pagination";

/**
 * Query GET /api/audit-logs (#314).
 * projectId LanPro bukan UUID (contoh nanoid `2SGXiPUTwHnF8D576hfO`);
 * jangan memakai z.string().uuid() — itu menolak seluruh filter proyek sungguhan.
 */
export const auditLogsQuerySchema = z.object({
  projectId: z.string().min(1).max(64).optional(),
  entityName: z.string().min(1).max(100).optional(),
  entityId: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});
