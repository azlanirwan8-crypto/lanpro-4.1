import express from "express";
import crypto from "crypto";
import { buatProyekDemoBni } from "../services/demo-seed.service";
import { authenticateJWT, verifyGlobalAdmin } from "../middleware/auth";
import { jagaHapusProyek, jagaProyek, jagaSetelanProyek } from "../middleware/jagaProyek";
import { createAuditLog } from "../services/audit.service";
import { validasiBody } from "../middleware/validate";
import {
  createProjectSchema,
  updateProjectSchema,
  updateDashboardLayoutSchema,
} from "../schemas/project.schema";
import { AuthenticatedRequest } from "../types/express";
import { projectRepository } from "../repositories/project.repository";

const router = express.Router();

router.get("/api/projects", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const callerId = req.user?.id || req.user?.uid || "";
    const callerRole = req.user?.role || "";

    const projects = await projectRepository.findProjectsForCaller(callerId, callerRole);
    res.json({ status: "success", data: projects });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/projects error:", error);
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
  }
});

router.post(
  "/api/projects/generate-bni-demo",
  authenticateJWT,
  verifyGlobalAdmin,
  async (req: any, res: any) => {
    return buatProyekDemoBni(req, res);
  }
);

router.get("/api/projects/:id", jagaProyek("dashboard", "R"), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectRepository.findById(id);

    if (project) {
      res.json({ status: "success", data: project });
    } else {
      res
        .status(404)
        .json({ status: "error", code: "srv.project_not_found", message: "Project not found" });
    }
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/projects/:id error:", error);
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
  }
});

router.post(
  "/api/projects",
  authenticateJWT,
  verifyGlobalAdmin,
  validasiBody(createProjectSchema),
  async (req, res) => {
    try {
      const { name, description, ownerId, status, projectKey, category } = req.body;
      const newId = crypto.randomUUID();
      const pKey = projectKey || "PRJ";

      const created = await projectRepository.create({
        id: newId,
        name,
        projectKey: pKey,
        description: description || "",
        ownerId,
        status: status || "Active",
        category: category || "Agile",
      });

      res.json({
        status: "success",
        data: created,
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects error:", error);
      res
        .status(500)
        .json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
    }
  }
);

router.put(
  "/api/projects/:projectId/dashboard-layout",
  jagaSetelanProyek(),
  validasiBody(updateDashboardLayoutSchema),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { layout } = req.body;
      const jsonLayout = JSON.stringify(layout);

      await projectRepository.updateDashboardLayout(projectId, jsonLayout);

      res.json({ status: "success", code: "srv.layout_updated", message: "Layout updated" });
    } catch (error: any) {
      console.error(
        "LOG ANOMALI CRITICAL: PUT /api/projects/:projectId/dashboard-layout error:",
        error
      );
      res
        .status(500)
        .json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
    }
  }
);

router.put(
  "/api/projects/:id",
  jagaSetelanProyek(),
  validasiBody(updateProjectSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        status,
        projectKey,
        ownerId,
        category,
        taskCounter,
        dashboardLayout,
      } = req.body;

      const changedFields: any = {};
      if (name !== undefined) changedFields.name = name;
      if (description !== undefined) changedFields.description = description;
      if (status !== undefined) changedFields.status = status;
      if (projectKey !== undefined) changedFields.projectKey = projectKey;
      if (ownerId !== undefined) changedFields.ownerId = ownerId;
      if (category !== undefined) changedFields.category = category;
      if (taskCounter !== undefined) changedFields.taskCounter = taskCounter;
      if (dashboardLayout !== undefined) changedFields.dashboardLayout = dashboardLayout;

      await projectRepository.update(id, {
        name,
        description,
        status,
        projectKey,
        ownerId,
        category,
        taskCounter,
        dashboardLayout,
      });

      const userId = req.headers["x-user-id"] || "guest";
      await createAuditLog(userId as string, id, "UPDATE", "Projects", id, null, changedFields);

      res.json({ status: "success", code: "srv.project_updated", message: "Project updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects error:", error);
      res
        .status(500)
        .json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
    }
  }
);

// --- LanPro v1.5: BNI SDLC Advisor Route ---
router.post(
  "/api/projects/:projectId/methodology",
  authenticateJWT,
  jagaSetelanProyek(),
  async (req: any, res: any) => {
    try {
      const { projectId } = req.params;
      const { methodology, matrixScores } = req.body;
      const userId = req.user?.id || req.user?.uid || req.headers["x-user-id"] || "guest";

      if (!methodology) {
        return res
          .status(400)
          .json({
            status: "error",
            code: "srv.metodologi_harus_ditentukan",
            message: "Metodologi harus ditentukan.",
          });
      }

      const normalizedMethodology = methodology.toString().toUpperCase();
      const oldMethod = await projectRepository.updateMethodology(projectId, normalizedMethodology);

      const auditNewValues = {
        category: normalizedMethodology,
        matrixScores: matrixScores ? JSON.stringify(matrixScores) : null,
      };

      try {
        await createAuditLog(
          userId,
          projectId,
          "UPDATE",
          "Projects",
          projectId,
          { category: oldMethod },
          auditNewValues
        );
      } catch (auditError) {
        console.warn(
          "Peringatan: Gagal menyimpan jejak audit, tetapi metodologi berhasil diperbarui.",
          auditError
        );
      }

      res.json({
        status: "success",
        message: `Metodologi proyek berhasil diperbarui menjadi ${normalizedMethodology}.`,
        data: { methodology: normalizedMethodology },
      });
    } catch (error: any) {
      console.error("====== EROR KRITIKAL METODOLOGI BACKEND ======", error);
      res.status(500).json({
        status: "error",
        code: "srv.gagal_memperbarui_metodologi_ke",
        message: "Gagal memperbarui metodologi ke Waterfall akibat masalah integritas data server.",
      });
    }
  }
);

router.delete("/api/projects/:projectId", jagaHapusProyek(), async (req, res) => {
  try {
    const { projectId } = req.params;
    await projectRepository.deleteCascade(projectId);

    res.json({
      status: "success",
      code: "srv.proyek_berhasil_dihapus_beserta",
      message: "Proyek berhasil dihapus beserta seluruh dependensinya.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: DELETE /api/projects error:", error);
    return res.status(500).json({
      status: "error",
      code: "srv.gagal_menghapus_proyek_akibat",
      message: "Gagal menghapus proyek akibat kendala integritas database.",
    });
  }
});

// Project Members & Invites API
router.put("/api/projects/:id/members", authenticateJWT, verifyGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberRoles, newMemberId, newMemberRole, teamMemberIds } = req.body;

    await projectRepository.updateMembers(
      id,
      memberRoles,
      newMemberId,
      newMemberRole,
      teamMemberIds
    );
    res.json({ status: "success", code: "srv.members_updated", message: "Members updated" });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:id/members error:", error);
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
  }
});

router.delete(
  "/api/projects/:id/members/:userId",
  authenticateJWT,
  verifyGlobalAdmin,
  async (req, res) => {
    try {
      const { id, userId } = req.params;
      await projectRepository.removeMember(id, userId);
      res.json({
        status: "success",
        code: "srv.member_removed_from_project",
        message: "Member removed from project",
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects/:id/members/:userId error:", error);
      res
        .status(500)
        .json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
    }
  }
);

router.put("/api/projects/:id/invites", jagaProyek("access", "U"), async (req, res) => {
  try {
    const { id } = req.params;
    const { emailToInvite } = req.body;

    await projectRepository.addInvite(id, emailToInvite);
    res.json({ status: "success", code: "srv.invite_added", message: "Invite added" });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:id/invites error:", error);
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
