import { Request, Response, NextFunction } from "express";

/**
 * Penjaga pemicu cron eksternal / Vercel Cron (#304).
 * Set CRON_SECRET di lingkungan production; tanpa nilai, rute menolak semua pemicu.
 */
export function verifyCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({
      status: "error",
      code: "srv.cron_belum_dikonfigurasi",
      message: "Penjadwal cron belum dikonfigurasi (CRON_SECRET kosong).",
    });
  }

  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const headerSecret = (req.headers["x-cron-secret"] as string) || "";

  if (bearer === secret || headerSecret === secret) {
    return next();
  }

  return res.status(401).json({
    status: "error",
    code: "srv.cron_secret_tidak_valid",
    message: "Akses ditolak: rahasia cron tidak valid.",
  });
}
