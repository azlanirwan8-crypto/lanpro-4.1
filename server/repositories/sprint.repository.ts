import db from "../../src/lib/db";
import { BATAS_DAFTAR_TANPA_PAGINATION, type PaginationParams } from "../lib/pagination";

export interface SprintEntity {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
}

export class SprintRepository {
  async findByProjectId(projectId: string): Promise<SprintEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT * FROM Sprints WHERE projectId = ? ORDER BY startDate ASC LIMIT ${BATAS_DAFTAR_TANPA_PAGINATION}`,
        [projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findByProjectIdPaged(
    projectId: string,
    pagination: PaginationParams
  ): Promise<{ items: SprintEntity[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const [countRows]: any = await connection.query(
        "SELECT COUNT(*)::int AS total FROM Sprints WHERE projectId = ?",
        [projectId]
      );
      const total = countRows?.[0]?.total ?? 0;
      const [rows]: any = await connection.query(
        "SELECT * FROM Sprints WHERE projectId = ? ORDER BY startDate ASC LIMIT ? OFFSET ?",
        [projectId, pagination.limit, pagination.offset]
      );
      return { items: rows || [], total };
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<SprintEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM Sprints WHERE id = ?", [id]);
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async create(sprint: SprintEntity): Promise<SprintEntity> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          sprint.id,
          sprint.projectId,
          sprint.name,
          sprint.goal || "",
          sprint.startDate || null,
          sprint.endDate || null,
          sprint.status || "planned",
        ]
      );
      return sprint;
    } finally {
      connection.release();
    }
  }

  async update(id: string, updates: Partial<SprintEntity>): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Sprints SET name=?, goal=?, startDate=?, endDate=?, status=? WHERE id=?",
        [
          updates.name,
          updates.goal,
          updates.startDate || null,
          updates.endDate || null,
          updates.status,
          id,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async delete(id: string, projectId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Sprints WHERE id = ? AND projectId = ?", [id, projectId]);
    } finally {
      connection.release();
    }
  }
}

export const sprintRepository = new SprintRepository();
