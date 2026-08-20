import db from "../../src/lib/db";

export interface MasterDataEntity {
  id: string;
  type: string;
  label: string;
  color?: string | null;
  icon?: string | null;
  order?: number;
  description?: string | null;
  fieldType?: string | null;
  dropdownOptions?: string | any;
  role_type?: string | null;
  is_system_default?: boolean | number;
}

export class MasterDataRepository {
  async findAll(): Promise<MasterDataEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM MasterData ORDER BY `order` ASC");
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<MasterDataEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM MasterData WHERE id = ?", [id]);
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async create(item: MasterDataEntity): Promise<MasterDataEntity> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO MasterData (id, type, label, color, icon, \`order\`, description, fieldType, dropdownOptions, role_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.type || "general",
          item.label,
          item.color || null,
          item.icon || null,
          item.order || 0,
          item.description || null,
          item.fieldType || null,
          item.dropdownOptions ? (typeof item.dropdownOptions === "string" ? item.dropdownOptions : JSON.stringify(item.dropdownOptions)) : null,
          item.role_type || null,
        ]
      );
      return item;
    } finally {
      connection.release();
    }
  }

  async update(id: string, updates: Partial<MasterDataEntity>): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `UPDATE MasterData SET label=?, color=?, icon=?, \`order\`=?, description=?, fieldType=?, dropdownOptions=?, role_type=? WHERE id=?`,
        [
          updates.label || "Item",
          updates.color || null,
          updates.icon || null,
          updates.order || 0,
          updates.description || null,
          updates.fieldType || null,
          updates.dropdownOptions ? (typeof updates.dropdownOptions === "string" ? updates.dropdownOptions : JSON.stringify(updates.dropdownOptions)) : null,
          updates.role_type || null,
          id,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async countTaskUsage(label: string): Promise<number> {
    const connection = await db.getConnection();
    try {
      const [taskRows]: any = await connection.query(
        "SELECT COUNT(*) as count FROM Tasks WHERE status = ? OR priority = ? OR type = ? OR environment = ?",
        [label, label, label, label]
      );
      return Number(taskRows?.[0]?.count || 0);
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM MasterData WHERE id = ?", [id]);
    } finally {
      connection.release();
    }
  }
}

export const masterDataRepository = new MasterDataRepository();
