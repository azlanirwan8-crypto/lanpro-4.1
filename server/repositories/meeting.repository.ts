import db from "../../src/lib/db";
import { BATAS_DAFTAR_TANPA_PAGINATION, type PaginationParams } from "../lib/pagination";

export interface MeetingEntity {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  meetingLink?: string | null;
  authorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fileName?: string | null;
  fileType?: string | null;
  fileData?: string | null;
  file_size?: number | null;
  recording_url?: string | null;
  upload_status?: string | null;
  transcript?: string | null;
  aiSummary?: any;
  analysis_result?: any;
}

export class MeetingRepository {
  private meetingListSelect =
    "id, projectId, title, description, meetingLink, authorId, createdAt, updatedAt, fileName, fileType, file_size";

  private buildMeetingWhere(projectId: string, search?: string) {
    const params: unknown[] = [projectId];
    let where = "projectId = ?";
    if (search?.trim()) {
      where += " AND LOWER(title) LIKE ?";
      params.push(`%${search.trim().toLowerCase()}%`);
    }
    return { where, params };
  }

  async findByProjectId(projectId: string, search?: string): Promise<MeetingEntity[]> {
    const connection = await db.getConnection();
    try {
      const { where, params } = this.buildMeetingWhere(projectId, search);
      const [rows]: any = await connection.query(
        `SELECT ${this.meetingListSelect} FROM Meetings WHERE ${where} ORDER BY createdAt DESC LIMIT ${BATAS_DAFTAR_TANPA_PAGINATION}`,
        params
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findByProjectIdPaged(
    projectId: string,
    pagination: PaginationParams,
    search?: string
  ): Promise<{ items: MeetingEntity[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const { where, params } = this.buildMeetingWhere(projectId, search);
      const [countRows]: any = await connection.query(
        `SELECT COUNT(*)::int AS total FROM Meetings WHERE ${where}`,
        params
      );
      const total = countRows?.[0]?.total ?? 0;
      const [rows]: any = await connection.query(
        `SELECT ${this.meetingListSelect} FROM Meetings WHERE ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [...params, pagination.limit, pagination.offset]
      );
      return { items: rows || [], total };
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<MeetingEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM Meetings WHERE id = ?", [id]);
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async findStatusById(id: string): Promise<any | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT id, upload_status, transcript, analysis_result, aiSummary FROM Meetings WHERE id = ?",
        [id]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async updateRecordingInfo(
    meetingId: string,
    recordingUrl: string,
    fileSize: number,
    status = "UPLOAD_SUCCESS"
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Meetings SET recording_url = ?, file_size = ?, upload_status = ? WHERE id = ?",
        [recordingUrl, fileSize, status, meetingId]
      );
    } finally {
      connection.release();
    }
  }

  async setUploadStatus(meetingId: string, status: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("UPDATE Meetings SET upload_status = ? WHERE id = ?", [
        status,
        meetingId,
      ]);
    } finally {
      connection.release();
    }
  }

  async clearRecordingFile(meetingId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Meetings SET recording_url = NULL, file_size = NULL WHERE id = ?",
        [meetingId]
      );
    } finally {
      connection.release();
    }
  }

  async resetMeetingState(meetingId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Meetings SET upload_status = 'IDLE', recording_url = NULL, file_size = NULL, transcript = NULL, aiSummary = NULL, analysis_result = NULL WHERE id = ?",
        [meetingId]
      );
    } finally {
      connection.release();
    }
  }

  async getAiLearningLogs(projectId: string, limit = 10): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [logs]: any = await connection.query(
        "SELECT evaluation_notes, timestamp FROM ai_learning_logs WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?",
        [projectId, limit]
      );
      return logs || [];
    } catch (e) {
      console.warn("[MeetingRepository] getAiLearningLogs error:", e);
      return [];
    } finally {
      connection.release();
    }
  }

  async saveMultimodalDetails(
    detailId: string,
    meetingId: string,
    parsedData: any,
    finalJsonStr: string
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO meeting_details (
            id, meeting_id, ringkasan_eksekutif, topik_utama, 
            kronologi_dan_kesimpulan, kesimpulan, saran_dan_ide, 
            tindak_lanjut, next_plan, target_to_be_architecture, metadata_rapat
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detailId,
          meetingId,
          parsedData.tab_ringkasan?.executive_summary_multimodal || "",
          parsedData.tab_ringkasan?.topik_utama || "",
          JSON.stringify(parsedData.tab_kronologi_rapat || []),
          JSON.stringify(parsedData.tab_kesimpulan || []),
          JSON.stringify(parsedData.tab_saran_dan_ide || []),
          JSON.stringify(parsedData.tab_tindak_lanjut || []),
          JSON.stringify(parsedData.tab_next_plan || []),
          JSON.stringify(parsedData.tab_target_to_be || {}),
          JSON.stringify(parsedData.tab_metadata || {}),
        ]
      );

      await connection.query(
        "UPDATE Meetings SET aiSummary = ?, analysis_result = ?, upload_status = 'COMPLETED' WHERE id = ?",
        [finalJsonStr, finalJsonStr, meetingId]
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async updateTranscriptAndAiSummary(
    id: string,
    transcript: string,
    jsonStr: string
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("UPDATE Meetings SET transcript = ?, aiSummary = ? WHERE id = ?", [
        transcript,
        jsonStr,
        id,
      ]);
    } finally {
      connection.release();
    }
  }

  async create(meeting: {
    id: string;
    projectId: string;
    title: string;
    description?: string | null;
    meetingLink?: string | null;
    authorId?: string | null;
    fileData?: string | null;
    fileName?: string | null;
    fileType?: string | null;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO Meetings (id, projectId, title, description, meetingLink, authorId, fileData, fileName, fileType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          meeting.id,
          meeting.projectId,
          meeting.title,
          meeting.description || null,
          meeting.meetingLink || null,
          meeting.authorId || "guest",
          meeting.fileData || null,
          meeting.fileName || null,
          meeting.fileType || null,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async update(id: string, updates: Partial<MeetingEntity>): Promise<void> {
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
      if (updates.meetingLink !== undefined) {
        sqlUpdates.push("meetingLink = ?");
        values.push(updates.meetingLink);
      }
      if (updates.transcript !== undefined) {
        sqlUpdates.push("transcript = ?");
        values.push(updates.transcript);
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
      if (updates.aiSummary !== undefined) {
        sqlUpdates.push("aiSummary = ?");
        values.push(
          updates.aiSummary
            ? typeof updates.aiSummary === "string"
              ? updates.aiSummary
              : JSON.stringify(updates.aiSummary)
            : null
        );
      }

      if (sqlUpdates.length > 0) {
        values.push(id);
        await connection.query(`UPDATE Meetings SET ${sqlUpdates.join(", ")} WHERE id = ?`, values);
      }
    } finally {
      connection.release();
    }
  }

  async getFileDownload(
    id: string
  ): Promise<{ fileData: string; fileName: string; fileType: string } | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT fileData, fileName, fileType FROM Meetings WHERE id = ?",
        [id]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Meetings WHERE id = ?", [id]);
    } finally {
      connection.release();
    }
  }
}

export const meetingRepository = new MeetingRepository();
