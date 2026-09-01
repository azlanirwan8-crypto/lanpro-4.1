import db from "../../src/lib/db";
import { BATAS_DAFTAR_TANPA_PAGINATION, type PaginationParams } from "../lib/pagination";

export interface MilestoneEntity {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
  progress?: number;
  totalStoryPoints?: number;
  doneStoryPoints?: number;
}

export class MilestoneRepository {
  async findByProjectId(projectId: string): Promise<MilestoneEntity[]> {
    const connection = await db.getConnection();
    try {
      const [milestones]: any = await connection.query(
        `SELECT * FROM Milestones WHERE projectId = ? ORDER BY dueDate ASC LIMIT ${BATAS_DAFTAR_TANPA_PAGINATION}`,
        [projectId]
      );
      await this.enrichMilestones(connection, projectId, milestones || []);
      return milestones || [];
    } finally {
      connection.release();
    }
  }

  async findByProjectIdPaged(
    projectId: string,
    pagination: PaginationParams
  ): Promise<{ items: MilestoneEntity[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const [countRows]: any = await connection.query(
        "SELECT COUNT(*)::int AS total FROM Milestones WHERE projectId = ?",
        [projectId]
      );
      const total = countRows?.[0]?.total ?? 0;
      const [milestones]: any = await connection.query(
        "SELECT * FROM Milestones WHERE projectId = ? ORDER BY dueDate ASC LIMIT ? OFFSET ?",
        [projectId, pagination.limit, pagination.offset]
      );
      await this.enrichMilestones(connection, projectId, milestones || []);
      return { items: milestones || [], total };
    } finally {
      connection.release();
    }
  }

  private async enrichMilestones(
    connection: any,
    projectId: string,
    milestones: MilestoneEntity[]
  ) {
    if (!milestones.length) return;

    const [allMilestoneLinks]: any = await connection.query(
      "SELECT milestoneId, sprintId FROM MilestoneSprints WHERE milestoneId IN (SELECT id FROM Milestones WHERE projectId = ?)",
      [projectId]
    );

    const milestoneSprintMap = new Map<string, string[]>();
    for (const link of allMilestoneLinks || []) {
      if (!milestoneSprintMap.has(link.milestoneId)) {
        milestoneSprintMap.set(link.milestoneId, []);
      }
      milestoneSprintMap.get(link.milestoneId)!.push(link.sprintId);
    }

    const allSprintIds = new Set<string>();
    milestoneSprintMap.forEach((sprints) => sprints.forEach((s) => allSprintIds.add(s)));

    const sprintStatsMap = new Map<string, any>();
    const { muatKunciTerminal, sqlStatusAdalahTerminal } = await import("../lib/statusSelesai");
    const kunciTerminal = await muatKunciTerminal();
    const predikatDone = sqlStatusAdalahTerminal("status", kunciTerminal);

    if (allSprintIds.size > 0) {
      const [stats]: any = await connection.query(
        `
            SELECT
              sprintId,
              SUM(CASE WHEN ${predikatDone} THEN storyPoints ELSE 0 END) as donePoints,
              SUM(storyPoints) as totalPoints
            FROM Tasks
            WHERE sprintId IN (?) AND storyPoints IS NOT NULL
            GROUP BY sprintId
          `,
        [Array.from(allSprintIds)]
      );

      (stats || []).forEach((stat: any) => {
        sprintStatsMap.set(stat.sprintId, stat);
      });
    }

    // Progress langsung dari Tasks.milestoneId (#312) — jalur waterfall tanpa MilestoneSprints.
    const [taskStats]: any = await connection.query(
      `
        SELECT
          milestoneId,
          COUNT(*)::int AS totalTasks,
          SUM(CASE WHEN ${predikatDone} THEN 1 ELSE 0 END)::int AS doneTasks,
          COALESCE(SUM(COALESCE(storyPoints, 0)), 0)::int AS totalPoints,
          COALESCE(
            SUM(CASE WHEN ${predikatDone} THEN COALESCE(storyPoints, 0) ELSE 0 END),
            0
          )::int AS donePoints
        FROM Tasks
        WHERE projectId = ? AND milestoneId IS NOT NULL
        GROUP BY milestoneId
      `,
      [projectId]
    );
    const taskStatsMap = new Map<string, any>();
    for (const row of taskStats || []) {
      taskStatsMap.set(row.milestoneId, row);
    }

    for (const ms of milestones) {
      const sprintIds = milestoneSprintMap.get(ms.id) || [];
      let totalPoints = 0;
      let donePoints = 0;

      if (sprintIds.length > 0) {
        sprintIds.forEach((sprintId) => {
          const stat = sprintStatsMap.get(sprintId);
          if (stat) {
            totalPoints += Number(stat.totalPoints) || 0;
            donePoints += Number(stat.donePoints) || 0;
          }
        });
      }

      const direct = taskStatsMap.get(ms.id);
      if (direct) {
        if (Number(direct.totalPoints) > 0) {
          totalPoints += Number(direct.totalPoints) || 0;
          donePoints += Number(direct.donePoints) || 0;
        } else if (sprintIds.length === 0 && Number(direct.totalTasks) > 0) {
          totalPoints = Number(direct.totalTasks);
          donePoints = Number(direct.doneTasks) || 0;
        }
      }

      ms.totalStoryPoints = totalPoints;
      ms.doneStoryPoints = donePoints;
      ms.progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
    }
  }

  async create(milestone: {
    id: string;
    projectId: string;
    name: string;
    description?: string | null;
    dueDate?: string | null;
    status?: string;
    sprintIds?: string[];
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO Milestones (id, projectId, name, description, dueDate, status) VALUES (?, ?, ?, ?, ?, ?)",
        [
          milestone.id,
          milestone.projectId,
          milestone.name,
          milestone.description || "",
          milestone.dueDate || null,
          milestone.status || "planned",
        ]
      );

      if (milestone.sprintIds && Array.isArray(milestone.sprintIds)) {
        for (const sid of milestone.sprintIds) {
          await connection.query(
            "INSERT INTO MilestoneSprints (milestoneId, sprintId) VALUES (?, ?)",
            [milestone.id, sid]
          );
        }
      }
    } finally {
      connection.release();
    }
  }

  async update(
    id: string,
    updates: {
      name?: string;
      description?: string;
      dueDate?: string | null;
      status?: string;
      sprintIds?: string[];
    }
  ): Promise<void> {
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
      if (updates.dueDate !== undefined) {
        sqlUpdates.push("dueDate = ?");
        values.push(updates.dueDate);
      }
      if (updates.status !== undefined) {
        sqlUpdates.push("status = ?");
        values.push(updates.status);
      }

      if (sqlUpdates.length > 0) {
        values.push(id);
        await connection.query(
          `UPDATE Milestones SET ${sqlUpdates.join(", ")} WHERE id = ?`,
          values
        );
      }

      if (updates.sprintIds !== undefined && Array.isArray(updates.sprintIds)) {
        await connection.query("DELETE FROM MilestoneSprints WHERE milestoneId = ?", [id]);
        for (const sid of updates.sprintIds) {
          await connection.query(
            "INSERT INTO MilestoneSprints (milestoneId, sprintId) VALUES (?, ?)",
            [id, sid]
          );
        }
      }
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Milestones WHERE id = ?", [id]);
    } finally {
      connection.release();
    }
  }
}

export const milestoneRepository = new MilestoneRepository();
