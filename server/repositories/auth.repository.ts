import db from "../../src/lib/db";
import crypto from "crypto";

export class AuthRepository {
  async findUserRoleById(id: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT role FROM Users WHERE id = ? OR uid = ?", [
        id,
        id,
      ]);
      return rows.length > 0 ? String(rows[0].role || "").toLowerCase() : null;
    } finally {
      connection.release();
    }
  }

  async findUserByIdOrUid(idOrUid: string): Promise<any | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT * FROM Users WHERE id = ? OR uid = ?", [
        idOrUid,
        idOrUid,
      ]);
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async findSessionData(
    userId: string
  ): Promise<{ currentSessionToken?: string; lastSeen?: string } | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT currentSessionToken, lastSeen FROM Users WHERE id = ?",
        [userId]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async updateSessionToken(userId: string, token: string, lastSeen: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "UPDATE Users SET currentSessionToken = ?, lastSeen = ? WHERE id = ? RETURNING id",
        [token, lastSeen, userId]
      );
      return Array.isArray(rows) && rows.length > 0;
    } finally {
      connection.release();
    }
  }

  async clearSessionToken(userId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("UPDATE Users SET currentSessionToken = NULL WHERE id = ?", [userId]);
    } finally {
      connection.release();
    }
  }

  async logForceLogout(userId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO AuditLogs (id, userId, projectId, actionType, entityName, entityId, oldValues, newValues)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          userId,
          null,
          "FORCE_LOGOUT",
          "Authentication",
          userId,
          null,
          JSON.stringify({ action: "User initiated force logout from another device" }),
        ]
      );
    } finally {
      connection.release();
    }
  }

  async checkUserExistsByUsername(username: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT id FROM Users WHERE username = ?", [
        username,
      ]);
      return rows && rows.length > 0;
    } finally {
      connection.release();
    }
  }

  async checkUserExistsByEmail(email: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT id FROM Users WHERE email = ?", [email]);
      return rows && rows.length > 0;
    } finally {
      connection.release();
    }
  }

  async registerUser(user: {
    uid: string;
    username: string;
    fullName: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    passwordHash: string;
    department?: string | null;
    position?: string | null;
    permissions?: any;
    phone?: string | null;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO Users (id, uid, username, nama_lengkap, email, displayName, photoURL, role, status, passwordHash, department, position, permissions, phone) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.uid,
          user.uid,
          user.username,
          user.fullName,
          user.email,
          user.displayName,
          null,
          user.role,
          user.status,
          user.passwordHash,
          user.department || null,
          user.position || null,
          user.permissions
            ? typeof user.permissions === "string"
              ? user.permissions
              : JSON.stringify(user.permissions)
            : null,
          user.phone || null,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async findUserByEmail(email: string): Promise<any | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT * FROM "Users" WHERE LOWER(email) = LOWER(?)',
        [email.trim()]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'UPDATE "Users" SET "passwordHash" = ?, password = ? WHERE id = ? OR uid = ? RETURNING id',
        [passwordHash, passwordHash, userId, userId]
      );
      return Array.isArray(rows) && rows.length > 0;
    } finally {
      connection.release();
    }
  }

  async recordSessionLogin(sessionData: {
    id: string;
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    browser?: string | null;
    os?: string | null;
    device?: string | null;
    city?: string | null;
    country?: string | null;
    location?: string | null;
    token?: string | null;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      const safeId = String(sessionData.id).slice(0, 250);
      const safeUserId = String(sessionData.userId).slice(0, 250);
      const safeIpAddress = sessionData.ipAddress
        ? String(sessionData.ipAddress).slice(0, 250)
        : null;
      const safeUserAgent = sessionData.userAgent ? String(sessionData.userAgent) : null;
      const safeBrowser = sessionData.browser ? String(sessionData.browser) : null;
      const safeOs = sessionData.os ? String(sessionData.os) : null;
      const safeDevice = sessionData.device ? String(sessionData.device) : null;
      const safeCity = sessionData.city ? String(sessionData.city).slice(0, 250) : null;
      const safeCountry = sessionData.country ? String(sessionData.country).slice(0, 250) : null;
      const safeLocation = sessionData.location ? String(sessionData.location) : null;
      const safeToken = sessionData.token ? String(sessionData.token) : null;

      // Tandai sesi aktif sebelumnya sebagai FORCE_LOGOUT jika ada
      await connection.query(
        `UPDATE "UserSessions" 
         SET status = 'FORCE_LOGOUT', "logoutAt" = NOW(), "updatedAt" = NOW() 
         WHERE "userId" = ? AND status = 'ACTIVE'`,
        [safeUserId]
      );

      await connection.query(
        `INSERT INTO "UserSessions" 
         (id, "userId", "ipAddress", "userAgent", browser, os, device, city, country, location, "loginAt", "lastActiveAt", status, token, "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 'ACTIVE', ?, NOW(), NOW())`,
        [
          safeId,
          safeUserId,
          safeIpAddress,
          safeUserAgent,
          safeBrowser,
          safeOs,
          safeDevice,
          safeCity,
          safeCountry,
          safeLocation,
          safeToken,
        ]
      );
    } catch (e) {
      console.error("Gagal mencatat UserSession login:", e);
    } finally {
      connection.release();
    }
  }

  async recordSessionLogout(userId: string, token?: string | null): Promise<void> {
    const connection = await db.getConnection();
    try {
      let updated = false;
      if (token) {
        const [res]: any = await connection.query(
          `UPDATE "UserSessions" 
           SET status = 'LOGGED_OUT', "logoutAt" = NOW(), "updatedAt" = NOW() 
           WHERE "userId" = ? AND token = ?`,
          [userId, token]
        );
        if (res?.affectedRows > 0 || res?.rowCount > 0) {
          updated = true;
        }
      }

      if (!updated) {
        await connection.query(
          `UPDATE "UserSessions" 
           SET status = 'LOGGED_OUT', "logoutAt" = NOW(), "updatedAt" = NOW() 
           WHERE "userId" = ? AND status = 'ACTIVE'`,
          [userId]
        );
      }
    } catch (e) {
      console.error("Gagal mencatat UserSession logout:", e);
    } finally {
      connection.release();
    }
  }
}

export const authRepository = new AuthRepository();
