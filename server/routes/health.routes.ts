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
      code: "srv.endpoint_metrik_dinonaktifkan_metriktoken",
      message: "Endpoint metrik dinonaktifkan: METRIK_TOKEN belum diisi di environment.",
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
    return res.status(401).json({
      status: "error",
      code: "srv.token_metrik_tidak_valid",
      message: "Token metrik tidak valid.",
    });
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
// #57 — `GET /api/health` DIBUANG 16 Agu 2026 atas keputusan pemilik proyek.
//
// Ia menghitung hal yang sama persis dengan `/api/health-check` di
// `server.ts:552` — keduanya dari `statusMigrasi()` — dan bedanya hanya field
// `service` bernilai tetap "LanPro Backend".
//
// Yang menentukan: ia berada DI BALIK gerbang autentikasi `/api/*`, sementara
// `/api/health-check` terdaftar di `publicRoutes` (`server.ts:409`). Probe
// kesehatan tidak punya kredensial, jadi endpoint ini tidak bisa dipakai untuk
// keperluan yang namanya sendiri janjikan — ia menduplikasi informasi sambil
// tidak bisa diakses oleh yang membutuhkannya.
//
// Pemakai kesehatan backend memakai `/api/health-check`, yang DIPINDAHKAN ke
// sini dari `server.ts:552`. Jalurnya TIDAK berubah, jadi pendaftarannya di
// `publicRoutes` (`server.ts:409`) tetap berlaku. Yang berubah hanya letaknya:
// endpoint kesehatan kini berkumpul di berkas yang namanya menjanjikan itu,
// dan bisa diuji tanpa menyalakan seluruh server.
router.get("/api/health-check", (req, res) => {
  const migrasi = statusMigrasi();
  res.json({
    status: migrasi.status === "gagal" ? "degraded" : "ok",
    timestamp: new Date().toISOString(),
    service: "LanPro Backend",
    migrasi: migrasi.status,
    // Item #275: nama tabel yang hilang ikut dipaparkan. Tanpa ini,
    // `migrasi: "gagal"` cuma memberi tahu ADA yang salah, bukan APA —
    // dan orang yang membacanya tetap harus menebak.
    tabelHilang: migrasi.tabelHilang,
  });
});

export default router;
