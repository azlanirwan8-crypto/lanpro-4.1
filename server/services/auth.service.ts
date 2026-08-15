/**
 * Logika autentikasi. Dipisah dari auth.routes.ts pada F5.2 agar rute hanya
 * mengurus request/response, sementara logika berat turun ke lapisan service —
 * pola resmi backend LanPro (ARCHITECTURE.md §5.1d).
 *
 * Pemisahan ini dilakukan SEBELUM SSO ditambahkan. Menempelkan OIDC ke berkas
 * rute yang sudah 620 baris akan menjadikannya sekitar 1.200 baris tanpa
 * struktur, tepat di fitur yang paling sensitif keamanannya.
 *
 * TIDAK ada perubahan perilaku pada pemisahan ini.
 */
import crypto from "crypto";
import db from "../../src/lib/db";
import { verifyPassword } from "../helpers/hash";

export function formatUserForAuthResponse(user: any) {
  if (!user) return user;
  const avatar = user.avatar_url || user.photoURL || user.avatarUrl || user.avatar || null;
  let parsedPermissions = user.permissions;
  if (typeof user.permissions === "string") {
    try {
      parsedPermissions = JSON.parse(user.permissions);
    } catch (e) {}
  }
  return {
    id: user.id,
    uid: user.uid || user.id,
    username: user.username,
    displayName: user.displayName || user.nama_lengkap || user.name || user.username,
    nama_lengkap: user.nama_lengkap || user.displayName || user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions: parsedPermissions,
    department: user.department,
    position: user.position,
    phone: user.phone,
    avatar_url: avatar,
    photoURL: avatar,
    avatarUrl: avatar,
  };
}

// ============================================
// LOGIN RATE LIMIT & LOCKOUT TRACKER LOGIC
// ============================================
export interface LoginAttemptTracker {
  count: number;
  blockedUntil: number | null;
}

export type AuthResultSuccess = { success: true; user: any };
export type AuthResultFailure = {
  success: false;
  status: number;
  message: string;
  remainingMs?: number;
};
export type AuthResult = AuthResultSuccess | AuthResultFailure;

const loginAttemptsMap = new Map<string, LoginAttemptTracker>();

function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (mins > 0 && secs > 0) {
    return `${mins} menit ${secs} detik`;
  } else if (mins > 0) {
    return `${mins} menit`;
  } else {
    return `${secs} detik`;
  }
}

export async function handleUserAuthentication(
  usernameInput: string,
  passwordInput: string
): Promise<AuthResult> {
  let connection;
  let rows: any[] = [];
  try {
    connection = await db.getConnection();
    const [result]: any = await connection.query(
      "SELECT * FROM Users WHERE username = ? OR email = ?",
      [usernameInput, usernameInput]
    );
    rows = result;
  } catch (err) {
    console.error("Database query error in handleUserAuthentication:", err);
    return {
      success: false,
      status: 500,
      message: "Terjadi kesalahan koneksi database.",
    };
  } finally {
    if (connection) connection.release();
  }

  // 1. Username is NOT found in database
  if (!rows || rows.length === 0) {
    return {
      success: false,
      status: 401,
      message:
        "Kata sandi atau nama pengguna yang Anda masukkan salah. Silakan periksa kembali kredensial Anda.",
    };
  }

  const user = rows[0];
  const matchedUsername = user.username || usernameInput;
  const userKey = (user.username || usernameInput).trim().toLowerCase();
  const userId = user.id || user.uid;

  let attempt = loginAttemptsMap.get(userKey);
  if (!attempt) {
    attempt = { count: 0, blockedUntil: null };
    loginAttemptsMap.set(userKey, attempt);
  }

  const now = Date.now();

  // Check if user is currently blocked
  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    const remainingMs = attempt.blockedUntil - now;
    const timeStr = formatRemainingTime(remainingMs);
    setImmediate(async () => {
      try {
        const logConn = await db.getConnection();
        await logConn.query(
          `INSERT INTO AuditLogs (id, userId, projectId, actionType, entityName, entityId, oldValues, newValues)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            userId,
            null,
            "LOGIN_BLOCKED",
            "Authentication",
            userId,
            null,
            JSON.stringify({ reason: "Rate limit exceeded (5 min block)" }),
          ]
        );
        logConn.release();
      } catch (logErr) {
        console.error("Failed to log blocked login attempt:", logErr);
      }
    });
    return {
      success: false,
      status: 429,
      message: `halo ${matchedUsername} akun anda terblokir, Silahkan menunggu ${timeStr} lagi untuk coba kembali`,
      remainingMs,
    };
  }

  // If block expired, reset attempt count
  if (attempt.blockedUntil && now >= attempt.blockedUntil) {
    attempt.count = 0;
    attempt.blockedUntil = null;
  }

  // Status checks are now performed in the login controller after password verification

  // 2. Verify password
  const isValid = await verifyPassword(passwordInput, user.passwordHash);

  if (!isValid) {
    attempt.count += 1;

    // Log failed attempt to audit trail
    setImmediate(async () => {
      try {
        const logConn = await db.getConnection();
        await logConn.query(
          `INSERT INTO AuditLogs (id, userId, projectId, actionType, entityName, entityId, oldValues, newValues)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            userId,
            null,
            "LOGIN_FAILED",
            "Authentication",
            userId,
            null,
            JSON.stringify({ attempt: attempt.count }),
          ]
        );
        logConn.release();
      } catch (logErr) {
        console.error("Failed to log failed login attempt:", logErr);
      }
    });

    // 3. Reached 5 failed attempts -> Block for 5 minutes (300,000 ms)
    if (attempt.count >= 5) {
      const blockDurationMs = 5 * 60 * 1000;
      attempt.blockedUntil = Date.now() + blockDurationMs;
      return {
        success: false,
        status: 429,
        message: `halo ${matchedUsername} akun anda terblokir, Silahkan menunggu 5 menit lagi untuk coba kembali`,
        remainingMs: blockDurationMs,
      };
    }

    // 4. Failed password but attempt count < 5
    return {
      success: false,
      status: 401,
      message: `halo ${matchedUsername} password yang anda masukan salah, Silakan periksa kembali kredensial Anda.`,
    };
  }

  // 5. Password is correct! Reset attempt tracker
  loginAttemptsMap.delete(userKey);

  return {
    success: true,
    user,
  };
}
