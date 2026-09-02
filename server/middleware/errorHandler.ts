import { Request, Response, NextFunction } from "express";

// Standard Error Response Interface
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Global Error Handling Middleware
 * Menangkap semua error (termasuk unhandled promise rejections) dan membungkusnya
 * ke dalam format JSON standar sebelum dikirim ke client.
 *
 * #315 — envelope diseragamkan ke { status, code, message, errors? }
 * (bukan { error: true }) agar selaras middleware/rute lain.
 */
export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  // Jangan membocorkan error stack di production
  const isProduction = process.env.NODE_ENV === "production";

  const response = {
    status: "error" as const,
    code: err.code || (statusCode >= 500 ? "srv.kesalahan_internal" : "srv.permintaan_gagal"),
    message: err.message || "Internal Server Error",
    ...(!isProduction && { stack: err.stack }),
  };

  // Log error di console server
  console.error(`[ERROR] ${statusCode} - ${err.message}`);
  if (!isProduction) {
    console.error(err.stack);
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware untuk menangani rute yang tidak ditemukan (404)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: "error",
    code: "srv.endpoint_tidak_ditemukan",
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
};
