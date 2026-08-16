import express from "express";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import db from "../../src/lib/db";
import { authenticateJWT, activeUserSessions, generateToken } from "../middleware/auth";
import { hashPassword } from "../helpers/hash";
import { adalahDuplikat } from "../helpers/pgErrors";
import { roomPengguna, sidikToken } from "../middleware/socketAuth";
import { z } from "zod";
import { formatUserForAuthResponse, handleUserAuthentication } from "../services/auth.service";

const router = express.Router();

router.get("/api/auth/verify", authenticateJWT, async (req: any, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows]: any = await connection.query("SELECT * FROM Users WHERE id = ? OR uid = ?", [
      req.user.id || req.user.uid,
      req.user.uid || req.user.id,
    ]);
    if (rows.length === 0) {
      return res.json({ status: "success", user: formatUserForAuthResponse(req.user) });
    }
    res.json({ status: "success", user: formatUserForAuthResponse(rows[0]) });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Verify token error:", error);
    res.json({ status: "success", user: formatUserForAuthResponse(req.user) });
  } finally {
    if (connection) connection.release();
  }
});

router.post("/api/auth/refresh", authenticateJWT, async (req: any, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows]: any = await connection.query("SELECT * FROM Users WHERE id = ? OR uid = ?", [
      req.user.id || req.user.uid,
      req.user.uid || req.user.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Pengguna tidak ditemukan." });
    }
    const user = rows[0];
    if (user.status === "rejected") {
      return res.status(403).json({ status: "error", message: "Akun Anda ditolak oleh admin." });
    }
    if (user.status === "pending") {
      return res
        .status(403)
        .json({ status: "error", message: "Akun Anda masih dalam status peninjauan." });
    }

    const newToken = generateToken(user);
    return res.json({
      status: "success",
      token: newToken,
      user: formatUserForAuthResponse(user),
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Refresh token error:", error);
    return res.status(500).json({ status: "error", message: "Gagal memperpanjang sesi." });
  } finally {
    if (connection) connection.release();
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password, force } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "Username/Email dan Password wajib diisi." });
    }

    const authResult = await handleUserAuthentication(username, password);
    if (authResult.success === false) {
      return res.status(authResult.status).json({
        status: "error",
        message: authResult.message,
        remainingMs: authResult.remainingMs,
      });
    }

    const user = authResult.user;
    const userId = user.id || user.uid;

    if (user.status === "PENDING" || user.status === "pending") {
      return res
        .status(403)
        .json({ error: "Akun Anda sedang menunggu persetujuan Administrator." });
    }

    if (user.status === "REJECTED" || user.status === "rejected") {
      return res.status(403).json({ error: "Pendaftaran akun Anda ditolak." });
    }

    // --- SESSION COLLISION CHECK (Database-backed, no bypass) ---
    const [dbUsers]: any = await db.query(
      "SELECT currentSessionToken, lastSeen FROM Users WHERE id = ?",
      [userId.toString()]
    );
    const dbUser = dbUsers && dbUsers[0];
    if (dbUser && dbUser.currentSessionToken && !force) {
      // Cek jika sesi aktif belum expired (misal asumsi aktif jika lastActive < 24 jam)
      const lastActiveTime = dbUser.lastSeen ? Number(dbUser.lastSeen) : 0;
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (lastActiveTime && Date.now() - lastActiveTime < ONE_DAY) {
        return res.status(409).json({
          status: "conflict",
          message: "Akun Anda Masih Aktif di perangkat lain.",
          activeSession: {
            ip: "Device Lain",
            browser: "Aktif",
            device: "Aktif",
            lastActiveAt: lastActiveTime,
          },
        });
      }
    }

    const token = generateToken(user);

    // --- STORE SESSION METADATA ---
    const parser = new UAParser(req.headers["user-agent"]);
    const browserInfo = parser.getBrowser();
    const osInfo = parser.getOS();
    const deviceInfo = parser.getDevice();

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown IP";
    const browser = `${browserInfo.name || "Unknown Browser"} ${browserInfo.version || ""}`.trim();
    let device = `${osInfo.name || "Unknown OS"} ${osInfo.version || ""}`.trim();
    if (deviceInfo.vendor || deviceInfo.model) {
      device += ` (${deviceInfo.vendor || ""} ${deviceInfo.model || ""})`.trim();
    }

    // Update database session
    const [updateResult]: any = await db.query(
      "UPDATE Users SET currentSessionToken = ?, lastSeen = ? WHERE id = ?",
      [token, String(Date.now()), userId.toString()]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "User tidak ditemukan." });
    }

    activeUserSessions.set(userId.toString(), {
      token,
      ip: String(ip),
      browser,
      device,
      lastActiveAt: Date.now(),
      browserSessionId: req.body.browserSessionId || "",
    });

    if (force) {
      // #51 — dikirim HANYA ke room milik pengguna ini, dan TANPA token.
      //
      // Dulu barisnya `io.emit(... newToken: token ...)`: JWT yang baru terbit
      // dan berlaku dua jam disiarkan ke SELURUH klien yang terhubung. Klien
      // sebenarnya tidak pernah memakai token itu — ia hanya membandingkannya
      // untuk tahu "apakah sesi baru itu aku?" — jadi sidik jarinya sudah cukup.
      const io = req.app.get("io") || (req as any).io;
      if (io) {
        io.to(roomPengguna(userId.toString())).emit("FORCE_LOGOUT_EVENT", {
          userId: userId.toString(),
          sidikTokenBaru: sidikToken(token),
          browserSessionId: req.body.browserSessionId || "",
        });
      }
    }
    return res.json({
      status: "success",
      user: formatUserForAuthResponse(user),
      token,
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Login error:", error);
    return res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server." });
  }
});

router.post("/api/auth/force-logout", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ status: "error" });

    const authResult = await handleUserAuthentication(username, password);
    if (authResult.success === false) {
      return res.status(authResult.status).json({
        status: "error",
        message: authResult.message,
        remainingMs: authResult.remainingMs,
      });
    }

    const user = authResult.user;
    const userId = user.id || user.uid;

    const token = generateToken(user);

    // Log force logout
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
            "FORCE_LOGOUT",
            "Authentication",
            userId,
            null,
            JSON.stringify({ action: "User initiated force logout from another device" }),
          ]
        );
        logConn.release();
      } catch (logErr) {
        console.error("Failed to log force logout:", logErr);
      }
    });

    const parser = new UAParser(req.headers["user-agent"]);
    const browserInfo = parser.getBrowser();
    const osInfo = parser.getOS();
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown IP";
    const browser = `${browserInfo.name || "Unknown"} ${browserInfo.version || ""}`.trim();
    const device = `${osInfo.name || "Unknown"} ${osInfo.version || ""}`.trim();

    // Update database session
    const [updateResult]: any = await db.query(
      "UPDATE Users SET currentSessionToken = ?, lastSeen = ? WHERE id = ?",
      [token, String(Date.now()), userId.toString()]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "User tidak ditemukan." });
    }

    activeUserSessions.set(userId.toString(), {
      token,
      ip: String(ip),
      browser,
      device,
      lastActiveAt: Date.now(),
      browserSessionId: req.body.browserSessionId || "",
    });

    // #51 — lihat catatan di jalur login: hanya ke room pemilik akun, tanpa token.
    const io = req.app.get("io") || (req as any).io;
    if (io) {
      io.to(roomPengguna(userId.toString())).emit("FORCE_LOGOUT_EVENT", {
        userId: userId.toString(),
        sidikTokenBaru: sidikToken(token),
        browserSessionId: req.body.browserSessionId || "",
      });
    }

    return res.json({
      status: "success",
      user: formatUserForAuthResponse(user),
      token,
    });
  } catch (e) {
    return res.status(500).json({ status: "error" });
  }
});

router.post("/api/auth/logout", async (req, res) => {
  try {
    const userId = req.body?.userId;
    if (userId) {
      activeUserSessions.delete(userId.toString());
      await db.query("UPDATE Users SET currentSessionToken = NULL WHERE id = ?", [
        userId.toString(),
      ]);
    }
    return res.json({ status: "success" });
  } catch (e) {
    return res.json({ status: "success" });
  }
});

router.post("/api/auth/register", async (req, res) => {
  let connection;
  try {
    const {
      username,
      password,
      nama_lengkap,
      name,
      displayName,
      email,
      role,
      status,
      department,
      position,
      permissions,
      phone,
    } = req.body;
    const fullName = nama_lengkap || name || displayName || "";

    // Server-side Zod Schema Validation
    const serverSchema = z.object({
      name: z.string().min(3, "Nama minimal 3 karakter").max(25, "Nama maksimal 25 karakter"),
      email: z.string().email("Format email tidak valid (contoh: user@gmail.com)"),
      username: z
        .string()
        .regex(/^[a-zA-Z]+$/, "Username hanya boleh berupa huruf")
        .max(10, "Username maksimal 10 karakter"),
      password: z
        .string()
        .min(8, "Password minimal 8 karakter")
        .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar (A-Z)")
        .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil (a-z)")
        .regex(/[0-9]/, "Password harus mengandung minimal 1 angka (0-9)")
        .regex(/[@$!%*?&]/, "Password harus mengandung minimal 1 simbol khusus (@$!%*?&)"),
    });

    const validationResult = serverSchema.safeParse({
      name: fullName,
      email,
      username,
      password,
    });

    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues[0]?.message || "Validasi pendaftaran gagal.";
      return res.status(400).json({
        status: "error",
        message: errorMsg,
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    connection = await db.getConnection();

    // Check if username is already in use
    const [usernameCheck]: any = await connection.query("SELECT id FROM Users WHERE username = ?", [
      username,
    ]);
    if (usernameCheck.length > 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Username sudah digunakan oleh akun lain." });
    }

    // Check if email is already in use
    const [emailCheck]: any = await connection.query("SELECT id FROM Users WHERE email = ?", [
      email,
    ]);
    if (emailCheck.length > 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Email sudah digunakan oleh akun lain." });
    }

    const uid = (
      req.body.uid ||
      req.body.id ||
      Date.now().toString(36) + Math.random().toString(36).substring(2)
    )
      .toString()
      .trim();

    const insertDisplayName = displayName || nama_lengkap || name || username;
    const insertRole = role || "user";
    const insertStatus = "PENDING";
    const insertDepartment = department || null;
    const insertPosition = position || null;
    const insertPermissions = permissions ? JSON.stringify(permissions) : null;

    try {
      await connection.query(
        `INSERT INTO Users (id, uid, username, nama_lengkap, email, displayName, photoURL, role, status, passwordHash, department, position, permissions, phone) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          uid,
          username,
          fullName,
          email,
          insertDisplayName,
          null,
          insertRole,
          insertStatus,
          hashPassword(password),
          insertDepartment,
          insertPosition,
          insertPermissions,
          phone || null,
        ]
      );
    } catch (insertError: any) {
      // #63 — dulu memeriksa `ER_DUP_ENTRY`/`errno 1062`, keduanya kode MySQL.
      // PostgreSQL memakai SQLSTATE 23505, sehingga cabang penelan ini tidak
      // pernah tercapai dan galatnya SELALU dilempar ke catch luar: pendaftaran
      // dengan email yang sudah ada menjawab 500 "Terjadi kesalahan internal
      // server", bukan pesan 201 yang dimaksud di bawah.
      if (adalahDuplikat(insertError)) {
        console.log(
          "User sudah ada (SQLSTATE " + insertError.code + "), insert diabaikan:",
          email
        );
      } else {
        throw insertError;
      }
    }

    return res.status(201).json({
      status: "success",
      message:
        "Akun Anda sudah berhasil dibuat. Silahkan hubungi Admin untuk diaktifkan sebelum Anda dapat melakukan login.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Register error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
  } finally {
    if (connection) connection.release();
  }
});

// Users Heartbeat API (Fallback for Vercel Serverless)

export default router;
