import dbPool from "../../src/lib/db";

export interface BroadcastLogEntry {
  id?: number;
  channel: "whatsapp" | "email";
  userId?: string | null;
  recipientName: string;
  recipientTarget?: string | null;
  status: "success" | "failed" | "skipped_no_tasks";
  taskCount?: number;
  details?: string | null;
  createdAt?: Date;
}

/**
 * Catat satu baris riwayat pengiriman broadcast ke database PostgreSQL (#501).
 */
export async function recordBroadcastLog(log: BroadcastLogEntry): Promise<void> {
  const connection = await dbPool.getConnection();
  try {
    await connection.query(
      `
      INSERT INTO "BroadcastLogs" (channel, "userId", "recipientName", "recipientTarget", status, "taskCount", details, "createdAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        log.channel,
        log.userId || null,
        log.recipientName,
        log.recipientTarget || null,
        log.status,
        log.taskCount || 0,
        log.details || null,
      ]
    );
  } catch (err) {
    console.error("[BROADCAST-LOG] Gagal menyimpan log broadcast:", err);
  } finally {
    connection.release();
  }
}

/**
 * Ambil status broadcast harian terbaru per pengguna untuk monitor realtime (#501).
 * Mengembalikan seluruh pengguna terdaftar/dikonfigurasi beserta status pengiriman hari ini.
 */
export async function getBroadcastMonitorStatus(channel: string = "whatsapp"): Promise<{
  items: Array<{
    id: string;
    userId: string;
    name: string;
    target: string;
    channel: "whatsapp" | "email";
    time: string;
    status: "success" | "pending" | "failed" | "skipped_no_tasks" | "not_sent";
    taskCount: number;
    details: string | null;
  }>;
  totalSentToday: number;
  totalTarget: number;
}> {
  const connection = await dbPool.getConnection();
  try {
    // 1. Ambil config broadcast channel untuk tahu daftar recipientIds & scheduleTime
    const [cfgRows]: any = await connection.query(
      `SELECT "scheduleTime", "recipientIds" FROM "BroadcastConfig" WHERE channel = ?`,
      [channel]
    );
    const config = cfgRows?.[0] || { scheduleTime: "07:00", recipientIds: "" };
    const recipientIdsList = (config.recipientIds || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    // 2. Ambil user aktif (jika recipientIds ditentukan, sertakan seluruh user pilihan)
    let userQuery = 'SELECT id, uid, username, "displayName", phone, email FROM "Users" WHERE 1=1';
    const userParams: any[] = [];
    if (channel === "whatsapp" && recipientIdsList.length === 0) {
      userQuery += " AND phone IS NOT NULL";
    }
    if (recipientIdsList.length > 0) {
      userQuery += " AND (id IN (?) OR username IN (?) OR uid IN (?))";
      userParams.push(recipientIdsList, recipientIdsList, recipientIdsList);
    }
    userQuery += ' ORDER BY "displayName" ASC';
    const [users]: any = await connection.query(userQuery, userParams);

    // 3. Ambil log pengiriman hari ini (WIB / tanggal berjalan)
    const [todayLogs]: any = await connection.query(
      `
      SELECT id, channel, "userId", "recipientName", "recipientTarget", status, "taskCount", details, "createdAt"
      FROM "BroadcastLogs"
      WHERE channel = ?
        AND "createdAt" >= CURRENT_DATE
      ORDER BY "createdAt" DESC
      `,
      [channel]
    );

    const logMapByUserId = new Map<string, any>();
    for (const log of todayLogs || []) {
      if (log.userId && !logMapByUserId.has(log.userId)) {
        logMapByUserId.set(log.userId, log);
      }
    }

    let totalSentToday = 0;
    const items = (users || []).map((u: any, idx: number) => {
      const uId = String(u.id);
      const name = u.displayName || u.username || `User ${idx + 1}`;
      const target = (channel === "whatsapp" ? u.phone : u.email) || "-";

      const latestLog = logMapByUserId.get(uId) || logMapByUserId.get(String(u.uid));
      if (latestLog) {
        if (latestLog.status === "success") {
          totalSentToday++;
        }
        // Format jam WIB presisi (Asia/Jakarta UTC+7)
        let timeFormatted = "-";
        try {
          const logDate = new Date(latestLog.createdAt);
          if (!isNaN(logDate.getTime())) {
            const formatter = new Intl.DateTimeFormat("en-GB", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            timeFormatted = `${formatter.format(logDate)} WIB`;
          }
        } catch {
          const logDate = new Date(latestLog.createdAt);
          const hours = String(logDate.getHours()).padStart(2, "0");
          const minutes = String(logDate.getMinutes()).padStart(2, "0");
          timeFormatted = `${hours}:${minutes} WIB`;
        }

        return {
          id: `log-${latestLog.id || idx}`,
          userId: uId,
          name,
          target,
          channel: channel as "whatsapp" | "email",
          time: timeFormatted,
          status: latestLog.status,
          taskCount: Number(latestLog.taskCount || 0),
          details: latestLog.details || null,
        };
      }

      // Belum ada log pengiriman hari ini
      if (channel === "whatsapp" && (!u.phone || !String(u.phone).trim())) {
        return {
          id: `user-${uId}`,
          userId: uId,
          name,
          target: "-",
          channel: channel as "whatsapp" | "email",
          time: "-",
          status: "failed" as const,
          taskCount: 0,
          details: "Nomor WhatsApp belum terdaftar di profil pengguna",
        };
      }

      return {
        id: `user-${uId}`,
        userId: uId,
        name,
        target,
        channel: channel as "whatsapp" | "email",
        time: `Jadwal: ${config.scheduleTime || "07:00"} WIB`,
        status: "not_sent" as const,
        taskCount: 0,
        details: "Belum dikirim hari ini",
      };
    });

    return {
      items,
      totalSentToday,
      totalTarget: items.length,
    };
  } finally {
    connection.release();
  }
}
