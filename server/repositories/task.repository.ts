import db from "../../src/lib/db";
import { BATAS_DAFTAR_TANPA_PAGINATION, type PaginationParams } from "../lib/pagination";
import crypto from "crypto";
import { validateTimelineBoundaries } from "../services/task.service";
import { adalahTabelTidakAda, adalahKolomTidakAda } from "../helpers/pgErrors";

/**
 * #469 — hapus anak opsional di dalam transaksi PG.
 * try/catch biasa tidak cukup: error SQL meng-abort transaksi (25P02).
 * Tabel "TaskWorkLogs" tidak di auto-quote db.ts — wajib dikutip di SQL.
 * Kolom live = "taskId" (camelCase); migrate lama sempat snake_case — hapus
 * tetap tidak boleh gagalkan delete Tasks.
 */
async function hapusAnakOpsional(
  connection: { query: (sql: string, params?: unknown) => Promise<unknown> },
  savepoint: string,
  sql: string,
  params: unknown
): Promise<void> {
  await connection.query(`SAVEPOINT ${savepoint}`);
  try {
    await connection.query(sql, params);
    await connection.query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch (err) {
    await connection.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    if (!adalahTabelTidakAda(err) && !adalahKolomTidakAda(err)) throw err;
  }
}

export interface TaskEntity {
  id: string;
  projectId: string;
  sprintId?: string | null;
  taskKey: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  type: string;
  assigneeId?: string | null;
  reporterId?: string | null;
  parentId?: string | null;
  acceptanceCriteria?: string | null;
  storyPoints?: number | null;
  projectRisk?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  orderIndex?: number;
  version?: number;
  isBlocked?: boolean | number;
  createdAt?: string;
  updatedAt?: string;
}

export class TaskRepository {
  async findTasksWithRelations(
    projectId: string,
    allowedTaskIds: Set<string> | null = null
  ): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [tasksRows]: any = await connection.query(
        "SELECT * FROM Tasks WHERE projectId = ? ORDER BY orderIndex ASC, createdAt DESC LIMIT 2000",
        [projectId]
      );

      const filteredTasks = allowedTaskIds
        ? (tasksRows || []).filter((t: any) => t && allowedTaskIds.has(t.id))
        : tasksRows || [];

      const [linksRows]: any = await connection.query(
        "SELECT * FROM LinkedTasks WHERE sourceTaskId IN (SELECT id FROM Tasks WHERE projectId = ?)",
        [projectId]
      );

      const linksMap = new Map<string, any[]>();
      (linksRows || []).forEach((link: any) => {
        if (!linksMap.has(link.sourceTaskId)) {
          linksMap.set(link.sourceTaskId, []);
        }
        linksMap.get(link.sourceTaskId)!.push(link);
      });

      const [attachmentsRows]: any = await connection.query(
        'SELECT * FROM Attachments WHERE "taskId" IN (SELECT id FROM Tasks WHERE projectId = ?) ORDER BY "createdAt" ASC',
        [projectId]
      );

      const attachmentsMap = new Map<string, any[]>();
      (attachmentsRows || []).forEach((att: any) => {
        const tId = att.taskId || att.taskid;
        if (!attachmentsMap.has(tId)) {
          attachmentsMap.set(tId, []);
        }
        attachmentsMap.get(tId)!.push({
          id: att.id,
          taskId: tId,
          name: att.name || att.filename || "Attachment",
          originalName: att.originalName || att.name || att.filename,
          filename: att.filename,
          url: att.url,
          type: att.type || att.fileType || "file",
          fileType: att.fileType || att.type || "file",
          size: Number(att.size || att.fileSize || 0),
          uploadedByName: att.uploadedByName || null,
          uploadedByUserId: att.uploadedByUserId || null,
          createdAt: att.createdAt || att.uploadedAt || new Date().toISOString(),
        });
      });

      const subtasksMap = new Map<string, any[]>();
      (filteredTasks || []).forEach((t: any) => {
        if (t.parentId) {
          if (!subtasksMap.has(t.parentId)) {
            subtasksMap.set(t.parentId, []);
          }
          subtasksMap.get(t.parentId)!.push(t);
        }
      });

      const userIds = new Set<string>();
      (filteredTasks || []).forEach((t: any) => {
        if (t.reporterId) userIds.add(String(t.reporterId));
        if (t.assigneeId) userIds.add(String(t.assigneeId));
      });

      // Pakai IN (?) + array JS agar convertToPostgres → ANY($n) benar.
      // Bentuk IN (?,?,…) dengan 1 id jadi IN (?) + string → ANY gagal
      // (malformed array literal) — gejala #329 QA 02 Sep.
      const ids = Array.from(userIds);
      const [userRows]: any =
        ids.length > 0
          ? await connection.query(
              `SELECT id, uid, displayName, nama_lengkap, username, email, photoURL FROM Users WHERE id IN (?) OR uid IN (?)`,
              [ids, ids]
            )
          : [[]];
      const usersMap = new Map<string, any>();
      (userRows || []).forEach((u: any) => {
        const uObj = {
          id: u.id,
          uid: u.uid,
          name: u.displayName || u.nama_lengkap || u.username || u.email,
          displayName: u.displayName || u.nama_lengkap || u.username || u.email,
          avatar: u.photoURL || "",
          photoURL: u.photoURL || "",
          email: u.email || "",
        };
        if (u.id) usersMap.set(u.id, uObj);
        if (u.uid) usersMap.set(u.uid, uObj);
      });

      const [commentCountRows]: any = await connection.query(
        "SELECT taskId, COUNT(*)::int AS count FROM Comments WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?) GROUP BY taskId",
        [projectId]
      );
      const commentsCountMap = new Map<string, number>();
      (commentCountRows || []).forEach((row: any) => {
        const tId = row.taskId || row.taskid;
        if (tId) {
          commentsCountMap.set(tId, Number(row.count || 0));
        }
      });

      return filteredTasks.map((t: any) => {
        const reporterUser = t.reporterId ? usersMap.get(t.reporterId) : null;
        return {
          ...t,
          key: t.taskKey,
          reporter: reporterUser || null,
          linkedTasks: linksMap.get(t.id) || [],
          subtasks: subtasksMap.get(t.id) || [],
          attachments: attachmentsMap.get(t.id) || [],
          commentsCount: commentsCountMap.get(t.id) || 0,
        };
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Halaman root Issue List + seluruh keturunan root pada halaman itu (#318).
   * Board/Kanban tetap memakai findTasksWithRelations penuh.
   */
  async findIssueListPage(
    projectId: string,
    pagination: PaginationParams,
    search?: string
  ): Promise<{ items: any[]; total: number }> {
    const connection = await db.getConnection();
    let total = 0;
    let allowedIds = new Set<string>();
    try {
      const params: unknown[] = [projectId];
      let rootWhere = "projectId = ? AND (parentId IS NULL OR parentId = '')";
      if (search?.trim()) {
        rootWhere +=
          " AND (LOWER(COALESCE(title, '')) LIKE ? OR LOWER(COALESCE(taskKey, '')) LIKE ?)";
        const term = `%${search.trim().toLowerCase()}%`;
        params.push(term, term);
      }

      const [countRows]: any = await connection.query(
        `SELECT COUNT(*)::int AS total FROM Tasks WHERE ${rootWhere}`,
        params
      );
      total = countRows?.[0]?.total ?? 0;

      const [rootRows]: any = await connection.query(
        `SELECT id FROM Tasks WHERE ${rootWhere} ORDER BY orderIndex ASC, createdAt DESC LIMIT ? OFFSET ?`,
        [...params, pagination.limit, pagination.offset]
      );
      const rootIds: string[] = (rootRows || []).map((r: any) => r.id).filter(Boolean);
      if (rootIds.length === 0) {
        return { items: [], total };
      }

      const [treeRows]: any = await connection.query(
        `WITH RECURSIVE tree AS (
           SELECT id FROM Tasks WHERE id IN (${rootIds.map(() => "?").join(",")})
           UNION ALL
           SELECT c.id FROM Tasks c INNER JOIN tree p ON c.parentId = p.id
         )
         SELECT id FROM tree`,
        rootIds
      );
      allowedIds = new Set<string>((treeRows || []).map((r: any) => r.id));
    } finally {
      connection.release();
    }

    if (allowedIds.size === 0) {
      return { items: [], total };
    }
    const items = await this.findTasksWithRelations(projectId, allowedIds);
    return { items, total };
  }

  async findRawProjectTasks(projectId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT * FROM Tasks WHERE projectId = ? ORDER BY orderIndex ASC, createdAt DESC LIMIT 2000",
        [projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async validateTimeline(
    projectId: string,
    sprintId: string | null,
    parentId: string | null,
    startDate: string | null,
    endDate: string | null
  ): Promise<{ code: string; message: string } | null> {
    const connection = await db.getConnection();
    try {
      return await validateTimelineBoundaries(
        connection,
        projectId,
        sprintId,
        parentId,
        startDate,
        endDate
      );
    } finally {
      connection.release();
    }
  }

  async createTask(
    projectId: string,
    authenticatedUserStr: string | undefined,
    taskData: {
      title: string;
      description?: string;
      status?: string;
      type?: string;
      priority?: string;
      assigneeId?: string | null;
      reporterId?: string | null;
      sprintId?: string | null;
      parentId?: string | null;
      acceptanceCriteria?: string;
      storyPoints?: number | null;
      projectRisk?: string;
      startDate?: string | null;
      endDate?: string | null;
      attachments?: any[];
    }
  ): Promise<{ id: string; taskKey: string; reporterId: string | null; reporterObj: any }> {
    const connection = await db.getConnection();
    let transaksiTerbuka = false;
    try {
      await connection.beginTransaction();
      transaksiTerbuka = true;

      const [counterRows]: any = await connection.query(
        `UPDATE Projects SET taskCounter = COALESCE(taskCounter, 0) + 1 WHERE id = ? RETURNING id, projectKey, taskCounter`,
        [projectId]
      );

      let taskKey = "TASK-1";
      if (counterRows && counterRows.length > 0) {
        const proj = counterRows[0];
        const newCounter = proj.taskCounter || 1;
        const prefix = proj.projectKey || "TASK";
        taskKey = `${prefix}-${newCounter}`;
      }

      let resolvedReporterId = taskData.reporterId;
      if (
        !resolvedReporterId ||
        resolvedReporterId === "guest" ||
        resolvedReporterId === "Unknown"
      ) {
        if (authenticatedUserStr && authenticatedUserStr !== "guest") {
          const [uCheck]: any = await connection.query(
            "SELECT id, uid FROM Users WHERE id = ? OR uid = ?",
            [authenticatedUserStr, authenticatedUserStr]
          );
          if (uCheck && uCheck.length > 0) {
            resolvedReporterId = uCheck[0].id || uCheck[0].uid;
          } else {
            resolvedReporterId = authenticatedUserStr;
          }
        }
      }

      if (
        !resolvedReporterId ||
        resolvedReporterId === "guest" ||
        resolvedReporterId === "Unknown"
      ) {
        const [projOwner]: any = await connection.query(
          "SELECT ownerId FROM Projects WHERE id = ?",
          [projectId]
        );
        if (projOwner && projOwner.length > 0 && projOwner[0].ownerId) {
          resolvedReporterId = projOwner[0].ownerId;
        } else {
          const [firstUser]: any = await connection.query(
            "SELECT id, uid FROM Users ORDER BY createdAt ASC LIMIT 1"
          );
          if (firstUser && firstUser.length > 0) {
            resolvedReporterId = firstUser[0].id || firstUser[0].uid;
          }
        }
      }

      const validationError = await validateTimelineBoundaries(
        connection,
        projectId,
        taskData.sprintId || null,
        taskData.parentId || null,
        taskData.startDate || null,
        taskData.endDate || null
      );
      if (validationError) {
        await connection.rollback();
        transaksiTerbuka = false;
        const err: any = new Error(validationError.message);
        err.code = validationError.code;
        err.isValidationError = true;
        throw err;
      }

      const newId = crypto.randomUUID();

      await connection.query(
        `INSERT INTO Tasks (id, projectId, sprintId, taskKey, title, description, status, priority, type, assigneeId, reporterId, parentId, acceptanceCriteria, storyPoints, projectRisk, startDate, endDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          projectId,
          taskData.sprintId || null,
          taskKey,
          taskData.title,
          taskData.description || "",
          taskData.status || "To Do",
          taskData.priority || "Medium",
          taskData.type || "task",
          taskData.assigneeId || null,
          resolvedReporterId || null,
          taskData.parentId || null,
          taskData.acceptanceCriteria || "",
          taskData.storyPoints || null,
          taskData.projectRisk || "Low",
          taskData.startDate || null,
          taskData.endDate || null,
        ]
      );

      if (
        taskData.attachments &&
        Array.isArray(taskData.attachments) &&
        taskData.attachments.length > 0
      ) {
        for (const att of taskData.attachments) {
          const urlLampiran = att.url || "";
          const namaTersimpan =
            urlLampiran.split("?")[0].split("/").filter(Boolean).pop() || att.name || "lampiran";

          await connection.query(
            `INSERT INTO Attachments (id, "taskId", filename, name, "originalName", url, "fileType", type, size, "uploadedByName", "createdAt")
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              att.id || crypto.randomUUID(),
              newId,
              namaTersimpan,
              att.name || "Attachment",
              att.originalName || att.name || namaTersimpan,
              urlLampiran,
              att.type || "file",
              att.type || "file",
              att.size || 0,
              att.uploadedByName || "User",
            ]
          );
        }
      }

      await connection.commit();
      transaksiTerbuka = false;

      return { id: newId, taskKey, reporterId: resolvedReporterId || null, reporterObj: null };
    } catch (err) {
      if (transaksiTerbuka) {
        try {
          await connection.rollback();
        } catch {}
        transaksiTerbuka = false;
      }
      throw err;
    } finally {
      if (connection && transaksiTerbuka) {
        try {
          await connection.rollback();
        } catch {}
      }
      connection.release();
    }
  }

  async reorderTasks(projectId: string, orderedIds: string[]): Promise<void> {
    const connection = await db.getConnection();
    let transaksiTerbuka = false;
    try {
      await connection.beginTransaction();
      transaksiTerbuka = true;

      for (let i = 0; i < orderedIds.length; i++) {
        await connection.query("UPDATE Tasks SET orderIndex = ? WHERE id = ? AND projectId = ?", [
          i,
          orderedIds[i],
          projectId,
        ]);
      }

      await connection.commit();
      transaksiTerbuka = false;
    } catch (err) {
      if (transaksiTerbuka) {
        await connection.rollback();
      }
      throw err;
    } finally {
      connection.release();
    }
  }

  async findTaskWithProjectCategory(id: string, projectId: string): Promise<any | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT t.*, p.category as projectCategory, pt.reporterId as parentEpicReporterId 
         FROM Tasks t 
         JOIN Projects p ON t.projectId = p.id 
         LEFT JOIN Tasks pt ON t.parentId = pt.id 
         WHERE t.id = ? AND t.projectId = ?`,
        [id, projectId]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async getLinkedDependencies(id: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [deps]: any = await connection.query(
        `SELECT tl.sourceId, t_dep.status 
         FROM LinkedTasks tl 
         JOIN Tasks t_dep ON tl.sourceId = t_dep.id 
         WHERE tl.targetId = ? AND tl.type = 'blocks'`,
        [id]
      );
      return deps || [];
    } finally {
      connection.release();
    }
  }

  async getUnfinishedSubtasks(id: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const { muatKunciTerminal, sqlStatusBukanTerminal } = await import("../lib/statusSelesai");
      const kunci = await muatKunciTerminal();
      const predikat = sqlStatusBukanTerminal("status", kunci);
      const [subtasks]: any = await connection.query(
        `SELECT id, taskKey, title, status FROM Tasks WHERE parentId = ? AND ${predikat}`,
        [id]
      );
      return subtasks || [];
    } finally {
      connection.release();
    }
  }

  async updateTaskWithVersionLock(
    id: string,
    projectId: string,
    updates: { field: string; val: any }[],
    version?: number
  ): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const sqlParts = updates.map((u) => `${u.field} = ?`);
      const values = updates.map((u) => u.val);

      sqlParts.push("version = version + 1");
      values.push(id);

      let sql = `UPDATE Tasks SET ${sqlParts.join(", ")} WHERE id = ?`;
      if (version !== undefined) {
        sql += " AND version = ?";
        values.push(version);
      }
      sql += " RETURNING id";

      const [barisTersentuh]: any = await connection.query(sql, values);
      return Array.isArray(barisTersentuh) && barisTersentuh.length > 0;
    } finally {
      connection.release();
    }
  }

  async findTaskOwnership(id: string, projectId: string): Promise<any | null> {
    const connection = await db.getConnection();
    try {
      const [taskRows]: any = await connection.query(
        "SELECT assigneeId, reporterId FROM Tasks WHERE id = ? AND projectId = ?",
        [id, projectId]
      );
      return taskRows && taskRows.length > 0 ? taskRows[0] : null;
    } finally {
      connection.release();
    }
  }

  async findTasksByIds(taskIds: string[], projectId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [taskRows]: any = await connection.query(
        "SELECT id, projectId, reporterId, assigneeId FROM Tasks WHERE id IN (?) AND projectId = ?",
        [taskIds, projectId]
      );
      return taskRows || [];
    } finally {
      connection.release();
    }
  }

  async deleteTasksByIds(taskIds: string[], projectId: string): Promise<void> {
    // #444 — bulk harus cascade sama seperti delete satuan; sebelumnya hanya
    // DELETE Tasks sehingga Comments/Attachments/LinkedTasks/WorkLogs orphan.
    // #469 — "TaskWorkLogs" dikutip + SAVEPOINT (try/catch saja abort transaksi PG).
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM Comments WHERE taskId IN (?)", [taskIds]);
      await connection.query("DELETE FROM Attachments WHERE taskId IN (?)", [taskIds]);
      await connection.query(
        "DELETE FROM LinkedTasks WHERE sourceTaskId IN (?) OR targetTaskId IN (?)",
        [taskIds, taskIds]
      );
      await connection.query("DELETE FROM TaskCustomFields WHERE taskId IN (?)", [taskIds]);
      await hapusAnakOpsional(
        connection,
        "sp_worklogs",
        'DELETE FROM "TaskWorkLogs" WHERE "taskId" IN (?)',
        [taskIds]
      );
      await hapusAnakOpsional(
        connection,
        "sp_extlinks",
        "DELETE FROM TaskExternalLinks WHERE taskId IN (?)",
        [taskIds]
      );
      // #477 — ActivityLogs by taskId; Notifications terkait task (relatedId)
      await connection.query('DELETE FROM ActivityLogs WHERE "taskId" IN (?)', [taskIds]);
      await hapusAnakOpsional(
        connection,
        "sp_notif_task",
        "DELETE FROM Notifications WHERE relatedId IN (?)",
        [taskIds]
      );
      await connection.query("DELETE FROM Tasks WHERE id IN (?) AND projectId = ?", [
        taskIds,
        projectId,
      ]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async deleteTaskCascade(id: string, projectId: string): Promise<void> {
    // #469 — kutip "TaskWorkLogs" + SAVEPOINT agar 500 toast delete tidak kembali.
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM Comments WHERE taskId = ?", [id]);
      await connection.query("DELETE FROM Attachments WHERE taskId = ?", [id]);
      await connection.query("DELETE FROM LinkedTasks WHERE sourceTaskId = ? OR targetTaskId = ?", [
        id,
        id,
      ]);
      await connection.query("DELETE FROM TaskCustomFields WHERE taskId = ?", [id]);
      await hapusAnakOpsional(
        connection,
        "sp_worklogs",
        'DELETE FROM "TaskWorkLogs" WHERE "taskId" = ?',
        [id]
      );
      await hapusAnakOpsional(
        connection,
        "sp_extlinks",
        "DELETE FROM TaskExternalLinks WHERE taskId = ?",
        [id]
      );
      // #477 — bersihkan ActivityLogs + notifikasi terkait task
      await connection.query('DELETE FROM ActivityLogs WHERE "taskId" = ?', [id]);
      await hapusAnakOpsional(
        connection,
        "sp_notif_task",
        "DELETE FROM Notifications WHERE relatedId = ?",
        [id]
      );
      await connection.query("DELETE FROM Tasks WHERE id = ? AND projectId = ?", [id, projectId]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async findCommentsByTaskId(taskId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT c.*, 
                COALESCE(u."displayName", u.username, 'Pengguna') AS "authorName", 
                COALESCE(u.avatar_url, u."photoURL") AS "authorAvatar",
                COALESCE(u.username, '') AS "authorUsername"
         FROM Comments c
         LEFT JOIN Users u ON (c."authorId" = u.uid OR c."authorId" = u.id OR c."userId" = u.uid OR c."userId" = u.id)
         WHERE c.taskId = ? 
         ORDER BY c.createdAt ASC 
         LIMIT 200`,
        [taskId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createComment(comment: {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    parentId?: string | null;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        'INSERT INTO Comments (id, taskId, text, content, authorId, "parentId") VALUES (?, ?, ?, ?, ?, ?)',
        [
          comment.id,
          comment.taskId,
          comment.content,
          comment.content,
          comment.userId,
          comment.parentId || null,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async findActivityLogs(projectId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT * FROM ActivityLogs WHERE projectId = ? ORDER BY createdAt DESC LIMIT ${BATAS_DAFTAR_TANPA_PAGINATION}`,
        [projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findActivityLogsPaged(
    projectId: string,
    pagination: PaginationParams
  ): Promise<{ items: any[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const [countRows]: any = await connection.query(
        "SELECT COUNT(*)::int AS total FROM ActivityLogs WHERE projectId = ?",
        [projectId]
      );
      const total = countRows?.[0]?.total ?? 0;
      const [rows]: any = await connection.query(
        "SELECT * FROM ActivityLogs WHERE projectId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?",
        [projectId, pagination.limit, pagination.offset]
      );
      return { items: rows || [], total };
    } finally {
      connection.release();
    }
  }

  async createActivityLog(activity: {
    id: string;
    projectId: string;
    userId?: string | null;
    action: string;
    details?: string;
    taskId?: string | null;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO ActivityLogs (id, projectId, userId, action, details, "taskId")
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          activity.id,
          activity.projectId,
          activity.userId || null,
          activity.action,
          activity.details || "",
          activity.taskId || null,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async hasCycle(startNode: string, targetNode: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const visited = new Set<string>();
      const stack = [targetNode];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === startNode) return true;
        if (visited.has(current)) continue;

        visited.add(current);

        const [edges]: any = await connection.query(
          "SELECT targetTaskId FROM LinkedTasks WHERE sourceTaskId = ?",
          [current]
        );

        for (const edge of edges) {
          stack.push(edge.targetTaskId);
        }
      }
      return false;
    } finally {
      connection.release();
    }
  }

  async createLink(link: {
    id: string;
    sourceTaskId: string;
    targetTaskId: string;
    relationType: string;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO LinkedTasks (id, sourceTaskId, targetTaskId, relationType) VALUES (?, ?, ?, ?)",
        [link.id, link.sourceTaskId, link.targetTaskId, link.relationType]
      );
    } finally {
      connection.release();
    }
  }

  async deleteLink(linkId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      const [linkRows]: any = await connection.query("SELECT * FROM LinkedTasks WHERE id = ?", [
        linkId,
      ]);
      if (linkRows && linkRows.length > 0) {
        const link = linkRows[0];
        await connection.query("DELETE FROM LinkedTasks WHERE id = ?", [linkId]);
        await connection.query(
          "DELETE FROM LinkedTasks WHERE sourceTaskId = ? AND targetTaskId = ?",
          [link.targetTaskId, link.sourceTaskId]
        );
      }
    } finally {
      connection.release();
    }
  }

  /** #343 — daftar entri jam kerja (snake_case kolom). #469 — kutip nama tabel. */
  async listWorkLogs(taskId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT * FROM "TaskWorkLogs" WHERE "taskId" = ? ORDER BY "loggedAt" DESC LIMIT 100',
        [taskId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createWorkLog(entry: {
    id: string;
    taskId: string;
    userId: string | null;
    hours: number;
    note: string;
    loggedAt: string;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        'INSERT INTO "TaskWorkLogs" (id, "taskId", "userId", hours, note, "loggedAt") VALUES (?, ?, ?, ?, ?, ?)',
        [entry.id, entry.taskId, entry.userId, entry.hours, entry.note, entry.loggedAt]
      );
      const [sumRows]: any = await connection.query(
        'SELECT COALESCE(SUM(hours), 0) AS total FROM "TaskWorkLogs" WHERE "taskId" = ?',
        [entry.taskId]
      );
      const total = Number(sumRows?.[0]?.total || 0);
      await connection.query("UPDATE Tasks SET loggedHours = ?, updatedAt = NOW() WHERE id = ?", [
        total,
        entry.taskId,
      ]);
    } finally {
      connection.release();
    }
  }

  async addAttachment(data: {
    id: string;
    taskId: string;
    filename: string;
    name: string;
    originalName?: string;
    mimetype?: string;
    type?: string;
    size?: number;
    url: string;
    uploadedByName?: string;
    uploadedByUserId?: string;
  }): Promise<any> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO Attachments (id, "taskId", filename, name, "originalName", mimetype, type, size, url, "uploadedByName", "uploadedByUserId", "createdAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          data.id,
          data.taskId,
          data.filename,
          data.name,
          data.originalName || data.name,
          data.mimetype || "application/octet-stream",
          data.type || "file",
          data.size || 0,
          data.url,
          data.uploadedByName || "User",
          data.uploadedByUserId || null,
        ]
      );
      return {
        id: data.id,
        taskId: data.taskId,
        filename: data.filename,
        name: data.name,
        originalName: data.originalName || data.name,
        type: data.type || "file",
        size: data.size || 0,
        url: data.url,
        uploadedByName: data.uploadedByName || "User",
        createdAt: new Date().toISOString(),
      };
    } finally {
      connection.release();
    }
  }

  async deleteAttachment(attachmentId: string, taskId: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const [result]: any = await connection.query(
        'DELETE FROM Attachments WHERE id = ? AND "taskId" = ?',
        [attachmentId, taskId]
      );
      return (
        result?.affectedRows > 0 || (typeof result?.rowCount === "number" && result.rowCount > 0)
      );
    } finally {
      connection.release();
    }
  }

  async findAttachmentById(attachmentId: string): Promise<any | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM Attachments WHERE id = ? LIMIT 1", [
        attachmentId,
      ]);
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }
}

export const taskRepository = new TaskRepository();
