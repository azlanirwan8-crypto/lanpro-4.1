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
import { muatKunciTerminal, sqlStatusBukanTerminal } from "../lib/statusSelesai";

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
  /** Putaran 3 (#744): diminta pemilik proyek supaya blok catatan menyebut keadaan butirnya. */
  status: string;
  targetDate: string;
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
           COALESCE(NULLIF(TRIM(dp.status), ''),
                    'pending')                       AS "status",
           COALESCE(TRIM(dp."targetDate"), '')       AS "targetDate",
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
    status: String(r.status || "pending").trim(),
    targetDate: String(r.targetDate || "").trim(),
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

    /* #745 — arahan pemilik proyek 15 Okt: broadcast hanya memuat pekerjaan yang
     * masih OPEN; yang sudah close/done tidak dikirim lagi. Tiga string hardcode
     * lama diganti predikat terminal dari MasterData, pola yang sama dengan
     * digest email (`taskDigest.service.ts:64-68`), supaya WhatsApp dan email
     * akhirnya sepakat soal arti "aktif". Dibaca SEKALI per digest, bukan per
     * pengguna. CATATAN JUJUR: lebar himpunan hasilnya terhadap tiga string lama
     * belum bisa diukur dari mesin kerja karena database tidak terjangkau —
     * pengukuran itu tetap tercatat sebagai syarat di baris #745.
     */
    const kunciTerminal = await muatKunciTerminal(connection);
    const predikatBuka = sqlStatusBukanTerminal("t.status", kunciTerminal);

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
        AND ${predikatBuka}
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
       * persis sasaran fitur ini.
       *
       * Putaran 2 (uji kirim sungguhan 15 Okt): tiket dan rapat berangkat
       * sebagai DUA pesan terpisah. Satu pesan gabungan terbukti terlalu
       * panjang di layar ponsel. Pengecualiannya hanya satu: admin yang
       * menaruh {{meeting_list}} di templat kustomnya memang meminta rapat
       * inline, dan kehendak itu dihormati.
       *
       * `taskCount` di log tetap jumlah TIKET saja: kolom itu yang dicetak
       * `BroadcastMonitor.tsx:146`, dan mencampur topik rapat ke dalamnya
       * membuat angka di layar tidak lagi berarti apa pun. Jumlah topik masuk
       * ke `details`, jadi nol perubahan skema. Log tetap SATU baris per
       * pengguna supaya monitor tidak membaca pesan rapat sebagai baris
       * terbaru ber-`taskCount` 0 untuk orang yang sebenarnya punya tiket.
       */
      if (tasks.length > 0 || jumlahTopik > 0) {
        const adaTugas = tasks.length > 0;
        const adaRapat = jumlahTopik > 0;
        const gabung = adaTugas && adaRapat && rapatDigabungKeTemplat(messageTemplate);

        const daftarPesan: string[] = gabung
          ? [
              formatMessage(
                recipientName,
                tasks,
                messageTemplate,
                appUrlAktif,
                rapat.baris,
                rapat.total
              ),
            ]
          : adaTugas && adaRapat
            ? [
                formatMessage(recipientName, tasks, messageTemplate, appUrlAktif, [], undefined),
                formatMessage(recipientName, [], null, appUrlAktif, rapat.baris, rapat.total),
              ]
            : adaTugas
              ? [formatMessage(recipientName, tasks, messageTemplate, appUrlAktif, [], undefined)]
              : [formatMessage(recipientName, [], null, appUrlAktif, rapat.baris, rapat.total)];
        const namaPesan =
          gabung || daftarPesan.length === 1 ? ["pesan"] : ["pesan tugas", "catatan rapat"];

        const terkirim: string[] = [];
        let errPertama: any = null;
        for (let i = 0; i < daftarPesan.length; i++) {
          try {
            await sendToWhatsApp(user.phone, daftarPesan[i]);
            terkirim.push(namaPesan[i]);
          } catch (kirimErr: any) {
            errPertama = errPertama || kirimErr;
            console.error(`[WHATSAPP] Gagal mengirim ${namaPesan[i]} ke ${user.phone}:`, kirimErr);
          }
        }

        const isi = [
          adaTugas ? `${tasks.length} tugas aktif` : null,
          adaRapat ? `${jumlahTopik} topik rapat` : null,
        ]
          .filter(Boolean)
          .join(", ");
        const topikTerkirim =
          adaRapat && (gabung ? terkirim.length === 1 : terkirim.includes("catatan rapat"))
            ? jumlahTopik
            : 0;
        totalTopikRapat += topikTerkirim;

        if (terkirim.length === daftarPesan.length) {
          totalDikirim++;
          await recordBroadcastLog({
            channel: "whatsapp",
            userId: uId,
            recipientName,
            recipientTarget: user.phone,
            status: "success",
            taskCount: tasks.length,
            details: `Berhasil dikirim (${isi}) dalam ${daftarPesan.length} pesan`,
          });
        } else {
          totalGagal++;
          const reason = errPertama?.message || "Gagal mengirim ke gateway WhatsApp";
          const keterangan =
            terkirim.length > 0
              ? `Sebagian terkirim (${terkirim.join(", ")}); gagal: ${reason}`
              : reason;
          kegagalan.push({
            userId: uId,
            name: recipientName,
            phone: user.phone,
            reason: keterangan,
          });
          await recordBroadcastLog({
            channel: "whatsapp",
            userId: uId,
            recipientName,
            recipientTarget: user.phone,
            status: "failed",
            taskCount: tasks.length,
            details: keterangan,
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

/**
 * Benar bila admin MENGAJAK rapat masuk ke dalam templat tiketnya lewat
 * `{{meeting_list}}` (#744 putaran 2). Hanya dalam kasus itu rapat dikirim
 * SATU pesan bersama tiket; selain itu rapat selalu berangkat sebagai pesan
 * kedua tersendiri, sesuai permintaan pemilik proyek sesudah uji kirim:
 * satu pesan gabungan terlalu panjang di layar ponsel.
 */
function rapatDigabungKeTemplat(template?: string | null): boolean {
  if (!template || !template.trim()) return false;
  if (isTemplateLegacy(template) || isTemplateBawaan(template)) return false;
  return template.includes("{{meeting_list}}");
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
      /* Putaran 3 (#744): judul tiket bisa jauh lebih panjang dari lebar layar
       * ponsel, dan WhatsApp melipatnya di KOLOM NOL sehingga baris lanjutan
       * menabrak nomor butir — persis tangkapan layar pemilik proyek pada
       * butir 14–18. Judul karena itu dilipat sendiri, dengan indentasi gantung
       * sejajar di bawah teks judul, bukan jatuh di bawah `[n]`.
       */
      const kepala = bungkusKepala(idx + 1, title);
      return (
        `${kepala}\n` +
        `${barisLabel("Status", status, LEBAR_LABEL_TIKET)}\n` +
        `${barisLabel("Prioritas", priority, LEBAR_LABEL_TIKET)}\n` +
        `${barisLabel("Tanggal Terakhir", tanggal, LEBAR_LABEL_TIKET)}`
      );
    })
    .join("\n\n");

  return `\`\`\`\n${inner}\n\`\`\``;
}

/**
 * Lebar maksimum satu baris di dalam blok monospace (#744 putaran 2, atas
 * keluhan pemilik proyek saat uji kirim sungguhan; putaran 3 melebarkan
 * cakupannya ke blok tiket sesudah tangkapan layar kedua menunjukkan judul
 * tiket panjang dilipat WhatsApp di kolom nol dan menabrak nomor butir).
 *
 * WhatsApp MELIPAT SENDIRI baris yang melebihi lebar layar, dan lipatannya
 * jatuh di kolom nol — di luar indentasi blok — sehingga pesan tampak
 * berantakan. Pelipatan karena itu WAJIB dilakukan di sini, sebelum pesan
 * dikirim, dengan indentasi gantung supaya baris lanjutan tetap sejajar.
 */
const LEBAR_BLOK = 46;
const INDENT = "    ";
const LEBAR_LABEL_TIKET = 16; // "Tanggal Terakhir"; penjaga penyelarasan titik dua #505
const LEBAR_LABEL_CATATAN = 14; // "Tanggal Target" — label terpanjang blok catatan

function bungkus(teks: string, lebarIsi: number, indentLanjut: string): string {
  const baris: string[] = [];
  let kini = "";
  for (const kata of teks.split(/\s+/).filter(Boolean)) {
    const calon = kini ? `${kini} ${kata}` : kata;
    if (kini && calon.length > lebarIsi) {
      baris.push(kini);
      kini = kata;
    } else {
      kini = calon;
    }
  }
  if (kini) baris.push(kini);
  if (baris.length === 0) baris.push("-");
  return baris.map((b, i) => (i === 0 ? b : `${indentLanjut}${b}`)).join("\n");
}

/**
 * Baris kepala `[n] JUDUL`. Lipatannya menjorok tepat di bawah judulnya, bukan
 * empat spasi tetap: awalan `[14] ` lebih lebar satu karakter daripada `[1] `,
 * dan nomor dua digit justru yang tampak bertabrakan di tangkapan layar pemilik
 * proyek (butir 14–18).
 */
function bungkusKepala(nomor: number, teks: string): string {
  const awalan = `[${nomor}] `;
  return bungkus(`${awalan}${teks}`, LEBAR_BLOK, " ".repeat(awalan.length));
}

/** Satu baris berlabel `Label : nilai`; nilai panjang dilipat sejajar di kolom nilainya. */
function barisLabel(label: string, nilai: string, lebarLabel: number): string {
  const kepala = `${INDENT}${label.padEnd(lebarLabel)} : `;
  return `${kepala}${bungkus(nilai, LEBAR_BLOK - kepala.length, " ".repeat(kepala.length))}`;
}

/**
 * Format daftar topik rapat untuk WhatsApp (#744), dikelompokkan per judul rapat.
 * Putaran 3 atas permintaan pemilik proyek: tiap butir memuat TIGA label sejajar
 * — Topik, Status, Tanggal Target — meniru penyelarasan titik dua blok tiket.
 *
 * Contoh:
 * ```
 * [1] KICKOFF Q4 PLANNING
 *     Topik          : Evaluasi kapasitas tim
 *                      backend
 *     Status         : Pending
 *     Tanggal Target : 18/10/2026
 * ```
 */
export function formatMeetingList(rapat: TopikRapat[], totalSebelumBatas?: number): string {
  const perRapat = new Map<string, TopikRapat[]>();
  for (const r of rapat) {
    const judul = (r.judulRapat || "Tanpa Judul Rapat").trim() || "Tanpa Judul Rapat";
    if (!perRapat.has(judul)) perRapat.set(judul, []);
    const daftar = perRapat.get(judul)!;
    const topik = (r.topik || "Tanpa Topik").trim() || "Tanpa Topik";
    if (!daftar.some((d) => d.topik === topik)) daftar.push({ ...r, topik });
  }

  const inner = [...perRapat.entries()]
    .map(([judul, daftar], idx) => {
      const kepala = bungkusKepala(idx + 1, judul.toUpperCase());
      const badan = daftar
        .map(
          (r) =>
            `${barisLabel("Topik", r.topik, LEBAR_LABEL_CATATAN)}\n` +
            `${barisLabel("Status", formatStatus(r.status), LEBAR_LABEL_CATATAN)}\n` +
            `${barisLabel(
              "Tanggal Target",
              r.targetDate ? formatTanggal(r.targetDate) : "-",
              LEBAR_LABEL_CATATAN
            )}`
        )
        .join("\n\n");
      return `${kepala}\n${badan}`;
    })
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
