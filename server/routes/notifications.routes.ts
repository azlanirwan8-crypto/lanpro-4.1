/**
 * Rute notifikasi pengguna.
 *
 * Menggunakan notificationRepository dan userRepository.
 */
import express from "express";
import crypto from "crypto";
import { matchesCaller } from "../services/task.service";
import { notificationRepository } from "../repositories/notification.repository";
import { userRepository } from "../repositories/user.repository";

const router = express.Router();

router.get("/api/users/:userId/notifications", async (req, res) => {
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
});

router.post("/api/users/:userId/notifications", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { type, title, message, relatedId, read } = req.body;
    const senderId = req.user?.id || req.user?.uid || null;

    const newId = crypto.randomUUID();

    await notificationRepository.create({
      id: newId,
      recipientId: userId,
      senderId: senderId || null,
      title: title || "New Notification",
      message: message || "",
      type: type || "system",
      relatedId: relatedId || null,
      read: read ? true : false,
    });

    res.json({
      status: "success",
      data: { id: newId, type, title, message, relatedId, senderId, read },
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

export default router;
