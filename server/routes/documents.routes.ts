/**
 * Rute dokumen proyek: daftar, unduh, unggah, ubah, dan hapus.
 *
 * Menggunakan documentRepository untuk operasi basis data.
 */
import { Router } from "express";
import crypto from "crypto";
import { jagaProyek } from "../middleware/jagaProyek";
import { documentRepository } from "../repositories/document.repository";
import { validasiBody, validasiQuery } from "../middleware/validate";
import { createDocumentSchema, updateDocumentSchema } from "../schemas/document.schema";
import { documentListQuerySchema } from "../schemas/pagination.schema";
import { respondWithProjectList } from "../lib/listResponse";

const router = Router();

router.get(
  "/api/projects/:projectId/documents",
  jagaProyek("wiki", "R"),
  validasiQuery(documentListQuerySchema),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const search = req.query.search as string | undefined;
      const type = req.query.type as string | undefined;
      await respondWithProjectList(
        res,
        req.query as Record<string, unknown>,
        () => documentRepository.findByProjectId(projectId, search, type),
        (pagination) => documentRepository.findByProjectIdPaged(projectId, pagination, search, type)
      );
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
          code: "srv.document_not_found_id",
          message: "Document not found. id: " + id + ", mode: " + getDbMode(),
        });
      }
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
  "/api/projects/:projectId/documents",
  jagaProyek("wiki", "C"),
  validasiBody(createDocumentSchema),
  async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const {
        title,
        description,
        type,
        link,
        fileData,
        fileName,
        fileType,
        canvasData,
        category,
        createdBy,
      } = req.body;
      // Item #268 — id dan nama pembuat disimpan TERPISAH.
      //
      // Sebelumnya keduanya berebut satu kolom: klien mengirim `createdBy`
      // berisi nama tampilan, lalu baris ini menimpanya dengan id sesi. Nama
      // pembuat karena itu tidak pernah sampai ke basis data, dan frontend
      // terpaksa menebak — `isAuthor()` mencocokkan satu nilai tersimpan ke
      // ENAM field identitas sekaligus (id/uid/username/email/name/
      // displayName). Tebakan itu gagal secara TIDAK KONSISTEN begitu format
      // yang tersimpan berbeda dari field yang kebetulan ada di sesi, dan
      // ketika gagal tombol Edit/Hapus flowchart hilang tanpa pesan apa pun —
      // kanvasnya terbuka baca-saja, yang oleh pemilik proyek terbaca sebagai
      // "klik edit malah ke detail".
      //
      // Id tetap yang menentukan otorisasi (tidak berubah saat pengguna ganti
      // nama tampilan); nama hanya untuk ditampilkan.
      const currentUserId = req.user?.id || req.user?.uid || "guest";
      const currentUserName = req.user?.displayName || req.user?.username || createdBy || null;
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
        canvasData: canvasData || null,
        category: category || null,
        createdBy: currentUserId,
        createdByName: currentUserName,
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
          createdByName: currentUserName,
        },
      });
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
  "/api/projects/:projectId/documents/:id",
  jagaProyek("wiki", "U"),
  validasiBody(updateDocumentSchema),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const item = await documentRepository.findById(id);
      if (!item) {
        return res
          .status(404)
          .json({ status: "error", code: "srv.document_not_found", message: "Document not found" });
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

      const { title, description, type, link, fileData, fileName, fileType, canvasData, category } =
        req.body;

      await documentRepository.update(id, {
        title,
        description,
        type,
        link,
        fileData,
        fileName,
        fileType,
        canvasData,
        category,
      });

      res.json({ status: "success", code: "srv.document_updated", message: "Document updated" });
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
  "/api/projects/:projectId/documents/:id",
  jagaProyek("wiki", "D"),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const item = await documentRepository.findById(id);
      if (!item) {
        return res
          .status(404)
          .json({ status: "error", code: "srv.document_not_found", message: "Document not found" });
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
      res.json({ status: "success", code: "srv.document_deleted", message: "Document deleted" });
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

export default router;
