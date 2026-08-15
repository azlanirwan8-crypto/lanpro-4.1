import cron from "node-cron";
import dbPool from "../../src/lib/db";

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

/**
 * Menyalakan penjadwal digest harian pukul 07:00.
 *
 * Fungsi ini sebelumnya di-import di `server.ts` tetapi TIDAK PERNAH DIPANGGIL,
 * sehingga digest harian belum pernah menyala sekali pun sejak ditulis. Hanya
 * pemicu manual yang berfungsi.
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

  cron.schedule("0 7 * * *", async () => {
    try {
      await sendDailyTaskDigest();
    } catch (err: any) {
      // Kegagalan satu hari tidak boleh mematikan penjadwal untuk hari-hari
      // berikutnya. Tanpa penangkap ini, satu galat menghentikan seluruh
      // pengiriman berikutnya secara senyap.
      console.error("[WHATSAPP] Digest harian gagal:", err?.message);
    }
  });

  console.log("[WHATSAPP] Penjadwal digest harian aktif (07:00).");
};

export async function sendDailyTaskDigest(targetUserId?: number) {
  const connection = await dbPool.getConnection();
  try {
    let query = "SELECT id, displayName, phone FROM Users WHERE phone IS NOT NULL";
    const params: any[] = [];
    if (targetUserId) {
      query += " AND id = ?";
      params.push(targetUserId);
    }
    const [users]: any = await connection.query(query, params);

    for (const user of users) {
      const [tasks]: any = await connection.query(
        `
        SELECT t.title, t.dueDate, t.status
        FROM Tasks t
        WHERE t.assigneeId = ? 
        AND t.status IN ('To Do', 'In Progress', 'Testing')
      `,
        [user.id]
      );

      if (tasks.length > 0) {
        const message = formatMessage(user.displayName, tasks);
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

function formatMessage(name: string, tasks: any[]) {
  let msg = `*Selamat Pagi, ${name}!* ☕\n\nBerikut ringkasan tugas Anda hari ini:\n\n`;
  tasks.forEach((t) => {
    msg += `• *${t.title}*\n  Status: ${t.status} | Due: ${t.dueDate}\n\n`;
  });
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
