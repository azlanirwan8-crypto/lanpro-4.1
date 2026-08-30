import express from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../helpers/jwtSecret";
import { UAParser } from "ua-parser-js";
import { authenticateJWT, activeUserSessions, generateToken } from "../middleware/auth";
import { hashPassword, verifyPassword } from "../helpers/hash";
import { adalahDuplikat } from "../helpers/pgErrors";
import { roomPengguna, sidikToken } from "../middleware/socketAuth";
import { z } from "zod";
import { formatUserForAuthResponse, handleUserAuthentication } from "../services/auth.service";
import {
  kirimEmailSelamatDatang,
  kirimEmailResetPassword,
  kirimEmailPasswordBaru,
  kirimEmailLatarBelakang,
} from "../services/email.service";
import crypto from "crypto";
import { validasiBody } from "../middleware/validate";
import { loginSchema, forceLogoutSchema } from "../schemas/auth.schema";
import { authRepository } from "../repositories/auth.repository";
import { urlFrontend } from "./auth-oidc.routes";
import { extractGeoLocation } from "../helpers/geo";

export function generateRandomPassword(length = 10): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%&*";
  const all = uppers + lowers + numbers + symbols;

  const randomChar = (chars: string) => chars[crypto.randomInt(0, chars.length)];

  const passwordChars = [
    randomChar(uppers),
    randomChar(lowers),
    randomChar(numbers),
    randomChar(symbols),
  ];

  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(randomChar(all));
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

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
      return res.status(404).json({
        status: "error",
        code: "srv.pengguna_tidak_ditemukan",
        message: "Pengguna tidak ditemukan.",
      });
    }
    if (user.status === "rejected") {
      return res.status(403).json({
        status: "error",
        code: "srv.akun_anda_ditolak_oleh",
        message: "Akun Anda ditolak oleh admin.",
      });
    }
    if (user.status === "pending") {
      return res.status(403).json({
        status: "error",
        code: "srv.akun_anda_masih_dalam",
        message: "Akun Anda masih dalam status peninjauan.",
      });
    }

    const newToken = generateToken(user);
    return res.json({
      status: "success",
      token: newToken,
      user: formatUserForAuthResponse(user),
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Refresh token error:", error);
    return res.status(500).json({
      status: "error",
      code: "srv.gagal_memperpanjang_sesi",
      message: "Gagal memperpanjang sesi.",
    });
  }
});

router.post("/api/auth/login", validasiBody(loginSchema), async (req, res) => {
  try {
    const { username, password, force } = req.body;

    const authResult = await handleUserAuthentication(username, password);
    if (authResult.success === false) {
      return res.status(authResult.status).json({
        status: "error",
        // Item #150 — kode dan parameternya ikut dikirim supaya klien bisa
        // menerjemahkan; `message` tetap ada sebagai cadangan.
        code: authResult.code,
        params: authResult.params,
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
          code: "srv.akun_anda_masih_aktif",
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

    const geo = extractGeoLocation(req);

    const updated = await authRepository.updateSessionToken(
      userId.toString(),
      token,
      String(Date.now())
    );
    if (!updated) {
      return res.status(404).json({
        status: "error",
        code: "srv.user_tidak_ditemukan",
        message: "User tidak ditemukan.",
      });
    }

    const sessionId = crypto.randomUUID();
    activeUserSessions.set(userId.toString(), {
      token,
      ip: geo.ip,
      browser,
      device,
      lastActiveAt: Date.now(),
      browserSessionId: req.body.browserSessionId || "",
    });

    setImmediate(async () => {
      try {
        await authRepository.recordSessionLogin({
          id: sessionId,
          userId: userId.toString(),
          ipAddress: geo.ip,
          userAgent: req.headers["user-agent"] as string,
          browser,
          os: `${osInfo.name || ""} ${osInfo.version || ""}`.trim() || null,
          device,
          city: geo.city,
          country: geo.country,
          location: geo.location,
          token,
        });
      } catch (err) {
        console.error("Gagal mencatat riwayat sesi login:", err);
      }
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
    return res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server_2",
      message: "Terjadi kesalahan internal server.",
    });
  }
});

router.post("/api/auth/force-logout", validasiBody(forceLogoutSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    const authResult = await handleUserAuthentication(username, password);
    if (authResult.success === false) {
      return res.status(authResult.status).json({
        status: "error",
        // Item #150 — kode dan parameternya ikut dikirim supaya klien bisa
        // menerjemahkan; `message` tetap ada sebagai cadangan.
        code: authResult.code,
        params: authResult.params,
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
    const deviceInfo = parser.getDevice();
    const geo = extractGeoLocation(req);
    const browser = `${browserInfo.name || "Unknown"} ${browserInfo.version || ""}`.trim();
    let device = `${osInfo.name || "Unknown"} ${osInfo.version || ""}`.trim();
    if (deviceInfo.vendor || deviceInfo.model) {
      device += ` (${deviceInfo.vendor || ""} ${deviceInfo.model || ""})`.trim();
    }

    const updated = await authRepository.updateSessionToken(
      userId.toString(),
      token,
      String(Date.now())
    );
    if (!updated) {
      return res.status(404).json({
        status: "error",
        code: "srv.user_tidak_ditemukan",
        message: "User tidak ditemukan.",
      });
    }

    const sessionId = crypto.randomUUID();
    activeUserSessions.set(userId.toString(), {
      token,
      ip: geo.ip,
      browser,
      device,
      lastActiveAt: Date.now(),
      browserSessionId: req.body.browserSessionId || "",
    });

    setImmediate(async () => {
      try {
        await authRepository.recordSessionLogin({
          id: sessionId,
          userId: userId.toString(),
          ipAddress: geo.ip,
          userAgent: req.headers["user-agent"] as string,
          browser,
          os: `${osInfo.name || ""} ${osInfo.version || ""}`.trim() || null,
          device,
          city: geo.city,
          country: geo.country,
          location: geo.location,
          token,
        });
      } catch (err) {
        console.error("Gagal mencatat UserSession pada force-logout:", err);
      }
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
    const header = req.headers?.authorization;
    const token = header && header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (userId) {
      activeUserSessions.delete(userId.toString());
      await authRepository.clearSessionToken(userId.toString());
      await authRepository.recordSessionLogout(userId.toString(), token);
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
      return res.status(400).json({
        status: "error",
        code: "srv.username_sudah_digunakan_oleh",
        message: "Username sudah digunakan oleh akun lain.",
      });
    }

    const emailInUse = await authRepository.checkUserExistsByEmail(email);
    if (emailInUse) {
      return res.status(400).json({
        status: "error",
        code: "srv.email_sudah_digunakan_oleh",
        message: "Email sudah digunakan oleh akun lain.",
      });
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

    kirimEmailLatarBelakang(
      kirimEmailSelamatDatang({
        email,
        nama: fullName || insertDisplayName,
        username,
      }),
      `Email selamat datang pendaftaran untuk ${email}`
    );

    return res.status(201).json({
      status: "success",
      code: "srv.akun_anda_sudah_berhasil",
      message:
        "Akun Anda sudah berhasil dibuat. Silahkan hubungi Admin untuk diaktifkan sebelum Anda dapat melakukan login.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Register error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/**
 * Masa berlaku kata sandi sementara (#296), diminta pemilik proyek: 2 jam.
 *
 * Ditulis sebagai konstanta bernama, bukan angka di tengah kode, supaya
 * jelas ia keputusan kebijakan -- bukan detail teknis yang boleh diubah
 * siapa saja sambil lewat.
 */
const MASA_BERLAKU_KATA_SANDI_SEMENTARA_MS = 2 * 60 * 60 * 1000;

/**
 * Syarat kata sandi baru, dipakai bersama oleh reset-password (bertoken) dan
 * change-password (#296).
 *
 * Diangkat jadi konstanta karena dua jalur yang menetapkan kata sandi harus
 * menuntut hal yang sama. Menyalinnya ke tiap rute adalah cara paling umum
 * dua jalur diam-diam berbeda syarat, dan yang longgar akan jadi pintu
 * belakang bagi yang ketat.
 */
const SKEMA_KATA_SANDI = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar (A-Z)")
  .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil (a-z)")
  .regex(/[0-9]/, "Password harus mengandung minimal 1 angka (0-9)")
  .regex(/[@$!%*?&]/, "Password harus mengandung minimal 1 simbol khusus (@$!%*?&)");

router.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        status: "error",
        code: "srv.alamat_email_tidak_valid",
        message: "Alamat email tidak valid.",
      });
    }

    const balasanNetral = {
      status: "success",
      code: "srv.bila_alamat_email_itu",
      message:
        "Bila alamat email terdaftar, instruksi dan kata sandi sementara baru telah dikirimkan ke alamat email tersebut.",
    };

    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      return res.json(balasanNetral);
    }

    // Item #262 — Buat password acak sementara, hash ke DB, dan kirim via email
    // Item #296 — kata sandi itu kini punya masa berlaku dan wajib diganti.
    const userId = user.id || user.uid;
    const temporaryPassword = generateRandomPassword(10);
    const newPasswordHash = hashPassword(temporaryPassword);
    const berlakuSampai = new Date(Date.now() + MASA_BERLAKU_KATA_SANDI_SEMENTARA_MS);

    await authRepository.setTemporaryPassword(userId, newPasswordHash, berlakuSampai);

    // Cabut sesi aktif lama
    if (user.id) {
      activeUserSessions.delete(user.id);
    }
    if (user.uid) {
      activeUserSessions.delete(user.uid);
    }

    kirimEmailLatarBelakang(
      kirimEmailPasswordBaru({
        email: user.email,
        nama: user.displayName || user.nama_lengkap || user.username,
        username: user.username || user.email,
        temporaryPassword,
        berlakuSampai,
      }),
      `Kata sandi sementara untuk ${user.email}`
    );

    return res.json(balasanNetral);
  } catch (error: any) {
    console.error("LOG ANOMALI: forgot-password error:", error);
    return res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server_2",
      message: "Terjadi kesalahan internal server.",
    });
  }
});

/**
 * Ganti kata sandi saat sudah masuk (#296).
 *
 * Inilah jalur yang dipakai pengguna sesudah masuk memakai kata sandi
 * sementara dari email. Ia menuntut kata sandi lama, jadi token sesi yang
 * dicuri saja tidak cukup untuk mengunci akun orang lain.
 *
 * Menetapkan kata sandi tetap lewat `updateUserPassword`, yang MENGOSONGKAN
 * `tempPasswordExpiresAt` dan `mustChangePassword` -- itu yang mengakhiri
 * keadaan "wajib ganti", bukan penanda terpisah yang bisa lupa dibersihkan.
 */
router.post("/api/auth/change-password", authenticateJWT, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const userId = req.user?.id || req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        code: "srv.sesi_tidak_valid",
        message: "Sesi tidak valid.",
      });
    }

    const validasi = SKEMA_KATA_SANDI.safeParse(newPassword);
    if (!validasi.success) {
      return res.status(400).json({
        status: "error",
        message:
          validasi.error.issues[0]?.message ||
          "Format kata sandi baru tidak memenuhi syarat keamanan.",
      });
    }

    const user = await authRepository.findUserByIdOrUid(String(userId));
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: "srv.pengguna_tidak_ditemukan",
        message: "Pengguna tidak ditemukan.",
      });
    }

    const cocok = await verifyPassword(String(currentPassword || ""), user.passwordHash);
    if (!cocok) {
      return res.status(401).json({
        status: "error",
        code: "srv.kata_sandi_saat_ini_salah",
        message: "Kata sandi saat ini salah.",
      });
    }

    // Kata sandi baru tidak boleh sama dengan yang sementara -- kalau boleh,
    // seluruh alur "wajib ganti" jadi tidak berarti apa-apa.
    const samaDenganLama = await verifyPassword(String(newPassword), user.passwordHash);
    if (samaDenganLama) {
      return res.status(400).json({
        status: "error",
        code: "srv.kata_sandi_baru_sama",
        message: "Kata sandi baru tidak boleh sama dengan kata sandi saat ini.",
      });
    }

    await authRepository.updateUserPassword(String(userId), hashPassword(String(newPassword)));

    return res.json({
      status: "success",
      code: "srv.kata_sandi_berhasil_diubah",
      message: "Kata sandi berhasil diubah.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI: change-password error:", error);
    return res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server_2",
      message: "Terjadi kesalahan internal server.",
    });
  }
});

router.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword, password } = req.body || {};
    const effectivePassword = newPassword || password;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        status: "error",
        code: "srv.token_pengaturan_ulang_kata",
        message: "Token pengaturan ulang kata sandi tidak valid atau hilang.",
      });
    }

    const validationResult = SKEMA_KATA_SANDI.safeParse(effectivePassword);
    if (!validationResult.success) {
      return res.status(400).json({
        status: "error",
        message:
          validationResult.error.issues[0]?.message ||
          "Format kata sandi baru tidak memenuhi syarat keamanan.",
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err: any) {
      return res.status(400).json({
        status: "error",
        code: "srv.token_pengaturan_ulang_kata_2",
        message:
          "Token pengaturan ulang kata sandi sudah kedaluwarsa atau tidak valid. Silakan ajukan permohonan baru.",
      });
    }

    if (decoded.type !== "password_reset" || !decoded.id) {
      return res.status(400).json({
        status: "error",
        code: "srv.jenis_token_tidak_valid",
        message: "Jenis token tidak valid untuk pengaturan ulang kata sandi.",
      });
    }

    const passwordHash = await hashPassword(effectivePassword);
    await authRepository.updateUserPassword(decoded.id, passwordHash);

    // Invalidate active sessions to force re-login
    activeUserSessions.delete(decoded.id.toString());
    await authRepository.clearSessionToken(decoded.id.toString());

    return res.json({
      status: "success",
      code: "srv.kata_sandi_anda_berhasil",
      message: "Kata sandi Anda berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Reset password error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

export default router;
