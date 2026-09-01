import { Express } from "express";
import crypto from "crypto";
import { jagaProyek } from "../middleware/jagaProyek";
import { sprintRepository } from "../repositories/sprint.repository";
import { projectRepository } from "../repositories/project.repository";
import { validasiBody, validasiQuery } from "../middleware/validate";
import { paginationQuerySchema } from "../schemas/pagination.schema";
import { respondWithProjectList } from "../lib/listResponse";
import { createSprintSchema, updateSprintSchema } from "../schemas/sprint.schema";
import { adalahWaterfall } from "../lib/methodology";

export function setupSprintsRoutes(
  app: Express,
  createAuditLog: (
    userId: string,
    projectId: string | null,
    actionType: "CREATE" | "UPDATE" | "DELETE",
    entityName: string,
    entityId: string,
    oldValues: any,
    newValues: any
  ) => Promise<any>
) {
  // GET: List Sprints for a project
  app.get(
    "/api/projects/:projectId/sprints",
    jagaProyek("sprints", "R"),
    validasiQuery(paginationQuerySchema),
    async (req, res) => {
      try {
        const { projectId } = req.params;
        await respondWithProjectList(
          res,
          req.query as Record<string, unknown>,
          () => sprintRepository.findByProjectId(projectId),
          (pagination) => sprintRepository.findByProjectIdPaged(projectId, pagination)
        );
      } catch (error: any) {
        console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/sprints error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // POST: Create Sprint
  app.post(
    "/api/projects/:projectId/sprints",
    jagaProyek("sprints", "C"),
    validasiBody(createSprintSchema),
    async (req: any, res) => {
      try {
        const { projectId } = req.params;
        const { name, goal, startDate, endDate, status } = req.body;

        const category = await projectRepository.getCategory(projectId);
        if (adalahWaterfall(category)) {
          return res.status(400).json({
            status: "error",
            code: "srv.metodologi_waterfall_tidak_mendukung",
            message:
              "Metodologi Waterfall tidak mendukung pembuatan Sprint. Gunakan Milestone atau GANTT Chart.",
          });
        }

        const newId = crypto.randomUUID();
        const created = await sprintRepository.create({
          id: newId,
          projectId,
          name,
          goal: goal || "",
          startDate: startDate || null,
          endDate: endDate || null,
          status: status || "planned",
        });

        const userIdStr = req.headers["x-user-id"] || "guest";

        res.json({
          status: "success",
          data: created,
        });

        void createAuditLog(
          userIdStr as string,
          projectId,
          "CREATE",
          "Sprints",
          newId,
          null,
          req.body
        ).catch((err) => console.error("[SPRINT CREATE] audit log gagal:", err));
      } catch (error: any) {
        console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/sprints error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // PUT: Update Sprint
  app.put(
    "/api/projects/:projectId/sprints/:id",
    jagaProyek("sprints", "U"),
    validasiBody(updateSprintSchema),
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await sprintRepository.findById(id);
        if (!existing) {
          return res.status(404).json({
            status: "error",
            code: "srv.sprint_tidak_ditemukan",
            message: "Sprint tidak ditemukan",
          });
        }

        const finalName = req.body.hasOwnProperty("name") ? req.body.name : existing.name;
        const finalGoal = req.body.hasOwnProperty("goal") ? req.body.goal : existing.goal;
        const finalStartDate = req.body.hasOwnProperty("startDate")
          ? req.body.startDate
          : existing.startDate;
        const finalEndDate = req.body.hasOwnProperty("endDate")
          ? req.body.endDate
          : existing.endDate;
        const finalStatus = req.body.hasOwnProperty("status") ? req.body.status : existing.status;

        await sprintRepository.update(id, {
          name: finalName,
          goal: finalGoal,
          startDate: finalStartDate,
          endDate: finalEndDate,
          status: finalStatus,
        });

        res.json({ status: "success", code: "srv.sprint_updated", message: "Sprint updated" });
      } catch (error: any) {
        console.error(
          "LOG ANOMALI CRITICAL: PUT /api/projects/:projectId/sprints/:id error:",
          error
        );
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // DELETE: Remove Sprint
  app.delete(
    "/api/projects/:projectId/sprints/:id",
    jagaProyek("sprints", "D"),
    async (req, res) => {
      try {
        const { id, projectId } = req.params;
        await sprintRepository.delete(id, projectId);
        res.json({ status: "success", code: "srv.sprint_deleted", message: "Sprint deleted" });
      } catch (error: any) {
        console.error(
          "LOG ANOMALI CRITICAL: DELETE /api/projects/:projectId/sprints/:id error:",
          error
        );
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );
}

export default setupSprintsRoutes;
