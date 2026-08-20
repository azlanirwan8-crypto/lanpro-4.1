import db from "../../src/lib/db";

export interface AuditLogEntity {
  id: string;
  userId: string;
  projectId?: string | null;
  actionType: string;
  entityName: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
  userName?: string;
}

export class AuditRepository {
  async findLogs(filters: { projectId?: string; entityName?: string; entityId?: string; limit?: number }): Promise<AuditLogEntity[]> {
    const connection = await db.getConnection();
    try {
      let sql = "SELECT a.*, u.displayName as userName FROM AuditLogs a JOIN Users u ON a.userId = u.id";
      const params: any[] = [];
      const sqlFilters: string[] = [];

      if (filters.projectId) {
        sqlFilters.push("a.projectId = ?");
        params.push(filters.projectId);
      }
      if (filters.entityName) {
        sqlFilters.push("a.entityName = ?");
        params.push(filters.entityName);
      }
      if (filters.entityId) {
        sqlFilters.push("a.entityId = ?");
        params.push(filters.entityId);
      }

      if (sqlFilters.length > 0) sql += " WHERE " + sqlFilters.join(" AND ");

      sql += " ORDER BY a.createdAt DESC LIMIT ?";
      const limitValue = Math.min(Math.max(filters.limit || 50, 1), 500);
      params.push(limitValue);

      const [rows]: any = await connection.query(sql, params);
      return rows || [];
    } finally {
      connection.release();
    }
  }
}

export const auditRepository = new AuditRepository();
