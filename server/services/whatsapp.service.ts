import cron from "node-cron";
import dbPool from "../../src/lib/db";
import {
  getBroadcastConfig,
  claimBroadcastFire,
  DEFAULT_WHATSAPP_TEMPLATE,
} from "./broadcastConfig.service";
import { ambilAppUrl } from "./email.service";
import { ambilWhatsappToken } from "./integrationSettings.service";
import { recordBroadcastLog } from "./broadcastLog.service";

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

export interface WhatsAppDigestFailure {
  userId: string;
  name: string;
  phone: string;
  reason: string;
}

export interface WhatsAppDigestResult {
  totalDikirim: number;
  totalPenerima: number;
  totalGagal: number;
  totalTanpaTugas: number;
  totalTopikRapat: number;
  kegagalan: WhatsAppDigestFailure[];
}

/**
 * Satu topik rapat yang ditugaskan ke pengguna (#744).
 *
 * Sengaja HANYA dua medan ini. Pemilik proyek meminta "informasinya saja
 * (topiknya saja)": catatan rapat bisa berisi pembahasan sensitif, dan pesan
 * ini keluar ke nomor WhatsApp pribadi. `keterangan`, `tindakanLanjut`,
 * `transcript`, dan `aiSummary` TIDAK boleh ikut ke sini.
 */
export interface TopikRapat {
  judulRapat: string;
  topik: string;
}

/**
 * Batas topik rapat per pesan (#744). Tanpa batas, satu pengguna yang memegang
 * belasan titik diskusi menghasilkan pesan 1.500+ karakter yang tidak terbaca
 * di ponsel dan mendekati batas praktis gateway. Sisanya dilaporkan sebagai
 * satu baris hitungan, bukan dibuang diam-diam.
 */
export const BATAS_TOPIK_RAPAT = 10;

/**
 * Topik titik diskusi Meeting Notes yang ditugaskan ke pengguna (#744).
 *
 * TIGA hal yang mudah salah di sini, semuanya sudah diukur sebelumnya:
 *
 * 1. **Identitas.** `discussion_point_assignees.user_id` menyimpan `Users.uid`,
 *    BUKAN `Users.id` — `DiscussionPointsTable.tsx:541` membangun opsinya dari
 *    `String(m?.uid || m?.id)`. Karena itu pemanggil mengirim ketiga kunci
 *    (id, uid, username) persis seperti kueri tiket di bawah, bukan satu.
 *
 * 2. **Dua sumber.** Kolom tunggal lama `"assignTo"` MASIH ditulis sampai hari
 *    ini (`discussion-points.routes.ts:101` dan `:160`), berdampingan dengan
 *    tabel jamak #703. Membaca salah satunya saja membuat sebagian data
 *    pengguna tidak muncul. `EXISTS` dipakai alih-alih `JOIN` supaya titik yang
 *    cocok di KEDUA sumber tetap satu baris, bukan dua.
 *
 * 3. **Kutip manual.** `"assignTo"`, `"meetingId"`, dan `"targetDate"` tidak
 *    ada di `camelCaseCols` `src/lib/db.ts:122`, jadi Postgres akan melipatnya
 *    jadi huruf kecil — pelajaran #476. `Meetings`/`DiscussionPoints` sebaliknya
 *    SUDAH ada di `pgTables:88` dan dikutip otomatis, jadi ditulis tanpa kutip.
 *
 * `"targetDate"` bertipe VARCHAR(50), bukan tanggal: pengurutannya perbandingan
 * string dan hanya benar selama formatnya seragam. Itu keterbatasan yang
 * diterima, bukan yang tersembunyi.
 *
 * `COUNT(*) OVER()` memberi jumlah total SEBELUM dibatasi LIMIT, supaya baris
 * penutup bisa menyebut angka sisa yang jujur tanpa kueri kedua.
 */
export async function ambilTopikRapat(
  connection: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  kunciPengguna: string[]
): Promise<{ baris: (TopikRapat & { total: number })[]; total: number }> {
  if (kunciPengguna.length === 0) return { baris: [], total: 0 };

  const [rows]: any = await connection.query(
    `
    SELECT m.title                                   AS "judulRapat",
           COALESCE(NULLIF(TRIM(dp.concern), ''),
                    NULLIF(TRIM(dp.content), ''),
                    'Tanpa Topik')                   AS "topik",
           COUNT(*) OVER()                           AS "total"
    FROM DiscussionPoints dp
    JOIN Meetings m ON m.id = dp."meetingId"
    WHERE (
            EXISTS (
              SELECT 1 FROM discussion_point_assignees dpa
              WHERE dpa.point_id = dp.id AND dpa.user_id IN (?)
            )
         OR dp."assignTo" IN (?)
          )
      AND COALESCE(dp.status, 'pending') <> 'completed'
    ORDER BY NULLIF(TRIM(dp."targetDate"), '') ASC NULLS LAST, dp."createdAt" ASC
    LIMIT ?
  `,
    [kunciPengguna, kunciPengguna, BATAS_TOPIK_RAPAT]
  );

  const baris = (rows || []).map((r: any) => ({
    judulRapat: String(r.judulRapat || "Tanpa Judul Rapat").trim(),
    topik: String(r.topik || "Tanpa Topik").trim(),
    total: Number(r.total || 0),
  }));

  return { baris, total: baris[0]?.total ?? 0 };
}

export async function sendDailyTaskDigest(
  targetUserId?: number | string,
  recipientIds?: string[],
  messageTemplate?: string | null
): Promise<WhatsAppDigestResult> {
  const connection = await dbPool.getConnection();
  try {
    let query = 'SELECT id, uid, username, "displayName", phone FROM "Users" WHERE 1=1';
    const params: any[] = [];
    if (targetUserId) {
      query += " AND (id = ? OR username = ? OR uid = ?)";
      params.push(targetUserId, targetUserId, targetUserId);
    } else if (recipientIds && recipientIds.length > 0) {
      // Pakai IN (?) + array JS agar convertToPostgres → ANY($n) benar untuk Postgres pooler (#500)
      query += " AND (id IN (?) OR username IN (?) OR uid IN (?))";
      params.push(recipientIds, recipientIds, recipientIds);
    } else {
      query += " AND phone IS NOT NULL";
    }
    const [users]: any = await connection.query(query, params);

    // Item #278: dibaca sekali per digest, bukan per pesan — sumbernya
    // basis data (UI Settings), dengan env APP_URL sebagai cadangan.
    const appUrlAktif = await ambilAppUrl();
    let totalDikirim = 0;
    let totalGagal = 0;
    let totalTanpaTugas = 0;
    let totalTopikRapat = 0;
    const kegagalan: WhatsAppDigestFailure[] = [];

    for (const user of users) {
      const uId = String(user.id);
      const uUid = String(user.uid || user.id);
      const uUsername = String(user.username || "");
      const recipientName = user.displayName || user.username || "User";
      const rawPhone = user.phone ? String(user.phone).trim() : "";

      if (!rawPhone) {
        totalGagal++;
        const reason = "Nomor WhatsApp belum terdaftar di profil pengguna";
        kegagalan.push({
          userId: uId,
          name: recipientName,
          phone: "-",
          reason,
        });
        await recordBroadcastLog({
          channel: "whatsapp",
          userId: uId,
          recipientName,
          recipientTarget: "-",
          status: "failed",
          taskCount: 0,
          details: reason,
        });
        continue;
      }

      const [tasks]: any = await connection.query(
        `
        SELECT t.id, t.title, t."endDate", t."dueDate", t.status, t.priority, p.name as "projectName"
        FROM Tasks t
        LEFT JOIN Projects p ON t."projectId" = p.id
        WHERE (t.assigneeId = ? OR t.assigneeId = ? OR t.assigneeId = ?)
        AND t.status IN ('To Do', 'In Progress', 'Testing')
        ORDER BY p.name, COALESCE(t."endDate", t."dueDate")
      `,
        [uId, uUid, uUsername]
      );

      /* #744 — topik rapat dibaca DENGAN kunci identitas yang sama seperti
       * tiket di atas: id, uid, DAN username. `discussion_point_assignees`
       * menyimpan uid, `Tasks.assigneeId` menyimpan campuran keduanya.
       */
      const rapat = await ambilTopikRapat(connection, [uId, uUid, uUsername]);
      const jumlahTopik = rapat.baris.length;

      /* Sebelum #744 cabang ini hanya `tasks.length > 0`, sehingga pengguna
       * tanpa tiket tapi punya topik rapat TIDAK PERNAH menerima pesan —
       * persis sasaran fitur ini. `taskCount` di log tetap jumlah TIKET saja:
       * kolom itu yang dicetak `BroadcastMonitor.tsx:146`, dan mencampur topik
       * rapat ke dalamnya membuat angka di layar tidak lagi berarti apa pun.
       * Jumlah topik masuk ke `details`, jadi nol perubahan skema.
       */
      if (tasks.length > 0 || jumlahTopik > 0) {
        const message = formatMessage(
          recipientName,
          tasks,
          messageTemplate,
          appUrlAktif,
          rapat.baris,
          rapat.total
        );
        const isi = [
          tasks.length > 0 ? `${tasks.length} tugas aktif` : null,
          jumlahTopik > 0 ? `${jumlahTopik} topik rapat` : null,
        ]
          .filter(Boolean)
          .join(", ");
        try {
          await sendToWhatsApp(user.phone, message);
          totalDikirim++;
          totalTopikRapat += jumlahTopik;
          await recordBroadcastLog({
            channel: "whatsapp",
            userId: uId,
            recipientName,
            recipientTarget: user.phone,
            status: "success",
            taskCount: tasks.length,
            details: `Berhasil dikirim (${isi})`,
          });
        } catch (kirimErr: any) {
          totalGagal++;
          const reason = kirimErr?.message || "Gagal mengirim ke gateway WhatsApp";
          kegagalan.push({
            userId: uId,
            name: recipientName,
            phone: user.phone,
            reason,
          });
          console.error(`[WHATSAPP] Gagal mengirim pesan ke ${user.phone}:`, kirimErr);
          await recordBroadcastLog({
            channel: "whatsapp",
            userId: uId,
            recipientName,
            recipientTarget: user.phone,
            status: "failed",
            taskCount: tasks.length,
            details: reason,
          });
        }
      } else {
        totalTanpaTugas++;
        await recordBroadcastLog({
          channel: "whatsapp",
          userId: uId,
          recipientName,
          recipientTarget: user.phone,
          status: "skipped_no_tasks",
          taskCount: 0,
          details: "Dilewati: 0 tiket tugas aktif dan 0 topik rapat yang ditugaskan",
        });
      }
    }

    return {
      totalDikirim,
      totalPenerima: users.length,
      totalGagal,
      totalTanpaTugas,
      totalTopikRapat,
      kegagalan,
    };
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

/** Garis pemisah penutup pesan — dipakai juga sebagai jangkar penyisipan #744. */
const GARIS_KAKI = "─────────────────";

/** Judul blok topik rapat (#744) — satu sumber supaya labelnya tidak pernah beda antar jalur. */
const LABEL_RAPAT = "📋 *Catatan Rapat*";

/**
 * Template yang PERSIS sama dengan `DEFAULT_WHATSAPP_TEMPLATE` diperlakukan
 * seolah admin belum mengkustomisasi apa pun (#744).
 *
 * Tanpa ini, pesan adaptif di `formatMessage()` tidak pernah tercapai di
 * production: `toRow()` di `broadcastConfig.service.ts:36-43` menormalkan
 * setiap template yang tidak memuat `{{task_list}}` menjadi DEFAULT, sehingga
 * `config.messageTemplate` yang sampai ke sini SELALU string default itu dan
 * selalu masuk cabang template-kustom. Akibatnya pengguna yang hanya punya
 * topik rapat akan menerima pesan berjudul "Task Assignment" dan berkalimat
 * "Berikut tiket tugas aktif..." yang tidak memuat satu pun tugas.
 *
 * Presedennya `isTemplateLegacy()` tepat di atas: sama-sama mendeteksi
 * "admin belum benar-benar mengubah apa pun", hanya penandanya berbeda.
 */
function isTemplateBawaan(template: string): boolean {
  return template.trim() === DEFAULT_WHATSAPP_TEMPLATE.trim();
}

function formatStatus(status?: string | null): string {
  if (!status || status === "-") return "-";
  const s = String(status).trim();
  const map: Record<string, string> = {
    TODO: "To Do",
    todo: "To Do",
    to_do: "To Do",
    IN_PROGRESS: "In Progress",
    in_progress: "In Progress",
    DONE: "Done",
    done: "Done",
    BLOCKED: "Blocked",
    blocked: "Blocked",
    IN_REVIEW: "In Review",
    in_review: "In Review",
    REVIEW: "Review",
    review: "Review",
  };
  if (map[s]) return map[s];
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPriority(priority?: string | null): string {
  if (!priority || priority === "-") return "-";
  const p = String(priority).trim().toLowerCase();
  const map: Record<string, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
    none: "None",
  };
  return map[p] || p.charAt(0).toUpperCase() + p.slice(1);
}

/**
 * Format daftar tiket bernomor untuk WhatsApp (Item #505 - Monospace Ticket).
 * Menggunakan blok monospace (```...```) agar font berkarakter sama lebar
 * sehingga titik dua (:) berbaris lurus vertikal sempurna di seluruh tipe ponsel.
 *
 * Contoh:
 * ```
 * [1] WHATSAPP
 *     Status    : To Do
 *     Prioritas : Medium
 *     Tenggat   : -
 *
 * [2] TES LAGI
 *     Status    : To Do
 *     Prioritas : Medium
 *     Tenggat   : -
 * ```
 */
export function formatTaskList(tasks: any[]): string {
  const inner = tasks
    .map((t, idx) => {
      const title = (t.title || "Tanpa Judul").toUpperCase();
      const status = formatStatus(t.status);
      const priority = formatPriority(t.priority);
      const tanggal = formatTanggal(t.endDate || t.dueDate);
      return (
        `[${idx + 1}] ${title}\n` +
        `    Status           : ${status}\n` +
        `    Prioritas        : ${priority}\n` +
        `    Tanggal Terakhir : ${tanggal}`
      );
    })
    .join("\n\n");

  return `\`\`\`\n${inner}\n\`\`\``;
}

/**
 * Format daftar topik rapat untuk WhatsApp (#744), dikelompokkan per judul rapat.
 *
 * Bentuknya sengaja meniru `formatTaskList()`: blok monospace terpisah, judul
 * rapat sebagai `[n]` huruf kapital, topik di bawahnya dengan label `Topik :`
 * yang lebarnya tetap. Karena bloknya TERPISAH dari blok tiket, lebar label
 * keduanya tidak saling menyeret — penyelarasan `:` yang diperjuangkan #505
 * tetap utuh.
 *
 * Contoh:
 * ```
 * [1] KICKOFF Q4 PLANNING
 *     Topik : Evaluasi kapasitas tim backend
 *     Topik : Pembagian PIC rilis November
 *
 * [2] REVIEW SPRINT 12
 *     Topik : Migrasi database ke Neon
 * ```
 */
export function formatMeetingList(rapat: TopikRapat[], totalSebelumBatas?: number): string {
  const perRapat = new Map<string, string[]>();
  for (const r of rapat) {
    const judul = (r.judulRapat || "Tanpa Judul Rapat").trim() || "Tanpa Judul Rapat";
    if (!perRapat.has(judul)) perRapat.set(judul, []);
    const daftar = perRapat.get(judul)!;
    const topik = (r.topik || "Tanpa Topik").trim() || "Tanpa Topik";
    if (!daftar.includes(topik)) daftar.push(topik);
  }

  const inner = [...perRapat.entries()]
    .map(
      ([judul, topik], idx) =>
        `[${idx + 1}] ${judul.toUpperCase()}\n` + topik.map((t) => `    Topik : ${t}`).join("\n")
    )
    .join("\n\n");

  // Sisa yang terpotong BATAS_TOPIK_RAPAT disebut jumlahnya, bukan dibuang
  // diam-diam — admin yang membaca pesan harus tahu daftarnya tidak lengkap.
  const sisa = (totalSebelumBatas ?? rapat.length) - rapat.length;
  const barisSisa = sisa > 0 ? `\n\n+ ${sisa} topik lainnya tidak ditampilkan` : "";

  return `\`\`\`\n${inner}${barisSisa}\n\`\`\``;
}

/**
 * Menyusun isi pesan WhatsApp Task Assignment (Item #505 - Monospace Ticket).
 * Mendukung kustomisasi template melalui BroadcastConfig.
 * Placeholder yang didukung: {{user_name}}, {{task_list}}, {{meeting_list}},
 * {{app_url}}, {{project_name}}.
 *
 * #744 menambah blok Catatan Rapat. Tiga penyesuaian yang menyertainya,
 * semuanya karena pesan ini sekarang punya TIGA bentuk, bukan satu:
 * judul kepala, label tautan, dan ada-tidaknya sub-judul 📋 menyesuaikan
 * isi — pengguna yang hanya punya topik rapat tidak boleh menerima pesan
 * berjudul "Task Assignment" yang tidak memuat satu pun tugas.
 */
export function formatMessage(
  name: string,
  tasks: any[],
  messageTemplate?: string | null,
  appUrlOverride?: string,
  rapat: TopikRapat[] = [],
  totalTopikRapat?: number
) {
  const daftarTugas = tasks || [];
  const adaTugas = daftarTugas.length > 0;
  const daftarRapat = rapat || [];
  const adaRapat = daftarRapat.length > 0;

  const projectNames = Array.from(
    new Set(daftarTugas.map((t) => t.projectName || "Tanpa Project"))
  );
  const projectNameUntukTemplate =
    projectNames.length === 1 ? projectNames[0] : adaTugas ? "beberapa project" : "";
  const appUrl = (appUrlOverride || process.env.APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );

  const taskListText = adaTugas ? formatTaskList(daftarTugas) : "";
  const meetingListText = adaRapat ? formatMeetingList(daftarRapat, totalTopikRapat) : "";

  const templateBersih =
    messageTemplate &&
    messageTemplate.trim() &&
    !isTemplateLegacy(messageTemplate) &&
    !isTemplateBawaan(messageTemplate)
      ? messageTemplate
      : null;

  // Jika template kustom mengandung {{task_list}}
  if (templateBersih && templateBersih.includes("{{task_list}}")) {
    const tersusun = templateBersih
      .replace(/\{\{user_name\}\}/g, name)
      .replace(/\{\{task_list\}\}/g, taskListText)
      .replace(/\{\{meeting_list\}\}/g, meetingListText)
      .replace(/\{\{app_url\}\}/g, appUrl)
      .replace(/\{\{project_name\}\}/g, projectNameUntukTemplate)
      .replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");

    if (!adaRapat || templateBersih.includes("{{meeting_list}}")) return tersusun.trim();

    /* Template admin yang tersimpan SEBELUM #744 tidak punya {{meeting_list}},
     * dan sapuan placeholder di atas tidak akan memunculkannya. Tanpa blok ini
     * topik rapat hilang tanpa jejak dari pesan mereka — kelas bug yang sama
     * persis dengan yang melahirkan isTemplateLegacy(). Disisipkan SEBELUM
     * garis kaki, bukan ditambahkan di ujung, supaya pemisah `─` dan baris
     * "_Pesan otomatis_" tetap menjadi penutup pesan.
     *
     * LABEL_RAPAT wajib ikut disisipkan: template admin sudah memuat blok tiket
     * mereka sendiri, jadi tanpa judul dua blok ```monospace``` akan tampak
     * bersambung dan penerima tidak bisa membedakan mana tugas mana topik rapat.
     */
    const blokRapat = `${LABEL_RAPAT}\n\n${meetingListText}`;
    const idxKaki = tersusun.lastIndexOf(GARIS_KAKI);
    const disisipkan =
      idxKaki === -1
        ? `${tersusun.trimEnd()}\n\n${blokRapat}`
        : `${tersusun.slice(0, idxKaki).trimEnd()}\n\n${blokRapat}\n\n${tersusun.slice(idxKaki)}`;
    return disisipkan.trim();
  }

  const greeting = templateBersih
    ? templateBersih
        .replace(/\{\{user_name\}\}/g, name)
        .replace(/\{\{project_name\}\}/g, projectNameUntukTemplate)
        .replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")
        .trim()
    : `Halo *${name}*,`;

  const judul = adaTugas ? (adaRapat ? "Ringkasan Pekerjaan" : "Task Assignment") : "Catatan Rapat";
  const labelTautan = adaTugas
    ? adaRapat
      ? "Akses Detail"
      : "Akses Detail Tugas"
    : "Akses Catatan Rapat";

  let isi = "";
  if (adaTugas) {
    isi += `Berikut tiket tugas aktif yang ditugaskan kepada Anda:\n\n${taskListText}\n\n`;
  }
  if (adaRapat) {
    // Sub-judul 📋 hanya diperlukan bila ada blok tiket di atasnya. Bila pesan
    // ini HANYA berisi rapat, kepala sudah menyebut "Catatan Rapat" dan
    // mengulanginya mencetak dua baris berjudul sama.
    const subJudul = adaTugas ? `${LABEL_RAPAT}\n` : "";
    isi += `${subJudul}Berikut topik rapat yang ditugaskan kepada Anda:\n\n${meetingListText}\n\n`;
  }

  // Format default Monospace Ticket resmi (#505) + blok Catatan Rapat (#744)
  return (
    `*[LanPro] ${judul}*\n\n` +
    `${greeting}\n` +
    `${isi}` +
    `🔗 *${labelTautan}:*\n` +
    `${appUrl}\n\n` +
    `${GARIS_KAKI}\n` +
    `_Pesan otomatis • LanPro Project Management_`
  );
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
