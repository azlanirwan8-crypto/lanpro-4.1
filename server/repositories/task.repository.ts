import db from "../../src/lib/db";
import crypto from "crypto";
import { validateTimelineBoundaries } from "../services/task.service";

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
  async findTasksWithRelations(projectId: string, allowedTaskIds: Set<string> | null = null): Promise<any[]> {
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

      const subtasksMap = new Map<string, any[]>();
      (filteredTasks || []).forEach((t: any) => {
        if (t.parentId) {
          if (!subtasksMap.has(t.parentId)) {
            subtasksMap.set(t.parentId, []);
          }
          subtasksMap.get(t.parentId)!.push(t);
        }
      });

      const [userRows]: any = await connection.query(
        "SELECT id, uid, displayName, nama_lengkap, username, email, photoURL FROM Users"
      );
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

      return filteredTasks.map((t: any) => {
        const reporterUser = t.reporterId ? usersMap.get(t.reporterId) : null;
        return {
          ...t,
          key: t.taskKey,
          reporter: reporterUser || null,
          linkedTasks: linksMap.get(t.id) || [],
          subtasks: subtasksMap.get(t.id) || [],
        };
      });
    } finally {
      connection.release();
    }
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

      const [lockRows]: any = await connection.query(
        "SELECT id, projectKey, taskCounter FROM Projects WHERE id = ? FOR UPDATE",
        [projectId]
      );

      let taskKey = "TASK-1";
      if (lockRows && lockRows.length > 0) {
        const proj = lockRows[0];
        const newCounter = (proj.taskCounter || 0) + 1;
        await connection.query("UPDATE Projects SET taskCounter = ? WHERE id = ?", [
          newCounter,
          projectId,
        ]);
        taskKey = `${proj.projectKey}-${newCounter}`;
      }

      let resolvedReporterId = taskData.reporterId;
      if (!resolvedReporterId || resolvedReporterId === "guest" || resolvedReporterId === "Unknown") {
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

      if (!resolvedReporterId || resolvedReporterId === "guest" || resolvedReporterId === "Unknown") {
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

      if (taskData.attachments && Array.isArray(taskData.attachments) && taskData.attachments.length > 0) {
        for (const att of taskData.attachments) {
          const urlLampiran = att.url || "";
          const namaTersimpan =
            urlLampiran.split("?")[0].split("/").filter(Boolean).pop() || att.name || "lampiran";

          await connection.query(
            `INSERT INTO Attachments (id, taskId, filename, name, url, fileType, uploadedByName, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              att.id || crypto.randomUUID(),
              newId,
              namaTersimpan,
              att.name || "Attachment",
              urlLampiran,
              att.type || "file",
              att.uploadedByName || "User",
            ]
          );
        }
      }

      await connection.commit();
      transaksiTerbuka = false;

      let reporterObj: any = null;
      if (resolvedReporterId) {
        const [rRows]: any = await connection.query(
          "SELECT id, uid, displayName, nama_lengkap, username, email, photoURL FROM Users WHERE id = ? OR uid = ?",
          [resolvedReporterId, resolvedReporterId]
        );
        if (rRows && rRows.length > 0) {
          const r = rRows[0];
          reporterObj = {
            id: r.id,
            uid: r.uid,
            name: r.displayName || r.nama_lengkap || r.username || r.email,
            displayName: r.displayName || r.nama_lengkap || r.username || r.email,
            avatar: r.photoURL || "",
            photoURL: r.photoURL || "",
            email: r.email || "",
          };
        }
      }

      return { id: newId, taskKey, reporterId: resolvedReporterId || null, reporterObj };
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
      const [subtasks]: any = await connection.query(
        "SELECT id, taskKey, title, status FROM Tasks WHERE parentId = ? AND status != 'Done'",
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
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Tasks WHERE id IN (?) AND projectId = ?", [
        taskIds,
        projectId,
      ]);
    } finally {
      connection.release();
    }
  }

  async deleteTaskCascade(id: string, projectId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM Comments WHERE taskId = ?", [id]);
      await connection.query("DELETE FROM Attachments WHERE taskId = ?", [id]);
      await connection.query(
        "DELETE FROM LinkedTasks WHERE sourceTaskId = ? OR targetTaskId = ?",
        [id, id]
      );
      await connection.query("DELETE FROM TaskCustomFields WHERE taskId = ?", [id]);
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
        "SELECT * FROM Comments WHERE taskId = ? ORDER BY createdAt ASC LIMIT 200",
        [taskId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createComment(comment: { id: string; taskId: string; userId: string; content: string }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO Comments (id, taskId, content, authorId) VALUES (?, ?, ?, ?)",
        [comment.id, comment.taskId, comment.content, comment.userId]
      );
    } finally {
      connection.release();
    }
  }

  async findActivityLogs(projectId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT * FROM ActivityLogs WHERE projectId = ? ORDER BY createdAt DESC LIMIT 50",
        [projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createActivityLog(activity: { id: string; projectId: string; userId?: string | null; action: string; details?: string }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO ActivityLogs (id, projectId, userId, action, details)
         VALUES (?, ?, ?, ?, ?)`,
        [activity.id, activity.projectId, activity.userId || null, activity.action, activity.details || ""]
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

  async createLink(link: { id: string; sourceTaskId: string; targetTaskId: string; relationType: string }): Promise<void> {
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
      const [linkRows]: any = await connection.query("SELECT * FROM LinkedTasks WHERE id = ?", [linkId]);
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
}

export const taskRepository = new TaskRepository();
