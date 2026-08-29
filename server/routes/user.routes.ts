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
import {
  sanitizeAvatarValue,
  extractStoredFilename,
  AVATAR_ALLOWED_EXT,
} from "../helpers/avatarValue";
import { validasiBody } from "../middleware/validate";
import { updateUserSchema, updateProfileSchema } from "../schemas/user.schema";
import { AuthenticatedRequest } from "../types/express";
import { userRepository } from "../repositories/user.repository";
import { matchesCaller } from "../services/task.service";
import { createAuditLog } from "../services/audit.service";
import { kirimEmailAktivasiAkun, kirimEmailLatarBelakang } from "../services/email.service";
export { sanitizeAvatarValue };

// Item #210 — dulu memakai `sanitizeAvatarValue` (yang sengaja menolak URL
// absolut untuk validasi INPUT PENGGUNA), jadi begitu STORAGE_DRIVER=s3
// aktif dan `simpanBerkas()` mengembalikan URL absolut, fungsi ini berhenti
// menghapus apa pun — berkas lama menumpuk selamanya di bucket. Lihat
// `extractStoredFilename()` di avatarValue.ts untuk penjelasan lengkap.
function hapusAvatarLama(urlLama: unknown, urlBaru: string): void {
  if (urlLama === urlBaru) return;
  const namaBerkas = extractStoredFilename(urlLama);
  if (!namaBerkas) return;
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
    res.json({ status: "error", code: "srv.silent_error", message: "Silent error" });
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
router.get("/api/users", async (req: any, res) => {
  try {
    // Item #162 — `email`, `phone`, dan `permissions` hanya untuk Global
    // Admin. Pemeriksaannya SAMA PERSIS dengan `verifyGlobalAdmin`
    // (`req.user.role === "admin"`, diisi `authenticateJWT` dari JWT yang
    // ditandatangani, jadi tidak bisa dipalsukan klien) supaya tidak lahir
    // kosakata otorisasi kedua di repo ini. Middleware-nya sendiri tidak
    // bisa dipakai di sini: ia MENOLAK non-admin dengan 403, sedangkan rute
    // ini memang harus tetap melayani mereka — cuma dengan isi lebih sedikit.
    const rows =
      req.user?.role === "admin"
        ? await userRepository.findAll()
        : await userRepository.findAllRingkas();
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/users error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server_3",
      message: "Terjadi kesalahan internal server: " + error.message,
    });
  }
});

router.get("/api/users/:id", async (req: any, res) => {
  try {
    const { id } = req.params;

    // Item #243 — `email`, `phone`, dan `permissions` hanya untuk Global Admin
    // dan untuk pemilik akunnya sendiri. Pemeriksaan perannya SAMA PERSIS
    // dengan `GET /api/users` di atas (`req.user.role === "admin"`, diisi
    // `authenticateJWT` dari JWT yang ditandatangani) supaya tidak lahir
    // kosakata otorisasi kedua di repo ini.
    //
    // Bedanya dengan endpoint daftar cuma satu: di sini ada pemanggil yang
    // BUKAN admin tetapi tetap berhak atas isi penuh — dirinya sendiri, yang
    // memang perlu membaca email dan nomornya di halaman profil.
    // `matchesCaller` dipakai karena `:id` boleh berupa `id` MAUPUN `uid`,
    // persis seperti `findByIdOrUid()` yang melayaninya.
    const bolehPenuh = req.user?.role === "admin" || matchesCaller(req.user, id);
    const user = bolehPenuh
      ? await userRepository.findByIdOrUid(id)
      : await userRepository.findByIdOrUidRingkas(id);
    if (user) {
      res.json({ status: "success", data: user });
    } else {
      res
        .status(404)
        .json({ status: "error", code: "srv.user_not_found", message: "User not found" });
    }
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/users/:id error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server_3",
      message: "Terjadi kesalahan internal server: " + error.message,
    });
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
          code: "srv.akses_ditolak_anda_hanya_5",
          message: "Akses ditolak: Anda hanya dapat memperbarui foto profil Anda sendiri.",
        });
      }

      const file = req.file || (req.files && req.files[0]);
      if (!file) {
        return res.status(400).json({
          status: "error",
          code: "srv.file_gambar_avatar_wajib",
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
          code: "srv.foto_profil_harus_berupa",
          message: "Foto profil harus berupa gambar (PNG, JPG, WEBP, atau GIF).",
        });
      }

      const safeFilename = `avatar-${id}-${Date.now()}.${ext}`;
      const avatarUrl = await simpanBerkas(safeFilename, fileBuffer, file.mimetype);
      // Item #211 — dicatat sementara untuk diagnosis: pemilik proyek
      // melaporkan berkas TERLIHAT ADA di bucket R2 tapi TIDAK tampil di
      // halaman. Log ini menampilkan URL persis yang dikembalikan
      // simpanBerkas(), supaya bisa dibandingkan dengan URL publik bucket
      // sungguhan tanpa pemilik proyek perlu buka DevTools browser.
      console.log(`[UPLOAD] Avatar disimpan untuk user ${id}: ${avatarUrl}`);

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
        code: "srv.foto_profil_berhasil_diperbarui",
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
        code: "srv.gagal_memperbarui_foto_profil",
        message: "Gagal memperbarui foto profil: " + error.message,
      });
    }
  }
);

// Item #208 — UPLOAD COVER ENDPOINT: POST /api/users/:id/cover
//
// Sebelumnya cover foto profil disimpan HANYA di localStorage browser
// (`UserDetailView.tsx`) sebagai data URI base64 — tidak pernah tersimpan
// di database, tidak terlihat pengguna lain, dan hilang begitu pindah
// browser/hapus cache. Endpoint ini meniru persis pola `POST
// /api/users/:id/avatar` di atas: divalidasi sama, disimpan lewat
// `simpanBerkas()` (driver storage yang sama, ikut memakai S3 begitu
// dikonfigurasi — lihat storage.service.ts / item #30), dan URL-nya
// disimpan ke kolom "coverUrl" di tabel Users.
router.post(
  "/api/users/:id/cover",
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
          code: "srv.akses_ditolak_anda_hanya_cover_sendiri",
          message: "Akses ditolak: Anda hanya dapat memperbarui cover Anda sendiri.",
        });
      }

      const file = req.file || (req.files && req.files[0]);
      if (!file) {
        return res.status(400).json({
          status: "error",
          code: "srv.file_gambar_cover_wajib",
          message: "File gambar cover wajib disertakan.",
        });
      }

      const fileBuffer = fs.readFileSync(file.path);
      const validation = validateFileBuffer(fileBuffer, file.originalname);
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      if (!validation.valid || !AVATAR_ALLOWED_EXT.has(ext)) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({
          status: "error",
          code: "srv.foto_cover_harus_berupa",
          message: "Foto cover harus berupa gambar (PNG, JPG, WEBP, atau GIF).",
        });
      }

      // Nama diawali "cover-" (bukan "avatar-") supaya diberi akses publik
      // lewat penjaga khusus di server.ts (item #208), pola sama seperti
      // avatar tapi kategori file terpisah.
      const safeFilename = `cover-${id}-${Date.now()}.${ext}`;
      const coverUrl = await simpanBerkas(safeFilename, fileBuffer, file.mimetype);
      // Item #211 — lihat catatan sama di endpoint /avatar di atas.
      console.log(`[UPLOAD] Cover disimpan untuk user ${id}: ${coverUrl}`);

      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {}

      const coverLama = await userRepository.getCover(id);
      const updatedUser = await userRepository.updateCover(id, coverUrl);
      hapusAvatarLama(coverLama, coverUrl);

      const io = req.app.get("io") || (req as any).io;
      if (io) {
        io.emit("data_changed", { path: `/api/users/${id}`, method: "PUT" });
        io.emit("data_changed", { path: `/api/users`, method: "GET" });
        io.emit("user_cover_updated", { userId: id, cover_url: coverUrl, user: updatedUser });
      }

      return res.json({
        status: "success",
        code: "srv.cover_berhasil_diperbarui",
        message: "Cover berhasil diperbarui",
        cover_url: coverUrl,
        data: {
          id: id,
          cover_url: coverUrl,
          user: updatedUser || { id, coverUrl },
        },
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/users/:id/cover error:", error);
      return res.status(500).json({
        status: "error",
        code: "srv.gagal_memperbarui_cover",
        message: "Gagal memperbarui cover: " + error.message,
      });
    }
  }
);

router.put(
  "/api/users/:id",
  authenticateJWT,
  validasiBody(updateUserSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id || req.user?.uid;
      const currentUserRole = String(req.user?.role || req.user?.system_role || "").toLowerCase();
      const isAdmin = currentUserRole === "admin";

      if (!isAdmin && String(id) !== String(currentUserId)) {
        return res.status(403).json({
          status: "error",
          code: "srv.akses_ditolak_anda_hanya_6",
          message: "Akses ditolak: Anda hanya dapat memperbarui profil Anda sendiri.",
        });
      }

      const {
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

      // #178 — username & email unik di database, tapi tanpa pemeriksaan ini
      // klien hanya melihat galat Postgres mentah, bukan pesan yang jelas.
      if (username !== undefined && (await userRepository.isUsernameTaken(username, id))) {
        return res.status(400).json({
          status: "error",
          code: "srv.username_sudah_digunakan_oleh",
          message: "Username sudah digunakan oleh akun lain.",
        });
      }
      if (email && (await userRepository.isEmailTaken(email, id))) {
        return res.status(400).json({
          status: "error",
          code: "srv.email_sudah_digunakan_oleh",
          message: "Email sudah digunakan oleh akun lain.",
        });
      }

      // Item #195 — snapshot SEBELUM update: aksi manajemen-user sebelumnya
      // tidak pernah tercatat di mana pun (hanya ActivityLogs Task yang
      // ditulis), jadi panel "Recent Activity" di Detail User selalu kosong
      // untuk perubahan seperti ini. Dicatat ke AuditLogs (tabel global,
      // sudah dipakai fitur "Audit Perusahaan") supaya konsisten dengan
      // aksi lain di aplikasi, bukan tabel baru.
      const oldUser = await userRepository.findByIdOrUid(id);

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

      createAuditLog({
        userId: currentUserId,
        projectId: null,
        actionType: "UPDATE",
        entityName: "User",
        entityId: id,
        oldValues: oldUser,
        newValues: { role, status, department, position, displayName, username, email, phone },
      });

      // Item #261 — Kirim email notifikasi aktivasi akun bila status berubah menjadi ACTIVE
      const isBeingActivated =
        oldUser &&
        String(oldUser.status || "").toLowerCase() !== "active" &&
        String(status || "").toLowerCase() === "active";

      if (isBeingActivated) {
        const targetEmail = email || oldUser.email;
        const targetUsername = username || oldUser.username || targetEmail;
        const targetName =
          displayName || oldUser.displayName || oldUser.nama_lengkap || targetUsername;

        if (targetEmail) {
          kirimEmailLatarBelakang(
            kirimEmailAktivasiAkun({
              email: targetEmail,
              username: targetUsername,
              nama: targetName,
            }),
            `Email aktivasi akun untuk ${targetEmail}`
          );
        }
      }

      res.json({ status: "success", code: "srv.user_updated", message: "User updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/users error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server_3",
        message: "Terjadi kesalahan internal server: " + error.message,
      });
    }
  }
);

router.delete(
  "/api/users/:id",
  authenticateJWT,
  verifyGlobalAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id || req.user?.uid;
      const oldUser = await userRepository.findByIdOrUid(id);

      /**
       * #190 — tiga penolakan sebelum menghapus.
       *
       * `verifyGlobalAdmin` di atas hanya menjawab "penghapusnya admin?",
       * bukan "yang dihapus boleh dihapus?". Sampai sebelum ini, admin bisa
       * menghapus AKUN DIRINYA SENDIRI. Dan karena barisnya sendiri berada di
       * urutan teratas tabel User Management, salah klik pada baris pertama
       * adalah kesalahan yang paling mungkin terjadi, bukan yang paling tidak
       * mungkin. Bila ia satu-satunya admin — keadaan nyata saat #190
       * dilaporkan, kartu ringkasan menunjukkan ADMINISTRATOR: 1 — seluruh
       * administrasi sistem terkunci tanpa jalan pemulihan lewat UI.
       */

      // (1) Menghapus yang tidak ada sebelumnya "berhasil" diam-diam: tanpa
      // baris ini `userRepository.delete()` tidak menghapus apa pun, audit log
      // tetap tertulis, dan klien menerima "User deleted" yang keliru.
      if (!oldUser) {
        return res.status(404).json({
          status: "error",
          code: "srv.user_not_found",
          message: "User not found",
        });
      }

      // (2) Tidak boleh menghapus akun sendiri. Dibandingkan lewat `oldUser`
      // dan bukan `id` mentah dari URL, sebab `findByIdOrUid` menerima id
      // MAUPUN uid — membandingkan `id` langsung akan meleset ketika yang satu
      // uid dan yang lain id, dan penjaganya diam-diam tidak berlaku.
      const iniAkunSendiri = [oldUser.id, oldUser.uid]
        .filter(Boolean)
        .map(String)
        .includes(String(currentUserId));
      if (iniAkunSendiri) {
        return res.status(400).json({
          status: "error",
          code: "srv.tidak_bisa_hapus_akun_sendiri",
          message: "Anda tidak bisa menghapus akun Anda sendiri.",
        });
      }

      // (3) Tidak boleh menghapus admin terakhir. Dengan (2) sudah berlaku,
      // kasus ini secara logika sulit tercapai lewat rute ini — penghapusnya
      // pasti admin, jadi kalau targetnya juga admin berarti ada minimal dua.
      // Tetap dipasang: ia tidak bergantung pada penalaran itu tetap benar
      // bila kelak muncul jalur hapus lain atau peran admin kedua.
      if (String(oldUser.role || "").toLowerCase() === "admin") {
        const semua = await userRepository.findAll();
        const jumlahAdmin = semua.filter(
          (u: any) => String(u.role || "").toLowerCase() === "admin"
        ).length;
        if (jumlahAdmin <= 1) {
          return res.status(400).json({
            status: "error",
            code: "srv.tidak_bisa_hapus_admin_terakhir",
            message: "Tidak bisa menghapus administrator terakhir yang tersisa.",
          });
        }
      }

      await userRepository.delete(id);

      createAuditLog({
        userId: currentUserId,
        projectId: null,
        actionType: "DELETE",
        entityName: "User",
        entityId: id,
        oldValues: oldUser,
        newValues: null,
      });

      res.json({ status: "success", code: "srv.user_deleted", message: "User deleted" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/users error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server_3",
        message: "Terjadi kesalahan internal server: " + error.message,
      });
    }
  }
);

router.put(
  "/api/profile/update",
  authenticateJWT,
  validasiBody(updateProfileSchema),
  async (req: AuthenticatedRequest, res: any) => {
    try {
      const userId = req.user?.id || req.user?.uid;
      if (!userId) {
        return res
          .status(401)
          .json({ status: "error", code: "srv.sesi_tidak_valid", message: "Sesi tidak valid." });
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
        return res
          .status(404)
          .json({ status: "error", code: "srv.user_not_found", message: "User not found" });
      }

      let newPasswordHash: string | undefined;
      if (currentPassword && newPassword) {
        // #241 — hash diminta TERPISAH, hanya di titik yang benar-benar
        // memverifikasinya. Sebelumnya ia menumpang di objek `user` hasil
        // `findByIdOrUid()`, dan objek itu juga dipakai `GET /api/users/:id`
        // yang memulangkannya utuh ke klien.
        const hashTersimpan = await userRepository.findPasswordHashById(id);
        const isValid = await verifyPassword(currentPassword, hashTersimpan || "");
        if (!isValid) {
          return res.status(400).json({
            status: "error",
            code: "srv.password_lama_yang_anda",
            message: "Password lama yang Anda masukkan salah!",
          });
        }
        newPasswordHash = hashPassword(newPassword);
      }

      const finalAvatar =
        effectiveAvatar !== undefined
          ? effectiveAvatar
          : user.avatar_url || user.photoURL || user.avatarUrl || null;

      // #178 — sama seperti PUT /api/users/:id: cegah bentrok eksplisit
      // sebelum UPDATE, supaya pesannya jelas alih-alih galat Postgres mentah.
      if (username !== undefined && (await userRepository.isUsernameTaken(username, id))) {
        return res.status(400).json({
          status: "error",
          code: "srv.username_sudah_digunakan_oleh",
          message: "Username sudah digunakan oleh akun lain.",
        });
      }
      if (email && (await userRepository.isEmailTaken(email, id))) {
        return res.status(400).json({
          status: "error",
          code: "srv.email_sudah_digunakan_oleh",
          message: "Email sudah digunakan oleh akun lain.",
        });
      }

      await userRepository.updateProfile(id, {
        displayName,
        username,
        email,
        phone,
        avatar: finalAvatar,
        newPasswordHash,
      });

      // Item #195 — self-service profile update juga tidak pernah tercatat
      // sebelumnya, sama seperti PUT /api/users/:id.
      createAuditLog({
        userId: id,
        projectId: null,
        actionType: "UPDATE",
        entityName: "User",
        entityId: id,
        oldValues: user,
        newValues: { displayName, username, email, phone, avatar: finalAvatar },
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
            user: {
              ...user,
              avatar_url: finalAvatar,
              photoURL: finalAvatar,
              avatarUrl: finalAvatar,
            },
          });
        }
      }

      res.json({ status: "success", code: "srv.profile_updated", message: "Profile updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/profile/update error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server_3",
        message: "Terjadi kesalahan internal server: " + error.message,
      });
    }
  }
);

export default router;
