/**
 * Rute dokumen proyek: daftar, unduh, unggah, ubah, dan hapus.
 *
 * Menggunakan documentRepository untuk operasi basis data.
 */
import { Router } from "express";
import crypto from "crypto";
import { jagaProyek } from "../middleware/jagaProyek";
import { documentRepository } from "../repositories/document.repository";

const router = Router();

router.get("/api/projects/:projectId/documents", jagaProyek("wiki", "R"), async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await documentRepository.findByProjectId(projectId);
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
  }
});

router.get(
  "/api/projects/:projectId/documents/:id/download",
  jagaProyek("wiki", "R"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const file = await documentRepository.getFileAndIncrementDownload(id);
      if (file) {
        res.json({ status: "success", data: file });
      } else {
        const { getDbMode } = await import("../../src/lib/db");
        res.status(404).json({
          status: "error",
          message: "Document not found. id: " + id + ", mode: " + getDbMode(),
        });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.post(
  "/api/projects/:projectId/documents",
  jagaProyek("wiki", "C"),
  async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, type, link, fileData, fileName, fileType, createdBy } = req.body;
      const currentUserId = req.user?.id || req.user?.uid || createdBy || "guest";
      const newId = crypto.randomUUID();

      await documentRepository.create({
        id: newId,
        projectId,
        title,
        description: description || null,
        type: type || null,
        link: link || null,
        fileData: fileData || null,
        fileName: fileName || null,
        fileType: fileType || null,
        createdBy: currentUserId,
      });

      res.json({
        status: "success",
        data: {
          id: newId,
          projectId,
          title,
          description,
          type,
          link,
          fileName,
          fileType,
          createdBy: currentUserId,
        },
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.put(
  "/api/projects/:projectId/documents/:id",
  jagaProyek("wiki", "U"),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const item = await documentRepository.findById(id);
      if (!item) {
        return res.status(404).json({ status: "error", message: "Document not found" });
      }

      const currentUserId = req.user?.id || req.user?.uid || req.headers["x-user-id"];
      const userRole = (req.user?.role || req.user?.system_role || "").toUpperCase();
      const isAdmin = userRole === "ADMIN";
      const authorId = item.createdBy || (item as any).author_id || (item as any).authorId;
      const isAuthor = authorId === currentUserId;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({
          status: "error",
          error: "Akses ditolak: Anda hanya diizinkan untuk melihat data ini.",
        });
      }

      const { title, description, type, link, fileData, fileName, fileType } = req.body;

      await documentRepository.update(id, {
        title,
        description,
        type,
        link,
        fileData,
        fileName,
        fileType,
      });

      res.json({ status: "success", message: "Document updated" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.delete(
  "/api/projects/:projectId/documents/:id",
  jagaProyek("wiki", "D"),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const item = await documentRepository.findById(id);
      if (!item) {
        return res.status(404).json({ status: "error", message: "Document not found" });
      }

      const currentUserId = req.user?.id || req.user?.uid || req.headers["x-user-id"];
      const userRole = (req.user?.role || req.user?.system_role || "").toUpperCase();
      const isAdmin = userRole === "ADMIN";
      const authorId = item.createdBy || (item as any).author_id || (item as any).authorId;
      const isAuthor = authorId === currentUserId;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({
          status: "error",
          error: "Akses ditolak: Anda hanya diizinkan untuk melihat data ini.",
        });
      }

      await documentRepository.delete(id);
      res.json({ status: "success", message: "Document deleted" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

export default router;
