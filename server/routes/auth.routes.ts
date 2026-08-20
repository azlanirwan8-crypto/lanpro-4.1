import express from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../helpers/jwtSecret";
import { UAParser } from "ua-parser-js";
import { authenticateJWT, activeUserSessions, generateToken } from "../middleware/auth";
import { hashPassword } from "../helpers/hash";
import { adalahDuplikat } from "../helpers/pgErrors";
import { roomPengguna, sidikToken } from "../middleware/socketAuth";
import { z } from "zod";
import { formatUserForAuthResponse, handleUserAuthentication } from "../services/auth.service";
import { kirimEmailSelamatDatang } from "../services/email.service";
import { validasiBody } from "../middleware/validate";
import { loginSchema, forceLogoutSchema } from "../schemas/auth.schema";
import { authRepository } from "../repositories/auth.repository";

const router = express.Router();

async function peraminta(req: any): Promise<string | null> {
  const header = req.headers?.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const decoded: any = jwt.verify(header.split(" ")[1], getJwtSecret());
    const id = decoded?.id || decoded?.uid;
    if (!id) return null;
    return await authRepository.findUserRoleById(id);
  } catch {
    return null;
  }
}

router.get("/api/auth/verify", authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const user = await authRepository.findUserByIdOrUid(userId);
    if (!user) {
      return res.json({ status: "success", user: formatUserForAuthResponse(req.user) });
    }
    res.json({ status: "success", user: formatUserForAuthResponse(user) });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Verify token error:", error);
    res.json({ status: "success", user: formatUserForAuthResponse(req.user) });
  }
});

router.post("/api/auth/refresh", authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const user = await authRepository.findUserByIdOrUid(userId);
    if (!user) {
      return res.status(404).json({ status: "error", message: "Pengguna tidak ditemukan." });
    }
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
  }
});

router.post("/api/auth/login", validasiBody(loginSchema), async (req, res) => {
  try {
    const { username, password, force } = req.body;

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

    // SESSION COLLISION CHECK
    const dbUser = await authRepository.findSessionData(userId.toString());
    if (dbUser && dbUser.currentSessionToken && !force) {
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

    const updated = await authRepository.updateSessionToken(userId.toString(), token, String(Date.now()));
    if (!updated) {
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

router.post("/api/auth/force-logout", validasiBody(forceLogoutSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

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

    setImmediate(async () => {
      try {
        await authRepository.logForceLogout(userId);
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

    const updated = await authRepository.updateSessionToken(userId.toString(), token, String(Date.now()));
    if (!updated) {
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

function idDariToken(req: any): string | null {
  const header = req.headers?.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const decoded: any = jwt.verify(header.split(" ")[1], getJwtSecret());
    const id = decoded?.id || decoded?.uid;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

router.post("/api/auth/logout", async (req, res) => {
  try {
    const userId = idDariToken(req);
    if (userId) {
      activeUserSessions.delete(userId.toString());
      await authRepository.clearSessionToken(userId.toString());
    }
    return res.json({ status: "success" });
  } catch (e) {
    return res.json({ status: "success" });
  }
});

router.post("/api/auth/register", async (req, res) => {
  try {
    const {
      username,
      password,
      nama_lengkap,
      name,
      displayName,
      email,
      role,
      department,
      position,
      permissions,
      phone,
    } = req.body;
    const fullName = nama_lengkap || name || displayName || "";

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

    const usernameInUse = await authRepository.checkUserExistsByUsername(username);
    if (usernameInUse) {
      return res
        .status(400)
        .json({ status: "error", message: "Username sudah digunakan oleh akun lain." });
    }

    const emailInUse = await authRepository.checkUserExistsByEmail(email);
    if (emailInUse) {
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
    const insertRole = (await peraminta(req)) === "admin" ? role || "user" : "user";
    const insertStatus = "PENDING";
    const insertDepartment = department || null;
    const insertPosition = position || null;
    const insertPermissions = permissions ? JSON.stringify(permissions) : null;

    try {
      await authRepository.registerUser({
        uid,
        username,
        fullName,
        email,
        displayName: insertDisplayName,
        role: insertRole,
        status: insertStatus,
        passwordHash: hashPassword(password),
        department: insertDepartment,
        position: insertPosition,
        permissions: insertPermissions,
        phone,
      });
    } catch (insertError: any) {
      if (adalahDuplikat(insertError)) {
        console.log("User sudah ada (SQLSTATE " + insertError.code + "), insert diabaikan:", email);
      } else {
        throw insertError;
      }
    }

    kirimEmailSelamatDatang({
      email,
      nama: fullName || insertDisplayName,
      username,
    }).catch((emailErr) => {
      console.error("[EMAIL] Gagal mengirim email selamat datang pendaftaran:", emailErr?.message || emailErr);
    });

    return res.status(201).json({
      status: "success",
      message:
        "Akun Anda sudah berhasil dibuat. Silahkan hubungi Admin untuk diaktifkan sebelum Anda dapat melakukan login.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Register error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
  }
});

export default router;
