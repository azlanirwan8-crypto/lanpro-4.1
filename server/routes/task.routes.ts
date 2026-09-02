import express from "express";
import crypto from "crypto";
import { authenticateJWT, verifyGlobalAdmin } from "../middleware/auth";
import { createAuditLog } from "../services/audit.service";
import {
  broadcastProjectNotification,
  sendProjectActivityNotification,
  checkUpcomingDueDates,
  createAutomatedNotification,
  createNotification,
} from "../services/notification.service";
import { optimisticLockingConflicts } from "../config/metrics";
import { GoogleGenAI } from "@google/genai";
import xss from "xss";
import { generateContentWithFallback } from "../services/ai.service";
import { matchesCaller, checkUserPermissionBackend } from "../services/task.service";
import { jagaProyek } from "../middleware/jagaProyek";
import { validasiBody, validasiQuery } from "../middleware/validate";
import { paginationQuerySchema, taskListQuerySchema } from "../schemas/pagination.schema";
import { respondWithProjectList } from "../lib/listResponse";
import { listSuccessPayload, parsePaginationQuery } from "../lib/pagination";
import { createTaskSchema, updateTaskSchema, reorderTaskIdsSchema } from "../schemas/task.schema";
import { AuthenticatedRequest } from "../types/express";
import { taskRepository } from "../repositories/task.repository";
import { userRepository } from "../repositories/user.repository";
import { qaRepository } from "../repositories/qa.repository";
import { adalahWaterfall } from "../lib/methodology";
import { statusSelesai } from "../lib/statusSelesai";
import { masterDataRepository } from "../repositories/master-data.repository";

const router = express.Router();

router.get(
  "/api/projects/:projectId/tasks",
  jagaProyek("list", "R"),
  validasiQuery(taskListQuerySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || req.user?.uid;
      const search = req.query.search as string | undefined;
      const rootsOnlyRaw = String(req.query.rootsOnly || "");
      const rootsOnly = rootsOnlyRaw === "1" || rootsOnlyRaw === "true";
      const pagination = parsePaginationQuery(req.query as Record<string, unknown>);

      const rawIdentifiers: (string | null | undefined)[] = [
        userId,
        req.user?.uid,
        req.user?.id,
        req.user?.username,
        req.user?.email,
        req.user?.displayName,
      ];

      if (userId) {
        const user = await userRepository.findByIdOrUid(String(userId));
        if (user) {
          rawIdentifiers.push(
            user.id,
            user.uid,
            user.username,
            user.email,
            user.displayName,
            user.nama_lengkap
          );
        }
      }
      const userIdentifiers = Array.from(new Set(rawIdentifiers.filter(Boolean) as string[]));

      const uRole = req.user?.role || "viewer";
      const isAdminOrManager = ["admin", "manager", "head"].includes(uRole.toLowerCase());

      // Issue List: page root + keturunan. Board tanpa page/limit → penuh.
      if (rootsOnly && pagination && isAdminOrManager) {
        const { items, total } = await taskRepository.findIssueListPage(
          projectId,
          pagination,
          search
        );
        return res.json(listSuccessPayload(items, pagination, total));
      }

      if (isAdminOrManager) {
        const tasks = await taskRepository.findTasksWithRelations(projectId, null);
        if (rootsOnly && pagination) {
          const roots = tasks.filter(
            (t: any) => !t.parentId || !tasks.some((p: any) => p.id === t.parentId)
          );
          const filtered = search?.trim()
            ? roots.filter(
                (t: any) =>
                  (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
                  (t.key || t.taskKey || "").toLowerCase().includes(search.toLowerCase())
              )
            : roots;
          const pageRoots = filtered.slice(pagination.offset, pagination.offset + pagination.limit);
          const rootIdSet = new Set(pageRoots.map((r: any) => r.id));
          const include = new Set<string>(rootIdSet);
          const addChildren = (parentId: string) => {
            tasks.forEach((t: any) => {
              if (t.parentId === parentId && !include.has(t.id)) {
                include.add(t.id);
                addChildren(t.id);
              }
            });
          };
          rootIdSet.forEach((id) => addChildren(id));
          const pageTasks = tasks.filter((t: any) => include.has(t.id));
          return res.json(listSuccessPayload(pageTasks, pagination, filtered.length));
        }
        return res.json({ status: "success", data: tasks });
      }

      const allProjTasks = await taskRepository.findRawProjectTasks(projectId);
      const directMatchedIds = new Set<string>();

      const hasAncestorReporterMatch = (task: any): boolean => {
        let curr = task;
        while (curr && curr.parentId) {
          const parent = allProjTasks.find((p: any) => p.id === curr.parentId);
          if (!parent) break;
          if (userIdentifiers.includes(parent.reporterId)) {
            return true;
          }
          curr = parent;
        }
        return false;
      };

      allProjTasks.forEach((t: any) => {
        if (!t) return;
        const isAssignee = userIdentifiers.includes(t.assigneeId);
        const isReporter = userIdentifiers.includes(t.reporterId);
        const hasParentReporter = hasAncestorReporterMatch(t);

        if (isAssignee || isReporter || hasParentReporter) {
          directMatchedIds.add(t.id);
        }
      });

      const allowedIds = new Set<string>(directMatchedIds);

      const addAncestors = (childTask: any) => {
        if (childTask && childTask.parentId) {
          const parent = allProjTasks.find((p: any) => p.id === childTask.parentId);
          if (parent && !allowedIds.has(parent.id)) {
            allowedIds.add(parent.id);
            addAncestors(parent);
          }
        }
      };

      directMatchedIds.forEach((id) => {
        const t = allProjTasks.find((x: any) => x.id === id);
        if (t) addAncestors(t);
      });

      const tasks = await taskRepository.findTasksWithRelations(projectId, allowedIds);

      if (rootsOnly && pagination) {
        const roots = tasks.filter(
          (t: any) => !t.parentId || !tasks.some((p: any) => p.id === t.parentId)
        );
        const filtered = search?.trim()
          ? roots.filter(
              (t: any) =>
                (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
                (t.key || t.taskKey || "").toLowerCase().includes(search.toLowerCase())
            )
          : roots;
        const pageRoots = filtered.slice(pagination.offset, pagination.offset + pagination.limit);
        const rootIdSet = new Set(pageRoots.map((r: any) => r.id));
        const include = new Set<string>(rootIdSet);
        const addChildren = (parentId: string) => {
          tasks.forEach((t: any) => {
            if (t.parentId === parentId && !include.has(t.id)) {
              include.add(t.id);
              addChildren(t.id);
            }
          });
        };
        rootIdSet.forEach((id) => addChildren(id));
        const pageTasks = tasks.filter((t: any) => include.has(t.id));
        return res.json(listSuccessPayload(pageTasks, pagination, filtered.length));
      }

      res.json({ status: "success", data: tasks });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/tasks error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.get(
  "/api/projects/:projectId/team-tasks",
  jagaProyek("list", "R"),
  async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tasks = await taskRepository.findTasksWithRelations(projectId, null);
      res.json({ status: "success", data: tasks });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/team-tasks error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.post(
  "/api/projects/:projectId/tasks",
  authenticateJWT,
  jagaProyek("list", "C"),
  validasiBody(createTaskSchema),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const {
        title,
        description,
        status,
        type,
        priority,
        assigneeId,
        reporterId,
        sprintId,
        parentId,
        acceptanceCriteria,
        storyPoints,
        projectRisk,
        startDate,
        endDate,
        attachments,
      } = req.body;

      const authenticatedUserStr =
        (req as any).user?.uid || (req as any).user?.id || req.headers["x-user-id"];

      const {
        id: newId,
        taskKey,
        reporterId: resolvedReporterId,
        reporterObj,
      } = await taskRepository.createTask(projectId, authenticatedUserStr, {
        title,
        description,
        status,
        type,
        priority,
        assigneeId,
        reporterId,
        sprintId,
        parentId,
        acceptanceCriteria,
        storyPoints,
        projectRisk,
        startDate,
        endDate,
        attachments,
      });

      const userIdStr = authenticatedUserStr || resolvedReporterId || "guest";

      res.json({
        status: "success",
        data: {
          id: newId,
          projectId,
          title,
          description,
          status: status || "To Do",
          type: type || "task",
          priority: priority || "Medium",
          assigneeId: assigneeId || null,
          reporterId: resolvedReporterId,
          reporter: reporterObj,
          sprintId: sprintId || null,
          parentId: parentId || null,
          taskKey,
          key: taskKey,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });

      // Audit & notifikasi tidak menahan respons create — sub-issue harus tampil cepat (#317).
      void createAuditLog(
        userIdStr as string,
        projectId,
        "CREATE",
        "Tasks",
        newId,
        null,
        req.body
      ).catch((err) => console.error("[TASK CREATE] audit log gagal:", err));

      void sendProjectActivityNotification(projectId, userIdStr, "create_task", {
        taskId: newId,
      }).catch((err) => console.error("Create task notification broadcast failed:", err));
    } catch (error: any) {
      if (error?.isValidationError) {
        return res.status(400).json({
          status: "error",
          code: error.code,
          message: error.message,
        });
      }
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

/**
 * Saran story point dari AI (Item #292).
 *
 * KENAPA RUTE INI ADA. Sebelumnya panggilan Gemini dilakukan LANGSUNG DARI
 * PERAMBAN di `AppContainer.tsx`, memakai `process.env.GEMINI_API_KEY`. Karena
 * `vite.config.ts` mengganti rujukan itu dengan nilai harfiahnya saat build,
 * kunci API ikut terpanggang ke dalam berkas JavaScript publik — siapa pun
 * yang membuka aplikasi bisa membacanya. Dibuktikan dengan mencari nilai kunci
 * di `dist/assets/*.js` dan menemukannya.
 *
 * Ini satu-satunya pemanggil Gemini di sisi klien; tujuh pemanggil lain sudah
 * benar di sisi server. Rute ini menutup yang terakhir, sehingga blok `define`
 * di `vite.config.ts` bisa dihapus dan kuncinya tidak pernah meninggalkan
 * server.
 *
 * Dijaga `jagaProyek("list", "U")`: menyarankan story point mengubah task,
 * jadi izinnya sama dengan mengubah task — bukan sekadar membaca. Tanpa
 * penjaga, siapa pun yang punya akun bisa menghabiskan kuota Gemini atas nama
 * proyek mana pun (pelajaran #281).
 */
router.post(
  "/api/projects/:projectId/tasks/:taskId/saran-story-point",
  authenticateJWT,
  jagaProyek("list", "U"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { judul, deskripsi, tipe } = req.body || {};

      if (!judul || typeof judul !== "string") {
        return res.status(400).json({
          status: "error",
          code: "srv.judul_task_wajib",
          message: "Judul task wajib diisi untuk meminta saran.",
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          status: "error",
          code: "srv.kunci_api_gemini_tidak_2",
          message: "Kunci API Gemini tidak dikonfigurasi pada server.",
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await generateContentWithFallback(ai, {
        model: "gemini-flash-latest",
        contents: `Analisis task berikut dan sarankan story point (Fibonacci: 1, 2, 3, 5, 8, 13).
Judul: ${judul}
Deskripsi: ${deskripsi || "-"}
Tipe: ${tipe || "-"}

Jawab HANYA dengan satu objek JSON: {"points": number, "reasoning": "string"}`,
        config: { responseMimeType: "application/json" },
      });

      let hasil: any = {};
      try {
        hasil = JSON.parse(response.text || "{}");
      } catch {
        // Model kadang membalas dengan teks di luar JSON. Dianggap gagal
        // dengan pesan yang jelas, BUKAN dilempar sebagai galat 500 -- ini
        // kegagalan yang diharapkan, bukan kerusakan server.
        hasil = {};
      }

      if (typeof hasil.points !== "number") {
        return res.status(422).json({
          status: "error",
          code: "srv.balasan_ai_tidak_valid",
          message: "Balasan AI tidak dapat dibaca. Silakan coba lagi.",
        });
      }

      return res.json({
        status: "success",
        data: { points: hasil.points, reasoning: String(hasil.reasoning || "") },
      });
    } catch (error: any) {
      console.error("LOG ANOMALI: saran story point gagal:", error?.message);
      return res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server_2",
        message: "Terjadi kesalahan internal server.",
      });
    }
  }
);

router.put(
  "/api/projects/:projectId/tasks/reorder",
  authenticateJWT,
  jagaProyek("list", "U"),
  validasiBody(reorderTaskIdsSchema),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { orderedIds } = req.body;

      await taskRepository.reorderTasks(projectId, orderedIds);

      const io = req.app.get("io");
      if (io) {
        io.to(projectId).emit("project_updated", { type: "tasks_reordered", projectId });
      }
      res.json({
        status: "success",
        code: "srv.tasks_reordered_successfully",
        message: "Tasks reordered successfully",
      });
    } catch (error: any) {
      console.error("Reorder tasks error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.put(
  "/api/projects/:projectId/tasks/:id",
  authenticateJWT,
  jagaProyek("list", "U"),
  validasiBody(updateTaskSchema),
  async (req, res) => {
    try {
      const { id, projectId } = req.params;
      const {
        status,
        type,
        priority,
        assigneeId,
        reporterId,
        sprintId,
        parentId,
        dueDate,
        storyPoints,
        startDate,
        endDate,
        estimatedHours,
        loggedHours,
        acceptanceCriteria,
        version,
        isBlocked,
        // Item #139 — lima field ini punya dropdown di Daftar Isu tetapi tidak
        // pernah ikut di-destructure, sehingga nilainya berhenti di sini tanpa
        // satu pun pesan galat.
        resolution,
        release,
        milestoneId,
        category,
        environment,
        projectRisk,
      } = req.body;
      const title = req.body.title !== undefined ? xss(req.body.title || "") : undefined;
      const description =
        req.body.description !== undefined ? xss(req.body.description || "") : undefined;
      const userId = (req as any).user?.id || req.headers["x-user-id"] || "guest";

      const oldTask = await taskRepository.findTaskWithProjectCategory(id, projectId);
      if (!oldTask) {
        return res.status(404).json({
          status: "error",
          code: "srv.tugas_tidak_ditemukan",
          message: "Tugas tidak ditemukan.",
        });
      }

      let effectiveStatus = status;
      if (
        effectiveStatus &&
        (effectiveStatus.toLowerCase() === "done" || effectiveStatus.toLowerCase() === "selesai")
      ) {
        const isBugTask =
          (oldTask.type && oldTask.type.toLowerCase() === "bug") ||
          (oldTask.taskKey && oldTask.taskKey.toUpperCase().startsWith("BUG")) ||
          (type && type.toLowerCase() === "bug") ||
          (oldTask.title && oldTask.title.toLowerCase().includes("bug"));
        if (isBugTask) {
          effectiveStatus = "Ready for Retest";
        }
      }

      const user = await userRepository.findByIdOrUid(userId);
      const userRole = user?.role || "viewer";
      const userPerms = user?.permissions || null;

      const dbUserId = user?.id;
      const dbUserUid = user?.uid;
      const dbUsername = user?.username;

      const isDirectReporter =
        oldTask.reporterId === userId ||
        oldTask.reporterId === (req as any).user?.uid ||
        oldTask.reporterId === (req as any).user?.username ||
        (dbUserId && oldTask.reporterId === dbUserId) ||
        (dbUserUid && oldTask.reporterId === dbUserUid) ||
        (dbUsername && oldTask.reporterId === dbUsername);

      const parentReporterId = oldTask.parentEpicReporterId;
      const isParentReporter = parentReporterId
        ? parentReporterId === userId ||
          parentReporterId === (req as any).user?.uid ||
          parentReporterId === (req as any).user?.username ||
          (dbUserId && parentReporterId === dbUserId) ||
          (dbUserUid && parentReporterId === dbUserUid) ||
          (dbUsername && parentReporterId === dbUsername)
        : false;

      const isAssignee = oldTask.assigneeId
        ? oldTask.assigneeId === userId ||
          oldTask.assigneeId === (req as any).user?.uid ||
          oldTask.assigneeId === (req as any).user?.username ||
          (dbUserId && oldTask.assigneeId === dbUserId) ||
          (dbUserUid && oldTask.assigneeId === dbUserUid) ||
          (dbUsername && oldTask.assigneeId === dbUsername)
        : false;

      const isWorkspaceAdmin = (userRole || "").toLowerCase() === "admin";
      const isAdmin = isWorkspaceAdmin;

      const hasRolePermission = checkUserPermissionBackend(userRole, userPerms, "update");
      if (!hasRolePermission) {
        return res.status(403).json({
          status: "error",
          code: "srv.role_anda_tidak_memiliki",
          message: "Role Anda tidak memiliki akses untuk tindakan ini",
        });
      }

      if (sprintId !== undefined) {
        const isAuthorizedSprint = isDirectReporter || isParentReporter || isAdmin;
        if (!isAuthorizedSprint) {
          return res.status(403).json({
            status: "error",
            code: "srv.akses_ditolak_anda_tidak_2",
            message: "Akses ditolak: Anda tidak memiliki wewenang untuk memindahkan task ini.",
          });
        }
      } else {
        const isAuthorizedGeneral = isDirectReporter || isParentReporter || isAssignee || isAdmin;
        if (!isAuthorizedGeneral) {
          return res.status(403).json({
            status: "error",
            code: "srv.hanya_reporter_pembuat_task",
            message:
              "Hanya Reporter pembuat task ini, Assignee, atau Admin/Manager yang diizinkan melakukan perubahan",
          });
        }
      }

      const isDateOrRelUpdated =
        parentId !== undefined ||
        sprintId !== undefined ||
        startDate !== undefined ||
        endDate !== undefined ||
        dueDate !== undefined;
      const effectiveParentId = parentId !== undefined ? parentId : oldTask?.parentId;
      const effectiveSprintId = sprintId !== undefined ? sprintId : oldTask?.sprintId;
      const effectiveStartDate = startDate !== undefined ? startDate : oldTask?.startDate;
      const effectiveEndDate =
        endDate !== undefined ? endDate : dueDate !== undefined ? dueDate : oldTask?.endDate;

      if (isDateOrRelUpdated) {
        const validationError = await taskRepository.validateTimeline(
          projectId,
          effectiveSprintId,
          effectiveParentId,
          effectiveStartDate,
          effectiveEndDate
        );
        if (validationError) {
          return res.status(400).json({
            status: "error",
            code: validationError.code,
            message: validationError.message,
          });
        }
      }

      const isWaterfall = adalahWaterfall(oldTask.projectCategory);

      if (version !== undefined && oldTask.version !== version) {
        optimisticLockingConflicts.inc();
        await createAuditLog(
          userId as string,
          projectId,
          "UPDATE",
          "Tasks",
          id,
          { version: oldTask.version },
          { version: version, status: "409 CONFLICT" }
        );
        return res.status(409).json({
          status: "error",
          code: "srv.konflik_versi_tugas_silakan",
          message: "Konflik versi tugas. Silakan refresh.",
        });
      }

      const masterStatus = await masterDataRepository.findAll();
      const menujuTerminal =
        !!status &&
        statusSelesai(status, masterStatus) &&
        !statusSelesai(oldTask.status, masterStatus);

      if (isWaterfall && menujuTerminal) {
        const deps = await taskRepository.getLinkedDependencies(id);
        const unfinishedDeps = deps.filter((d: any) => !statusSelesai(d.status, masterStatus));

        if (unfinishedDeps.length > 0) {
          await createAuditLog(
            userId as string,
            projectId,
            "UPDATE",
            "Tasks",
            id,
            { status: oldTask.status },
            { status: status, constraintFailure: "WATERFALL_PHASE_GATE_VIOLATION" }
          );

          return res.status(403).json({
            status: "error",
            code: "srv.phase_gate_constraint_anda",
            message:
              "Phase Gate Constraint: Anda tidak dapat menyelesaikan tugas Tahap ini. Terdapat dependensi prasyarat yang belum mencapai 100% ('Done').",
          });
        }
      }

      if (menujuTerminal) {
        const subtasks = await taskRepository.getUnfinishedSubtasks(id);
        if (subtasks.length > 0) {
          const unfinishedKeys = subtasks.map((s: any) => s.taskKey || s.title || s.id).join(", ");
          await createAuditLog(
            userId as string,
            projectId,
            "UPDATE",
            "Tasks",
            id,
            { status: oldTask.status },
            { status: status, constraintFailure: "SUBTASK_INTEGRITY_VIOLATION" }
          );

          return res.status(400).json({
            status: "error",
            message: `Integritas Hirarki: Tidak dapat menyelesaikan tugas utama ini karena masih memiliki sub-task yang belum selesai (${unfinishedKeys}). Silakan selesaikan semua sub-task terlebih dahulu.`,
          });
        }
      }

      const updates: { field: string; val: any }[] = [];
      const changedFields: any = {};
      const newValues: any = {};

      const checkUpdate = (field: string, val: any) => {
        if (val !== undefined && val !== oldTask[field]) {
          updates.push({ field, val });
          changedFields[field] = val;
          newValues[field] = val;
        }
      };

      checkUpdate("title", title);
      checkUpdate("description", description);
      checkUpdate("status", effectiveStatus);
      checkUpdate("type", type);
      checkUpdate("priority", priority);
      checkUpdate("assigneeId", assigneeId);
      checkUpdate("reporterId", reporterId);
      checkUpdate("sprintId", sprintId);
      checkUpdate("parentId", parentId);
      checkUpdate("dueDate", dueDate);
      checkUpdate("storyPoints", storyPoints);
      checkUpdate("startDate", startDate);
      checkUpdate("endDate", endDate);
      checkUpdate("estimatedHours", estimatedHours);
      checkUpdate("loggedHours", loggedHours);
      checkUpdate("acceptanceCriteria", acceptanceCriteria);
      checkUpdate("resolution", resolution);
      checkUpdate("release", release);
      checkUpdate("milestoneId", milestoneId);
      checkUpdate("category", category);
      checkUpdate("environment", environment);
      checkUpdate("projectRisk", projectRisk);

      if (isBlocked !== undefined) {
        const oldBlockedVal = oldTask.isBlocked === true || oldTask.isBlocked === 1;
        const newBlockedVal = !!isBlocked;
        if (newBlockedVal !== oldBlockedVal) {
          updates.push({ field: "isBlocked", val: newBlockedVal });
          changedFields.isBlocked = newBlockedVal;
          newValues.isBlocked = newBlockedVal;
        }
      }

      if (updates.length > 0) {
        const updated = await taskRepository.updateTaskWithVersionLock(
          id,
          projectId,
          updates,
          version
        );
        if (!updated) {
          optimisticLockingConflicts.inc();
          return res.status(409).json({
            status: "error",
            code: "srv.gagal_memperbarui_data_mungkin",
            message: "Gagal memperbarui: Data mungkin sudah berubah. Silakan coba lagi.",
          });
        }

        await createAuditLog(
          userId as string,
          projectId,
          "UPDATE",
          "Tasks",
          id,
          oldTask,
          newValues
        );

        const io = req.app.get("io");
        if (io) {
          io.to(projectId).emit("task_updated", {
            taskId: id,
            projectId,
            changes: changedFields,
            updatedBy: userId,
          });

          if (changedFields.status) {
            io.to(projectId).emit("TASK_MOVE", {
              taskId: id,
              oldStatus: oldTask.status,
              newStatus: changedFields.status,
              updatedBy: userId,
            });
          }
        }

        const isNowBlockedStatus =
          changedFields.status &&
          changedFields.status.toLowerCase() === "blocked" &&
          (!oldTask.status || oldTask.status.toLowerCase() !== "blocked");
        const isNowBlockedFlag =
          changedFields.isBlocked !== undefined &&
          changedFields.isBlocked === true &&
          (!oldTask.isBlocked || oldTask.isBlocked === false);

        if (isNowBlockedStatus || isNowBlockedFlag) {
          const recipientId =
            changedFields.assigneeId !== undefined ? changedFields.assigneeId : oldTask.assigneeId;
          if (recipientId) {
            const updater = await userRepository.findByIdOrUid(userId);
            const updaterName = updater
              ? updater.displayName || updater.username
              : "Seorang pengguna";
            const taskKey = oldTask.taskKey || oldTask.key || id;
            const taskTitle = oldTask.title || "Tugas";

            const notifTitle = "⚠️ Tugas Terblokir (Blocked)";
            const notifMessage = `Tugas "${taskTitle}" (${taskKey}) telah ditandai sebagai Terblokir (Blocked) oleh ${updaterName}.`;
            await createAutomatedNotification(
              recipientId,
              userId,
              notifTitle,
              notifMessage,
              "blocked",
              id
            );
          }
        }

        const isIssueResolvedOrDone =
          changedFields.status &&
          [
            "done",
            "resolved",
            "ready for retest",
            "retest",
            "completed",
            "selesai",
            "done / closed",
          ].includes(changedFields.status.toLowerCase().trim());

        if (isIssueResolvedOrDone) {
          const taskKey = oldTask.taskKey || oldTask.key || id;
          const updater = await userRepository.findByIdOrUid(userId);
          const updaterName = updater ? updater.displayName || updater.username : "Developer";

          const linkedTCs = await qaRepository.findLinkedTestCasesByBug(taskKey, id, projectId);
          if (linkedTCs && linkedTCs.length > 0) {
            for (const tc of linkedTCs) {
              await qaRepository.transitionTestCaseToRetest(
                projectId,
                tc.id,
                taskKey,
                userId as string,
                updaterName,
                changedFields.status
              );

              const reporterUserId = oldTask.reporterId || tc.activeTesterId || userId;
              if (reporterUserId) {
                const notifTitle = "🔄 Test Case Ready for Retest";
                const notifMsg = `Issue #${taskKey} (${oldTask.title || "Bug"}) telah [${changedFields.status}] oleh ${updaterName}. Test Case "${tc.judul || tc.title}" kini siap diuji ulang (Retest).`;
                await createAutomatedNotification(
                  reporterUserId,
                  userId as string,
                  notifTitle,
                  notifMsg,
                  "bug_retest",
                  tc.id
                );
              }

              if (io) {
                io.to(projectId).emit("QA_TESTCASE_UPDATED", {
                  testCaseId: tc.id,
                  projectId,
                  status: "Retest",
                  linkedBugKey: taskKey,
                });
              }
            }
          }
        }

        const ioInstance = req.app.get("io");
        const notificationPromises = [];

        if (changedFields.status) {
          notificationPromises.push(
            createNotification(ioInstance, projectId, id, userId as string, "update_task", {
              field: "status",
              oldValue: oldTask.status,
              newValue: changedFields.status,
            }).catch((err) => console.error("Update status notification failed:", err))
          );
        }
        // #341 — jangan else-if: status + assignee dalam satu PUT harus keduanya notifikasi
        if (changedFields.assigneeId !== undefined) {
          notificationPromises.push(
            createNotification(ioInstance, projectId, id, userId as string, "update_task", {
              field: "assigneeId",
              oldValue: oldTask.assigneeId,
              newValue: changedFields.assigneeId,
            }).catch((err) => console.error("Update assignee notification failed:", err))
          );
        }
        if (changedFields.description !== undefined) {
          notificationPromises.push(
            createNotification(ioInstance, projectId, id, userId as string, "update_task", {
              field: "deskripsi",
              newValue: "Deskripsi diperbarui",
            }).catch((err) => console.error("Update description notification failed:", err))
          );
        }
        if (changedFields.acceptanceCriteria !== undefined) {
          notificationPromises.push(
            createNotification(ioInstance, projectId, id, userId as string, "update_task", {
              field: "acceptanceCriteria",
              newValue: "Acceptance Criteria diperbarui",
            }).catch((err) => console.error("Update AC notification failed:", err))
          );
        }

        if (notificationPromises.length > 0) {
          await Promise.allSettled(notificationPromises);
        }

        if (changedFields.dueDate) {
          setImmediate(() => checkUpcomingDueDates());
        }
      }

      res.json({ status: "success", data: { id, ...changedFields } });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:projectId/tasks/:id error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.delete(
  "/api/projects/:projectId/tasks/:id",
  authenticateJWT,
  jagaProyek("list", "D"),
  async (req, res) => {
    try {
      const { id, projectId } = req.params;
      const userId = (req as any).user?.id || req.headers["x-user-id"] || "guest";

      const task = await taskRepository.findTaskOwnership(id, projectId);
      if (!task) {
        return res
          .status(404)
          .json({ status: "error", code: "srv.task_not_found", message: "Task not found" });
      }

      const user = await userRepository.findByIdOrUid(userId);
      const userRole = user?.role || "viewer";
      const userPerms = user?.permissions || null;
      const dbUserId = user?.id;
      const dbUserUid = user?.uid;
      const dbUsername = user?.username;

      const isReporter =
        task.reporterId === userId ||
        task.reporterId === (req as any).user?.uid ||
        task.reporterId === (req as any).user?.username ||
        (dbUserId && task.reporterId === dbUserId) ||
        (dbUserUid && task.reporterId === dbUserUid) ||
        (dbUsername && task.reporterId === dbUsername);

      // Item #202 — sebelumnya baris ini TIDAK PUNYA jalur untuk
      // Admin/Manager/Head sama sekali, jadi bahkan Admin diblokir menghapus
      // task yang bukan mereka laporkan — bertentangan dengan #200/#201
      // (frontend `src/features/issues/issuePermissions.ts`, sudah benar).
      // `checkUserPermissionBackend` di atas MASIH bisa lolos lewat custom
      // permission per-user, tapi gerbang di bawah ini TETAP mewajibkan
      // Reporter ATAU Admin/Manager/Head — custom permission TIDAK cukup
      // sendirian, menyamakan aturan dengan frontend.
      const isLeadOrAdmin = ["admin", "manager", "head"].includes(
        String(userRole || "").toLowerCase()
      );

      const hasRolePermission = checkUserPermissionBackend(userRole, userPerms, "delete");
      if (!hasRolePermission && !isLeadOrAdmin) {
        return res.status(403).json({
          status: "error",
          code: "srv.role_anda_tidak_memiliki",
          message: "Role Anda tidak memiliki akses untuk tindakan ini",
        });
      }

      if (!isReporter && !isLeadOrAdmin) {
        return res.status(403).json({
          status: "error",
          code: "srv.hanya_reporter_pembuat_task_2",
          message:
            "Hanya Reporter pembuat task ini atau Admin/Manager yang diizinkan melakukan perubahan/penghapusan",
        });
      }

      await createAuditLog(userId as string, projectId, "DELETE", "Tasks", id, null, null);
      await taskRepository.deleteTaskCascade(id, projectId);

      res.json({ status: "success", code: "srv.task_deleted", message: "Task deleted" });
    } catch (error: any) {
      console.error(
        "LOG ANOMALI CRITICAL: DELETE /api/projects/:projectId/tasks/:id error:",
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

router.post(
  "/api/projects/:projectId/tasks/bulk-delete",
  authenticateJWT,
  jagaProyek("list", "D"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      let taskIds = req.body?.taskIds;
      if (typeof taskIds === "string") {
        try {
          taskIds = JSON.parse(taskIds);
        } catch (e) {}
      }
      const userId =
        (req as any).user?.id || (req as any).user?.uid || req.headers["x-user-id"] || "guest";

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({
          status: "error",
          code: "srv.taskids_must_be_a",
          message: "taskIds must be a non-empty array",
        });
      }

      const user = await userRepository.findByIdOrUid(userId);
      const dbUserId = user?.id;
      const dbUserUid = user?.uid;
      // Item #204 — sama seperti #202 (delete satuan): bulk-delete di sini
      // TIDAK PUNYA jalur Admin/Manager/Head sama sekali, jadi task yang
      // bukan dilaporkan Admin sendiri diam-diam TERSARING KELUAR dari
      // `deletableTaskIds` tanpa pesan galat apa pun — kelihatan seperti
      // "berhasil sebagian" padahal aslinya Admin diblokir seperti user
      // biasa.
      const isLeadOrAdmin = ["admin", "manager", "head"].includes(
        String(user?.role || "").toLowerCase()
      );

      const taskRows = await taskRepository.findTasksByIds(taskIds, projectId);

      const deletableTaskIds: string[] = [];
      for (const t of taskRows) {
        const isReporter =
          t.reporterId === userId ||
          t.reporterId === (req as any).user?.uid ||
          t.reporterId === (req as any).user?.username ||
          (dbUserId && t.reporterId === dbUserId) ||
          (dbUserUid && t.reporterId === dbUserUid);

        if (isReporter || isLeadOrAdmin) {
          deletableTaskIds.push(t.id);
        }
      }

      if (deletableTaskIds.length === 0) {
        return res.status(403).json({
          status: "error",
          code: "srv.you_do_not_have",
          message: "You do not have permission to delete any of the selected tasks",
        });
      }

      await taskRepository.deleteTasksByIds(deletableTaskIds, projectId);

      for (const deletedId of deletableTaskIds) {
        await createAuditLog(userId as string, projectId, "DELETE", "Tasks", deletedId, null, null);
      }

      res.json({
        status: "success",
        message: `Successfully deleted ${deletableTaskIds.length} tasks`,
        deletedIds: deletableTaskIds,
      });
    } catch (error: any) {
      console.error(
        "LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks/bulk-delete error:",
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

// Comments API
router.get(
  "/api/projects/:projectId/tasks/:taskId/comments",
  jagaProyek("list", "R"),
  async (req, res) => {
    try {
      const { taskId } = req.params;
      const rows = await taskRepository.findCommentsByTaskId(taskId);
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error(
        "LOG ANOMALI CRITICAL: GET /api/projects/:projectId/tasks/:taskId/comments error:",
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

router.post(
  "/api/projects/:projectId/tasks/:taskId/comments",
  jagaProyek("list", "C"),
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const { content, authorId } = req.body;
      const effectiveAuthorId =
        authorId ||
        (req as any).user?.uid ||
        (req as any).user?.id ||
        req.headers["x-user-id"] ||
        "guest";

      const newId = crypto.randomUUID();
      await taskRepository.createComment({
        id: newId,
        taskId,
        userId: effectiveAuthorId,
        content,
      });

      sendProjectActivityNotification(projectId, effectiveAuthorId as string, "comment_task", {
        taskId,
        commentContent: content,
      }).catch((err) => console.error("Comment notification broadcast failed:", err));

      res.json({
        status: "success",
        data: { id: newId, taskId, content, authorId: effectiveAuthorId },
      });
    } catch (error: any) {
      console.error(
        "LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks/:taskId/comments error:",
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

// ActivityLogs API
router.get(
  "/api/projects/:projectId/activity",
  jagaProyek("list", "R"),
  validasiQuery(paginationQuerySchema),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      await respondWithProjectList(
        res,
        req.query as Record<string, unknown>,
        () => taskRepository.findActivityLogs(projectId),
        (pagination) => taskRepository.findActivityLogsPaged(projectId, pagination)
      );
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:projectId/activity error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.post("/api/projects/:projectId/activity", jagaProyek("list", "U"), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { action, details, userId } = req.body;
    const newId = crypto.randomUUID();

    await taskRepository.createActivityLog({
      id: newId,
      projectId,
      userId: userId || null,
      action,
      details: details || "",
    });

    const notificationTitle = `Aktivitas Proyek: ${action}`;
    const notificationMessage = details || `Terdapat aktivitas "${action}" pada proyek ini.`;

    broadcastProjectNotification(
      projectId,
      userId || null,
      notificationTitle,
      notificationMessage,
      "project_activity",
      newId
    ).catch((err) => console.error("Async broadcast error:", err));

    res.json({ status: "success", data: { id: newId } });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: POST /api/projects/:projectId/activity error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

// Task Links API
router.post(
  "/api/projects/:projectId/tasks/:taskId/links",
  jagaProyek("list", "C"),
  async (req, res) => {
    try {
      const { taskId } = req.params;
      const { targetTaskId, relationType } = req.body;

      if (relationType === "precedes" || relationType === "blocks") {
        const cycleDetected = await taskRepository.hasCycle(taskId, targetTaskId);
        if (cycleDetected) {
          return res.status(400).json({
            status: "error",
            code: "srv.circular_dependency_terdeteksi_tugas",
            message:
              "Circular Dependency Terdeteksi! Tugas ini tidak bisa dihubungkan karena akan menyebabkan looping (saling menunggu).",
          });
        }
      }

      const newId = crypto.randomUUID();
      await taskRepository.createLink({
        id: newId,
        sourceTaskId: taskId,
        targetTaskId,
        relationType,
      });

      res.json({
        status: "success",
        data: { id: newId, sourceTaskId: taskId, targetTaskId, relationType },
      });
    } catch (error: any) {
      console.error(
        "LOG ANOMALI CRITICAL: POST /api/projects/:projectId/tasks/:taskId/links error:",
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

router.delete(
  "/api/projects/:projectId/tasks/:taskId/links/:linkId",
  jagaProyek("list", "D"),
  async (req, res) => {
    try {
      const { linkId } = req.params;
      await taskRepository.deleteLink(linkId);
      res.json({ status: "success", code: "srv.task_link_deleted", message: "Task link deleted" });
    } catch (error: any) {
      console.error(
        "LOG ANOMALI CRITICAL: DELETE /api/projects/:projectId/tasks/:taskId/links/:linkId error:",
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

router.post("/api/tasks/trigger-digest", verifyGlobalAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    const { kirimDailyTaskDigestEmail } = await import("../services/taskDigest.service");
    const result = await kirimDailyTaskDigestEmail(targetUserId);
    res.json({
      status: "success",
      message: `Digest email diproses: ${result.emailsSent} email terkirim, ${result.failedCount} gagal dari ${result.totalUsersChecked} pengguna.`,
      data: result,
    });
  } catch (error: any) {
    console.error("[TASK DIGEST] Gagal memicu digest email:", error);
    res
      .status(500)
      .json({ status: "error", message: error?.message || "Gagal memicu digest email" });
  }
});

// #343 — work log tipis
router.get(
  "/api/projects/:projectId/tasks/:taskId/work-logs",
  jagaProyek("list", "R"),
  async (req, res) => {
    try {
      const rows = await taskRepository.listWorkLogs(req.params.taskId);
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("GET work-logs error:", error);
      res.status(500).json({ status: "error", message: error?.message || "Gagal memuat work log" });
    }
  }
);

router.post(
  "/api/projects/:projectId/tasks/:taskId/work-logs",
  jagaProyek("list", "U"),
  async (req: any, res) => {
    try {
      const hours = Number(req.body?.hours);
      if (!Number.isFinite(hours) || hours <= 0) {
        return res.status(400).json({ status: "error", message: "hours harus angka > 0" });
      }
      const id = crypto.randomUUID();
      const loggedAt = req.body?.loggedAt
        ? new Date(req.body.loggedAt).toISOString()
        : new Date().toISOString();
      await taskRepository.createWorkLog({
        id,
        taskId: req.params.taskId,
        userId: req.user?.uid || req.user?.id || null,
        hours,
        note: String(req.body?.note || "").slice(0, 2000),
        loggedAt,
      });
      const rows = await taskRepository.listWorkLogs(req.params.taskId);
      res.status(201).json({ status: "success", data: rows });
    } catch (error: any) {
      console.error("POST work-logs error:", error);
      res
        .status(500)
        .json({ status: "error", message: error?.message || "Gagal menambah work log" });
    }
  }
);

export default router;
