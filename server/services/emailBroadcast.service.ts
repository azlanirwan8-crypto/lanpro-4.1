/**
 * Broadcast ringkasan task lewat email, terjadwal (Item #297).
 *
 * KENAPA HAMPIR TIDAK ADA KODE BARU DI SINI. Empat bagian yang biasanya
 * paling mahal sudah ada di repo dan dipakai ulang apa adanya:
 *
 *   - penyimpanan jadwal  -> tabel `BroadcastConfig`, sudah generik per
 *                            `channel` sejak #193 (bukan khusus WhatsApp)
 *   - templat emailnya    -> `kirimEmailTaskDigest()` di `email.service.ts`
 *   - pengiriman aman     -> `kirimEmailLatarBelakang()` dari #277
 *   - pola penjadwalnya   -> `whatsapp.service.ts`, sudah terbukti jalan
 *
 * Yang benar-benar baru hanyalah: baris `channel = "email"`, kueri task per
 * penerima, dan penjadwal yang membacanya.
 *
 * KENAPA TIDAK DIGABUNG DENGAN PENJADWAL WHATSAPP. Keduanya memang mirip,
 * tetapi jadwalnya milik pemilik proyek untuk diatur terpisah: broadcast
 * WhatsApp bisa harian sementara email mingguan, dan menggabungkannya akan
 * memaksa keduanya selalu sama. Yang dibagi adalah penyimpanan dan templat,
 * bukan waktunya.
 */

import cron from "node-cron";
import dbPool from "../../src/lib/db";
import { getBroadcastConfig } from "./broadcastConfig.service";
import { kirimEmailTaskDigest, kirimEmailLatarBelakang } from "./email.service";
import type { TaskDigestItem } from "./email.service";

/** Status yang dianggap "masih perlu dikerjakan". */
const STATUS_AKTIF = ["To Do", "In Progress", "Testing"];

/**
 * Hari dan jam saat ini di WIB, dalam bentuk yang sama dengan yang disimpan
 * `BroadcastConfig` ("1".."7" dan "HH:MM").
 *
 * Disalin dari `whatsapp.service.ts` dengan sengaja alih-alih diekspor dari
 * sana: mengimpor fungsi dari modul WhatsApp akan membuat penjadwal email
 * ikut mati kalau modul itu gagal dimuat, dan keduanya tidak seharusnya
 * saling menjatuhkan.
 */
function jadwalSekarangWIB(): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

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

/**
 * Menyusun dan mengirim ringkasan task ke tiap penerima.
 *
 * Satu email per penerima, berisi HANYA task yang ditugaskan kepadanya.
 * Penerima tanpa task aktif TIDAK dikirimi apa pun — email "Anda tidak punya
 * tugas" yang datang tiap hari adalah cara tercepat membuat orang memasang
 * filter dan berhenti membaca seluruh kiriman dari sistem ini.
 */
export async function kirimBroadcastTaskEmail(recipientIds?: string[]): Promise<{
  penerimaDiperiksa: number;
  emailDikirim: number;
}> {
  const connection = await dbPool.getConnection();
  try {
    let query = `SELECT id, "displayName", nama_lengkap, username, email FROM "Users" WHERE email IS NOT NULL AND email <> ''`;
    const params: any[] = [];

    if (recipientIds && recipientIds.length > 0) {
      query += ` AND id IN (${recipientIds.map(() => "?").join(",")})`;
      params.push(...recipientIds);
    }

    const [users]: any = await connection.query(query, params);
    let dikirim = 0;

    for (const user of users || []) {
      const [rows]: any = await connection.query(
        `SELECT t.title, t."dueDate", t.status, t.priority, p.name AS "projectName"
           FROM Tasks t
           LEFT JOIN Projects p ON t."projectId" = p.id
          WHERE t."assigneeId" = ?
            AND t.status IN (${STATUS_AKTIF.map(() => "?").join(",")})
          ORDER BY t."dueDate" NULLS LAST`,
        [user.id, ...STATUS_AKTIF]
      );

      const tasks: TaskDigestItem[] = (rows || []).map((r: any) => ({
        title: r.title,
        projectName: r.projectName || undefined,
        priority: r.priority || "-",
        status: r.status,
        dueDate: r.dueDate || null,
        isOverdue: r.dueDate ? new Date(r.dueDate).getTime() < Date.now() : false,
      }));

      if (tasks.length === 0) continue;

      // Lewat helper #277, BUKAN kirimEmail() langsung: kirimEmail
      // mengembalikan kegagalan sebagai NILAI, bukan lemparan, sehingga
      // pemanggil yang memakai .catch() tidak pernah tahu ia gagal.
      kirimEmailLatarBelakang(
        kirimEmailTaskDigest({
          email: user.email,
          nama: user.displayName || user.nama_lengkap || user.username,
          username: user.username || user.email,
          tasks,
        }),
        `Ringkasan task untuk ${user.email}`
      );
      dikirim += 1;
    }

    return { penerimaDiperiksa: (users || []).length, emailDikirim: dikirim };
  } finally {
    connection.release();
  }
}

/**
 * Kunci hari+jam terakhir yang sudah dipicu.
 *
 * Cron bisa terpicu lebih dari sekali pada menit yang sama di beberapa
 * runtime; tanpa kunci ini penerima bisa mendapat email dobel, dan email
 * dobel adalah alasan orang berhenti memercayai kiriman otomatis.
 */
let kunciTerakhir: string | null = null;

export const initEmailBroadcastScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const config = await getBroadcastConfig("email");

      // Belum ada penerima dipilih berarti fitur ini belum dinyalakan dari UI.
      if (!config.recipientIds || config.recipientIds.length === 0) return;

      const { day, time } = jadwalSekarangWIB();
      if (!config.scheduleDays.includes(day) || config.scheduleTime !== time) return;

      const kunci = `${day}-${time}`;
      if (kunciTerakhir === kunci) return;
      kunciTerakhir = kunci;

      console.log(`[EMAIL-BROADCAST] Menjalankan broadcast task (hari ${day}, ${time} WIB)...`);
      const hasil = await kirimBroadcastTaskEmail(config.recipientIds);
      console.log(
        `[EMAIL-BROADCAST] ${hasil.emailDikirim} email dikirim dari ${hasil.penerimaDiperiksa} penerima diperiksa.`
      );
    } catch (err: any) {
      // Kegagalan satu jadwal tidak boleh mematikan jadwal berikutnya.
      console.error("[EMAIL-BROADCAST] Broadcast terjadwal gagal:", err?.message);
    }
  });

  console.log(
    "[EMAIL-BROADCAST] Penjadwal broadcast task via email aktif (dicek tiap menit dari BroadcastConfig)."
  );
};
