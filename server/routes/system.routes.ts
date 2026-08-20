import { Router } from "express";
import path from "path";
import fs from "fs";
import db from "../../src/lib/db";
import { verifyGlobalAdmin } from "../middleware/auth";
import {
  statusEmailService,
  kirimEmail,
  validasiFormatEmail,
  ambilApiKey,
} from "../services/email.service";

const router = Router();

// DB Explorer endpoints are securely maintained in server/routes/db-admin.routes.ts with read-only enforcement (Item #19).

// Database Schema Stats
router.get("/api/db-schema", verifyGlobalAdmin, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [tablesRow] = await connection.query("SHOW TABLES");
    const tables = (tablesRow as any[]).map(row => Object.values(row)[0] as string);
    
    const schema: Record<string, any> = {};
    for (const table of tables) {
      const [columns] = await connection.query(`DESCRIBE \`${table}\``);
      schema[table] = columns;
    }

    let tableStats: any[] = [];
    try {
      const [stats] = await connection.query(`
        SELECT 
          table_name AS 'tableName', 
          table_rows AS 'rowCount',
          data_length + index_length AS 'sizeBytes'
        FROM information_schema.TABLES 
        WHERE table_schema = DATABASE();
      `);
      tableStats = stats as any[];
    } catch (e) {
       console.warn("Could not fetch table stats", e);
    }
    
    res.json({ status: "success", tables: schema, stats: tableStats });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Database query error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
  } finally {
    if (connection) connection.release();
  }
});

// Database Migration Endpoint
router.post("/api/migrate-db", verifyGlobalAdmin, async (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const cleanSql = schemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS.*?;/i, '')
      .replace(/USE .*?;/i, '');

    const connection = await db.getConnection();
    await connection.query(cleanSql);
    connection.release();

    res.json({ status: "success", message: "Migrasi database berhasil dijalankan! Tabel sudah terbuat." });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Migration error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
  }
});

/**
 * Item #45: Endpoint status integrasi email (Khusus Global Admin)
 */
router.get("/api/settings/email", verifyGlobalAdmin, async (req, res) => {
  try {
    const status = statusEmailService();
    res.json({
      status: "success",
      data: {
        ...status,
        isMock: !ambilApiKey() && process.env.NODE_ENV !== "production",
      },
    });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengambil status konfigurasi email:", error);
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil status integrasi email",
    });
  }
});

/**
 * Item #45: Endpoint uji coba kirim email (Khusus Global Admin)
 */
router.post("/api/settings/email/test", verifyGlobalAdmin, async (req, res) => {
  try {
    const { targetEmail } = req.body || {};

    if (!targetEmail || !validasiFormatEmail(targetEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Alamat email tujuan tidak valid atau kosong",
      });
    }

    const hasil = await kirimEmail({
      to: targetEmail,
      subject: "[LanPro] Uji Coba Koneksi Integrasi Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669; margin-top: 0;">Uji Coba Integrasi Email Berhasil!</h2>
          <p style="color: #334155; line-height: 1.6;">Email ini dikirim dari sistem LanPro untuk menguji fungsionalitas pengiriman email transaksional.</p>
          <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #475569;">
            <div><strong>Waktu Pengujian:</strong> ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</div>
            <div><strong>Penerima Uji:</strong> ${targetEmail}</div>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">LanPro Project Management System</p>
        </div>
      `,
      text: `Uji Coba Integrasi Email Berhasil!\n\nEmail ini dikirim dari sistem LanPro pada ${new Date().toISOString()} ke ${targetEmail}.`,
    });

    if (!hasil.success) {
      return res.status(500).json({
        status: "error",
        message: hasil.error || "Gagal mengirim email uji coba",
      });
    }

    res.json({
      status: "success",
      message: `Email simulasi uji coba berhasil dikirim ke ${targetEmail}`,
      messageId: hasil.messageId,
    });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengirim email uji coba:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan internal saat mengirim email uji coba",
    });
  }
});

export default router;

