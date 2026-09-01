import db from "../../src/lib/db";
import type { PaginationParams } from "../lib/pagination";

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
  async findLogs(filters: {
    projectId?: string;
    entityName?: string;
    entityId?: string;
    limit?: number;
    page?: number;
  }): Promise<AuditLogEntity[]> {
    const pagination =
      filters.page && filters.page > 1
        ? {
            page: filters.page,
            limit: Math.min(Math.max(filters.limit || 50, 1), 500),
            offset: (filters.page - 1) * Math.min(Math.max(filters.limit || 50, 1), 500),
          }
        : null;

    if (pagination) {
      const { items } = await this.findLogsPaged(filters, pagination);
      return items;
    }

    const connection = await db.getConnection();
    try {
      const { sql, params } = this.buildLogsQuery(filters);
      const limitValue = Math.min(Math.max(filters.limit || 50, 1), 500);
      const [rows]: any = await connection.query(`${sql} LIMIT ?`, [...params, limitValue]);
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findLogsPaged(
    filters: { projectId?: string; entityName?: string; entityId?: string },
    pagination: PaginationParams
  ): Promise<{ items: AuditLogEntity[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const { sql, params, countSql, countParams } = this.buildLogsQuery(filters);
      const [countRows]: any = await connection.query(countSql, countParams);
      const total = countRows?.[0]?.total ?? 0;
      const [rows]: any = await connection.query(`${sql} LIMIT ? OFFSET ?`, [
        ...params,
        pagination.limit,
        pagination.offset,
      ]);
      return { items: rows || [], total };
    } finally {
      connection.release();
    }
  }

  private buildLogsQuery(filters: { projectId?: string; entityName?: string; entityId?: string }) {
    let sql =
      "SELECT a.*, u.displayName as userName FROM AuditLogs a JOIN Users u ON a.userId = u.id";
    let countSql = "SELECT COUNT(*)::int AS total FROM AuditLogs a JOIN Users u ON a.userId = u.id";
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

    if (sqlFilters.length > 0) {
      const clause = " WHERE " + sqlFilters.join(" AND ");
      sql += clause;
      countSql += clause;
    }

    sql += " ORDER BY a.createdAt DESC";
    return { sql, params, countSql, countParams: [...params] };
  }
}

export const auditRepository = new AuditRepository();
