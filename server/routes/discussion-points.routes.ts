/**
 * Rute discussion point sebuah rapat, beserta komentarnya.
 *
 * Menggunakan discussionPointsRepository untuk operasi data.
 */
import { Router } from "express";
import crypto from "crypto";
import { jagaProyek } from "../middleware/jagaProyek";
import { discussionPointsRepository } from "../repositories/discussion-points.repository";
import { matchesCaller } from "../services/task.service";
import { validasiBody } from "../middleware/validate";
import {
  createDiscussionPointSchema,
  updateDiscussionPointSchema,
  createCommentSchema,
  updateCommentSchema,
} from "../schemas/discussion-points.schema";

const router = Router();

/**
 * Penulis sebuah titik diskusi atau komentar, diambil dari TOKEN — item #248 & #251.
 *
 * Dulu `authorId`/`userId` dibaca dari body dengan cadangan header `x-user-id` lalu
 * `"guest"`, jadi penulisnya bisa ditulis sendiri oleh pemanggil. Mengambil penulis
 * langsung dari token mencegah pemalsuan kepemilikan.
 */
const penulisDari = (req: any) => ({
  id: String(req.user?.id || req.user?.uid || ""),
  nama: req.user?.displayName || req.user?.username || "Member",
});

// Discussion Points API
router.get(
  "/api/projects/:projectId/meetings/:id/discussionPoints",
  jagaProyek("meetingNotes", "R"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await discussionPointsRepository.findByMeetingId(id);
      res.json({ status: "success", data: rows });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.post(
  "/api/projects/:projectId/meetings/:id/discussionPoints",
  jagaProyek("meetingNotes", "C"),
  validasiBody(createDiscussionPointSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        parentPointId,
        assignTo,
        concern,
        fitur,
        system,
        surrounding,
        keterangan,
        tindakanLanjut,
        status,
        targetDate,
        tanggalUpdateStatus,
      } = req.body || {};
      const effectiveAuthorId = penulisDari(req).id || "guest";
      const newId = crypto.randomUUID();

      await discussionPointsRepository.createPoint({
        id: newId,
        meetingId: id,
        parentPointId: parentPointId || null,
        authorId: effectiveAuthorId,
        assignTo: assignTo || null,
        concern: concern || null,
        fitur: fitur || null,
        system: system || null,
        surrounding: surrounding || null,
        keterangan: keterangan || null,
        tindakanLanjut: tindakanLanjut || null,
        status: status || "pending",
        targetDate: targetDate || null,
        tanggalUpdateStatus: tanggalUpdateStatus || null,
      });

      res.json({ status: "success", data: { id: newId, meetingId: id } });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.put(
  "/api/projects/:projectId/meetings/:id/discussionPoints/:pointId",
  jagaProyek("meetingNotes", "U"),
  validasiBody(updateDiscussionPointSchema),
  async (req, res) => {
    try {
      const { pointId } = req.params;
      const {
        parentPointId,
        assignTo,
        concern,
        fitur,
        system,
        surrounding,
        keterangan,
        tindakanLanjut,
        status,
        targetDate,
        tanggalUpdateStatus,
      } = req.body;

      await discussionPointsRepository.updatePoint(pointId, {
        parentPointId,
        assignTo,
        concern,
        fitur,
        system,
        surrounding,
        keterangan,
        tindakanLanjut,
        status,
        targetDate,
        tanggalUpdateStatus,
      });

      res.json({ status: "success", code: "srv.point_updated", message: "Point updated" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.delete(
  "/api/projects/:projectId/meetings/:id/discussionPoints/:pointId",
  jagaProyek("meetingNotes", "D"),
  async (req, res) => {
    try {
      const { pointId } = req.params;
      await discussionPointsRepository.deletePoint(pointId);
      res.json({ status: "success", code: "srv.point_deleted", message: "Point deleted" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

// DISCUSSION POINT THREADED COMMENTS API
const getCommentsHandler = async (req: any, res: any) => {
  try {
    const pointId = req.params.pointId || req.params.id;
    const rows = await discussionPointsRepository.findCommentsByPointId(pointId);
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      status: "error",
      code: "srv.failed_to_fetch_comments",
      message: "Failed to fetch comments: " + error.message,
    });
  }
};

const postCommentHandler = async (req: any, res: any) => {
  try {
    const pointId = req.params.pointId || req.params.id;
    const { commentText } = req.body;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        status: "error",
        code: "srv.teks_komentar_wajib_diisi",
        message: "Teks komentar wajib diisi.",
      });
    }

    const commentId = crypto.randomUUID();
    const penulis = penulisDari(req);
    const createdAt = new Date().toISOString();

    const created = await discussionPointsRepository.createComment({
      id: commentId,
      pointId,
      userId: penulis.id,
      userName: penulis.nama,
      commentText: commentText.trim(),
      createdAt,
    });

    res.status(201).json({
      status: "success",
      data: created,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      status: "error",
      code: "srv.failed_to_add_comment",
      message: "Failed to add comment: " + error.message,
    });
  }
};

/**
 * Menyunting satu komentar — item #248.
 *
 * SIAPA YANG BOLEH: PENULISNYA SAJA, meski matriks memberi peran lain aksi `U`
 * pada `meetingNotes`. Menyunting berbeda sifat dari menghapus: manajer yang
 * menulis ulang kalimat Anda dan membiarkannya tetap bernama Anda lebih buruk
 * daripada manajer yang menghapusnya — yang pertama memalsukan, yang kedua
 * sekadar meniadakan. Jadi penjaga matriks menjawab "boleh menyentuh modul
 * ini?", dan pemeriksaan penulis di dalam handler menjawab "boleh menyentuh
 * kalimat SIAPA?". Keduanya diperlukan.
 *
 * Hanya `commentText` yang boleh berubah. `userId`, `userName`, dan `createdAt`
 * tidak ikut, supaya menyunting tidak bisa dipakai untuk berpindah kepemilikan.
 */
const putCommentHandler = async (req: any, res: any) => {
  try {
    const { commentId } = req.params;
    const { commentText } = req.body;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({
        status: "error",
        code: "srv.teks_komentar_wajib_diisi",
        message: "Teks komentar wajib diisi.",
      });
    }

    const pemilik = await discussionPointsRepository.findCommentOwnerId(commentId);
    if (!pemilik) {
      return res.status(404).json({
        status: "error",
        code: "srv.komentar_tidak_ditemukan",
        message: "Komentar tidak ditemukan.",
      });
    }

    if (!matchesCaller(req.user, pemilik)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_hanya_penulis",
        message: "Akses ditolak: hanya penulis komentar yang dapat menyuntingnya.",
      });
    }

    await discussionPointsRepository.updateComment(commentId, commentText.trim());
    res.json({
      status: "success",
      code: "srv.comment_updated",
      message: "Comment updated",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: PUT komentar discussion point error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
};

/**
 * Menghapus satu komentar — item #248.
 *
 * SIAPA YANG BOLEH: siapa pun yang punya aksi `D` pada `meetingNotes` di proyek
 * itu — penjaga matriksnya yang menjawab, bukan daftar peran di sini (§19.7,
 * yang menutup #66 dan #72 secara struktural). Penulisnya sendiri termasuk,
 * SELAMA perannya punya `D`.
 *
 * ⚠️ BATAS YANG DIKETAHUI, ditulis supaya tidak ditemukan ulang: `system_analyst`
 * dan `qa` punya `C, R, U` tetapi TIDAK punya `D` pada `meetingNotes`. Keduanya
 * karena itu bisa menulis komentar tetapi tidak bisa menghapus komentarnya
 * sendiri. Membuka itu berarti mengubah `MATRIKS_PROYEK` — ketetapan §19 yang
 * milik pemilik proyek, bukan efek samping yang boleh saya selipkan di sini.
 *
 * Hapus keras, alasan yang sama seperti `chat`: repo ini belum punya konsep
 * soft-delete, dan memperkenalkannya lewat satu tabel akan membuat setiap kueri
 * lama yang lupa menyaring menampilkan data yang penggunanya yakin sudah hilang.
 */
const deleteCommentHandler = async (req: any, res: any) => {
  try {
    const { commentId } = req.params;

    const pemilik = await discussionPointsRepository.findCommentOwnerId(commentId);
    if (!pemilik) {
      return res.status(404).json({
        status: "error",
        code: "srv.komentar_tidak_ditemukan",
        message: "Komentar tidak ditemukan.",
      });
    }

    await discussionPointsRepository.deleteComment(commentId);
    res.json({
      status: "success",
      code: "srv.comment_deleted",
      message: "Comment deleted",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: DELETE komentar discussion point error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
};

router.get(
  "/api/discussion-points/:pointId/comments",
  jagaProyek("meetingNotes", "R", "discussionPoint"),
  getCommentsHandler
);
router.get(
  "/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments",
  jagaProyek("meetingNotes", "R"),
  getCommentsHandler
);
router.post(
  "/api/discussion-points/:pointId/comments",
  jagaProyek("meetingNotes", "C", "discussionPoint"),
  validasiBody(createCommentSchema),
  postCommentHandler
);
router.post(
  "/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments",
  jagaProyek("meetingNotes", "C"),
  validasiBody(createCommentSchema),
  postCommentHandler
);

// Sunting & hapus komentar — item #248. Dua bentuk jalur untuk masing-masing,
// sama seperti GET dan POST di atas: bentuk berlingkup proyek dipakai layar
// Catatan Rapat, bentuk pendek dipakai pemanggil yang cuma memegang id titik
// diskusinya. Yang pendek menurunkan proyeknya lewat entitas `discussionPoint`,
// jadi penjaga matriksnya tetap yang menjawab — bukan penjaga yang lebih longgar.
router.put(
  "/api/discussion-points/:pointId/comments/:commentId",
  jagaProyek("meetingNotes", "U", "discussionPoint"),
  validasiBody(updateCommentSchema),
  putCommentHandler
);
router.put(
  "/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments/:commentId",
  jagaProyek("meetingNotes", "U"),
  validasiBody(updateCommentSchema),
  putCommentHandler
);
router.delete(
  "/api/discussion-points/:pointId/comments/:commentId",
  jagaProyek("meetingNotes", "D", "discussionPoint"),
  deleteCommentHandler
);
router.delete(
  "/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments/:commentId",
  jagaProyek("meetingNotes", "D"),
  deleteCommentHandler
);

export default router;
