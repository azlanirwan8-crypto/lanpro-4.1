/**
 * Rute notifikasi pengguna.
 *
 * Menggunakan notificationRepository dan userRepository.
 */
import express from "express";
import crypto from "crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { matchesCaller } from "../services/task.service";
import { notificationRepository } from "../repositories/notification.repository";
import { userRepository } from "../repositories/user.repository";
import { validasiQuery } from "../middleware/validate";
import { notificationsListQuerySchema } from "../schemas/session.schema";
import { verifyGlobalAdmin } from "../middleware/auth";
import db from "../../src/lib/db";

const router = express.Router();

/**
 * Item #258 — sisa #244 yang belum tertutup: batas laju.
 *
 * Dikunci ke SENDER yang terautentikasi (`req.user`), bukan ke IP seperti
 * `globalLimiter`/`loginLimiter` di `server.ts`. Menotifikasi orang lain
 * adalah tindakan PER PENGGUNA — mengunci ke IP akan membebani seluruh
 * kantor/NAT yang berbagi alamat yang sama, dan longgar untuk penyerang yang
 * gonta-ganti IP.
 *
 * 30/15 menit dipilih dari pemakaian sah yang ada: satu-satunya pemanggil di
 * `src/` adalah notifikasi @mention pada komentar, satu per pengguna yang
 * disebut per komentar — jauh di bawah 30 dalam keadaan normal.
 */
const notifikasiPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  /**
   * Bug ditemukan 29 Agu 2026 lewat `npm run dev` sungguhan — bukan lewat
   * test: `express-rate-limit` v8 MENOLAK `keyGenerator` yang jatuh ke
   * `req.ip` mentah, sebab alamat IPv6 punya banyak representasi string
   * untuk host yang sama dan itu bisa dipakai melewati batas laju. Ia
   * melempar `ValidationError` saat `rateLimit(...)` DIPANGGIL — bukan saat
   * ada permintaan — sehingga error-nya muncul di baris impor modul, dan
   * SELURUH `notifications.routes.ts` gagal dimuat sejak server dinyalakan.
   * `npx jest` tidak menangkapnya karena test memasang `req.user` manual di
   * setiap kasus; jalur fallback ke `req.ip` tidak pernah benar-benar
   * ditempuh di lingkungan test.
   */
  keyGenerator: (req: any) => req.user?.id || req.user?.uid || ipKeyGenerator(req.ip),
  message: {
    status: "error",
    code: "srv.notifikasi_terlalu_sering",
    message: "Terlalu banyak notifikasi dikirim. Silakan coba lagi dalam 15 menit.",
  },
});

/**
 * Item #258 — sisa #244: "tanpa cek peran". Satu-satunya dua pemanggil sah di
 * `src/` (`AppContainer.tsx:2638`, `:3415`) memakai `type` ini persis. Bukan
 * daftar sembarang: memperluasnya berarti menambah jalur yang bisa dipakai
 * mengaku sebagai notifikasi sistem/keamanan.
 */
const TIPE_AMAN_PENGIRIM_BUKAN_ADMIN = new Set(["mention", "bug_retest"]);

router.get(
  "/api/users/:userId/notifications",
  validasiQuery(notificationsListQuerySchema),
  async (req, res) => {
    try {
      const activeUser = (req as any).user;
      if (!activeUser) {
        return res.status(401).json({
          status: "error",
          code: "srv.akses_tidak_sah_sesi",
          message: "Akses tidak sah: Sesi tidak valid atau belum login.",
        });
      }

      const activeUserId = activeUser.id || activeUser.uid;
      const requesterRole = activeUser.role || "user";

      let targetUserId = activeUserId;
      if (requesterRole === "admin") {
        targetUserId = req.params.userId || activeUserId;
      }

      const uCheck = await userRepository.findByIdOrUid(targetUserId);

      let userIds = [targetUserId];
      let dbUserId = targetUserId;
      let firebaseUid = targetUserId;
      let userDisplayName = "";
      let userUsername = "";
      let globalRole = "user";

      if (uCheck) {
        userIds = [uCheck.id, uCheck.uid || ""].filter(Boolean);
        dbUserId = uCheck.id;
        firebaseUid = uCheck.uid || uCheck.id;
        userDisplayName = uCheck.displayName || "";
        userUsername = uCheck.username || "";
        globalRole = uCheck.role || "user";
      }

      const { projectRoles } = await userRepository.getUserProjectRoles(dbUserId, firebaseUid);

      const rows = await notificationRepository.findRawNotificationsForUserIds(userIds);

      const filteredNotifications = rows.filter((row: any) => {
        const projId = row.taskProjectId || row.meetingProjectId || row.activityProjectId || null;

        const isAdminGlobally = globalRole === "admin";
        const roleInProject = projId ? projectRoles[projId] : null;
        const isProjectAdmin = roleInProject === "admin";
        const isUserAdmin = isAdminGlobally || isProjectAdmin;

        const isAssignee = row.assigneeId === dbUserId || row.assigneeId === firebaseUid;
        const isCreator = row.reporterId === dbUserId || row.reporterId === firebaseUid;
        const isParentEpicReporter =
          row.parentTaskReporterId &&
          (row.parentTaskReporterId === dbUserId || row.parentTaskReporterId === firebaseUid);

        const isTargetAksi =
          isAssignee ||
          (userDisplayName && row.message && row.message.includes(userDisplayName)) ||
          (userUsername && row.message && row.message.includes(userUsername));

        const isMentioned =
          (userUsername &&
            row.message &&
            row.message.toLowerCase().includes("@" + userUsername.toLowerCase())) ||
          (userDisplayName &&
            row.message &&
            row.message.toLowerCase().includes("@" + userDisplayName.toLowerCase()));

        const hasDirectContext =
          isAssignee || isCreator || isParentEpicReporter || isTargetAksi || isMentioned;

        if (!projId) {
          const isProjectOrTaskRelated =
            row.type === "project_activity" ||
            row.type === "task" ||
            row.type === "meeting" ||
            (row.title &&
              (row.title.toLowerCase().includes("proyek") ||
                row.title.toLowerCase().includes("project") ||
                row.title.toLowerCase().includes("tugas") ||
                row.title.toLowerCase().includes("task"))) ||
            (row.message &&
              (row.message.toLowerCase().includes("proyek") ||
                row.message.toLowerCase().includes("project") ||
                row.message.toLowerCase().includes("tugas") ||
                row.message.toLowerCase().includes("task")));

          if (isProjectOrTaskRelated) {
            if (isUserAdmin) {
              return true;
            }
            return hasDirectContext;
          }

          return true;
        }

        if (isUserAdmin) {
          return true;
        }

        if (!roleInProject) {
          return false;
        }

        if (roleInProject === "viewer") {
          return isMentioned;
        }

        if (roleInProject === "qa") {
          const isQAStatus =
            row.taskStatus &&
            (row.taskStatus.toLowerCase() === "ready for qa" ||
              row.taskStatus.toLowerCase() === "testing" ||
              row.taskStatus.toLowerCase() === "uat");
          return hasDirectContext || isQAStatus;
        }

        return hasDirectContext;
      });

      res.json({ status: "success", data: filteredNotifications.slice(0, 50) });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/users/:userId/notifications error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.post("/api/users/:userId/notifications", notifikasiPostLimiter, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { type, title, message, relatedId, read } = req.body;

    /**
     * Item #258 — sisa #244: "tanpa cek peran, tanpa cek kepemilikan". Sebelum
     * perbaikan ini, `senderId` boleh `null` dan permintaan tetap diproses —
     * satu-satunya yang mencegah pengiriman anonim adalah gerbang auth GLOBAL
     * di `server.ts`, bukan rute ini sendiri. GET di atas memeriksa ini
     * eksplisit; POST tidak, dan itu bukan cacat kosmetik: bila gerbang
     * global suatu saat dilonggarkan untuk jalur ini (mis. ditambah ke
     * RUTE_PUBLIK karena kekeliruan), rute ini akan tetap menerima pengirim
     * anonim tanpa ada yang menyadarinya di sini.
     */
    const senderId = req.user?.id || req.user?.uid || null;
    if (!senderId) {
      return res.status(401).json({
        status: "error",
        code: "srv.akses_tidak_sah_sesi",
        message: "Akses tidak sah: Sesi tidak valid atau belum login.",
      });
    }

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        status: "error",
        code: "srv.id_penerima_tidak_valid",
        message: "ID penerima tidak valid.",
      });
    }

    const recipient = await userRepository.findByIdOrUid(userId);
    if (!recipient) {
      return res.status(404).json({
        status: "error",
        code: "srv.pengguna_tidak_ditemukan",
        message: "Pengguna tidak ditemukan.",
      });
    }

    if (recipient.status === "inactive" || recipient.status === "suspended") {
      return res.status(400).json({
        status: "error",
        code: "srv.pengguna_tidak_aktif",
        message: "Pengguna penerima notifikasi tidak aktif.",
      });
    }

    if (title && typeof title === "string" && title.length > 200) {
      return res.status(400).json({
        status: "error",
        code: "srv.judul_terlalu_panjang",
        message: "Judul notifikasi terlalu panjang (maksimum 200 karakter).",
      });
    }

    if (message && typeof message === "string" && message.length > 2000) {
      return res.status(400).json({
        status: "error",
        code: "srv.pesan_notifikasi_terlalu_panjang",
        message: "Pesan notifikasi terlalu panjang (maksimum 2000 karakter).",
      });
    }

    /**
     * Item #258 — sisa #244: "tanpa cek peran". Pengirim non-admin yang
     * menotifikasi PENGGUNA LAIN (bukan dirinya sendiri) dibatasi ke
     * `TIPE_AMAN_PENGIRIM_BUKAN_ADMIN`. Ini menutup dua hal sekaligus:
     *
     *   - default lama `type` jatuh ke `"system"` bila tidak dikirim —
     *     sekarang non-admin yang menotifikasi orang lain WAJIB
     *     mencantumkan tipe dari daftar aman, tidak bisa mengandalkan
     *     default itu untuk terlihat seperti pesan sistem.
     *   - non-admin tidak bisa mengarang `type` bebas (mis. "security_alert",
     *     "password_reset") untuk membuat notifikasinya terlihat resmi.
     *
     * Menotifikasi DIRI SENDIRI (userId === senderId) dan pengirim BERPERAN
     * ADMIN keduanya dikecualikan — mengunci admin ke daftar yang sama akan
     * mematahkan kasus pakai admin yang sah (mis. broadcast) tanpa menutup
     * risiko baru: admin sudah dipercaya untuk tindakan yang lebih berat.
     *
     * Diletakkan PALING AKHIR dari seluruh pemeriksaan bentuk permintaan
     * (eksistensi penerima, status, panjang judul/pesan): tiga test lama
     * (#244) mengirim permintaan tanpa `type` sama sekali sambil menguji
     * kesalahan BENTUK lain (penerima hilang, tidak aktif, teks kepanjangan),
     * dan urutan ini memastikan kesalahan bentuknya tetap terlihat sebagai
     * kesalahan bentuk (404/400) — bukan tertutupi jadi 403 otorisasi hanya
     * karena kebetulan `type` juga tidak disertakan.
     */
    const requesterRole = req.user?.role || "user";
    const menotifikasiOrangLain = userId !== senderId;
    if (
      menotifikasiOrangLain &&
      requesterRole !== "admin" &&
      (typeof type !== "string" || !TIPE_AMAN_PENGIRIM_BUKAN_ADMIN.has(type.trim()))
    ) {
      return res.status(403).json({
        status: "error",
        code: "srv.tipe_notifikasi_tidak_diizinkan",
        message: "Anda tidak diizinkan mengirim notifikasi jenis ini ke pengguna lain.",
      });
    }

    const newId = crypto.randomUUID();
    const finalRecipientId = recipient.id || userId;

    await notificationRepository.create({
      id: newId,
      recipientId: finalRecipientId,
      senderId: senderId || null,
      title: title && typeof title === "string" ? title.trim() : "New Notification",
      message: message && typeof message === "string" ? message.trim() : "",
      type: type && typeof type === "string" ? type.trim() : "system",
      relatedId: relatedId || null,
      read: read ? true : false,
    });

    res.json({
      status: "success",
      data: {
        id: newId,
        type: type && typeof type === "string" ? type.trim() : "system",
        title: title && typeof title === "string" ? title.trim() : "New Notification",
        message: message && typeof message === "string" ? message.trim() : "",
        relatedId: relatedId || null,
        senderId: senderId || null,
        read: read ? true : false,
      },
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: POST /api/users/:userId/notifications error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

router.put("/api/users/:userId/notifications/:id", async (req: any, res) => {
  try {
    const { userId, id } = req.params;
    const { read } = req.body;

    if (!matchesCaller(req.user, userId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_anda_hanya_4",
        message: "Akses ditolak: Anda hanya dapat mengubah notifikasi milik Anda sendiri.",
      });
    }

    const recipientId = await notificationRepository.findRecipientIdById(id);
    if (!recipientId) {
      return res.status(404).json({
        status: "error",
        code: "srv.notifikasi_tidak_ditemukan",
        message: "Notifikasi tidak ditemukan.",
      });
    }
    if (!matchesCaller(req.user, recipientId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_notifikasi_ini",
        message: "Akses ditolak: notifikasi ini bukan milik Anda.",
      });
    }

    await notificationRepository.setRead(id, read ? true : false);

    res.json({
      status: "success",
      code: "srv.notification_updated",
      message: "Notification updated",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: PUT /api/users/:userId/notifications/:id error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/**
 * Menghapus satu notifikasi — item #248.
 *
 * SIAPA YANG BOLEH: penerimanya saja. Bukan pengirimnya — sekali sebuah
 * notifikasi sampai, ia milik kotak masuk penerima, dan pengirim yang bisa
 * menariknya kembali berarti bisa menghapus jejak apa yang pernah ia kirim.
 *
 * PENJAGANYA DISALIN PERSIS DARI `PUT` DI ATAS, dua lapis: parameter `:userId`
 * harus si pemanggil, DAN `recipientId` yang tersimpan harus si pemanggil juga.
 * Lapis kedua yang benar-benar menutup: tanpa ia, memanggil
 * `/api/users/<id-saya>/notifications/<id-punya-orang-lain>` lolos lapis
 * pertama. Dua lapis ini bukan hiasan — persis bentuk itulah yang membuat
 * `PUT`-nya sudah aman sejak awal sementara `POST`-nya tidak (#244).
 */
router.delete("/api/users/:userId/notifications/:id", async (req: any, res) => {
  try {
    const { userId, id } = req.params;

    if (!matchesCaller(req.user, userId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_hapus_notifikasi",
        message: "Akses ditolak: Anda hanya dapat menghapus notifikasi milik Anda sendiri.",
      });
    }

    const recipientId = await notificationRepository.findRecipientIdById(id);
    if (!recipientId) {
      return res.status(404).json({
        status: "error",
        code: "srv.notifikasi_tidak_ditemukan",
        message: "Notifikasi tidak ditemukan.",
      });
    }
    if (!matchesCaller(req.user, recipientId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_notifikasi_ini",
        message: "Akses ditolak: notifikasi ini bukan milik Anda.",
      });
    }

    await notificationRepository.delete(id);

    res.json({
      status: "success",
      code: "srv.notification_deleted",
      message: "Notification deleted",
    });
  } catch (error: any) {
    console.error(
      "LOG ANOMALI CRITICAL: DELETE /api/users/:userId/notifications/:id error:",
      error
    );
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/** #345 — preferensi notifikasi minimal (due reminder). */
router.get("/api/profile/notif-prefs", async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        code: "srv.sesi_tidak_valid",
        message: "Sesi tidak valid.",
      });
    }
    const user = await userRepository.findByIdOrUid(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: "srv.user_not_found",
        message: "User not found",
      });
    }
    const dueReminder = user.notifDueReminder !== false;
    res.json({ status: "success", data: { dueReminder } });
  } catch (error: any) {
    console.error("GET /api/profile/notif-prefs error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal memuat preferensi notifikasi",
    });
  }
});

router.patch("/api/profile/notif-prefs", async (req: any, res) => {
  let conn;
  try {
    const userId = req.user?.id || req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        status: "error",
        code: "srv.sesi_tidak_valid",
        message: "Sesi tidak valid.",
      });
    }
    if (typeof req.body?.dueReminder !== "boolean") {
      return res.status(400).json({
        status: "error",
        message: "dueReminder harus boolean",
      });
    }
    const user = await userRepository.findByIdOrUid(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        code: "srv.user_not_found",
        message: "User not found",
      });
    }
    conn = await db.getConnection();
    await conn.query('UPDATE Users SET "notifDueReminder" = ? WHERE id = ?', [
      req.body.dueReminder,
      user.id,
    ]);
    res.json({ status: "success", data: { dueReminder: req.body.dueReminder } });
  } catch (error: any) {
    console.error("PATCH /api/profile/notif-prefs error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal menyimpan preferensi notifikasi",
    });
  } finally {
    if (conn) conn.release();
  }
});

/** #345 — inventaris gagal kirim (admin). */
router.get("/api/admin/notification-failures", verifyGlobalAdmin, async (_req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const [rows]: any = await conn.query(
      "SELECT id, channel, context, recipient_id, related_id, error_message, created_at FROM NotificationDeliveryFailures ORDER BY created_at DESC LIMIT 50"
    );
    res.json({ status: "success", data: rows || [] });
  } catch (error: any) {
    console.error("GET /api/admin/notification-failures error:", error);
    res.status(500).json({
      status: "error",
      message: error?.message || "Gagal memuat log gagal notifikasi",
    });
  } finally {
    if (conn) conn.release();
  }
});

export default router;
