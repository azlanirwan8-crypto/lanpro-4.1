/**
 * Rute discussion point sebuah rapat, beserta komentarnya.
 *
 * Menggunakan discussionPointsRepository untuk operasi data.
 */
import { Router } from "express";
import crypto from "crypto";
import { jagaProyek } from "../middleware/jagaProyek";
import { discussionPointsRepository } from "../repositories/discussion-points.repository";

const router = Router();

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
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.post(
  "/api/projects/:projectId/meetings/:id/discussionPoints",
  jagaProyek("meetingNotes", "C"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        parentPointId,
        authorId,
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
      const effectiveAuthorId = authorId || req.headers["x-user-id"] || "guest";
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
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.put(
  "/api/projects/:projectId/meetings/:id/discussionPoints/:pointId",
  jagaProyek("meetingNotes", "U"),
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

      res.json({ status: "success", message: "Point updated" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
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
      res.json({ status: "success", message: "Point deleted" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
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
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch comments: " + error.message });
  }
};

const postCommentHandler = async (req: any, res: any) => {
  try {
    const pointId = req.params.pointId || req.params.id;
    const { userId, userName, commentText } = req.body;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({ status: "error", message: "Teks komentar wajib diisi." });
    }

    const commentId = crypto.randomUUID();
    const effectiveUserId = userId || req.headers["x-user-id"] || "guest";
    const effectiveUserName = userName || "Member";
    const createdAt = new Date().toISOString();

    const created = await discussionPointsRepository.createComment({
      id: commentId,
      pointId,
      userId: effectiveUserId,
      userName: effectiveUserName,
      commentText: commentText.trim(),
      createdAt,
    });

    res.status(201).json({
      status: "success",
      data: created,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Failed to add comment: " + error.message });
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
  postCommentHandler
);
router.post(
  "/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments",
  jagaProyek("meetingNotes", "C"),
  postCommentHandler
);

export default router;
