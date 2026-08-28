import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import db from "../../src/lib/db";
import { getJwtSecret } from "../helpers/jwtSecret";

export interface UserSession {
  token: string;
  ip: string;
  browser: string;
  device: string;
  lastActiveAt: number;
  browserSessionId?: string;
}

export const activeUserSessions = new Map<string, UserSession>();

// Pindah ke helpers/jwtSecret.ts agar modul yang hanya butuh rahasia JWT tidak
// ikut menarik adapter database. Di-re-export supaya pemanggil lama tetap jalan.
export { getJwtSecret };

export const generateToken = (user: any): string => {
  return jwt.sign(
    {
      id: user.id,
      uid: user.uid,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
    getJwtSecret(),
    { expiresIn: "2h" }
  );
};

export const verifyGlobalAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role === "admin") {
    next();
  } else {
    res.status(403).json({
      status: "error",
      code: "srv.akses_ditolak_hanya_global",
      message: "Akses ditolak: Hanya Global Admin yang memiliki izin.",
    });
  }
};

export const authenticateJWT = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: "error",
      code: "srv.akses_ditolak_token_autentikasi",
      message: "Akses ditolak: Token autentikasi tidak ditemukan.",
    });
  }

  if (authHeader.startsWith("Bearer ")) {
    const parts = authHeader.split(" ");
    const token = parts.length === 2 ? parts[1] : null;

    if (!token) {
      return res.status(401).json({
        status: "error",
        code: "srv.format_token_tidak_valid",
        message: "Format token tidak valid.",
      });
    }

    jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
      if (err) {
        return res.status(401).json({
          status: "error",
          code: "srv.sesi_anda_telah_berakhir",
          message: "Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.",
        });
      }

      // Single login concurrent session check (Database-backed for Serverless & Multi-instance compatibility - NO BYPASS)
      const userId = user.id || user.uid;

      if (userId) {
        db.query('SELECT "currentSessionToken", role, status FROM Users WHERE id = ? OR uid = ?', [
          userId.toString(),
          userId.toString(),
        ])
          .then(([rows]: any) => {
            if (rows && rows.length > 0) {
              const dbUser = rows[0];
              const currentToken = dbUser.currentSessionToken;
              if (!currentToken || currentToken !== token) {
                return res.status(401).json({
                  status: "error",
                  code: "srv.sesi_anda_telah_diakhiri",
                  message:
                    "Sesi Anda telah diakhiri oleh Administrator atau Anda telah masuk di perangkat/browser lain.",
                });
              }

              // Tolak akun yang dinonaktifkan atau belum aktif (status sah: 'approved' atau 'active')
              const statusLower = dbUser.status ? String(dbUser.status).toLowerCase() : "";
              if (statusLower && statusLower !== "active" && statusLower !== "approved") {
                return res.status(403).json({
                  status: "error",
                  code: "srv.akses_ditolak_akun_anda",
                  message: "Akses ditolak: Akun Anda dinonaktifkan atau belum aktif.",
                });
              }

              // Sinkronisasi peran real-time dari database ke req.user (§19.28 / #92)
              req.user = {
                ...user,
                role: dbUser.role || user.role,
                status: dbUser.status || user.status,
              };
              return next();
            }

            return res.status(401).json({
              status: "error",
              code: "srv.akses_ditolak_pengguna_tidak",
              message: "Akses ditolak: Pengguna tidak ditemukan.",
            });
          })
          .catch((dbErr: any) => {
            console.error(
              "[AUTH MIDDLEWARE] Gagal memverifikasi token sesi dari database, fallback ke in-memory check:",
              dbErr
            );
            // Fallback to in-memory activeUserSessions if DB fails
            const activeSession = activeUserSessions.get(userId.toString());
            if (!activeSession || activeSession.token !== token) {
              return res.status(401).json({
                status: "error",
                code: "srv.sesi_anda_telah_diakhiri",
                message:
                  "Sesi Anda telah diakhiri oleh Administrator atau Anda telah masuk di perangkat/browser lain.",
              });
            }
            req.user = user;
            next();
          });
      } else {
        req.user = user;
        next();
      }
    });
  } else {
    res.status(401).json({
      status: "error",
      code: "srv.akses_ditolak_format_authorization",
      message: "Akses ditolak: Format Authorization bukan Bearer.",
    });
  }
};
