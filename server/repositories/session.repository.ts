import db from "../../src/lib/db";

export interface SessionFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  userId?: string;
}

export class SessionRepository {
  async getSessions(filter: SessionFilter) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const offset = (page - 1) * limit;

    const connection = await db.getConnection();
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filter.userId) {
        conditions.push('us."userId" = ?');
        params.push(filter.userId);
      }

      if (filter.status && filter.status !== "ALL") {
        conditions.push("us.status = ?");
        params.push(filter.status);
      }

      if (filter.search && filter.search.trim()) {
        const term = `%${filter.search.trim().toLowerCase()}%`;
        conditions.push(
          '(LOWER(u."displayName") LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(us."ipAddress") LIKE ? OR LOWER(us.location) LIKE ?)'
        );
        params.push(term, term, term, term, term);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countSql = `
        SELECT COUNT(*)::int as total
        FROM "UserSessions" us
        LEFT JOIN "Users" u ON us."userId" = u.id
        ${whereClause}
      `;
      const [countRows]: any = await connection.query(countSql, params);
      const total = countRows?.[0]?.total || 0;

      const dataSql = `
        SELECT 
          us.id,
          us."userId",
          us."ipAddress",
          us."userAgent",
          us.browser,
          us.os,
          us.device,
          us.city,
          us.country,
          us.location,
          TO_CHAR(us."loginAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "loginAt",
          TO_CHAR(us."logoutAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "logoutAt",
          TO_CHAR(us."lastActiveAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastActiveAt",
          us.status,
          us."createdAt",
          u."displayName",
          u.username,
          u.email,
          u.role,
          COALESCE(u.avatar_url, u."avatarUrl", u."photoURL", u."photoUrl") as avatar
        FROM "UserSessions" us
        LEFT JOIN "Users" u ON us."userId" = u.id
        ${whereClause}
        ORDER BY us."loginAt" DESC
        LIMIT ? OFFSET ?
      `;

      const [dataRows]: any = await connection.query(dataSql, [...params, limit, offset]);

      return {
        data: dataRows || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } finally {
      connection.release();
    }
  }

  async getUserActivities(userId: string, limit = 50) {
    const connection = await db.getConnection();
    try {
      const [uRows]: any = await connection.query(
        `SELECT id, uid, username, email FROM "Users" WHERE id = ? OR uid = ? OR email = ? OR username = ?`,
        [userId, userId, userId, userId]
      );

      const userIdentifiers = new Set<string>([userId]);
      if (uRows && uRows.length > 0) {
        const u = uRows[0];
        if (u.id) userIdentifiers.add(String(u.id));
        if (u.uid) userIdentifiers.add(String(u.uid));
        if (u.username) userIdentifiers.add(String(u.username));
        if (u.email) userIdentifiers.add(String(u.email));
      }

      const idList = Array.from(userIdentifiers);
      const placeholders = idList.map(() => "?").join(",");

      const sql = `
        (
          SELECT 
            id,
            "userId",
            "actionType" as action,
            "entityName" as entity,
            "entityId",
            "ipAddress",
            "userAgent",
            changes,
            "oldValues",
            "newValues",
            "createdAt",
            'AUDIT' as source
          FROM "AuditLogs"
          WHERE "userId" IN (${placeholders})
        )
        UNION ALL
        (
          SELECT 
            id,
            "userId",
            action,
            "entityName" as entity,
            "entityId",
            NULL as "ipAddress",
            NULL as "userAgent",
            CASE 
              WHEN details IS NOT NULL AND details != '' THEN jsonb_build_object('details', details)
              ELSE NULL 
            END as changes,
            NULL as "oldValues",
            NULL as "newValues",
            "createdAt",
            'ACTIVITY' as source
          FROM "ActivityLogs"
          WHERE "userId" IN (${placeholders})
        )
        ORDER BY "createdAt" DESC
        LIMIT ?
      `;

      const [rows]: any = await connection.query(sql, [...idList, ...idList, limit]);
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async terminateSession(sessionId: string) {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `UPDATE "UserSessions" 
         SET status = 'FORCE_LOGOUT', "logoutAt" = NOW(), "updatedAt" = NOW() 
         WHERE id = ? 
         RETURNING "userId", token`,
        [sessionId]
      );
      const termData = rows?.[0] || null;
      if (termData?.userId) {
        await connection.query(
          `UPDATE Users 
           SET "currentSessionToken" = NULL 
           WHERE (id = ? OR uid = ?)`,
          [termData.userId.toString(), termData.userId.toString()]
        );
      }
      return termData;
    } finally {
      connection.release();
    }
  }

  async getSessionStats() {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(`
        SELECT 
          COUNT(*)::int as "totalSessions",
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as "activeSessions",
          COUNT(CASE WHEN "loginAt" >= CURRENT_DATE THEN 1 END)::int as "todaySessions",
          COUNT(DISTINCT CASE WHEN status = 'ACTIVE' THEN "userId" END)::int as "activeUsersCount"
        FROM "UserSessions"
      `);
      return (
        rows?.[0] || {
          totalSessions: 0,
          activeSessions: 0,
          todaySessions: 0,
          activeUsersCount: 0,
        }
      );
    } finally {
      connection.release();
    }
  }
}

export const sessionRepository = new SessionRepository();
