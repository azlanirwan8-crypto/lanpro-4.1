import db from "../../src/lib/db";

export interface DocumentEntity {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  type?: string | null;
  link?: string | null;
  fileData?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  /** Payload kanvas flowchart ({nodes,edges}). Item #136 — dulu menumpang `description`. */
  canvasData?: string | null;
  /** Kategori dokumen. Item #144 — dulu tidak punya kolom sama sekali. */
  category?: string | null;
  createdBy?: string;
  downloadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export class DocumentRepository {
  async findByProjectId(projectId: string): Promise<DocumentEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT id, projectId, title, description, type, link, fileName, fileType, canvasData, category, createdBy, downloadCount, createdAt, updatedAt FROM Documents WHERE projectId = ? ORDER BY createdAt DESC",
        [projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<DocumentEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM Documents WHERE id = ?", [id]);
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async getFileAndIncrementDownload(
    id: string
  ): Promise<{ fileData: string; fileName: string; fileType: string } | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT fileData, fileName, fileType FROM Documents WHERE id = ?",
        [id]
      );
      if (rows && rows.length > 0) {
        await connection.query(
          "UPDATE Documents SET downloadCount = downloadCount + 1 WHERE id = ?",
          [id]
        );
        return rows[0];
      }
      return null;
    } finally {
      connection.release();
    }
  }

  async create(doc: DocumentEntity): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO Documents (id, projectId, title, description, type, link, fileData, fileName, fileType, canvasData, category, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          doc.id,
          doc.projectId,
          doc.title,
          doc.description || null,
          doc.type || null,
          doc.link || null,
          doc.fileData || null,
          doc.fileName || null,
          doc.fileType || null,
          doc.canvasData || null,
          doc.category || null,
          doc.createdBy || "guest",
        ]
      );
    } finally {
      connection.release();
    }
  }

  async update(id: string, updates: Partial<DocumentEntity>): Promise<void> {
    const connection = await db.getConnection();
    try {
      const sqlUpdates: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        sqlUpdates.push("title = ?");
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        sqlUpdates.push("description = ?");
        values.push(updates.description);
      }
      if (updates.type !== undefined) {
        sqlUpdates.push("type = ?");
        values.push(updates.type);
      }
      if (updates.link !== undefined) {
        sqlUpdates.push("link = ?");
        values.push(updates.link);
      }
      if (updates.fileData !== undefined) {
        sqlUpdates.push("fileData = ?");
        values.push(updates.fileData);
      }
      if (updates.fileName !== undefined) {
        sqlUpdates.push("fileName = ?");
        values.push(updates.fileName);
      }
      if (updates.fileType !== undefined) {
        sqlUpdates.push("fileType = ?");
        values.push(updates.fileType);
      }
      if (updates.canvasData !== undefined) {
        sqlUpdates.push("canvasData = ?");
        values.push(updates.canvasData);
      }
      if (updates.category !== undefined) {
        sqlUpdates.push("category = ?");
        values.push(updates.category);
      }

      if (sqlUpdates.length > 0) {
        values.push(id);
        await connection.query(
          `UPDATE Documents SET ${sqlUpdates.join(", ")} WHERE id = ?`,
          values
        );
      }
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Documents WHERE id = ?", [id]);
    } finally {
      connection.release();
    }
  }
}

export const documentRepository = new DocumentRepository();
