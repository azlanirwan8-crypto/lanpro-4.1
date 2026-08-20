import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { authenticateJWT, verifyGlobalAdmin } from "../middleware/auth";
import { hashPassword, verifyPassword } from "../helpers/hash";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../middleware/auth";
import { validateFileBuffer } from "../../src/lib/fileSecurity";
import { simpanBerkas, hapusBerkas } from "../services/storage.service";
import { sanitizeAvatarValue, AVATAR_ALLOWED_EXT } from "../helpers/avatarValue";
import { validasiBody } from "../middleware/validate";
import { updateUserSchema, updateProfileSchema } from "../schemas/user.schema";
import { AuthenticatedRequest } from "../types/express";
import { userRepository } from "../repositories/user.repository";
export { sanitizeAvatarValue };

function hapusAvatarLama(urlLama: unknown, urlBaru: string): void {
  const lama = sanitizeAvatarValue(urlLama);
  if (!lama || lama === urlBaru) return;
  const namaBerkas = path.basename(lama);
  void hapusBerkas(namaBerkas);
}

const isServerless =
  !!process.env.VERCEL ||
  !!process.env.AWS_EXECUTION_ENV ||
  process.cwd() === "/var/task" ||
  process.cwd().includes("/var/task");
const GLOBAL_UPLOADS_DIR = isServerless ? "/tmp/uploads" : path.join(process.cwd(), "uploads");
if (!fs.existsSync(GLOBAL_UPLOADS_DIR)) {
  fs.mkdirSync(GLOBAL_UPLOADS_DIR, { recursive: true });
}
const upload = multer({ dest: GLOBAL_UPLOADS_DIR, limits: { fileSize: 5 * 1024 * 1024 } });

const isRedisConnected = false;
const pubClient: any = null;
const globalPresence = new Map<string, any>();

const router = express.Router();

router.post("/api/users/heartbeat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ status: "error" });
    const parts = authHeader.split(" ");
    if (parts.length < 2) return res.status(401).json({ status: "error" });
    const token = parts[1];
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const userId = decoded.id;

    await userRepository.updateLastSeen(userId, new Date().toISOString());
    res.json({ status: "success" });
  } catch (e) {
    res.json({ status: "error", message: "Silent error" });
  }
});

// Resilient Presence Ping API (Fallback for Vercel Serverless)
router.post("/api/presence/ping", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id || req.user?.uid;
    const nowStr = new Date().toISOString();

    if (userId) {
      await userRepository.updateLastSeen(userId, nowStr);
    }

    const processedUsers = await userRepository.findAll();

    const currentUserProfile = processedUsers.find((u: any) => {
      const uId = u.uid || u.id;
      return uId && userId && uId.toString() === userId.toString();
    });

    if (currentUserProfile && isRedisConnected && userId) {
      try {
        await pubClient.set(`presence:user:${userId}`, JSON.stringify(currentUserProfile), {
          EX: 30,
        });
      } catch (redisErr) {
        console.warn("[REDIS] Failed to write user presence:", redisErr);
      }
    }

    let activeUsers: any[] = [];
    if (isRedisConnected) {
      try {
        const keys = await pubClient.keys("presence:user:*");
        if (keys.length > 0) {
          const values = await pubClient.mGet(keys);
          values.forEach((val: any) => {
            if (val) {
              try {
                activeUsers.push(JSON.parse(val));
              } catch (e) {}
            }
          });
        }
      } catch (redisErr) {
        console.warn("[REDIS] Failed to read presence from Redis:", redisErr);
      }
    }

    if (activeUsers.length === 0) {
      activeUsers = processedUsers.filter((u: any) => {
        if (!u.lastSeen) return false;
        const lastSeenTime = new Date(u.lastSeen).getTime();
        return Date.now() - lastSeenTime < 30000;
      });
    }

    activeUsers.forEach((u: any) => {
      const uid = u.uid || u.id;
      if (uid) {
        globalPresence.set(uid.toString(), u);
      }
    });

    res.json({
      status: "success",
      onlineUsers: activeUsers,
      allUsers: processedUsers,
    });
  } catch (error: any) {
    console.error("Presence Ping Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Resilient Presence Sync API
router.get("/api/presence/sync", authenticateJWT, async (req: any, res) => {
  try {
    let onlineUsers: any[] = [];
    if (isRedisConnected) {
      try {
        const keys = await pubClient.keys("presence:user:*");
        if (keys.length > 0) {
          const values = await pubClient.mGet(keys);
          values.forEach((val: any) => {
            if (val) {
              try {
                onlineUsers.push(JSON.parse(val));
              } catch (e) {}
            }
          });
        }
      } catch (redisErr) {
        console.warn(
          "[REDIS] Failed to sync presence from Redis, falling back to database",
          redisErr
        );
      }
    }

    if (onlineUsers.length === 0) {
      const processedUsers = await userRepository.findAll();
      onlineUsers = processedUsers.filter((u: any) => {
        if (!u.lastSeen) return false;
        const lastSeenTime = new Date(u.lastSeen).getTime();
        return Date.now() - lastSeenTime < 30000;
      });
    }

    res.json({
      status: "success",
      onlineUsers,
    });
  } catch (error: any) {
    console.error("Presence Sync Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Users API
router.get("/api/users", async (req, res) => {
  try {
    const rows = await userRepository.findAll();
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/users error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
  }
});

router.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userRepository.findByIdOrUid(id);
    if (user) {
      res.json({ status: "success", data: user });
    } else {
      res.status(404).json({ status: "error", message: "User not found" });
    }
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/users/:id error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
  }
});

// UPLOAD AVATAR ENDPOINT: POST /api/users/:id/avatar
router.post(
  "/api/users/:id/avatar",
  authenticateJWT,
  upload.single("file"),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id || req.user?.uid;
      const currentUserRole = String(req.user?.role || req.user?.system_role || "").toLowerCase();
      const isAdmin = currentUserRole === "admin";

      if (!isAdmin && String(id) !== String(currentUserId)) {
        return res.status(403).json({
          status: "error",
          message: "Akses ditolak: Anda hanya dapat memperbarui foto profil Anda sendiri.",
        });
      }

      const file = req.file || (req.files && req.files[0]);
      if (!file) {
        return res.status(400).json({
          status: "error",
          message: "File gambar avatar wajib disertakan.",
        });
      }

      const fileBuffer = fs.readFileSync(file.path);
      const validation = validateFileBuffer(fileBuffer, file.originalname);
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      if (!validation.valid || !AVATAR_ALLOWED_EXT.has(ext)) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({
          status: "error",
          message: "Foto profil harus berupa gambar (PNG, JPG, WEBP, atau GIF).",
        });
      }

      const safeFilename = `avatar-${id}-${Date.now()}.${ext}`;
      const avatarUrl = await simpanBerkas(safeFilename, fileBuffer, file.mimetype);

      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {}

      const avatarLama = await userRepository.getAvatar(id);
      const updatedUser = await userRepository.updateAvatar(id, avatarUrl);
      hapusAvatarLama(avatarLama, avatarUrl);

      const io = req.app.get("io") || (req as any).io;
      if (io) {
        io.emit("data_changed", { path: `/api/users/${id}`, method: "PUT" });
        io.emit("data_changed", { path: `/api/users`, method: "GET" });
        io.emit("user_avatar_updated", { userId: id, avatar_url: avatarUrl, user: updatedUser });
      }

      return res.json({
        status: "success",
        message: "Foto profil berhasil diperbarui",
        avatar_url: avatarUrl,
        data: {
          id: id,
          avatar_url: avatarUrl,
          photoURL: avatarUrl,
          user: updatedUser || { id, avatar_url: avatarUrl, photoURL: avatarUrl },
        },
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/users/:id/avatar error:", error);
      return res.status(500).json({
        status: "error",
        message: "Gagal memperbarui foto profil: " + error.message,
      });
    }
  }
);

router.put("/api/users/:id", authenticateJWT, validasiBody(updateUserSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id || req.user?.uid;
    const currentUserRole = String(req.user?.role || req.user?.system_role || "").toLowerCase();
    const isAdmin = currentUserRole === "admin";

    if (!isAdmin && String(id) !== String(currentUserId)) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak: Anda hanya dapat memperbarui profil Anda sendiri.",
      });
    }

    let {
      role,
      status,
      department,
      position,
      permissions,
      displayName,
      username,
      email,
      phone,
      passwordHash,
      password,
      photoURL,
      avatar_url,
    } = req.body;

    const effectiveAvatar = sanitizeAvatarValue(avatar_url || photoURL) ?? undefined;
    const rawPassword = passwordHash || password;
    const computedPasswordHash = rawPassword
      ? rawPassword.startsWith("pbkdf2$")
        ? rawPassword
        : hashPassword(rawPassword)
      : undefined;

    await userRepository.updateUser(
      id,
      {
        role,
        status,
        department,
        position,
        permissions,
        displayName,
        username,
        email,
        phone,
        effectiveAvatar,
        passwordHash: computedPasswordHash,
      },
      isAdmin
    );

    res.json({ status: "success", message: "User updated" });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: PUT /api/users error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
  }
});

router.delete("/api/users/:id", authenticateJWT, verifyGlobalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await userRepository.delete(id);
    res.json({ status: "success", message: "User deleted" });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: DELETE /api/users error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
  }
});

router.put("/api/profile/update", authenticateJWT, validasiBody(updateProfileSchema), async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.user?.id || req.user?.uid;
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Sesi tidak valid." });
    }
    const id = userId;
    const {
      displayName,
      username,
      email,
      phone,
      currentPassword,
      newPassword,
      photoURL,
      avatar_url,
    } = req.body;

    const effectiveAvatar = sanitizeAvatarValue(avatar_url || photoURL) ?? undefined;
    const user = await userRepository.findByIdOrUid(id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    let newPasswordHash: string | undefined;
    if (currentPassword && newPassword) {
      const isValid = await verifyPassword(currentPassword, user.passwordHash || "");
      if (!isValid) {
        return res
          .status(400)
          .json({ status: "error", message: "Password lama yang Anda masukkan salah!" });
      }
      newPasswordHash = hashPassword(newPassword);
    }

    const finalAvatar =
      effectiveAvatar !== undefined ? effectiveAvatar : user.avatar_url || user.photoURL || user.avatarUrl || null;

    await userRepository.updateProfile(id, {
      displayName,
      username,
      email,
      phone,
      avatar: finalAvatar,
      newPasswordHash,
    });

    const io = req.app.get("io") || (req as any).io;
    if (io) {
      io.emit("data_changed", { path: `/api/users/${id}`, method: "PUT" });
      io.emit("data_changed", { path: `/api/users`, method: "GET" });

      const avatarLama = user.avatar_url || user.photoURL || user.avatarUrl || null;
      if (finalAvatar && finalAvatar !== avatarLama) {
        io.emit("user_avatar_updated", {
          userId: id,
          avatar_url: finalAvatar,
          user: { ...user, avatar_url: finalAvatar, photoURL: finalAvatar, avatarUrl: finalAvatar },
        });
      }
    }

    res.json({ status: "success", message: "Profile updated" });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: PUT /api/profile/update error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
  }
});

export default router;
