import db from "../../src/lib/db";

export interface MasterDataEntity {
  /** Item #143 — kode stabil; sebelumnya tidak pernah ikut ditulis saat INSERT. */
  code?: string | null;
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
  /** #313 — status terminal (burndown, tutup sprint, gerbang fase). */
  isTerminal?: boolean | number | null;
  /** #737 — code jenis anak bawaan saat menambah anak di bawah jenis ini. */
  defaultChildCode?: string | null;
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

  /**
   * Kode yang sudah dipakai pada satu tipe (item #143).
   *
   * Dipakai untuk mencegah dua label berbeda meluruh ke kode yang sama —
   * tabel MasterData tidak punya batasan UNIQUE, jadi tabrakan tidak akan
   * memunculkan galat, hanya dua baris yang tak bisa dibedakan lewat kode.
   */
  async findCodesByType(type: string): Promise<string[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT code FROM MasterData WHERE type = ? AND code IS NOT NULL",
        [type]
      );
      return (rows || []).map((r: any) => r.code).filter(Boolean);
    } finally {
      connection.release();
    }
  }

  async create(item: MasterDataEntity): Promise<MasterDataEntity> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO MasterData (id, type, label, code, color, icon, \`order\`, description, fieldType, dropdownOptions, role_type, "isTerminal", "defaultChildCode")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.type || "general",
          item.label,
          item.code || null,
          item.color || null,
          item.icon || null,
          item.order || 0,
          item.description || null,
          item.fieldType || null,
          item.dropdownOptions
            ? typeof item.dropdownOptions === "string"
              ? item.dropdownOptions
              : JSON.stringify(item.dropdownOptions)
            : null,
          item.role_type || null,
          item.isTerminal === true || item.isTerminal === 1 ? true : false,
          item.defaultChildCode || null,
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
      const existing = await this.findById(id);
      const label =
        updates.label !== undefined ? updates.label || "Item" : existing?.label || "Item";
      const color = updates.color !== undefined ? updates.color : existing?.color || null;
      const icon = updates.icon !== undefined ? updates.icon : existing?.icon || null;
      const order = updates.order !== undefined ? updates.order || 0 : existing?.order || 0;
      const description =
        updates.description !== undefined ? updates.description : existing?.description || null;
      const fieldType =
        updates.fieldType !== undefined ? updates.fieldType : existing?.fieldType || null;
      const dropdownOptions =
        updates.dropdownOptions !== undefined
          ? updates.dropdownOptions
          : existing?.dropdownOptions || null;
      const role_type =
        updates.role_type !== undefined ? updates.role_type : existing?.role_type || null;
      const isTerminal =
        updates.isTerminal !== undefined
          ? updates.isTerminal === true || updates.isTerminal === 1
          : existing?.isTerminal === true || existing?.isTerminal === 1;
      const defaultChildCode =
        updates.defaultChildCode !== undefined
          ? updates.defaultChildCode || null
          : existing?.defaultChildCode || null;

      await connection.query(
        `UPDATE MasterData SET label=?, color=?, icon=?, \`order\`=?, description=?, fieldType=?, dropdownOptions=?, role_type=?, "isTerminal"=?, "defaultChildCode"=? WHERE id=?`,
        [
          label,
          color || null,
          icon || null,
          order || 0,
          description || null,
          fieldType || null,
          dropdownOptions
            ? typeof dropdownOptions === "string"
              ? dropdownOptions
              : JSON.stringify(dropdownOptions)
            : null,
          role_type || null,
          !!isTerminal,
          defaultChildCode || null,
          id,
        ]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * #609 — berapa task yang masih memakai baris master ini (gerbang hapus).
   *
   * Kolom `Tasks.type` dulu memuat LABEL yang dilowerkan dan sekarang memuat
   * `code`; baris lama belum tentu sudah termigrasi, jadi keduanya harus
   * terhitung. Bila tidak, gerbang "sedang digunakan" meloloskan penghapusan
   * baris `issue_type` yang justru paling terpakai — sunyi, tanpa galat.
   * Huruf besar-kecil dan pemisah (spasi/`-`/`_`) diabaikan, meniru `normal()`
   * di `src/lib/warnaLabel.ts` yang dipakai pencocok di klien.
   */
  async countTaskUsage(label: string, kode?: string | null): Promise<number> {
    const normal = (nilai?: string | null) =>
      String(nilai ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const labelN = normal(label);
    const kodeN = normal(kode) || labelN;
    const connection = await db.getConnection();
    try {
      const [taskRows]: any = await connection.query(
        `SELECT COUNT(*) as count FROM Tasks
          WHERE status = ? OR priority = ? OR environment = ?
             OR REGEXP_REPLACE(LOWER(COALESCE(type, '')), '[^a-z0-9]', '', 'g') IN (?, ?)`,
        [label, label, label, labelN, kodeN]
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
