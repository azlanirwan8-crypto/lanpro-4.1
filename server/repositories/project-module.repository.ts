import db from "../../src/lib/db";

export interface ProjectModuleEntity {
  id: string;
  projectId: string;
  namaModul: string;
  keterangan?: string | null;
  createdAt?: string;
}

export class ProjectModuleRepository {
  async findAll(): Promise<ProjectModuleEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT * FROM ProjectModules ORDER BY createdAt DESC"
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findByProjectId(projectId: string): Promise<ProjectModuleEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT * FROM ProjectModules WHERE projectId = ? ORDER BY createdAt DESC",
        [projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async create(modul: ProjectModuleEntity): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO ProjectModules (id, projectId, namaModul, keterangan, createdAt) VALUES (?, ?, ?, ?, ?)",
        [
          modul.id || String(Date.now()),
          modul.projectId,
          modul.namaModul,
          modul.keterangan || null,
          modul.createdAt || new Date().toISOString(),
        ]
      );
    } finally {
      connection.release();
    }
  }

  async update(id: string, updates: { projectId: string; namaModul: string; keterangan?: string | null }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE ProjectModules SET projectId = ?, namaModul = ?, keterangan = ? WHERE id = ?",
        [updates.projectId, updates.namaModul, updates.keterangan || null, id]
      );
    } finally {
      connection.release();
    }
  }

  async deleteWithTestCases(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM QATestCases WHERE modulId = ?", [id]);
      await connection.query("DELETE FROM ProjectModules WHERE id = ?", [id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

export const projectModuleRepository = new ProjectModuleRepository();
