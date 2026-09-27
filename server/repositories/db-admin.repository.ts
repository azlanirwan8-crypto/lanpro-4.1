import db from "../../src/lib/db";

export class DbAdminRepository {
  async testConnection(): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("SELECT 1 + 1 AS solution");
    } finally {
      connection.release();
    }
  }

  async runReadOnlyQuery(trimmedSql: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(trimmedSql);
      return rows || [];
    } finally {
      connection.release();
    }
  }
}

export const dbAdminRepository = new DbAdminRepository();
