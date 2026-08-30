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
  /** Item #278: URL aplikasi untuk tautan di dalam email. Kosong = pakai env APP_URL. */
  appUrl: string;
  updatedAt?: string;
}

/**
 * Item #300: host, pengguna, dan alamat pengirim sengaja KOSONG.
 *
 * Versi sebelumnya menyemai `mail.lanpro.my.id` dan `admin@lanpro.my.id`, dan
 * itu membuat pemasangan yang belum pernah disentuh admin tampak sudah
 * terkonfigurasi: `statusEmailServiceAsync()` melaporkan host yang tidak
 * pernah dipilih siapa pun, dan kegagalan kirim terbaca seperti salah sandi
 * alih-alih seperti "memang belum diatur". Port 465 dan `smtpSecure`
 * dipertahankan sebab keduanya bawaan yang benar begitu host diisi.
 */
export const DEFAULT_EMAIL_CONFIG: EmailIntegrationConfig = {
  channel: "email",
  provider: "smtp",
  smtpHost: "",
  smtpPort: 465,
  smtpUser: "",
  smtpPass: "",
  smtpSecure: true,
  senderEmail: "",
  senderName: "LanPro System",
  apiKey: "",
  subjectTemplate: "[LanPro] Pemberitahuan Sistem",
  bodyTemplate: "Halo {{user_name}},\n\nPemberitahuan penting dari sistem LanPro.",
  appUrl: "",
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
    appUrl: data.appUrl || "",
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
        "senderEmail", "senderName", "apiKey", "subjectTemplate", "bodyTemplate", "appUrl", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
        DEFAULT_EMAIL_CONFIG.appUrl,
      ]
    );

    const [created]: any = await connection.query(
      `SELECT * FROM "IntegrationSettings" WHERE channel = 'email'`
    );
    return toEmailConfigRow(created && created[0] ? created[0] : DEFAULT_EMAIL_CONFIG);
  } catch (err) {
    console.error("[INTEGRATION] Gagal membaca konfigurasi email dari DB:", err);
    throw err;
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
    // Item #278: dinormalkan di sini supaya tautan email tidak pernah berakhir
    // dengan garis miring ganda, apa pun yang diketik admin di UI.
    const appUrl =
      input.appUrl !== undefined ? String(input.appUrl).trim().replace(/\/+$/, "") : current.appUrl;

    await connection.query(
      `
      INSERT INTO "IntegrationSettings" (
        channel, provider, "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpSecure",
        "senderEmail", "senderName", "apiKey", "subjectTemplate", "bodyTemplate", "appUrl", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
        "appUrl" = EXCLUDED."appUrl",
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
        appUrl,
      ]
    );

    return getEmailIntegrationConfig();
  } finally {
    connection.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Item #279: Konfigurasi Sistem Operasional (SSO Domains, CORS, Slack Webhook)
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemIntegrationConfig {
  channel: "system";
  ssoAllowedDomains: string;
  slackWebhookUrl: string;
  allowedOrigins: string;
  appUrl: string;
  updatedAt?: string;
}

const DEFAULT_SYSTEM_CONFIG: SystemIntegrationConfig = {
  channel: "system",
  ssoAllowedDomains: "",
  slackWebhookUrl: "",
  allowedOrigins: "",
  appUrl: "",
};

function toSystemConfigRow(data: any): SystemIntegrationConfig {
  if (!data) return DEFAULT_SYSTEM_CONFIG;
  return {
    channel: "system",
    ssoAllowedDomains: data.ssoAllowedDomains || "",
    slackWebhookUrl: data.slackWebhookUrl || "",
    allowedOrigins: data.allowedOrigins || "",
    appUrl: data.appUrl || "",
    updatedAt: data.updatedAt,
  };
}

export async function getSystemIntegrationConfig(): Promise<SystemIntegrationConfig> {
  if (
    (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === "test") &&
    !process.env.TEST_WITH_REAL_DB
  ) {
    return {
      ...DEFAULT_SYSTEM_CONFIG,
      ssoAllowedDomains: process.env.SSO_ALLOWED_DOMAINS || "",
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
      allowedOrigins: process.env.ALLOWED_ORIGINS || "",
      appUrl: process.env.APP_URL || "",
    };
  }

  const connection = await dbPool.getConnection();
  try {
    const [rows]: any = await connection.query(
      `SELECT * FROM "IntegrationSettings" WHERE channel = 'system'`
    );
    const existing = Array.isArray(rows) ? rows[0] : null;
    if (existing) return toSystemConfigRow(existing);

    await connection.query(
      `INSERT INTO "IntegrationSettings" (
        channel, "ssoAllowedDomains", "slackWebhookUrl", "allowedOrigins", "appUrl", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, NOW())
      ON CONFLICT (channel) DO NOTHING`,
      [
        "system",
        DEFAULT_SYSTEM_CONFIG.ssoAllowedDomains,
        DEFAULT_SYSTEM_CONFIG.slackWebhookUrl,
        DEFAULT_SYSTEM_CONFIG.allowedOrigins,
        DEFAULT_SYSTEM_CONFIG.appUrl,
      ]
    );

    const [created]: any = await connection.query(
      `SELECT * FROM "IntegrationSettings" WHERE channel = 'system'`
    );
    return toSystemConfigRow(created && created[0] ? created[0] : DEFAULT_SYSTEM_CONFIG);
  } catch (err) {
    console.error("[INTEGRATION] Gagal membaca konfigurasi sistem dari DB:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function saveSystemIntegrationConfig(
  input: Partial<SystemIntegrationConfig>
): Promise<SystemIntegrationConfig> {
  const connection = await dbPool.getConnection();
  try {
    const current = await getSystemIntegrationConfig();

    const ssoAllowedDomains =
      input.ssoAllowedDomains !== undefined
        ? input.ssoAllowedDomains.trim()
        : current.ssoAllowedDomains;
    const slackWebhookUrl =
      input.slackWebhookUrl !== undefined ? input.slackWebhookUrl.trim() : current.slackWebhookUrl;
    const allowedOrigins =
      input.allowedOrigins !== undefined ? input.allowedOrigins.trim() : current.allowedOrigins;
    const appUrl =
      input.appUrl !== undefined ? String(input.appUrl).trim().replace(/\/+$/, "") : current.appUrl;

    await connection.query(
      `
      INSERT INTO "IntegrationSettings" (
        channel, "ssoAllowedDomains", "slackWebhookUrl", "allowedOrigins", "appUrl", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, NOW())
      ON CONFLICT (channel) DO UPDATE SET
        "ssoAllowedDomains" = EXCLUDED."ssoAllowedDomains",
        "slackWebhookUrl" = EXCLUDED."slackWebhookUrl",
        "allowedOrigins" = EXCLUDED."allowedOrigins",
        "appUrl" = EXCLUDED."appUrl",
        "updatedAt" = NOW()
      `,
      ["system", ssoAllowedDomains, slackWebhookUrl, allowedOrigins, appUrl]
    );

    return getSystemIntegrationConfig();
  } finally {
    connection.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Item #263, #279: Konfigurasi Koneksi WhatsApp (DB-backed)
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsAppIntegrationConfig {
  channel: "whatsapp";
  provider: string;
  endpoint: string;
  token: string;
  senderNumber: string;
  deviceId: string;
  updatedAt?: string;
}

const DEFAULT_WHATSAPP_CONFIG: WhatsAppIntegrationConfig = {
  channel: "whatsapp",
  provider: "fonnte",
  endpoint: "https://api.fonnte.com/send",
  token: "",
  senderNumber: "",
  deviceId: "",
};

function toWhatsAppConfigRow(data: any): WhatsAppIntegrationConfig {
  if (!data) return DEFAULT_WHATSAPP_CONFIG;
  return {
    channel: "whatsapp",
    provider: data.provider || DEFAULT_WHATSAPP_CONFIG.provider,
    endpoint: data.endpoint || DEFAULT_WHATSAPP_CONFIG.endpoint,
    token: data.apiKey || "",
    senderNumber: data.senderNumber || "",
    deviceId: data.deviceId || "",
    updatedAt: data.updatedAt,
  };
}

export async function getWhatsAppIntegrationConfig(): Promise<WhatsAppIntegrationConfig> {
  if (
    (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === "test") &&
    !process.env.TEST_WITH_REAL_DB
  ) {
    return {
      ...DEFAULT_WHATSAPP_CONFIG,
      token: process.env.WHATSAPP_API_TOKEN || "",
    };
  }

  const connection = await dbPool.getConnection();
  try {
    const [rows]: any = await connection.query(
      `SELECT * FROM "IntegrationSettings" WHERE channel = 'whatsapp'`
    );
    const existing = Array.isArray(rows) ? rows[0] : null;
    if (existing) return toWhatsAppConfigRow(existing);

    await connection.query(
      `INSERT INTO "IntegrationSettings" (
        channel, provider, endpoint, "apiKey", "senderNumber", "deviceId", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (channel) DO NOTHING`,
      [
        "whatsapp",
        DEFAULT_WHATSAPP_CONFIG.provider,
        DEFAULT_WHATSAPP_CONFIG.endpoint,
        DEFAULT_WHATSAPP_CONFIG.token,
        DEFAULT_WHATSAPP_CONFIG.senderNumber,
        DEFAULT_WHATSAPP_CONFIG.deviceId,
      ]
    );

    const [created]: any = await connection.query(
      `SELECT * FROM "IntegrationSettings" WHERE channel = 'whatsapp'`
    );
    return toWhatsAppConfigRow(created && created[0] ? created[0] : DEFAULT_WHATSAPP_CONFIG);
  } catch (err) {
    console.error("[INTEGRATION] Gagal membaca konfigurasi WhatsApp dari DB:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function saveWhatsAppIntegrationConfig(
  input: Partial<WhatsAppIntegrationConfig>
): Promise<WhatsAppIntegrationConfig> {
  const connection = await dbPool.getConnection();
  try {
    const current = await getWhatsAppIntegrationConfig();

    const provider = input.provider || current.provider || "fonnte";
    const endpoint = input.endpoint !== undefined ? input.endpoint.trim() : current.endpoint;
    const token = input.token && !input.token.includes("••••") ? input.token.trim() : current.token;
    const senderNumber =
      input.senderNumber !== undefined ? input.senderNumber.trim() : current.senderNumber;
    const deviceId = input.deviceId !== undefined ? input.deviceId.trim() : current.deviceId;

    await connection.query(
      `
      INSERT INTO "IntegrationSettings" (
        channel, provider, endpoint, "apiKey", "senderNumber", "deviceId", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (channel) DO UPDATE SET
        provider = EXCLUDED.provider,
        endpoint = EXCLUDED.endpoint,
        "apiKey" = EXCLUDED."apiKey",
        "senderNumber" = EXCLUDED."senderNumber",
        "deviceId" = EXCLUDED."deviceId",
        "updatedAt" = NOW()
      `,
      ["whatsapp", provider, endpoint, token, senderNumber, deviceId]
    );

    return getWhatsAppIntegrationConfig();
  } finally {
    connection.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Item #279: Resolusi Hierarkis (Database → Environment Variable → Default)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mengambil daftar domain email yang diizinkan untuk SSO.
 * Urutan: DB (ssoAllowedDomains) -> env SSO_ALLOWED_DOMAINS -> default.
 */
export async function ambilSsoAllowedDomains(): Promise<string[]> {
  try {
    const sys = await getSystemIntegrationConfig();
    if (sys.ssoAllowedDomains && sys.ssoAllowedDomains.trim() !== "") {
      return sys.ssoAllowedDomains
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
    }
  } catch {
    // Database tidak terbaca, jatuh ke env
  }

  const envDomains = process.env.SSO_ALLOWED_DOMAINS || "";
  if (envDomains.trim() !== "") {
    return envDomains
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }

  return ["rajonet.com", "bni.co.id", "gmail.com", "outlook.com"];
}

/**
 * Mengambil daftar origin CORS tambahan yang diizinkan.
 * Urutan: DB (allowedOrigins) -> env ALLOWED_ORIGINS -> env APP_URL -> [].
 */
export async function ambilAllowedOrigins(): Promise<string[]> {
  try {
    const sys = await getSystemIntegrationConfig();
    if (sys.allowedOrigins && sys.allowedOrigins.trim() !== "") {
      return sys.allowedOrigins
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, ""))
        .filter(Boolean);
    }
  } catch {
    // Database tidak terbaca, jatuh ke env
  }

  const envOrigins = process.env.ALLOWED_ORIGINS || process.env.APP_URL || "";
  return envOrigins
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Mengambil URL Slack Webhook.
 * Urutan: DB (slackWebhookUrl) -> env SLACK_WEBHOOK_URL -> "".
 */
export async function ambilSlackWebhookUrl(): Promise<string> {
  try {
    const sys = await getSystemIntegrationConfig();
    if (sys.slackWebhookUrl && sys.slackWebhookUrl.trim() !== "") {
      return sys.slackWebhookUrl.trim();
    }
  } catch {
    // Database tidak terbaca, jatuh ke env
  }

  return (process.env.SLACK_WEBHOOK_URL || "").trim();
}

/**
 * Mengambil token API WhatsApp.
 * Urutan: DB (token di channel whatsapp) -> env WHATSAPP_API_TOKEN -> "".
 */
export async function ambilWhatsappToken(): Promise<string> {
  try {
    const wa = await getWhatsAppIntegrationConfig();
    if (wa.token && wa.token.trim() !== "") {
      return wa.token.trim();
    }
  } catch {
    // Database tidak terbaca, jatuh ke env
  }

  return (process.env.WHATSAPP_API_TOKEN || "").trim();
}
