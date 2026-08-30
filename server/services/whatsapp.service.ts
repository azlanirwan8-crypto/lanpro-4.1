import cron from "node-cron";
import dbPool from "../../src/lib/db";
import { getBroadcastConfig } from "./broadcastConfig.service";
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
      const token = await ambilToken();
      if (!token) return;

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
    "[WHATSAPP] Penjadwal broadcast dinamis aktif (dicek tiap menit dari BroadcastConfig & DB Settings)."
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

    // Item #278: dibaca sekali per digest, bukan per pesan — sumbernya
    // basis data (UI Settings), dengan env APP_URL sebagai cadangan.
    const appUrlAktif = await ambilAppUrl();

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
        const message = formatMessage(user.displayName, tasks, messageTemplate, appUrlAktif);
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

/** "Tenggat: DD/MM/YYYY", atau "(Tenggat: Belum diatur)" — TIDAK PERNAH "null" literal. */
function formatTenggat(dueDate: any): string {
  if (!dueDate) return "(Tenggat: Belum diatur)";
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return "(Tenggat: Belum diatur)";
  return `Tenggat: ${formatTanggal(dueDate)}`;
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
 * Menyusun isi pesan (Item #193/#194, format "Daily Stand-up" diminta
 * pemilik proyek 26 Agu 2026). Sapaan pembuka bisa dikustomisasi admin
 * lewat panel Settings → WhatsApp gateway → "Edit Broadcast Template" —
 * mendukung `{{user_name}}` dan `{{project_name}}`; daftar tugas SELALU
 * disusun terprogram — dikelompokkan per STATUS (Sedang Berjalan / Menunggu
 * Eksekusi), sebab itu yang paling relevan dibaca cepat tiap pagi, bukan
 * per project. Nama project ikut disebut per baris tugas hanya bila
 * pengguna punya tugas dari LEBIH dari satu project sekaligus — kalau
 * cuma satu, cukup disebut sekali di header supaya pesan tidak berulang.
 *
 * Jaring pengaman: placeholder APA PUN yang tersisa tak-terganti setelah
 * substitusi (mis. `{{task_key}}` dari template lama yang belum dibersihkan
 * admin) dibuang, bukan dikirim mentah — pesan WhatsApp sungguhan tidak
 * boleh pernah menampilkan `{{...}}` literal.
 */
// Item #278: `appUrl` diterima sebagai parameter, bukan dibaca dari env di
// dalam fungsi ini, supaya sumber URL aplikasi tunggal (basis data) dan
// fungsi ini tetap murni serta mudah diuji.
export function formatMessage(
  name: string,
  tasks: any[],
  messageTemplate?: string | null,
  appUrlOverride?: string
) {
  const projectNames = Array.from(new Set(tasks.map((t) => t.projectName || "Tanpa Project")));
  const headerProject = projectNames.length === 1 ? ` - ${projectNames[0]}` : "";
  const projectNameUntukTemplate = projectNames.length === 1 ? projectNames[0] : "beberapa project";
  const appUrl = (appUrlOverride || process.env.APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );

  const templateBersih =
    messageTemplate && messageTemplate.trim() && !isTemplateLegacy(messageTemplate)
      ? messageTemplate
      : null;

  const greeting = templateBersih
    ? templateBersih
        .replace(/\{\{user_name\}\}/g, name)
        .replace(/\{\{project_name\}\}/g, projectNameUntukTemplate)
        .replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")
        .trim()
    : `Halo ${name},`;

  const bulletLine = (t: any) => {
    const proyek = projectNames.length > 1 ? ` (${t.projectName || "Tanpa Project"})` : "";
    return `• ${t.title}${proyek} — ${formatTenggat(t.dueDate)}`;
  };

  const sedangBerjalan = tasks.filter(
    (t) => String(t.status || "").toLowerCase() === "in progress"
  );
  const menungguEksekusi = tasks.filter(
    (t) => String(t.status || "").toLowerCase() !== "in progress"
  );

  let msg = `*[LanPro] 📊 Ringkasan Tugas${headerProject}*\n\n`;
  msg += `${greeting}\nBerikut adalah ringkasan tugas Anda:\n`;

  if (sedangBerjalan.length > 0) {
    msg += `\n🚀 *SEDANG BERJALAN (In Progress)*\n${sedangBerjalan.map(bulletLine).join("\n")}\n`;
  }
  if (menungguEksekusi.length > 0) {
    msg += `\n📋 *MENUNGGU EKSEKUSI (Pending/To Do)*\n${menungguEksekusi.map(bulletLine).join("\n")}\n`;
  }

  msg += `\nMohon perbarui status tugas Anda jika ada progres terbaru.\nCek detail selengkapnya di: ${appUrl}`;
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
  } catch (err) {
    console.error(`[DEBUG] Failed to send WA to ${phone}:`, err);
    throw err;
  }
}
