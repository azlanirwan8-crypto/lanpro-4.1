import db from "../../src/lib/db";

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
        "SELECT * FROM Milestones WHERE projectId = ? ORDER BY dueDate ASC",
        [projectId]
      );

      const [allMilestoneLinks]: any = await connection.query(
        "SELECT milestoneId, sprintId FROM MilestoneSprints WHERE milestoneId IN (SELECT id FROM Milestones WHERE projectId = ?)",
        [projectId]
      );

      const milestoneSprintMap = new Map<string, string[]>();
      for (const link of allMilestoneLinks) {
        if (!milestoneSprintMap.has(link.milestoneId)) {
          milestoneSprintMap.set(link.milestoneId, []);
        }
        milestoneSprintMap.get(link.milestoneId)!.push(link.sprintId);
      }

      const allSprintIds = new Set<string>();
      milestoneSprintMap.forEach((sprints) => sprints.forEach((s) => allSprintIds.add(s)));

      const sprintStatsMap = new Map<string, any>();
      if (allSprintIds.size > 0) {
        const [stats]: any = await connection.query(
          `
            SELECT
              sprintId,
              SUM(CASE WHEN status = 'Done' THEN storyPoints ELSE 0 END) as donePoints,
              SUM(storyPoints) as totalPoints
            FROM Tasks
            WHERE sprintId IN (?) AND storyPoints IS NOT NULL
            GROUP BY sprintId
          `,
          [Array.from(allSprintIds)]
        );

        stats.forEach((stat: any) => {
          sprintStatsMap.set(stat.sprintId, stat);
        });
      }

      for (const ms of milestones) {
        const sprintIds = milestoneSprintMap.get(ms.id) || [];
        if (sprintIds.length > 0) {
          let totalPoints = 0,
            donePoints = 0;
          sprintIds.forEach((sprintId) => {
            const stat = sprintStatsMap.get(sprintId);
            if (stat) {
              totalPoints += stat.totalPoints || 0;
              donePoints += stat.donePoints || 0;
            }
          });
          ms.progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
          ms.totalStoryPoints = totalPoints;
          ms.doneStoryPoints = donePoints;
        } else {
          ms.progress = 0;
        }
      }

      return milestones || [];
    } finally {
      connection.release();
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
