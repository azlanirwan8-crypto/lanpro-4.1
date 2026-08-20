/**
 * Rute milestone proyek: daftar, tambah, ubah, dan hapus.
 *
 * Menggunakan milestoneRepository untuk seluruh akses data.
 */
import { Router } from "express";
import crypto from "crypto";
import { createAuditLog } from "../services/audit.service";
import { jagaProyek } from "../middleware/jagaProyek";
import { milestoneRepository } from "../repositories/milestone.repository";

const router = Router();

// Milestones API (Hybrid Value-Added)
router.get("/api/projects/:projectId/milestones", jagaProyek("timeline", "R"), async (req, res) => {
  try {
    const { projectId } = req.params;
    const milestones = await milestoneRepository.findByProjectId(projectId);
    res.json({ status: "success", data: milestones });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET milestones error:", error);
    res.status(500).json({ status: "error", message: "Gagal mengambil Milestone." });
  }
});

router.post(
  "/api/projects/:projectId/milestones",
  jagaProyek("timeline", "C"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { name, description, dueDate, sprintIds } = req.body;
      const userId = req.headers["x-user-id"] || req.query.userId || "guest";
      const milestoneId = crypto.randomUUID();

      await milestoneRepository.create({
        id: milestoneId,
        projectId,
        name,
        description: description || "",
        dueDate: dueDate || null,
        status: "planned",
        sprintIds,
      });

      await createAuditLog(userId as string, projectId, "CREATE", "Milestones", milestoneId, null, {
        name,
        sprintIds,
      });

      res.json({ status: "success", data: { id: milestoneId, name, milestoneId } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST milestones error:", error);
      res.status(500).json({ status: "error", message: "Gagal membuat Milestone." });
    }
  }
);

router.put(
  "/api/projects/:projectId/milestones/:id",
  jagaProyek("timeline", "U"),
  async (req, res) => {
    try {
      const { id, projectId } = req.params;
      const { name, description, dueDate, status, sprintIds } = req.body;
      const userId = req.headers["x-user-id"] || "guest";

      await milestoneRepository.update(id, {
        name,
        description,
        dueDate,
        status,
        sprintIds,
      });

      await createAuditLog(userId as string, projectId, "UPDATE", "Milestones", id, null, req.body);
      res.json({ status: "success", message: "Milestone updated" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.delete(
  "/api/projects/:projectId/milestones/:id",
  jagaProyek("timeline", "D"),
  async (req, res) => {
    try {
      const { id, projectId } = req.params;
      const userId = req.headers["x-user-id"] || "guest";

      await createAuditLog(userId as string, projectId, "DELETE", "Milestones", id, null, null);
      await milestoneRepository.delete(id);

      res.json({ status: "success", message: "Milestone deleted" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

export default router;
