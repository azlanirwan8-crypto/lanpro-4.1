import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { auditRepository } from "../repositories/audit.repository";

const router = Router();

router.get("/api/audit-logs", authenticateJWT, async (req, res) => {
  try {
    const { projectId, entityName, entityId, limit } = req.query;
    const rows = await auditRepository.findLogs({
      projectId: projectId as string | undefined,
      entityName: entityName as string | undefined,
      entityId: entityId as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("[AUDIT] Error:", error);
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
  }
});

export default router;
