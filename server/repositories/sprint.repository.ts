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

  /**
   * #462 — turunkan sprint aktif lain di proyek yang sama menjadi planned
   * sebelum mengaktifkan `exceptId`.
   */
  async demoteOtherActives(projectId: string, exceptId: string): Promise<number> {
    const connection = await db.getConnection();
    try {
      const [result]: any = await connection.query(
        `UPDATE Sprints SET status = 'planned'
         WHERE projectId = ?
           AND id <> ?
           AND LOWER(TRIM(status)) IN ('active', 'in_progress', 'ongoing', 'in progress')`,
        [projectId, exceptId]
      );
      return result?.rowCount ?? result?.affectedRows ?? 0;
    } finally {
      connection.release();
    }
  }

  /**
   * #475 — hapus sprint: null-kan Tasks.sprintId + MilestoneSprints, lalu Sprints.
   * UPDATE langsung di repo = jalur unlock (#461): bukan PUT task per baris,
   * jadi cekPindahLingkupSprint tidak menolak saat lingkup aktif/selesai.
   */
  async delete(id: string, projectId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "UPDATE Tasks SET sprintId = NULL WHERE sprintId = ? AND projectId = ?",
        [id, projectId]
      );
      await connection.query("DELETE FROM MilestoneSprints WHERE sprintId = ?", [id]);
      await connection.query("DELETE FROM Sprints WHERE id = ? AND projectId = ?", [id, projectId]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

export const sprintRepository = new SprintRepository();
