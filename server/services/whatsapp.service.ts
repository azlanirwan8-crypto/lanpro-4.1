import cron from "node-cron";
import dbPool from "../../src/lib/db";
import { getBroadcastConfig } from "./broadcastConfig.service";

const WA_API_URL = "https://api.fonnte.com/send";

/**
 * Token dibaca TANPA nilai fallback.
 *
 * Sebelumnya baris ini berbunyi `process.env.WHATSAPP_API_TOKEN ||
 * 'TOKEN_ANDA_DISINI'`. Nilai contoh itu membuat konfigurasi yang hilang
 * terlihat seolah ada: permintaan tetap dikirim, hanya saja dengan token
 * karangan, lalu gagal dengan pesan dari pihak ketiga yang tidak menjelaskan
 * apa pun. Konfigurasi yang hilang harus terlihat sebagai hilang
 * (ARCHITECTURE.md §3.2).
 */
function ambilToken(): string {
  return process.env.WHATSAPP_API_TOKEN || "";
}

export const terkonfigurasi = (): boolean => ambilToken() !== "";

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

/**
 * Menyalakan penjadwal digest broadcast WhatsApp (Item #193).
 *
 * Fungsi ini sebelumnya di-import di `server.ts` tetapi TIDAK PERNAH DIPANGGIL,
 * sehingga digest harian belum pernah menyala sekali pun sejak ditulis. Hanya
 * pemicu manual yang berfungsi.
 *
 * Jadwal (hari + jam) dan daftar penerima TIDAK LAGI hardcode — keduanya
 * dibaca dari `BroadcastConfig` (diatur lewat panel Settings → WhatsApp
 * gateway) setiap menit. Cron sendiri berjalan tiap menit hanya untuk
 * MENGECEK apakah waktu saat ini cocok dengan konfigurasi; ini memungkinkan
 * jadwal diubah dari UI tanpa perlu restart server.
 *
 * Bila token belum dikonfigurasi, penjadwal sengaja TIDAK didaftarkan sama
 * sekali. Mendaftarkannya hanya akan menghasilkan kegagalan setiap pagi tanpa
 * ada yang bisa diperbuat — lebih baik satu pesan jelas saat boot.
 */
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
      const { day, time } = jadwalSekarangWIB();
      const config = await getBroadcastConfig("whatsapp");

      if (!config.scheduleDays.includes(day) || config.scheduleTime !== time) return;

      // Cron bisa terpicu lebih dari sekali pada menit yang sama di beberapa
      // runtime; kunci hari+jam mencegah broadcast terkirim dobel.
      const key = `${day}-${time}`;
      if (lastTriggeredKey === key) return;
      lastTriggeredKey = key;

      console.log(`[WHATSAPP] Menjalankan broadcast terjadwal (hari ${day}, ${time} WIB)...`);
      await sendDailyTaskDigest(undefined, config.recipientIds, config.messageTemplate);
    } catch (err: any) {
      // Kegagalan satu jadwal tidak boleh mematikan penjadwal untuk jadwal
      // berikutnya. Tanpa penangkap ini, satu galat menghentikan seluruh
      // pengiriman berikutnya secara senyap.
      console.error("[WHATSAPP] Broadcast terjadwal gagal:", err?.message);
    }
  });

  console.log(
    "[WHATSAPP] Penjadwal broadcast dinamis aktif (dicek tiap menit dari BroadcastConfig)."
  );
};

export async function sendDailyTaskDigest(
  targetUserId?: number,
  recipientIds?: string[],
  messageTemplate?: string | null
) {
  const connection = await dbPool.getConnection();
  try {
    let query = "SELECT id, displayName, phone FROM Users WHERE phone IS NOT NULL";
    const params: any[] = [];
    if (targetUserId) {
      query += " AND id = ?";
      params.push(targetUserId);
    } else if (recipientIds && recipientIds.length > 0) {
      query += ` AND id IN (${recipientIds.map(() => "?").join(",")})`;
      params.push(...recipientIds);
    }
    const [users]: any = await connection.query(query, params);

    for (const user of users) {
      const [tasks]: any = await connection.query(
        `
        SELECT t.title, t.dueDate, t.status, p.name as "projectName"
        FROM Tasks t
        LEFT JOIN Projects p ON t."projectId" = p.id
        WHERE t.assigneeId = ?
        AND t.status IN ('To Do', 'In Progress', 'Testing')
        ORDER BY p.name, t.dueDate
      `,
        [user.id]
      );

      if (tasks.length > 0) {
        const message = formatMessage(user.displayName, tasks, messageTemplate);
        await sendToWhatsApp(user.phone, message);
      }
    }
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
 * Titik status jadi penanda cepat-dipindai — pola yang sama dipakai bot
 * digest Slack/Asana/Jira: warna di depan baris jauh lebih cepat dibaca
 * di layar HP daripada teks status saja.
 */
const STATUS_EMOJI: Record<string, string> = {
  "to do": "⚪",
  "in progress": "🟡",
  "in review": "🟣",
  testing: "🔵",
  blocked: "🔴",
  done: "🟢",
};

function statusEmoji(status: string): string {
  return STATUS_EMOJI[String(status || "").toLowerCase()] || "⚪";
}

/**
 * Menyusun isi pesan (Item #193/#194). Sapaan pembuka bisa dikustomisasi
 * admin lewat panel Settings → WhatsApp gateway → "Edit Broadcast Template"
 * (variabel `{{user_name}}` diganti); daftar tugas SELALU disusun
 * terprogram — dikelompokkan per project, bernomor, dengan tanggal yang
 * sudah diformat — sebab satu digest berisi BANYAK tugas dari BANYAK
 * project per pengguna, sesuatu yang tidak bisa diwakili satu string
 * template statis.
 *
 * Desain dibenchmark ke pola notifikasi digest Slack/Asana/Jira (dot status
 * berwarna, tautan CTA jelas ke aplikasi) dan disamakan dengan digest email
 * yang sudah ada (`email.service.ts` — tombol "Buka Dashboard LanPro" ke
 * `APP_URL`), supaya kedua kanal punya identitas visual yang konsisten.
 */
export function formatMessage(name: string, tasks: any[], messageTemplate?: string | null) {
  const greeting =
    messageTemplate && messageTemplate.trim()
      ? messageTemplate.replace(/\{\{user_name\}\}/g, name)
      : `Hi ${name}`;

  const groups = new Map<string, any[]>();
  for (const t of tasks) {
    const proyek = t.projectName || "Tanpa Project";
    if (!groups.has(proyek)) groups.set(proyek, []);
    groups.get(proyek)!.push(t);
  }

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

  let msg = `*LanPro — Ringkasan Tugas*\n\n${greeting}\n`;
  for (const [projectName, projectTasks] of groups) {
    msg += `\n📁 Project *${projectName}*\n`;
    projectTasks.forEach((t, i) => {
      msg += `${i + 1}. *${t.title}*\n   ${statusEmoji(t.status)} ${t.status} · 📅 ${formatTanggal(t.dueDate)}\n`;
    });
  }

  msg += `\n🔗 Buka dashboard Anda: ${appUrl}\n\nTerima kasih 🙏`;
  return msg;
}

async function sendToWhatsApp(phone: string, message: string) {
  const token = ambilToken();
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
  } catch (err) {
    console.error(`[DEBUG] Failed to send WA to ${phone}:`, err);
    throw err;
  }
}
