import cron from "node-cron";
import dbPool from "../../src/lib/db";
import { getBroadcastConfig, claimBroadcastFire } from "./broadcastConfig.service";
import { ambilAppUrl } from "./email.service";
import { ambilWhatsappToken } from "./integrationSettings.service";

const WA_API_URL = "https://api.fonnte.com/send";

/**
 * Token dibaca dari database IntegrationSettings (channel whatsapp),
 * dengan fallback ke process.env.WHATSAPP_API_TOKEN (Item #279).
 */
export async function ambilToken(): Promise<string> {
  return ambilWhatsappToken();
}

export const terkonfigurasi = (): boolean => (process.env.WHATSAPP_API_TOKEN || "") !== "";

/** Hari ISO (1=Senin..7=Minggu) & jam "HH:MM" saat ini di zona Asia/Jakarta. */
function jadwalSekarangWIB(): { day: string; time: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const byType: Record<string, string> = {};
  for (const p of parts) byType[p.type] = p.value;

  const weekdayIso: Record<string, string> = {
    Mon: "1",
    Tue: "2",
    Wed: "3",
    Thu: "4",
    Fri: "5",
    Sat: "6",
    Sun: "7",
  };

  return {
    day: weekdayIso[byType.weekday] || "1",
    time: `${byType.hour}:${byType.minute}`,
  };
}

let lastTriggeredKey = "";

/** Satu tick penjadwal — dipanggil node-cron lokal atau Vercel Cron (#304). */
export async function tickWhatsAppScheduler(): Promise<void> {
  const token = await ambilToken();
  if (!token) return;

  const { day, time } = jadwalSekarangWIB();
  const config = await getBroadcastConfig("whatsapp");

  if (!config.scheduleDays.includes(day) || config.scheduleTime !== time) return;

  const key = `${day}-${time}`;
  if (lastTriggeredKey === key) return;

  const claimed = await claimBroadcastFire("whatsapp", key);
  if (!claimed) return;
  lastTriggeredKey = key;

  console.log(`[WHATSAPP] Menjalankan broadcast terjadwal (hari ${day}, ${time} WIB)...`);
  await sendDailyTaskDigest(undefined, config.recipientIds, config.messageTemplate);
}

export const initWhatsAppScheduler = () => {
  if (!terkonfigurasi()) {
    console.warn(
      "[WHATSAPP] WHATSAPP_API_TOKEN belum diisi — penjadwal digest harian tidak dinyalakan. " +
        "Isi variabel tersebut bila fitur ini ingin dipakai."
    );
    return;
  }

  cron.schedule("* * * * *", async () => {
    try {
      await tickWhatsAppScheduler();
    } catch (err: any) {
      console.error("[WHATSAPP] Broadcast terjadwal gagal:", err?.message);
    }
  });

  console.log(
    "[WHATSAPP] Penjadwal broadcast dinamis aktif (dicek tiap menit dari BroadcastConfig & DB Settings)."
  );
};

export async function sendDailyTaskDigest(
  targetUserId?: number | string,
  recipientIds?: string[],
  messageTemplate?: string | null
): Promise<{ totalDikirim: number; totalPenerima: number }> {
  const connection = await dbPool.getConnection();
  try {
    let query = 'SELECT id, "displayName", phone FROM "Users" WHERE phone IS NOT NULL';
    const params: any[] = [];
    if (targetUserId) {
      query += " AND (id = ? OR username = ? OR uid = ?)";
      params.push(targetUserId, targetUserId, targetUserId);
    } else if (recipientIds && recipientIds.length > 0) {
      query += ` AND (id IN (${recipientIds.map(() => "?").join(",")}) OR username IN (${recipientIds.map(() => "?").join(",")}) OR uid IN (${recipientIds.map(() => "?").join(",")}))`;
      params.push(...recipientIds, ...recipientIds, ...recipientIds);
    }
    const [users]: any = await connection.query(query, params);

    // Item #278: dibaca sekali per digest, bukan per pesan — sumbernya
    // basis data (UI Settings), dengan env APP_URL sebagai cadangan.
    const appUrlAktif = await ambilAppUrl();
    let totalDikirim = 0;

    for (const user of users) {
      const [tasks]: any = await connection.query(
        `
        SELECT t.id, t.title, t.dueDate, t.status, t.priority, p.name as "projectName"
        FROM Tasks t
        LEFT JOIN Projects p ON t."projectId" = p.id
        WHERE t.assigneeId = ?
        AND t.status IN ('To Do', 'In Progress', 'Testing')
        ORDER BY p.name, t.dueDate
      `,
        [user.id]
      );

      if (tasks.length > 0) {
        const message = formatMessage(user.displayName, tasks, messageTemplate, appUrlAktif);
        await sendToWhatsApp(user.phone, message);
        totalDikirim++;
      }
    }

    return { totalDikirim, totalPenerima: users.length };
  } catch (error) {
    console.error("[DEBUG] Error in daily task digest:", error);
    throw error;
  } finally {
    connection.release();
  }
}

/** Formats a due date as "DD/MM/YYYY", or "-" when missing/invalid. */
export function formatTanggal(dueDate: any): string {
  if (!dueDate) return "-";
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Template default LAMA yang pernah tersimpan di `BroadcastConfig` sebelum
 * item #193/#194 ada — ditulis untuk SATU tugas (`{{task_key}}`,
 * `{{task_title}}`, `{{status}}`), tidak cocok untuk digest berisi BANYAK
 * tugas. Admin yang membuka panel sebelum perbaikan ini punya baris
 * tersimpan berisi teks ini secara harfiah; tanpa deteksi di sini, teks
 * lama itu akan terus dipakai wholesale sebagai sapaan dan membocorkan
 * placeholder-nya ke WhatsApp SUNGGUHAN — persis yang dilaporkan pemilik
 * proyek. Cocok → diperlakukan seolah admin belum kustomisasi apa pun.
 */
const TEMPLATE_LAMA_DIKENALI = [
  "you have been assigned to task",
  "please check the dashboard for details",
];

function isTemplateLegacy(template: string): boolean {
  const lower = template.toLowerCase();
  return TEMPLATE_LAMA_DIKENALI.some((penanda) => lower.includes(penanda));
}

/**
 * Format daftar tiket bernomor untuk WhatsApp (Item #499).
 * Contoh:
 * 1. Tugas: ( Fix Authentication Flow )
 *     Status: ( IN_PROGRESS )
 *     Prioritas: ( high )
 *     Tanggal Terakhir : ( 10/09/2026 )
 */
export function formatTaskList(tasks: any[]): string {
  return tasks
    .map((t, idx) => {
      const title = t.title || "Tanpa Judul";
      const status = t.status || "-";
      const priority = t.priority || "-";
      const tanggal = formatTanggal(t.dueDate);
      return (
        `${idx + 1}. Tugas: ( ${title} )\n` +
        `    Status: ( ${status} )\n` +
        `    Prioritas: ( ${priority} )\n` +
        `    Tanggal Terakhir : ( ${tanggal} )`
      );
    })
    .join("\n");
}

/**
 * Menyusun isi pesan WhatsApp Task Assignment (Item #499).
 * Mendukung kustomisasi template melalui BroadcastConfig.
 * Placeholder yang didukung: {{user_name}}, {{task_list}}, {{app_url}}, {{project_name}}.
 */
export function formatMessage(
  name: string,
  tasks: any[],
  messageTemplate?: string | null,
  appUrlOverride?: string
) {
  const projectNames = Array.from(new Set(tasks.map((t) => t.projectName || "Tanpa Project")));
  const projectNameUntukTemplate = projectNames.length === 1 ? projectNames[0] : "beberapa project";
  const appUrl = (appUrlOverride || process.env.APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );

  const taskListText = formatTaskList(tasks);

  const templateBersih =
    messageTemplate && messageTemplate.trim() && !isTemplateLegacy(messageTemplate)
      ? messageTemplate
      : null;

  // Jika template kustom mengandung {{task_list}}
  if (templateBersih && templateBersih.includes("{{task_list}}")) {
    return templateBersih
      .replace(/\{\{user_name\}\}/g, name)
      .replace(/\{\{task_list\}\}/g, taskListText)
      .replace(/\{\{app_url\}\}/g, appUrl)
      .replace(/\{\{project_name\}\}/g, projectNameUntukTemplate)
      .replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")
      .trim();
  }

  // Jika template kustom hanya berisi salam/sapaan kustom
  const greeting = templateBersih
    ? templateBersih
        .replace(/\{\{user_name\}\}/g, name)
        .replace(/\{\{project_name\}\}/g, projectNameUntukTemplate)
        .replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")
        .trim()
    : `Halo ${name},`;

  let msg = `[LanPro] Task Assignment\n`;
  msg += `${greeting}\n`;
  msg += `Kamu telah ditugaskan untuk tiket berikut:\n`;
  msg += `${taskListText}\n\n`;
  msg += `Silakan cek detail tugas melalui tautan berikut:\n`;
  msg += `${appUrl}\n\n`;
  msg += `Terima kasih.`;
  return msg;
}

async function sendToWhatsApp(phone: string, message: string) {
  const token = await ambilToken();
  if (!token) {
    throw new Error("[WHATSAPP] WHATSAPP_API_TOKEN belum diisi. Pesan tidak dikirim.");
  }

  try {
    // Fonnte API expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("target", phone);
    formData.append("message", message);

    const response = await fetch(WA_API_URL, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const responseData = await response.json();
    // WhatsApp API response received

    if (!responseData.status) {
      throw new Error(responseData.reason || "Failed to send WhatsApp message");
    }
    return responseData;
  } catch (err) {
    console.error(`[DEBUG] Failed to send WA to ${phone}:`, err);
    throw err;
  }
}

export async function sendSingleWhatsAppMessage(phone: string, message: string) {
  return sendToWhatsApp(phone, message);
}
