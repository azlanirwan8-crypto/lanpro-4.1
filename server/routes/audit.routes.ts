import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { jagaAuditLogBaca } from "../middleware/jagaAuditLog";
import { validasiQuery } from "../middleware/validate";
import { auditLogsQuerySchema } from "../schemas/audit.schema";
import { auditRepository } from "../repositories/audit.repository";
import { listSuccessPayload, parsePaginationQuery } from "../lib/pagination";

const router = Router();

router.get(
  "/api/audit-logs",
  authenticateJWT,
  validasiQuery(auditLogsQuerySchema),
  jagaAuditLogBaca,
  async (req, res) => {
    try {
      const { projectId, entityName, entityId, limit, page } = req.query as {
        projectId?: string;
        entityName?: string;
        entityId?: string;
        limit?: number;
        page?: number;
      };
      const filters = { projectId, entityName, entityId };
      const pagination = parsePaginationQuery(req.query as Record<string, unknown>);

      if (pagination) {
        const { items, total } = await auditRepository.findLogsPaged(filters, pagination);
        return res.json(listSuccessPayload(items, pagination, total));
      }

      const rows = await auditRepository.findLogs({
        ...filters,
        limit,
        page,
      });
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("[AUDIT] Error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

export default router;
