/**
 * server/services/integrationSettings.service.ts
 *
 * Mengelola konfigurasi integrasi pihak ketiga (Email SMTP / Resend) di database (Item #264, #270).
 * Menghapus ketergantungan pada file .env sehingga pengaturan email dan domain
 * dapat dikelola langsung oleh Administrator melalui UI Settings.
 */

import dbPool from "../../src/lib/db";

export interface EmailIntegrationConfig {
  channel: string;
  provider: "smtp" | "resend";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string;
  smtpSecure: boolean;
  senderEmail: string;
  senderName: string;
  apiKey?: string;
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  updatedAt?: string;
}

const DEFAULT_EMAIL_CONFIG: EmailIntegrationConfig = {
  channel: "email",
  provider: "smtp",
  smtpHost: "mail.lanpro.my.id",
  smtpPort: 465,
  smtpUser: "admin@lanpro.my.id",
  smtpPass: "",
  smtpSecure: true,
  senderEmail: "admin@lanpro.my.id",
  senderName: "LanPro System",
  apiKey: "",
  subjectTemplate: "[LanPro] Pemberitahuan Sistem",
  bodyTemplate: "Halo {{user_name}},\n\nPemberitahuan penting dari sistem LanPro.",
};

function toEmailConfigRow(data: any): EmailIntegrationConfig {
  if (!data) return DEFAULT_EMAIL_CONFIG;
  return {
    channel: "email",
    provider: (data.provider === "resend" ? "resend" : "smtp") as "smtp" | "resend",
    smtpHost: data.smtpHost || "",
    smtpPort: data.smtpPort ? Number(data.smtpPort) : 465,
    smtpUser: data.smtpUser || "",
    smtpPass: data.smtpPass || "",
    smtpSecure: data.smtpSecure !== false && data.smtpSecure !== "false",
    senderEmail: data.senderEmail || "",
    senderName: data.senderName || "LanPro System",
    apiKey: data.apiKey || "",
    subjectTemplate: data.subjectTemplate ?? DEFAULT_EMAIL_CONFIG.subjectTemplate,
    bodyTemplate: data.bodyTemplate ?? DEFAULT_EMAIL_CONFIG.bodyTemplate,
    updatedAt: data.updatedAt,
  };
}

/**
 * Mengambil konfigurasi email dari database PostgreSQL.
 * Bila belum ada di database, baris default akan dibuat secara otomatis.
 */
export async function getEmailIntegrationConfig(): Promise<EmailIntegrationConfig> {
  if (
    (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === "test") &&
    !process.env.TEST_WITH_REAL_DB
  ) {
    return {
      ...DEFAULT_EMAIL_CONFIG,
      senderEmail: process.env.EMAIL_FROM || "",
      apiKey: process.env.RESEND_API_KEY || "",
    };
  }

  const connection = await dbPool.getConnection();
  try {
    const [rows]: any = await connection.query(
      `SELECT * FROM "IntegrationSettings" WHERE channel = 'email'`
    );
    const existing = Array.isArray(rows) ? rows[0] : null;
    if (existing) return toEmailConfigRow(existing);

    // Buat baris default bila belum ada
    await connection.query(
      `INSERT INTO "IntegrationSettings" (
        channel, provider, "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpSecure",
        "senderEmail", "senderName", "apiKey", "subjectTemplate", "bodyTemplate", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (channel) DO NOTHING`,
      [
        "email",
        DEFAULT_EMAIL_CONFIG.provider,
        DEFAULT_EMAIL_CONFIG.smtpHost,
        DEFAULT_EMAIL_CONFIG.smtpPort,
        DEFAULT_EMAIL_CONFIG.smtpUser,
        DEFAULT_EMAIL_CONFIG.smtpPass || "",
        DEFAULT_EMAIL_CONFIG.smtpSecure,
        DEFAULT_EMAIL_CONFIG.senderEmail,
        DEFAULT_EMAIL_CONFIG.senderName,
        DEFAULT_EMAIL_CONFIG.apiKey || "",
        DEFAULT_EMAIL_CONFIG.subjectTemplate,
        DEFAULT_EMAIL_CONFIG.bodyTemplate,
      ]
    );

    const [created]: any = await connection.query(
      `SELECT * FROM "IntegrationSettings" WHERE channel = 'email'`
    );
    return toEmailConfigRow(created && created[0] ? created[0] : DEFAULT_EMAIL_CONFIG);
  } catch (err) {
    console.error("[INTEGRATION] Gagal membaca konfigurasi email dari DB:", err);
    return DEFAULT_EMAIL_CONFIG;
  } finally {
    connection.release();
  }
}

/**
 * Menyimpan konfigurasi email baru ke database PostgreSQL.
 */
export async function saveEmailIntegrationConfig(
  input: Partial<EmailIntegrationConfig>
): Promise<EmailIntegrationConfig> {
  const connection = await dbPool.getConnection();
  try {
    const current = await getEmailIntegrationConfig();

    const provider = input.provider || current.provider || "smtp";
    const smtpHost = input.smtpHost !== undefined ? input.smtpHost : current.smtpHost;
    const smtpPort = input.smtpPort !== undefined ? Number(input.smtpPort) : current.smtpPort;
    const smtpUser = input.smtpUser !== undefined ? input.smtpUser : current.smtpUser;
    // Jangan menimpa password jika input kosong atau masked
    const smtpPass =
      input.smtpPass && !input.smtpPass.includes("••••") ? input.smtpPass : current.smtpPass;
    const smtpSecure =
      input.smtpSecure !== undefined ? Boolean(input.smtpSecure) : current.smtpSecure;
    const senderEmail = input.senderEmail !== undefined ? input.senderEmail : current.senderEmail;
    const senderName = input.senderName !== undefined ? input.senderName : current.senderName;
    const apiKey = input.apiKey && !input.apiKey.includes("••••") ? input.apiKey : current.apiKey;
    const subjectTemplate =
      input.subjectTemplate !== undefined ? input.subjectTemplate : current.subjectTemplate;
    const bodyTemplate =
      input.bodyTemplate !== undefined ? input.bodyTemplate : current.bodyTemplate;

    await connection.query(
      `
      INSERT INTO "IntegrationSettings" (
        channel, provider, "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpSecure",
        "senderEmail", "senderName", "apiKey", "subjectTemplate", "bodyTemplate", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (channel) DO UPDATE SET
        provider = EXCLUDED.provider,
        "smtpHost" = EXCLUDED."smtpHost",
        "smtpPort" = EXCLUDED."smtpPort",
        "smtpUser" = EXCLUDED."smtpUser",
        "smtpPass" = EXCLUDED."smtpPass",
        "smtpSecure" = EXCLUDED."smtpSecure",
        "senderEmail" = EXCLUDED."senderEmail",
        "senderName" = EXCLUDED."senderName",
        "apiKey" = EXCLUDED."apiKey",
        "subjectTemplate" = EXCLUDED."subjectTemplate",
        "bodyTemplate" = EXCLUDED."bodyTemplate",
        "updatedAt" = NOW()
      `,
      [
        "email",
        provider,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure,
        senderEmail,
        senderName,
        apiKey,
        subjectTemplate,
        bodyTemplate,
      ]
    );

    return getEmailIntegrationConfig();
  } finally {
    connection.release();
  }
}
