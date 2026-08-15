import { Router } from "express";
import { register } from "../config/metrics";
import { statusMigrasi } from "../services/migrasi-status";

const router = Router();

router.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

/**
 * Status kesehatan, termasuk hasil migrasi schema.
 *
 * Migrasi disertakan karena kegagalannya tidak terlihat di mana pun: server
 * tetap menyala dan seluruh endpoint tetap menjawab, sementara tabel yang
 * dibutuhkan fitur baru tidak pernah terbentuk. Menaruhnya di sini membuat
 * keadaan itu bisa diperiksa kapan saja tanpa membaca log boot.
 */
router.get("/api/health", (req, res) => {
  const migrasi = statusMigrasi();
  res.json({
    status: migrasi.status === "gagal" ? "degraded" : "ok",
    timestamp: new Date().toISOString(),
    service: "LanPro Backend",
    migrasi,
  });
});

export default router;
