import { Router } from "express";
import path from "path";
import fs from "fs";
import { verifyGlobalAdmin } from "../middleware/auth";
import {
  statusEmailService,
  statusEmailServiceAsync,
  kirimEmail,
  validasiFormatEmail,
  ambilApiKey,
} from "../services/email.service";
import {
  getEmailIntegrationConfig,
  saveEmailIntegrationConfig,
  getSystemIntegrationConfig,
  saveSystemIntegrationConfig,
  getWhatsAppIntegrationConfig,
  saveWhatsAppIntegrationConfig,
  ambilSsoAllowedDomains,
  ambilAllowedOrigins,
} from "../services/integrationSettings.service";
import { systemRepository } from "../repositories/system.repository";
import { getBroadcastConfig, saveBroadcastConfig } from "../services/broadcastConfig.service";
import { kirimBroadcastTaskEmail } from "../services/emailBroadcast.service";
import { validasiBody } from "../middleware/validate";
import {
  testEmailSchema,
  whatsappBroadcastConfigSchema,
  emailIntegrationConfigSchema,
  systemIntegrationConfigSchema,
  whatsappConnectionConfigSchema,
} from "../schemas/system.schema";
import { createAuditLog } from "../services/audit.service";

const router = Router();

const VALID_DAYS = ["1", "2", "3", "4", "5", "6", "7"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Database Schema Stats
router.get("/api/db-schema", verifyGlobalAdmin, async (req, res) => {
  try {
    const { schema, stats } = await systemRepository.getDbSchema();
    res.json({ status: "success", tables: schema, stats });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Database query error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

// Database Migration Endpoint
router.post("/api/migrate-db", verifyGlobalAdmin, async (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), "database", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    const cleanSql = schemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS.*?;/i, "")
      .replace(/USE .*?;/i, "");

    await systemRepository.executeRawMigration(cleanSql);

    res.json({
      status: "success",
      code: "srv.migrasi_database_berhasil_dijalankan",
      message: "Migrasi database berhasil dijalankan! Tabel sudah terbuat.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: Migration error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/**
 * Item #45, #264: Endpoint status integrasi email (Khusus Global Admin)
 */
router.get("/api/settings/email", verifyGlobalAdmin, async (req, res) => {
  try {
    const status = await statusEmailServiceAsync();
    res.json({
      status: "success",
      data: status,
    });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengambil status konfigurasi email:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mengambil_status_integrasi",
      message: "Gagal mengambil status integrasi email",
    });
  }
});

/**
 * Item #264, #270: Endpoint mengambil konfigurasi lengkap email dari database (Khusus Global Admin)
 */
router.get("/api/settings/email/config", verifyGlobalAdmin, async (req, res) => {
  try {
    const config = await getEmailIntegrationConfig();
    res.json({
      status: "success",
      data: {
        provider: config.provider,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        smtpPassMasked: config.smtpPass ? "••••••••" : "",
        hasSmtpPass: Boolean(config.smtpPass),
        smtpSecure: config.smtpSecure,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        apiKeyMasked: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "",
        hasApiKey: Boolean(config.apiKey),
        subjectTemplate: config.subjectTemplate,
        bodyTemplate: config.bodyTemplate,
        appUrl: config.appUrl,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengambil konfigurasi email dari DB:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mengambil_konfigurasi_email",
      message: "Gagal mengambil konfigurasi email",
    });
  }
});

/**
 * Item #264, #270: Endpoint menyimpan konfigurasi email ke database (Khusus Global Admin)
 */
router.post(
  "/api/settings/email/config",
  verifyGlobalAdmin,
  validasiBody(emailIntegrationConfigSchema),
  async (req: any, res) => {
    try {
      const currentUserId = req.user?.id || req.user?.uid;
      const updated = await saveEmailIntegrationConfig(req.body);

      createAuditLog({
        userId: currentUserId,
        projectId: null,
        actionType: "UPDATE",
        entityName: "EmailIntegrationSettings",
        entityId: "email",
        details: {
          provider: updated.provider,
          smtpHost: updated.smtpHost,
          smtpPort: updated.smtpPort,
          smtpUser: updated.smtpUser,
          senderEmail: updated.senderEmail,
          senderName: updated.senderName,
          hasSmtpPass: Boolean(updated.smtpPass),
          hasApiKey: Boolean(updated.apiKey),
        },
      });

      res.json({
        status: "success",
        message: "Konfigurasi email berhasil disimpan ke basis data.",
        data: {
          provider: updated.provider,
          smtpHost: updated.smtpHost,
          smtpPort: updated.smtpPort,
          smtpUser: updated.smtpUser,
          smtpPassMasked: updated.smtpPass ? "••••••••" : "",
          hasSmtpPass: Boolean(updated.smtpPass),
          smtpSecure: updated.smtpSecure,
          senderEmail: updated.senderEmail,
          senderName: updated.senderName,
          apiKeyMasked: updated.apiKey ? "••••••••" + updated.apiKey.slice(-4) : "",
          hasApiKey: Boolean(updated.apiKey),
          subjectTemplate: updated.subjectTemplate,
          bodyTemplate: updated.bodyTemplate,
          appUrl: updated.appUrl,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error: any) {
      console.error("[SETTINGS] Gagal menyimpan konfigurasi email:", error);
      res.status(500).json({
        status: "error",
        code: "srv.gagal_menyimpan_konfigurasi_email",
        message: "Gagal menyimpan konfigurasi email",
      });
    }
  }
);

/**
 * Item #45: Endpoint uji coba kirim email (Khusus Global Admin)
 */
router.post("/api/settings/email/test", verifyGlobalAdmin, async (req, res) => {
  try {
    const { targetEmail } = req.body || {};

    if (!targetEmail || !validasiFormatEmail(targetEmail)) {
      return res.status(400).json({
        status: "error",
        code: "srv.alamat_email_tujuan_tidak",
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
      code: "srv.terjadi_kesalahan_internal_saat",
      message: "Terjadi kesalahan internal saat mengirim email uji coba",
    });
  }
});

/**
 * Item #193: Konfigurasi jadwal (hari/jam), penerima, dan template broadcast
 * WhatsApp (Khusus Global Admin).
 */
router.get("/api/settings/whatsapp/broadcast-config", verifyGlobalAdmin, async (req, res) => {
  try {
    const config = await getBroadcastConfig("whatsapp");
    res.json({ status: "success", data: config });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengambil konfigurasi broadcast WhatsApp:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mengambil_konfigurasi_broadcast",
      message: "Gagal mengambil konfigurasi broadcast",
    });
  }
});

router.post(
  "/api/settings/whatsapp/broadcast-config",
  verifyGlobalAdmin,
  validasiBody(whatsappBroadcastConfigSchema),
  async (req, res) => {
    try {
      const { scheduleDays, scheduleTime, recipientIds, messageTemplate } = req.body || {};

      if (!Array.isArray(scheduleDays) || scheduleDays.length === 0) {
        return res.status(400).json({
          status: "error",
          code: "srv.pilih_minimal_satu_hari",
          message: "Pilih minimal satu hari untuk jadwal broadcast",
        });
      }
      const cleanDays = scheduleDays.map(String).filter((d) => VALID_DAYS.includes(d));
      if (cleanDays.length === 0) {
        return res.status(400).json({
          status: "error",
          code: "srv.hari_tidak_valid",
          message: "Hari yang dipilih tidak valid",
        });
      }

      if (typeof scheduleTime !== "string" || !TIME_RE.test(scheduleTime)) {
        return res.status(400).json({
          status: "error",
          code: "srv.jam_tidak_valid",
          message: "Format jam tidak valid, gunakan HH:MM",
        });
      }

      const cleanRecipients = Array.isArray(recipientIds) ? recipientIds.map(String) : [];

      const config = await saveBroadcastConfig("whatsapp", {
        scheduleDays: cleanDays,
        scheduleTime,
        recipientIds: cleanRecipients,
        messageTemplate: typeof messageTemplate === "string" ? messageTemplate : "",
      });

      res.json({ status: "success", data: config });
    } catch (error: any) {
      console.error("[SETTINGS] Gagal menyimpan konfigurasi broadcast WhatsApp:", error);
      res.status(500).json({
        status: "error",
        code: "srv.gagal_menyimpan_konfigurasi_broadcast",
        message: "Gagal menyimpan konfigurasi broadcast",
      });
    }
  }
);

/**
 * Item #297: Konfigurasi jadwal broadcast ringkasan task lewat EMAIL.
 *
 * Memakai penyimpanan yang sama dengan broadcast WhatsApp (`BroadcastConfig`,
 * satu baris per `channel`), hanya dengan `channel = "email"`. Validasinya
 * sengaja identik dengan jalur WhatsApp — dua jalur yang menulis ke tabel yang
 * sama tidak boleh menerima bentuk data yang berbeda, sebab yang longgar akan
 * menyimpan baris yang tidak bisa dibaca yang ketat.
 *
 * `messageTemplate` TIDAK dipakai di sini: isi emailnya disusun oleh templat
 * HTML `kirimEmailTaskDigest()`, bukan oleh string bebas seperti WhatsApp.
 * Kolomnya dibiarkan kosong alih-alih dihapus, karena tabelnya dibagi.
 */
router.get("/api/settings/email/broadcast-config", verifyGlobalAdmin, async (req, res) => {
  try {
    const config = await getBroadcastConfig("email");
    res.json({ status: "success", data: config });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengambil konfigurasi broadcast email:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mengambil_konfigurasi_broadcast",
      message: "Gagal mengambil konfigurasi broadcast",
    });
  }
});

router.post("/api/settings/email/broadcast-config", verifyGlobalAdmin, async (req, res) => {
  try {
    const { scheduleDays, scheduleTime, recipientIds } = req.body || {};

    if (!Array.isArray(scheduleDays) || scheduleDays.length === 0) {
      return res.status(400).json({
        status: "error",
        code: "srv.pilih_minimal_satu_hari",
        message: "Pilih minimal satu hari untuk jadwal broadcast",
      });
    }
    const cleanDays = scheduleDays.map(String).filter((d) => VALID_DAYS.includes(d));
    if (cleanDays.length === 0) {
      return res.status(400).json({
        status: "error",
        code: "srv.hari_tidak_valid",
        message: "Hari yang dipilih tidak valid",
      });
    }

    if (typeof scheduleTime !== "string" || !TIME_RE.test(scheduleTime)) {
      return res.status(400).json({
        status: "error",
        code: "srv.jam_tidak_valid",
        message: "Format jam tidak valid, gunakan HH:MM",
      });
    }

    const config = await saveBroadcastConfig("email", {
      scheduleDays: cleanDays,
      scheduleTime,
      recipientIds: Array.isArray(recipientIds) ? recipientIds.map(String) : [],
      messageTemplate: "",
    });

    res.json({ status: "success", data: config });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal menyimpan konfigurasi broadcast email:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_menyimpan_konfigurasi_broadcast",
      message: "Gagal menyimpan konfigurasi broadcast",
    });
  }
});

/**
 * Item #297: Kirim broadcast task SEKARANG, di luar jadwal.
 *
 * Ada supaya jadwal bisa dibuktikan tanpa menunggu hari dan jamnya tiba.
 * Tanpa ini, satu-satunya cara memastikan fitur bekerja adalah menyetel jam
 * ke satu menit ke depan lalu menunggu -- dan kalau gagal, tidak ada yang
 * tahu apakah yang salah kirimannya atau penjadwalnya.
 */
router.post("/api/settings/email/broadcast-now", verifyGlobalAdmin, async (req, res) => {
  try {
    const config = await getBroadcastConfig("email");
    const hasil = await kirimBroadcastTaskEmail(config.recipientIds);
    res.json({ status: "success", data: hasil });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengirim broadcast email:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mengirim_broadcast",
      message: "Gagal mengirim broadcast",
    });
  }
});

/**
 * Item #279: Mengambil konfigurasi sistem operasional (SSO Domains, CORS Origins, Slack Webhook)
 */
router.get("/api/settings/system/config", verifyGlobalAdmin, async (req, res) => {
  try {
    const config = await getSystemIntegrationConfig();
    const effectiveSsoDomains = await ambilSsoAllowedDomains();
    const effectiveOrigins = await ambilAllowedOrigins();

    res.json({
      status: "success",
      data: {
        ssoAllowedDomains: config.ssoAllowedDomains,
        slackWebhookUrl: config.slackWebhookUrl,
        allowedOrigins: config.allowedOrigins,
        appUrl: config.appUrl,
        effectiveSsoDomains,
        effectiveOrigins,
        sources: {
          ssoAllowedDomains: config.ssoAllowedDomains ? "database" : "environment",
          slackWebhookUrl: config.slackWebhookUrl ? "database" : "environment",
          allowedOrigins: config.allowedOrigins ? "database" : "environment",
          appUrl: config.appUrl ? "database" : "environment",
        },
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengambil konfigurasi sistem operasional:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mengambil_konfigurasi_sistem",
      message: "Gagal mengambil konfigurasi sistem operasional",
    });
  }
});

/**
 * Item #279: Menyimpan konfigurasi sistem operasional ke basis data (Khusus Global Admin)
 */
router.post(
  "/api/settings/system/config",
  verifyGlobalAdmin,
  validasiBody(systemIntegrationConfigSchema),
  async (req: any, res) => {
    try {
      const currentUserId = req.user?.id || req.user?.uid;
      const updated = await saveSystemIntegrationConfig(req.body);

      createAuditLog({
        userId: currentUserId,
        projectId: null,
        actionType: "UPDATE",
        entityName: "SystemIntegrationSettings",
        entityId: "system",
        details: {
          ssoAllowedDomains: updated.ssoAllowedDomains,
          slackWebhookUrl: updated.slackWebhookUrl,
          allowedOrigins: updated.allowedOrigins,
          appUrl: updated.appUrl,
        },
      });

      const effectiveSsoDomains = await ambilSsoAllowedDomains();
      const effectiveOrigins = await ambilAllowedOrigins();

      res.json({
        status: "success",
        message: "Konfigurasi operasional sistem berhasil disimpan ke basis data.",
        data: {
          ssoAllowedDomains: updated.ssoAllowedDomains,
          slackWebhookUrl: updated.slackWebhookUrl,
          allowedOrigins: updated.allowedOrigins,
          appUrl: updated.appUrl,
          effectiveSsoDomains,
          effectiveOrigins,
          sources: {
            ssoAllowedDomains: updated.ssoAllowedDomains ? "database" : "environment",
            slackWebhookUrl: updated.slackWebhookUrl ? "database" : "environment",
            allowedOrigins: updated.allowedOrigins ? "database" : "environment",
            appUrl: updated.appUrl ? "database" : "environment",
          },
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error: any) {
      console.error("[SETTINGS] Gagal menyimpan konfigurasi sistem operasional:", error);
      res.status(500).json({
        status: "error",
        code: "srv.gagal_menyimpan_konfigurasi_sistem",
        message: "Gagal menyimpan konfigurasi sistem operasional",
      });
    }
  }
);

/**
 * Item #263, #279: Mengambil konfigurasi koneksi WhatsApp (Khusus Global Admin)
 */
router.get("/api/settings/whatsapp/config", verifyGlobalAdmin, async (req, res) => {
  try {
    const config = await getWhatsAppIntegrationConfig();
    res.json({
      status: "success",
      data: {
        provider: config.provider,
        endpoint: config.endpoint,
        tokenMasked: config.token ? "••••••••" + config.token.slice(-4) : "",
        hasToken: Boolean(config.token),
        senderNumber: config.senderNumber,
        deviceId: config.deviceId,
        source: config.token ? "database" : "environment",
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[SETTINGS] Gagal mengambil konfigurasi koneksi WhatsApp:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mengambil_konfigurasi_whatsapp",
      message: "Gagal mengambil konfigurasi koneksi WhatsApp",
    });
  }
});

/**
 * Item #263, #279: Menyimpan konfigurasi koneksi WhatsApp ke basis data (Khusus Global Admin)
 */
router.post(
  "/api/settings/whatsapp/config",
  verifyGlobalAdmin,
  validasiBody(whatsappConnectionConfigSchema),
  async (req: any, res) => {
    try {
      const currentUserId = req.user?.id || req.user?.uid;
      const updated = await saveWhatsAppIntegrationConfig(req.body);

      createAuditLog({
        userId: currentUserId,
        projectId: null,
        actionType: "UPDATE",
        entityName: "WhatsAppIntegrationSettings",
        entityId: "whatsapp",
        details: {
          provider: updated.provider,
          endpoint: updated.endpoint,
          hasToken: Boolean(updated.token),
          senderNumber: updated.senderNumber,
          deviceId: updated.deviceId,
        },
      });

      res.json({
        status: "success",
        message: "Konfigurasi koneksi WhatsApp berhasil disimpan ke basis data.",
        data: {
          provider: updated.provider,
          endpoint: updated.endpoint,
          tokenMasked: updated.token ? "••••••••" + updated.token.slice(-4) : "",
          hasToken: Boolean(updated.token),
          senderNumber: updated.senderNumber,
          deviceId: updated.deviceId,
          source: updated.token ? "database" : "environment",
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error: any) {
      console.error("[SETTINGS] Gagal menyimpan konfigurasi koneksi WhatsApp:", error);
      res.status(500).json({
        status: "error",
        code: "srv.gagal_menyimpan_konfigurasi_whatsapp",
        message: "Gagal menyimpan konfigurasi koneksi WhatsApp",
      });
    }
  }
);

export default router;
