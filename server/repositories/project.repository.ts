import db from "../../src/lib/db";
import crypto from "crypto";
import { adalahTabelTidakAda } from "../helpers/pgErrors";

export interface ProjectEntity {
  id: string;
  name: string;
  projectKey: string;
  description?: string | null;
  ownerId?: string | null;
  status: string;
  category: string;
  taskCounter?: number;
  dashboardLayout?: any;
  dashboard_layout?: any;
  members?: string[];
  memberRoles?: Record<string, string>;
  createdAt?: string;
}

export class ProjectRepository {
  async getCategory(projectId: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [proj]: any = await connection.query("SELECT category FROM Projects WHERE id = ?", [
        projectId,
      ]);
      return proj && proj.length > 0 ? proj[0].category : null;
    } finally {
      connection.release();
    }
  }

  async findProjectsForCaller(callerId: string, callerRole: string): Promise<ProjectEntity[]> {
    const connection = await db.getConnection();
    try {
      const [callerRows]: any = await connection.query(
        "SELECT id, role FROM Users WHERE id = ? OR uid = ?",
        [callerId, callerId]
      );
      const role = callerRows[0]?.role || callerRole;
      const resolvedCallerId = callerRows[0]?.id || callerId;

      let query = "SELECT * FROM Projects ORDER BY createdAt DESC";
      let params: any[] = [];

      if (role !== "admin") {
        query = `
          SELECT p.* FROM Projects p
          LEFT JOIN ProjectMembers pm ON p.id = pm.projectId
          WHERE p.ownerId = ? OR pm.userId = ?
          GROUP BY p.id
          ORDER BY p.createdAt DESC
        `;
        params = [resolvedCallerId, resolvedCallerId];
      }

      const [rows] = await connection.query(query, params);
      const projects = rows as ProjectEntity[];

      if (projects.length > 0) {
        const projectIds = projects.map((p) => p.id);

        const [allMemberRows]: any = await connection.query(
          `SELECT pm.projectId, u.uid, u.id as uuid, pm.role 
             FROM ProjectMembers pm
             JOIN Users u ON (pm.userId = u.id OR pm.userId = u.uid)
             WHERE pm.projectId IN (?)`,
          [projectIds]
        );

        const membersByProject = new Map<
          string,
          { list: string[]; roles: Record<string, string> }
        >();

        for (const row of allMemberRows) {
          if (!membersByProject.has(row.projectId)) {
            membersByProject.set(row.projectId, { list: [], roles: {} });
          }
          const pData = membersByProject.get(row.projectId)!;
          if (row.uid && !pData.list.includes(row.uid)) pData.list.push(row.uid);
          if (row.uuid && !pData.list.includes(row.uuid)) pData.list.push(row.uuid);
          if (row.uid) pData.roles[row.uid] = row.role || "viewer";
          if (row.uuid) pData.roles[row.uuid] = row.role || "viewer";
        }

        for (const p of projects) {
          const pData = membersByProject.get(p.id) || { list: [], roles: {} };
          p.members = pData.list;
          p.memberRoles = pData.roles;
        }
      }

      return projects;
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<ProjectEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM Projects WHERE id = ?", [id]);

      if (rows && rows.length > 0) {
        const p = rows[0] as ProjectEntity;
        const [memberRows]: any = await connection.query(
          `SELECT u.uid, u.id as uuid, pm.role 
             FROM ProjectMembers pm
             JOIN Users u ON pm.userId = u.id
             WHERE pm.projectId = ?`,
          [p.id]
        );

        const membersList: string[] = [];
        const memberRoles: Record<string, string> = {};

        for (const m of memberRows as any[]) {
          membersList.push(m.uid);
          memberRoles[m.uid] = m.role || "viewer";
          memberRoles[m.uuid] = m.role || "viewer";
        }

        p.members = membersList;
        p.memberRoles = memberRoles;
        return p;
      }
      return null;
    } finally {
      connection.release();
    }
  }

  async create(project: {
    id: string;
    name: string;
    projectKey: string;
    description?: string;
    ownerId: string;
    status: string;
    category: string;
  }): Promise<ProjectEntity> {
    const connection = await db.getConnection();
    try {
      let resolvedOwnerId = project.ownerId;
      const [uRows]: any = await connection.query("SELECT id FROM Users WHERE id = ? OR uid = ?", [
        project.ownerId,
        project.ownerId,
      ]);
      if (uRows.length > 0) {
        resolvedOwnerId = uRows[0].id;
      }

      await connection.query(
        "INSERT INTO Projects (id, name, projectKey, description, ownerId, status, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          project.id,
          project.name,
          project.projectKey,
          project.description || "",
          resolvedOwnerId,
          project.status || "Active",
          project.category || "Agile",
        ]
      );

      await connection.query(
        "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
        [project.id, resolvedOwnerId, "Admin"]
      );

      return {
        id: project.id,
        name: project.name,
        projectKey: project.projectKey,
        description: project.description,
        ownerId: resolvedOwnerId,
        status: project.status || "Active",
        category: project.category || "Agile",
      };
    } finally {
      connection.release();
    }
  }

  async updateDashboardLayout(projectId: string, jsonLayout: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Projects SET dashboard_layout = ?, dashboardLayout = ? WHERE id = ?",
        [jsonLayout, jsonLayout, projectId]
      );
    } finally {
      connection.release();
    }
  }

  async update(id: string, updates: Record<string, any>): Promise<void> {
    const connection = await db.getConnection();
    try {
      const sqlUpdates: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        sqlUpdates.push("name = ?");
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        sqlUpdates.push("description = ?");
        values.push(updates.description);
      }
      if (updates.status !== undefined) {
        sqlUpdates.push("status = ?");
        values.push(updates.status);
      }
      if (updates.projectKey !== undefined) {
        sqlUpdates.push("projectKey = ?");
        values.push(updates.projectKey);
      }
      if (updates.ownerId !== undefined) {
        let resolvedOwnerId = updates.ownerId;
        const [uRows]: any = await connection.query(
          "SELECT id FROM Users WHERE id = ? OR uid = ?",
          [updates.ownerId, updates.ownerId]
        );
        if (uRows.length > 0) {
          resolvedOwnerId = uRows[0].id;
        }
        sqlUpdates.push("ownerId = ?");
        values.push(resolvedOwnerId);
      }
      if (updates.category !== undefined) {
        sqlUpdates.push("category = ?");
        values.push(updates.category);
      }
      if (updates.taskCounter !== undefined) {
        sqlUpdates.push("taskCounter = ?");
        values.push(updates.taskCounter);
      }
      if (updates.dashboardLayout !== undefined) {
        sqlUpdates.push("dashboardLayout = ?");
        values.push(
          updates.dashboardLayout !== null ? JSON.stringify(updates.dashboardLayout) : null
        );
      }

      if (sqlUpdates.length > 0) {
        values.push(id);
        const query = `UPDATE Projects SET ${sqlUpdates.join(", ")} WHERE id = ?`;
        await connection.query(query, values);
      }
    } finally {
      connection.release();
    }
  }

  async updateMethodology(projectId: string, normalizedMethodology: string): Promise<string> {
    const connection = await db.getConnection();
    try {
      const [oldRows]: any = await connection.query("SELECT category FROM Projects WHERE id = ?", [
        projectId,
      ]);
      if (oldRows.length === 0) {
        throw new Error("Proyek tidak ditemukan.");
      }
      const oldMethod = oldRows[0].category;

      await connection.query("UPDATE Projects SET category = ? WHERE id = ?", [
        normalizedMethodology,
        projectId,
      ]);

      return oldMethod;
    } finally {
      connection.release();
    }
  }

  async deleteCascade(projectId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const cascadeQueries: [string, any[]][] = [
        [
          "DELETE FROM LinkedTasks WHERE sourceTaskId IN (SELECT id FROM Tasks WHERE projectId = ?) OR targetTaskId IN (SELECT id FROM Tasks WHERE projectId = ?)",
          [projectId, projectId],
        ],
        [
          "DELETE FROM Comments WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)",
          [projectId],
        ],
        [
          "DELETE FROM Attachments WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)",
          [projectId],
        ],
        [
          "DELETE FROM TaskExternalLinks WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)",
          [projectId],
        ],
        [
          "DELETE FROM TaskCustomFields WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)",
          [projectId],
        ],
        [
          "DELETE FROM DiscussionPoints WHERE meetingId IN (SELECT id FROM Meetings WHERE projectId = ?)",
          [projectId],
        ],
        [
          "DELETE FROM MilestoneSprints WHERE milestoneId IN (SELECT id FROM Milestones WHERE projectId = ?)",
          [projectId],
        ],
        [
          "DELETE FROM meeting_details WHERE meeting_id IN (SELECT id FROM Meetings WHERE projectId = ?)",
          [projectId],
        ],
        ["DELETE FROM QATestCaseExecutionLogs WHERE projectId = ?", [projectId]],
        ["DELETE FROM Tasks WHERE projectId = ?", [projectId]],
        ["DELETE FROM Sprints WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectMembers WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectInvites WHERE projectId = ?", [projectId]],
        ["DELETE FROM Meetings WHERE projectId = ?", [projectId]],
        ["DELETE FROM Milestones WHERE projectId = ?", [projectId]],
        ["DELETE FROM Documents WHERE projectId = ?", [projectId]],
        ["DELETE FROM ActivityLogs WHERE projectId = ?", [projectId]],
        ["DELETE FROM AuditLogs WHERE projectId = ?", [projectId]],
        ["DELETE FROM QATestCases WHERE projectId = ?", [projectId]],
        ["DELETE FROM QATestSuites WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectModules WHERE projectId = ?", [projectId]],
        ["DELETE FROM Projects WHERE id = ?", [projectId]],
      ];

      for (const [query, params] of cascadeQueries) {
        await connection.query("SAVEPOINT hapus_bertingkat");
        try {
          await connection.query(query, params);
          await connection.query("RELEASE SAVEPOINT hapus_bertingkat");
        } catch (execError: any) {
          await connection.query("ROLLBACK TO SAVEPOINT hapus_bertingkat");
          if (adalahTabelTidakAda(execError)) {
            console.warn(`[HAPUS PROYEK] Melewati tabel yang tidak ada: ${query.substring(0, 60)}`);
            continue;
          }
          throw execError;
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async updateMembers(
    id: string,
    memberRoles?: Record<string, string>,
    newMemberId?: string,
    newMemberRole?: string,
    teamMemberIds?: string[]
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      if (memberRoles) {
        for (const [userId, role] of Object.entries(memberRoles)) {
          const [users]: any = await connection.query(
            "SELECT id FROM Users WHERE id = ? OR uid = ?",
            [userId, userId]
          );
          if (users.length > 0) {
            const resolvedUserId = users[0].id;
            const [existing]: any = await connection.query(
              "SELECT * FROM ProjectMembers WHERE projectId = ? AND userId = ?",
              [id, resolvedUserId]
            );

            if (existing.length > 0) {
              await connection.query(
                "UPDATE ProjectMembers SET role = ? WHERE projectId = ? AND userId = ?",
                [role, id, resolvedUserId]
              );
            } else {
              await connection.query(
                "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
                [id, resolvedUserId, role]
              );
            }
          }
        }
      }

      if (newMemberId && newMemberRole) {
        const [users]: any = await connection.query(
          "SELECT id FROM Users WHERE id = ? OR uid = ?",
          [newMemberId, newMemberId]
        );
        if (users.length > 0) {
          const resolvedUserId = users[0].id;

          const [existing]: any = await connection.query(
            "SELECT * FROM ProjectMembers WHERE projectId = ? AND userId = ?",
            [id, resolvedUserId]
          );

          if (existing.length > 0) {
            await connection.query(
              "UPDATE ProjectMembers SET role = ? WHERE projectId = ? AND userId = ?",
              [newMemberRole, id, resolvedUserId]
            );
          } else {
            await connection.query(
              "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
              [id, resolvedUserId, newMemberRole]
            );
          }

          if (
            ["admin", "manager", "lead"].includes(String(newMemberRole).toLowerCase()) &&
            Array.isArray(teamMemberIds) &&
            teamMemberIds.length > 0
          ) {
            for (const tmId of teamMemberIds) {
              const [tmUsers]: any = await connection.query(
                "SELECT id FROM Users WHERE id = ? OR uid = ?",
                [tmId, tmId]
              );
              if (tmUsers.length > 0) {
                const resolvedTmId = tmUsers[0].id;
                const [tmExisting]: any = await connection.query(
                  "SELECT * FROM ProjectMembers WHERE projectId = ? AND userId = ?",
                  [id, resolvedTmId]
                );
                if (tmExisting.length === 0) {
                  await connection.query(
                    "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, 'member')",
                    [id, resolvedTmId]
                  );
                }
              }
            }
          }
        }
      }
    } finally {
      connection.release();
    }
  }

  async removeMember(id: string, userId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      const [users]: any = await connection.query(
        "SELECT id, uid FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );

      if (users.length > 0) {
        const resolvedUserId = users[0].id;
        const resolvedUserUid = users[0].uid;

        await connection.query(
          "DELETE FROM ProjectMembers WHERE projectId = ? AND (userId = ? OR userId = ?)",
          [id, resolvedUserId, userId]
        );

        await connection.query(
          "UPDATE Projects SET ownerId = NULL WHERE id = ? AND (ownerId = ? OR ownerId = ? OR ownerId = ?)",
          [id, resolvedUserId, resolvedUserUid, userId]
        );
      }
    } finally {
      connection.release();
    }
  }

  async addInvite(projectId: string, email: string, invitedBy?: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        'INSERT INTO "ProjectInvites" (id, "projectId", email, "invitedBy") VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), projectId, email, invitedBy || null]
      );
    } finally {
      connection.release();
    }
  }
}

export const projectRepository = new ProjectRepository();
