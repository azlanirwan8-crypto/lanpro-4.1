import db from "../../src/lib/db";

export interface DiscussionPointEntity {
  id: string;
  meetingId: string;
  parentPointId?: string | null;
  authorId?: string | null;
  assignTo?: string | null;
  concern?: string | null;
  fitur?: string | null;
  system?: string | null;
  surrounding?: string | null;
  keterangan?: string | null;
  tindakanLanjut?: string | null;
  status?: string | null;
  targetDate?: string | null;
  tanggalUpdateStatus?: string | null;
  content?: string | null;
  createdAt?: string;
}

export interface DiscussionPointCommentEntity {
  id: string;
  pointId: string;
  userId: string;
  userName: string;
  commentText: string;
  createdAt: string;
}

export class DiscussionPointsRepository {
  async findByMeetingId(meetingId: string): Promise<DiscussionPointEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT * FROM DiscussionPoints WHERE meetingId = ? ORDER BY createdAt ASC",
        [meetingId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createPoint(point: DiscussionPointEntity): Promise<DiscussionPointEntity> {
    const connection = await db.getConnection();
    try {
      const contentVal = point.concern || point.keterangan || "Poin Diskusi";
      try {
        await connection.query(
          'INSERT INTO DiscussionPoints (id, meetingId, "parentPointId", "authorId", "assignTo", concern, fitur, "system", surrounding, keterangan, "tindakanLanjut", status, "targetDate", "tanggalUpdateStatus", content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            point.id,
            point.meetingId,
            point.parentPointId || null,
            point.authorId || "guest",
            point.assignTo || null,
            point.concern || null,
            point.fitur || null,
            point.system || null,
            point.surrounding || null,
            point.keterangan || null,
            point.tindakanLanjut || null,
            point.status || "pending",
            point.targetDate || null,
            point.tanggalUpdateStatus || null,
            contentVal,
          ]
        );
      } catch (insertErr: any) {
        console.warn("[POST DiscussionPoint Resilient Retry]:", insertErr?.message);
        await connection.query(
          'INSERT INTO DiscussionPoints (id, meetingId, "authorId", concern, status, content) VALUES (?, ?, ?, ?, ?, ?)',
          [point.id, point.meetingId, point.authorId || "guest", point.concern || "Poin Diskusi", point.status || "pending", contentVal]
        );
      }
      return point;
    } finally {
      connection.release();
    }
  }

  async updatePoint(pointId: string, updates: Partial<DiscussionPointEntity>): Promise<void> {
    const connection = await db.getConnection();
    try {
      const sqlUpdates: string[] = [];
      const values: any[] = [];

      if (updates.parentPointId !== undefined) {
        sqlUpdates.push("parentPointId = ?");
        values.push(updates.parentPointId);
      }
      if (updates.assignTo !== undefined) {
        sqlUpdates.push("assignTo = ?");
        values.push(updates.assignTo);
      }
      if (updates.concern !== undefined) {
        sqlUpdates.push("concern = ?");
        values.push(updates.concern);
      }
      if (updates.fitur !== undefined) {
        sqlUpdates.push("fitur = ?");
        values.push(updates.fitur);
      }
      if (updates.system !== undefined) {
        sqlUpdates.push("`system` = ?");
        values.push(updates.system);
      }
      if (updates.surrounding !== undefined) {
        sqlUpdates.push("surrounding = ?");
        values.push(updates.surrounding);
      }
      if (updates.keterangan !== undefined) {
        sqlUpdates.push("keterangan = ?");
        values.push(updates.keterangan);
      }
      if (updates.tindakanLanjut !== undefined) {
        sqlUpdates.push("tindakanLanjut = ?");
        values.push(updates.tindakanLanjut);
      }
      if (updates.status !== undefined) {
        sqlUpdates.push("status = ?");
        values.push(updates.status);
      }
      if (updates.targetDate !== undefined) {
        sqlUpdates.push("targetDate = ?");
        values.push(updates.targetDate);
      }
      if (updates.tanggalUpdateStatus !== undefined) {
        sqlUpdates.push("tanggalUpdateStatus = ?");
        values.push(updates.tanggalUpdateStatus);
      }

      if (sqlUpdates.length > 0) {
        values.push(pointId);
        await connection.query(
          `UPDATE DiscussionPoints SET ${sqlUpdates.join(", ")} WHERE id = ?`,
          values
        );
      }
    } finally {
      connection.release();
    }
  }

  async deletePoint(pointId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM DiscussionPoints WHERE id = ?", [pointId]);
    } finally {
      connection.release();
    }
  }

  async findCommentsByPointId(pointId: string): Promise<DiscussionPointCommentEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT id,
                pointid     AS "pointId",
                "userId"    AS "userId",
                username    AS "userName",
                commenttext AS "commentText",
                "createdAt" AS "createdAt"
           FROM discussion_point_comments
          WHERE pointId = ?
          ORDER BY createdAt ASC`,
        [pointId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createComment(comment: DiscussionPointCommentEntity): Promise<DiscussionPointCommentEntity> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO discussion_point_comments (id, pointId, userId, userName, commentText, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        [
          comment.id,
          comment.pointId,
          comment.userId,
          comment.userName,
          comment.commentText,
          comment.createdAt,
        ]
      );
      return comment;
    } finally {
      connection.release();
    }
  }
}

export const discussionPointsRepository = new DiscussionPointsRepository();
