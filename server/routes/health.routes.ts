import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { register } from "../config/metrics";
import { statusMigrasi } from "../services/migrasi-status";

const router = Router();

/**
 * Penjaga endpoint metrik (item #58, §13.6).
 *
 * `/metrics` TIDAK diawali `/api/`, sehingga gerbang global di `server.ts`
 * — yang hanya menjaga `/api/*` — tidak pernah menyentuhnya. Akibatnya endpoint
 * ini menjawab 200 tanpa autentikasi apa pun; dibuktikan dengan `curl` biasa.
 * Isinya bukan data pengguna, tapi `httpRequestsTotal` berlabel method, route,
 * dan status: peta rute internal beserta pola lalu lintas dan tingkat errornya.
 *
 * Ketetapan pemilik proyek 16 Agu 2026: dijaga token khusus lewat
 * `METRIK_TOKEN`, bukan JWT — supaya scraper Prometheus tetap bisa bekerja
 * tanpa perlu punya akun pengguna.
 *
 * Bila `METRIK_TOKEN` kosong, endpoint DITUTUP, bukan dibuka. Aman secara
 * bawaan: lupa mengisi variabel tidak boleh berarti kembali terbuka untuk umum.
 */
const penjagaMetrik = (req: any, res: any, next: any) => {
  const diharapkan = process.env.METRIK_TOKEN;

  if (!diharapkan) {
    return res.status(503).json({
      status: "error",
      message:
        "Endpoint metrik dinonaktifkan: METRIK_TOKEN belum diisi di environment.",
    });
  }

  const authHeader = String(req.headers?.authorization || "");
  const dariHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const diberikan = dariHeader || String(req.headers?.["x-metrik-token"] || "");

  // Perbandingan panjang-tetap supaya tidak membocorkan token lewat selisih
  // waktu respons.
  const cocok =
    diberikan.length === diharapkan.length &&
    timingSafeEqual(Buffer.from(diberikan), Buffer.from(diharapkan));

  if (!cocok) {
    return res.status(401).json({ status: "error", message: "Token metrik tidak valid." });
  }

  next();
};

router.get("/metrics", penjagaMetrik, async (req, res) => {
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
