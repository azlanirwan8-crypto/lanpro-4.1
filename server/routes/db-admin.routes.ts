/**
 * Database Administration Routes
 * For global admins only - database utilities, query explorer, schema inspection
 */

import { Router } from "express";
import { verifyGlobalAdmin } from "../middleware/auth";
import { validasiBody } from "../middleware/validate";
import { dbQuerySchema, dbConfigSchema } from "../schemas/system.schema";
import path from "path";
import fs from "fs";
import { dbAdminRepository } from "../repositories/db-admin.repository";

const router = Router();

// ==========================================
// DB TESTING & QUERY SECTION
// ==========================================

/**
 * Test database connection
 * GET /api/test-db
 */
router.get("/api/test-db", verifyGlobalAdmin, async (req, res) => {
  try {
    await dbAdminRepository.testConnection();
    res.json({
      status: "success",
      code: "srv.koneksi_ke_database_mysql",
      message: "Koneksi ke database MySQL berhasil!",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Database connection error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/**
 * Run raw database queries (read-only for explorer)
 * POST /api/db-query
 * Body: { query: "SELECT * FROM table" }
 */
/**
 * Item #259 — sisa #247: `dbQuerySchema` sudah dibuat di `system.schema.ts`
 * saat #247 dikerjakan, tetapi TIDAK PERNAH dipasang di rute ini — skema
 * yatim, ditemukan lewat grep langsung ke berkas ini. Dipasang sekarang.
 *
 * Ini tidak menggantikan pemeriksaan SQL di bawah (satu statement, awalan
 * SELECT/SHOW/DESCRIBE, tanpa kata kunci terlarang) — itu tetap baris
 * pertahanan utamanya. Yang ditambah skema ini: batas panjang string (skema
 * membatasi ke 5000 karakter di bawah), sehingga query raksasa tidak lolos
 * sampai ke `dbAdminRepository.runReadOnlyQuery`.
 */
router.post("/api/db-query", verifyGlobalAdmin, validasiBody(dbQuerySchema), async (req, res) => {
  try {
    const { query: sqlString } = req.body;
    if (!sqlString || typeof sqlString !== "string")
      return res.status(400).json({ error: "Query is required" });

    const trimmed = sqlString.trim().replace(/;+\s*$/, "");
    const isSingleStatement = !trimmed.includes(";");
    const isReadOnly = /^(SELECT|SHOW|DESCRIBE)\s/i.test(trimmed);
    const hasForbiddenKeyword =
      /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|CALL|MERGE)\b/i.test(
        trimmed
      );

    if (!isSingleStatement || !isReadOnly || hasForbiddenKeyword) {
      return res.status(400).json({
        status: "error",
        code: "srv.db_explorer_hanya_mengizinkan",
        message: "DB Explorer hanya mengizinkan satu statement SELECT/SHOW/DESCRIBE read-only.",
      });
    }

    const rows = await dbAdminRepository.runReadOnlyQuery(trimmed);
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Database query error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

// ==========================================
// DB CONFIG SECTION (PostgreSQL)
// ==========================================

/**
 * Get active DB config from environment
 * GET /api/system/db-config
 */
router.get("/api/system/db-config", verifyGlobalAdmin, (req, res) => {
  try {
    const config = {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || "3306",
      user: process.env.DB_USER || "app_user",
      password: process.env.DB_PASSWORD || "app_password",
      database: process.env.DB_NAME || "app_database",
    };

    const persistentPath = path.join(process.cwd(), "database", "db_config.json");
    if (fs.existsSync(persistentPath)) {
      try {
        const saved = JSON.parse(fs.readFileSync(persistentPath, "utf8"));
        if (saved.host) config.host = saved.host;
        if (saved.port) config.port = String(saved.port);
        if (saved.user) config.user = saved.user;
        if (saved.password) config.password = saved.password;
        if (saved.database) config.database = saved.database;
      } catch (err) {}
    }

    res.json({
      status: "success",
      data: config,
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

/**
 * Get active DB connection status
 * GET /api/system/db-status
 */
router.get("/api/system/db-status", verifyGlobalAdmin, async (req, res) => {
  try {
    const { getDbMode } = await import("../../src/lib/db");
    const mode = getDbMode();
    res.json({
      status: "success",
      mode,
      host: process.env.DATABASE_URL ? "Neon PostgreSQL Server" : "PostgreSQL Server",
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

/**
 * Switch/Toggle DB connection mode
 * POST /api/system/db-status
 */
router.post("/api/system/db-status", verifyGlobalAdmin, async (req, res) => {
  try {
    res.json({
      status: "success",
      mode: "pg",
      code: "srv.aplikasi_terkunci_pada_neon",
      message: "Aplikasi terkunci pada Neon PostgreSQL Server.",
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

/**
 * Test PostgreSQL connection with provided config
 * POST /api/system/db-config
 * Body: { connectionString: "postgresql://..." }
 */
// Item #259 — sisa #247: dbConfigSchema dibuat #247 tetapi tidak pernah dipasang di sini (skema yatim).
router.post(
  "/api/system/db-config",
  verifyGlobalAdmin,
  validasiBody(dbConfigSchema),
  async (req, res) => {
    try {
      const { connectionString } = req.body;
      const { Pool } = await import("pg");
      const testPool = new Pool({
        connectionString: connectionString || process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false },
      });
      await testPool.query("SELECT 1");
      await testPool.end();
      res.json({
        status: "success",
        code: "srv.koneksi_postgresql_berhasil",
        message: "Koneksi PostgreSQL Berhasil!",
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ status: "error", message: e.message });
    }
  }
);

/**
 * Save and hot-swap DB config connection
 * POST /api/system/db-config/save
 * Body: { connectionString: "postgresql://..." }
 */
// Item #259 — sama dengan di atas: rute ini yang MENGUBAH koneksi produksi
// (force: true), jadi lebih penting membatasi input daripada rute uji-coba.
router.post(
  "/api/system/db-config/save",
  verifyGlobalAdmin,
  validasiBody(dbConfigSchema),
  async (req, res) => {
    try {
      const { connectionString } = req.body;
      const { updatePoolConfig } = await import("../../src/lib/db");
      updatePoolConfig({ connectionString, force: true });
      res.json({
        status: "success",
        code: "srv.konfigurasi_postgresql_berhasil_diperbarui",
        message: "Konfigurasi PostgreSQL berhasil diperbarui!",
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ status: "error", message: e.message });
    }
  }
);

export default router;
