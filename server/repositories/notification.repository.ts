import db from "../../src/lib/db";

export interface NotificationEntity {
  id: string;
  recipientId: string;
  senderId?: string | null;
  title: string;
  message: string;
  type: string;
  relatedId?: string | null;
  read: boolean;
  createdAt?: string;
}

export class NotificationRepository {
  async findRawNotificationsForUserIds(userIds: string[]): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const sqlQuery = `
        SELECT n.*, 
               t.projectId as taskProjectId, t.assigneeId, t.reporterId, t.status as taskStatus,
               pt.reporterId as parentTaskReporterId,
               m.projectId as meetingProjectId,
               a.projectId as activityProjectId
        FROM Notifications n
        LEFT JOIN Tasks t ON n.relatedId = t.id
        LEFT JOIN Tasks pt ON t.parentId = pt.id
        LEFT JOIN Meetings m ON n.relatedId = m.id
        LEFT JOIN ActivityLogs a ON n.relatedId = a.id
        WHERE n.recipientId IN (?)
        ORDER BY n.createdAt DESC
        LIMIT 150
      `;
      const [rows]: any = await connection.query(sqlQuery, [userIds]);
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findRecipientIdById(id: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT recipientId FROM Notifications WHERE id = ?",
        [id]
      );
      return rows && rows.length > 0 ? rows[0].recipientId : null;
    } finally {
      connection.release();
    }
  }

  async create(notif: NotificationEntity): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO Notifications (id, recipientId, senderId, title, message, type, relatedId, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          notif.id,
          notif.recipientId,
          notif.senderId || null,
          notif.title || "New Notification",
          notif.message || "",
          notif.type || "system",
          notif.relatedId || null,
          notif.read ? true : false,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async setRead(id: string, read: boolean): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("UPDATE Notifications SET `read` = ? WHERE id = ?", [
        read ? true : false,
        id,
      ]);
    } finally {
      connection.release();
    }
  }
}

export const notificationRepository = new NotificationRepository();
