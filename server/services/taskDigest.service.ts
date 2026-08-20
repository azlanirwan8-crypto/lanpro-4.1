/**
 * LanPro Task Digest Service (F6.4 / Item #28)
 *
 * Mengumpulkan tugas-tugas tertunda (pending/overdue) dan mengirimkan
 * rekapitulasi harian via email transaksional kepada masing-masing anggota tim.
 */

import cron from "node-cron";
import db from "../../src/lib/db";
import {
  kirimEmailTaskDigest,
  TaskDigestItem,
  TaskDigestEmailData,
  emailTerkonfigurasi,
} from "./email.service";

export interface UserTaskDigestPayload {
  userId: string;
  email: string;
  displayName: string;
  username: string;
  tasks: TaskDigestItem[];
}

export interface DigestExecutionResult {
  totalUsersChecked: number;
  emailsSent: number;
  failedCount: number;
  details: {
    userId: string;
    email: string;
    taskCount: number;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Mengambil data tugas tertunda untuk pengguna tertentu atau seluruh pengguna aktif.
 */
export async function kumpulkanPendingTasksPerUser(
  targetUserId?: string | number
): Promise<UserTaskDigestPayload[]> {
  const connection = await db.getConnection();
  try {
    let userQuery = `
      SELECT id, email, "displayName", username
      FROM "Users"
      WHERE email IS NOT NULL AND email != ''
    `;
    const userParams: any[] = [];

    if (targetUserId) {
      userQuery += ` AND id = ?`;
      userParams.push(String(targetUserId));
    }

    const [users]: any = await connection.query(userQuery, userParams);
    const userList = Array.isArray(users) ? users : [];

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const results: UserTaskDigestPayload[] = [];

    for (const user of userList) {
      const uid = String(user.id);
      const userEmail = user.email?.trim();
      if (!userEmail) continue;

      const [taskRows]: any = await connection.query(
        `
        SELECT 
          t.id,
          t."taskKey",
          t.title,
          t.status,
          t.priority,
          t."dueDate",
          p.name as "projectName"
        FROM "Tasks" t
        LEFT JOIN "Projects" p ON t."projectId" = p.id
        WHERE t."assigneeId" = ?
          AND LOWER(t.status) NOT IN ('done', 'closed', 'selesai', 'archived')
        ORDER BY 
          CASE 
            WHEN t."dueDate" IS NOT NULL AND t."dueDate" < ? THEN 1
            WHEN LOWER(t.priority) IN ('urgent', 'kritis', 'high', 'tinggi') THEN 2
            ELSE 3
          END,
          t."dueDate" ASC
        LIMIT 50
      `,
        [uid, todayStr]
      );

      const rawTasks = Array.isArray(taskRows) ? taskRows : [];
      if (rawTasks.length === 0) continue;

      const digestTasks: TaskDigestItem[] = rawTasks.map((t: any) => {
        let isOverdue = false;
        let formattedDueDate: string | null = null;

        if (t.dueDate) {
          try {
            const d = new Date(t.dueDate);
            if (!isNaN(d.getTime())) {
              formattedDueDate = d.toISOString().split("T")[0];
              isOverdue = formattedDueDate < todayStr;
            }
          } catch {
            formattedDueDate = String(t.dueDate);
          }
        }

        return {
          id: String(t.id),
          key: t.taskKey || t.key || undefined,
          title: t.title || "Untitled Task",
          projectName: t.projectName || undefined,
          priority: t.priority || "Medium",
          status: t.status || "To Do",
          dueDate: formattedDueDate,
          isOverdue,
        };
      });

      results.push({
        userId: uid,
        email: userEmail,
        displayName: user.displayName || user.username || "Anggota Tim",
        username: user.username || "",
        tasks: digestTasks,
      });
    }

    return results;
  } finally {
    connection.release();
  }
}

/**
 * Menjalankan proses pengiriman digest tugas tertunda ke email masing-masing anggota tim.
 */
export async function kirimDailyTaskDigestEmail(
  targetUserId?: string | number
): Promise<DigestExecutionResult> {
  const usersWithTasks = await kumpulkanPendingTasksPerUser(targetUserId);

  const executionResult: DigestExecutionResult = {
    totalUsersChecked: usersWithTasks.length,
    emailsSent: 0,
    failedCount: 0,
    details: [],
  };

  for (const userPayload of usersWithTasks) {
    if (userPayload.tasks.length === 0) continue;

    const emailData: TaskDigestEmailData = {
      email: userPayload.email,
      nama: userPayload.displayName,
      username: userPayload.username,
      tasks: userPayload.tasks,
    };

    try {
      const sendResult = await kirimEmailTaskDigest(emailData);

      if (sendResult.success) {
        executionResult.emailsSent++;
        executionResult.details.push({
          userId: userPayload.userId,
          email: userPayload.email,
          taskCount: userPayload.tasks.length,
          success: true,
        });
      } else {
        executionResult.failedCount++;
        executionResult.details.push({
          userId: userPayload.userId,
          email: userPayload.email,
          taskCount: userPayload.tasks.length,
          success: false,
          error: sendResult.error,
        });
      }
    } catch (err: any) {
      executionResult.failedCount++;
      executionResult.details.push({
        userId: userPayload.userId,
        email: userPayload.email,
        taskCount: userPayload.tasks.length,
        success: false,
        error: err?.message || "Unknown error",
      });
    }
  }

  return executionResult;
}

/**
 * Menginisialisasi scheduler otomatis pengiriman digest email harian pukul 07:00.
 */
export const initTaskDigestEmailScheduler = () => {
  // Jadwalkan setiap hari pukul 07:00 pagi
  cron.schedule("0 7 * * *", async () => {
    try {
      console.log("[EMAIL DIGEST] Memulai pengiriman digest harian tugas pending (07:00)...");
      const result = await kirimDailyTaskDigestEmail();
      console.log(
        `[EMAIL DIGEST] Selesai: ${result.emailsSent} email terkirim, ${result.failedCount} gagal dari ${result.totalUsersChecked} pengguna.`
      );
    } catch (err: any) {
      console.error("[EMAIL DIGEST] Gagal menjalankan digest email harian:", err?.message || err);
    }
  });

  console.log("[EMAIL DIGEST] Penjadwal digest email harian aktif (07:00).");
};
