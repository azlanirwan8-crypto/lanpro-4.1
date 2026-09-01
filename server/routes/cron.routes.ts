import { Router, Request, Response } from "express";
import { verifyCronSecret } from "../middleware/verifyCronSecret";
import { tickEmailBroadcastScheduler } from "../services/emailBroadcast.service";
import { tickWhatsAppScheduler } from "../services/whatsapp.service";
import { kirimDailyTaskDigestEmail } from "../services/taskDigest.service";

const router = Router();

/**
 * Tick menit — broadcast email & WhatsApp (#304).
 *
 * Vercel Cron selalu memanggil GET. Pemicu luar boleh GET atau POST.
 * Vercel Hobby: jadwalkan pemicu luar tiap menit ke rute ini (cron bawaan
 * hanya harian). vercel.json hanya memuat task-digest harian.
 */
async function handleTick(_req: Request, res: Response) {
  const hasil: Record<string, string> = {};

  try {
    await tickEmailBroadcastScheduler();
    hasil.emailBroadcast = "ok";
  } catch (err: any) {
    console.error("[CRON] email broadcast:", err?.message);
    hasil.emailBroadcast = `error: ${err?.message || "unknown"}`;
  }

  try {
    await tickWhatsAppScheduler();
    hasil.whatsapp = "ok";
  } catch (err: any) {
    console.error("[CRON] whatsapp:", err?.message);
    hasil.whatsapp = `error: ${err?.message || "unknown"}`;
  }

  res.json({ status: "success", data: hasil });
}

/** Digest email harian tugas pending — setara initTaskDigestEmailScheduler 07:00 WIB. */
async function handleTaskDigest(_req: Request, res: Response) {
  try {
    console.log("[CRON] Memulai digest email harian tugas...");
    const result = await kirimDailyTaskDigestEmail();
    res.json({
      status: "success",
      data: {
        emailsSent: result.emailsSent,
        failedCount: result.failedCount,
        totalUsersChecked: result.totalUsersChecked,
      },
    });
  } catch (err: any) {
    console.error("[CRON] task digest:", err?.message);
    res.status(500).json({
      status: "error",
      code: "srv.cron_task_digest_gagal",
      message: err?.message || "Digest gagal",
    });
  }
}

router.get("/api/cron/tick", verifyCronSecret, handleTick);
router.post("/api/cron/tick", verifyCronSecret, handleTick);
router.get("/api/cron/task-digest", verifyCronSecret, handleTaskDigest);
router.post("/api/cron/task-digest", verifyCronSecret, handleTaskDigest);

export default router;
