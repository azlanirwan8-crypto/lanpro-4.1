import { Response, NextFunction } from "express";
import db from "../../src/lib/db";
import { bolehDiSistem } from "../../src/lib/matriksAkses";

/**
 * Otorisasi baca audit log (#314).
 * Admin dan peran sistem dengan auditLog:R boleh tanpa projectId.
 * Selain itu wajib projectId dan keanggotaan proyek.
 */
export async function jagaAuditLogBaca(req: any, res: Response, next: NextFunction) {
  const peran = req.user?.role;
  if (peran === "admin" || bolehDiSistem(peran, "auditLog", "R")) {
    return next();
  }

  const projectId = req.query?.projectId as string | undefined;
  if (!projectId) {
    return res.status(403).json({
      status: "error",
      code: "srv.akses_ditolak_project_id_wajib",
      message: "Akses ditolak: projectId wajib disertakan.",
    });
  }

  const requesterId = req.user?.id || req.user?.uid;
  if (!requesterId) {
    return res.status(401).json({
      status: "error",
      code: "srv.akses_ditolak_token_autentikasi",
      message: "Akses ditolak: Token autentikasi tidak ditemukan.",
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    const [requesterRows]: any = await connection.query(
      "SELECT id FROM Users WHERE id = ? OR uid = ?",
      [requesterId, requesterId]
    );
    const resolvedId = requesterRows[0]?.id || requesterId;

    const [proj]: any = await connection.query("SELECT ownerId FROM Projects WHERE id = ?", [
      projectId,
    ]);
    if (!proj?.length) {
      return res.status(404).json({
        status: "error",
        code: "srv.proyek_tidak_ditemukan",
        message: "Proyek tidak ditemukan.",
      });
    }

    const isOwner = proj[0].ownerId === resolvedId;
    if (!isOwner) {
      const [member]: any = await connection.query(
        "SELECT role FROM ProjectMembers WHERE projectId = ? AND userId = ?",
        [projectId, resolvedId]
      );
      if (!member?.length) {
        return res.status(403).json({
          status: "error",
          code: "srv.akses_ditolak_bukan_anggota",
          message: "Akses ditolak: Anda bukan anggota project ini.",
        });
      }
    }

    return next();
  } catch (error: any) {
    console.error("[AUDIT] jagaAuditLogBaca:", error);
    return res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  } finally {
    if (connection) connection.release();
  }
}
