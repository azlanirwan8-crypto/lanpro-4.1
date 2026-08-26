/**
 * Konfigurasi jadwal & penerima broadcast (Item #193).
 *
 * Satu baris per channel ("whatsapp"). Sebelumnya jadwal dan penerima
 * hardcode di kode server tanpa tempat penyimpanan; modul ini menjadi
 * satu-satunya sumber kebenaran yang dibaca baik oleh panel pengaturan
 * (server/routes/system.routes.ts) maupun penjadwal cron
 * (server/services/whatsapp.service.ts).
 */

import dbPool from "../../src/lib/db";

export interface BroadcastConfigData {
  channel: string;
  scheduleDays: string[];
  scheduleTime: string;
  recipientIds: string[];
  messageTemplate: string | null;
}

const DEFAULT_TEMPLATE =
  "*[LanPro] Task Assignment*\n\nHi {{user_name}},\n\nYou have been assigned to task *{{task_key}}*: {{task_title}}.\n_Status_: {{status}}\n_Project_: {{project_name}}\n\nPlease check the dashboard for details.";

function toRow(data: any): BroadcastConfigData {
  return {
    channel: data.channel,
    scheduleDays: String(data.scheduleDays || "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
    scheduleTime: data.scheduleTime || "07:00",
    recipientIds: String(data.recipientIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    messageTemplate: data.messageTemplate ?? DEFAULT_TEMPLATE,
  };
}

/** Mengambil config channel tertentu, membuat baris default bila belum ada. */
export async function getBroadcastConfig(channel: string): Promise<BroadcastConfigData> {
  const connection = await dbPool.getConnection();
  try {
    const [rows]: any = await connection.query(
      `SELECT * FROM "BroadcastConfig" WHERE channel = ?`,
      [channel]
    );
    const existing = Array.isArray(rows) ? rows[0] : null;
    if (existing) return toRow(existing);

    await connection.query(
      `INSERT INTO "BroadcastConfig" (channel, "messageTemplate") VALUES (?, ?)
       ON CONFLICT (channel) DO NOTHING`,
      [channel, DEFAULT_TEMPLATE]
    );
    const [created]: any = await connection.query(
      `SELECT * FROM "BroadcastConfig" WHERE channel = ?`,
      [channel]
    );
    return toRow(created[0]);
  } finally {
    connection.release();
  }
}

/** Menyimpan (upsert) config channel tertentu. */
export async function saveBroadcastConfig(
  channel: string,
  input: {
    scheduleDays: string[];
    scheduleTime: string;
    recipientIds: string[];
    messageTemplate: string;
  }
): Promise<BroadcastConfigData> {
  const connection = await dbPool.getConnection();
  try {
    await connection.query(
      `
      INSERT INTO "BroadcastConfig" (channel, "scheduleDays", "scheduleTime", "recipientIds", "messageTemplate", "updatedAt")
      VALUES (?, ?, ?, ?, ?, NOW())
      ON CONFLICT (channel) DO UPDATE SET
        "scheduleDays" = EXCLUDED."scheduleDays",
        "scheduleTime" = EXCLUDED."scheduleTime",
        "recipientIds" = EXCLUDED."recipientIds",
        "messageTemplate" = EXCLUDED."messageTemplate",
        "updatedAt" = NOW()
      `,
      [
        channel,
        input.scheduleDays.join(","),
        input.scheduleTime,
        input.recipientIds.join(","),
        input.messageTemplate,
      ]
    );
    return getBroadcastConfig(channel);
  } finally {
    connection.release();
  }
}
