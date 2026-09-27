import { Request, Response } from "express";
import { sessionRepository } from "../repositories/session.repository";
import { activeUserSessions } from "../middleware/auth";
import { roomPengguna, sidikToken } from "../middleware/socketAuth";

export class SessionController {
  async listSessions(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const userId = req.query.userId as string;

      const result = await sessionRepository.getSessions({
        page,
        limit,
        search,
        status,
        userId,
      });

      const stats = await sessionRepository.getSessionStats();

      return res.json({
        status: "success",
        ...result,
        stats,
      });
    } catch (err: any) {
      console.error("Gagal mengambil daftar sesi pengguna:", err);
      return res.status(500).json({
        status: "error",
        message: "Gagal memuat riwayat sesi pengguna",
      });
    }
  }

  async getUserActivities(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      if (!userId) {
        return res.status(400).json({
          status: "error",
          message: "ID pengguna diperlukan",
        });
      }

      const activities = await sessionRepository.getUserActivities(userId, limit);

      return res.json({
        status: "success",
        data: activities,
      });
    } catch (err: any) {
      console.error("Gagal mengambil log aktivitas pengguna:", err);
      return res.status(500).json({
        status: "error",
        message: "Gagal memuat log aktivitas pengguna",
      });
    }
  }

  async terminateSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        return res.status(400).json({
          status: "error",
          message: "ID Sesi diperlukan",
        });
      }

      const terminated = await sessionRepository.terminateSession(sessionId);
      if (!terminated) {
        return res.status(404).json({
          status: "error",
          message: "Sesi tidak ditemukan atau sudah tidak aktif",
        });
      }

      const userId = terminated.userId;
      if (userId) {
        activeUserSessions.delete(userId.toString());

        const io = req.app.get("io") || (req as any).io;
        if (io) {
          io.to(roomPengguna(userId.toString())).emit("FORCE_LOGOUT_EVENT", {
            userId: userId.toString(),
            sidikTokenBaru: "TERMINATED_BY_ADMIN",
            browserSessionId: "",
          });
        }
      }

      return res.json({
        status: "success",
        message: "Sesi pengguna berhasil diputus",
      });
    } catch (err: any) {
      console.error("Gagal memutuskan sesi pengguna:", err);
      return res.status(500).json({
        status: "error",
        message: "Gagal memutuskan sesi pengguna",
      });
    }
  }
}

export const sessionController = new SessionController();
