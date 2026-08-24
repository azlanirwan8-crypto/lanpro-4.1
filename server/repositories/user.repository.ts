import db from "../../src/lib/db";

export interface UserEntity {
  id: string;
  uid?: string | null;
  username: string;
  nama_lengkap?: string | null;
  email?: string | null;
  displayName: string;
  role: string;
  status: string;
  permissions?: any;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  avatar_url?: string | null;
  photoURL?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  passwordHash?: string;
  createdAt?: string;
  lastSeen?: string | null;
}

export class UserRepository {
  async findAll(): Promise<UserEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT id, uid, username, nama_lengkap, email, displayName, role, status, permissions, phone, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, createdAt, lastSeen FROM Users"
      );
      return (rows || []).map((u: any) => {
        try {
          if (u.permissions && typeof u.permissions === "string") {
            u.permissions = JSON.parse(u.permissions);
          }
        } catch (e) {}
        return u;
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Daftar pengguna TANPA field sensitif — item #162.
   *
   * `findAll()` memulangkan `email`, `phone`, dan `permissions`, dan
   * `GET /api/users` memulangkannya kepada SIAPA PUN yang membawa JWT sah.
   * Endpoint itu tidak bisa sekadar dikunci admin: ia mengisi `allUsers`
   * yang dipakai lima fitur non-admin — penyebutan di obrolan, status
   * daring, avatar header, pemilih penerima tugas, dan peserta rapat.
   *
   * Tidak satu pun dari kelimanya membaca ketiga field itu. Jadi yang
   * dipersempit adalah ISI-nya, bukan siapa yang boleh memanggil.
   *
   * Kolomnya sengaja ditulis ulang penuh, bukan hasil `findAll()` yang
   * disaring di JavaScript: menyaring setelah kueri berarti datanya SUDAH
   * meninggalkan database, dan satu `console.log` atau satu jalur galat
   * cukup untuk membocorkannya kembali.
   */
  async findAllRingkas(): Promise<UserEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT id, uid, username, nama_lengkap, displayName, role, status, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, createdAt, lastSeen FROM Users"
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findByIdOrUid(idOrUid: string): Promise<UserEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT id, uid, username, nama_lengkap, email, displayName, role, status, permissions, phone, department, position, passwordHash, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, createdAt, lastSeen FROM Users WHERE id = ? OR uid = ?",
        [idOrUid, idOrUid]
      );
      if (rows && rows.length > 0) {
        const u = rows[0];
        try {
          if (u.permissions && typeof u.permissions === "string") {
            u.permissions = JSON.parse(u.permissions);
          }
        } catch (e) {}
        return u;
      }
      return null;
    } finally {
      connection.release();
    }
  }

  async updateLastSeen(userId: string, lastSeen: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("UPDATE Users SET lastSeen = ? WHERE id = ? OR uid = ?", [
        lastSeen,
        userId,
        userId,
      ]);
    } finally {
      connection.release();
    }
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserEntity | null> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Users SET avatar_url = ?, photoURL = ?, avatarUrl = ? WHERE id = ? OR uid = ?",
        [avatarUrl, avatarUrl, avatarUrl, userId, userId]
      );
      const [rows]: any = await connection.query(
        "SELECT id, uid, username, nama_lengkap, email, displayName, role, status, permissions, phone, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, createdAt, lastSeen FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );
      return rows && rows[0] ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async getAvatar(userId: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [barisLama]: any = await connection.query(
        "SELECT avatar_url, photoURL, avatarUrl FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );
      return (
        barisLama?.[0]?.avatar_url || barisLama?.[0]?.photoURL || barisLama?.[0]?.avatarUrl || null
      );
    } finally {
      connection.release();
    }
  }

  async updateUser(id: string, updates: Record<string, any>, isAdmin: boolean): Promise<void> {
    const connection = await db.getConnection();
    try {
      const sqlUpdates: string[] = [];
      const values: any[] = [];

      if (isAdmin) {
        if (updates.role !== undefined) {
          sqlUpdates.push("role = ?");
          values.push(updates.role);
        }
        if (updates.status !== undefined) {
          sqlUpdates.push("status = ?");
          values.push(updates.status);
        }
        if (updates.permissions !== undefined) {
          sqlUpdates.push("permissions = ?");
          values.push(updates.permissions ? JSON.stringify(updates.permissions) : null);
        }
        if (updates.department !== undefined) {
          sqlUpdates.push("department = ?");
          values.push(updates.department || null);
        }
        if (updates.position !== undefined) {
          sqlUpdates.push("position = ?");
          values.push(updates.position || null);
        }
      }

      if (updates.displayName !== undefined) {
        sqlUpdates.push("displayName = ?");
        values.push(updates.displayName);
      }
      if (updates.username !== undefined) {
        sqlUpdates.push("username = ?");
        values.push(updates.username);
      }
      if (updates.email !== undefined) {
        sqlUpdates.push("email = ?");
        values.push(updates.email && updates.email.trim() !== "" ? updates.email.trim() : null);
      }
      if (updates.effectiveAvatar !== undefined) {
        sqlUpdates.push("photoURL = ?", "avatar_url = ?", "avatarUrl = ?");
        values.push(updates.effectiveAvatar, updates.effectiveAvatar, updates.effectiveAvatar);
      }
      if (updates.phone !== undefined) {
        sqlUpdates.push("phone = ?");
        values.push(updates.phone && updates.phone.trim() !== "" ? updates.phone.trim() : null);
      }
      if (
        updates.passwordHash !== undefined &&
        updates.passwordHash !== null &&
        updates.passwordHash !== ""
      ) {
        sqlUpdates.push("passwordHash = ?");
        values.push(updates.passwordHash);
      }

      if (sqlUpdates.length > 0) {
        values.push(id);
        await connection.query(`UPDATE Users SET ${sqlUpdates.join(", ")} WHERE id = ?`, values);
      }
    } finally {
      connection.release();
    }
  }

  async updateProfile(
    id: string,
    updates: {
      displayName: string;
      username: string;
      email?: string | null;
      phone?: string | null;
      avatar?: string | null;
      newPasswordHash?: string;
    }
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      if (updates.newPasswordHash) {
        await connection.query("UPDATE Users SET passwordHash = ? WHERE id = ?", [
          updates.newPasswordHash,
          id,
        ]);
      }

      await connection.query(
        "UPDATE Users SET displayName = ?, username = ?, email = ?, phone = ?, photoURL = ?, avatar_url = ?, avatarUrl = ? WHERE id = ?",
        [
          updates.displayName,
          updates.username,
          updates.email || null,
          updates.phone || null,
          updates.avatar || null,
          updates.avatar || null,
          updates.avatar || null,
          id,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Users WHERE id = ?", [id]);
    } finally {
      connection.release();
    }
  }

  async getUserProjectRoles(
    dbUserId: string,
    firebaseUid: string
  ): Promise<{
    projectRoles: Record<string, string>;
    adminProjectIds: string[];
    qaProjectIds: string[];
  }> {
    const connection = await db.getConnection();
    try {
      const [pmRows]: any = await connection.query(
        "SELECT projectId, role FROM ProjectMembers WHERE userId = ? OR userId = ?",
        [dbUserId, firebaseUid]
      );

      const projectRoles: Record<string, string> = {};
      const adminProjectIds: string[] = [];
      const qaProjectIds: string[] = [];

      for (const pm of pmRows) {
        if (pm.projectId) {
          const rawRole = (pm.role || "").toLowerCase().trim();
          let role = rawRole;
          if (rawRole === "qa engineer" || rawRole === "qa") {
            role = "qa";
            qaProjectIds.push(pm.projectId);
          } else if (rawRole === "ui/ux designer") {
            role = "ui/ux";
          } else if (rawRole === "database admin (dba)" || rawRole === "database admin") {
            role = "dba";
          } else if (rawRole === "architecture") {
            role = "arsitektur";
          } else if (rawRole === "business analyst") {
            role = "bisnis analyst";
          } else if (rawRole === "project admin" || rawRole === "admin") {
            role = "admin";
            adminProjectIds.push(pm.projectId);
          }
          projectRoles[pm.projectId] = role;
        }
      }

      const [ownerRows]: any = await connection.query(
        "SELECT id FROM Projects WHERE ownerId = ? OR ownerId = ?",
        [dbUserId, firebaseUid]
      );
      for (const p of ownerRows) {
        projectRoles[p.id] = "admin";
        if (!adminProjectIds.includes(p.id)) {
          adminProjectIds.push(p.id);
        }
      }

      return { projectRoles, adminProjectIds, qaProjectIds };
    } finally {
      connection.release();
    }
  }
}

export const userRepository = new UserRepository();
