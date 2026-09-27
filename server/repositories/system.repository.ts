import db from "../../src/lib/db";

export class SystemRepository {
  async getDbSchema(): Promise<{ schema: Record<string, any>; stats: any[] }> {
    const connection = await db.getConnection();
    try {
      const [tablesRow]: any = await connection.query("SHOW TABLES");
      const tables = (tablesRow as any[]).map((row) => Object.values(row)[0] as string);

      const schema: Record<string, any> = {};
      for (const table of tables) {
        const [columns]: any = await connection.query(`DESCRIBE \`${table}\``);
        schema[table] = columns;
      }

      let tableStats: any[] = [];
      try {
        const [stats]: any = await connection.query(`
          SELECT 
            table_name AS "tableName", 
            table_rows AS "rowCount",
            data_length + index_length AS "sizeBytes"
          FROM information_schema.TABLES 
          WHERE table_schema = DATABASE();
        `);
        tableStats = stats as any[];
      } catch (e) {
        console.warn("Could not fetch table stats", e);
      }

      return { schema, stats: tableStats };
    } finally {
      connection.release();
    }
  }

  async executeRawMigration(cleanSql: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(cleanSql);
    } finally {
      connection.release();
    }
  }
}

export const systemRepository = new SystemRepository();
