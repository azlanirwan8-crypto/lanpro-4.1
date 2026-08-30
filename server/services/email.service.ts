/**
 * LanPro Transactional Email Service (Resend API)
 *
 * Menangani pengiriman email transaksional (selamat datang, lupa password, digest)
 * menggunakan Resend REST API via fetch standar Node.js (0 dependensi baru).
 *
 * Bila RESEND_API_KEY tidak dikonfigurasi, pengiriman di lingkungan development
 * dialihkan ke mock log konsol yang aman. Di production, pengembalian error
 * terstruktur mencegah crash maupun kegagalan senyap.
 */

import nodemailer from "nodemailer";
import { getEmailIntegrationConfig, EmailIntegrationConfig } from "./integrationSettings.service";

export interface KirimEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface KirimEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Menjalankan pengiriman email latar belakang dengan kegagalan yang TERLIHAT.
 *
 * MASALAH YANG DIPECAHKAN (item #277). Empat pemanggil non-blocking hanya
 * memasang `.catch()`. Padahal `kirimEmail()` TIDAK melempar saat gagal — ia
 * mengembalikan `{ success: false, error }` yang resolved. Cabang `.catch` itu
 * karenanya tidak pernah dieksekusi, hasilnya tidak pernah diperiksa, dan
 * kegagalan kirim lenyap tanpa jejak. Terbukti nyata 30 Agu 2026: SMTP host
 * salah menyebabkan setiap email pendaftaran gagal selama berhari-hari, dan
 * satu-satunya cara pemilik proyek mengetahuinya adalah menunggu email yang
 * tidak kunjung datang.
 *
 * Menangani KEDUA bentuk kegagalan: promise yang ditolak, dan hasil resolved
 * yang `success`-nya false.
 */
export function kirimEmailLatarBelakang(
  pengiriman: Promise<KirimEmailResult>,
  konteks: string
): void {
  pengiriman
    .then((hasil) => {
      if (!hasil?.success) {
        console.error(
          `[EMAIL] ${konteks} TIDAK terkirim: ${hasil?.error || "penyebab tidak dilaporkan"}`
        );
      }
    })
    .catch((err: any) => {
      console.error(`[EMAIL] ${konteks} gagal dengan galat: ${err?.message || err}`);
    });
}

const RESEND_API_URL = "https://api.resend.com/emails";

export function validasiFormatEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function ambilApiKey(): string {
  return (process.env.RESEND_API_KEY || "").trim();
}

export function ambilEmailPengirim(): string {
  return (process.env.EMAIL_FROM || "").trim();
}

export async function emailTerkonfigurasiAsync(): Promise<boolean> {
  try {
    const config = await getEmailIntegrationConfig();
    if (config.provider === "smtp") {
      return Boolean(config.smtpHost && config.smtpUser);
    }
    return Boolean(config.apiKey || ambilApiKey());
  } catch {
    return emailTerkonfigurasi();
  }
}

export function emailTerkonfigurasi(): boolean {
  return ambilApiKey().length > 0;
}

export async function statusEmailServiceAsync() {
  const config = await getEmailIntegrationConfig();
  if (config.provider === "smtp" && (config.smtpHost || config.smtpUser)) {
    const sender = config.senderEmail || config.smtpUser || "admin@lanpro.my.id";
    return {
      aktif: Boolean(config.smtpHost && config.smtpUser && config.smtpPass),
      provider: `SMTP (${config.smtpHost || "Domain Hosting"})`,
      from: config.senderName ? `"${config.senderName}" <${sender}>` : sender,
      isMock: !config.smtpPass && process.env.NODE_ENV !== "production",
    };
  }
  return {
    aktif: Boolean(config.apiKey || ambilApiKey()),
    provider: "Resend",
    from: config.senderEmail || ambilEmailPengirim(),
    isMock: !config.apiKey && !ambilApiKey() && process.env.NODE_ENV !== "production",
  };
}

export function statusEmailService() {
  return {
    aktif: emailTerkonfigurasi(),
    provider: "Resend",
    from: ambilEmailPengirim(),
  };
}

/**
 * Mengirim email transaksional via SMTP hosting (Nodemailer) atau Resend REST API.
 */
/**
 * URL aplikasi untuk tautan di dalam email (item #278).
 *
 * Dulu keempat template membaca `process.env.APP_URL` langsung, sehingga
 * pergantian domain menuntut ubah env var lalu deploy ulang — dan sampai itu
 * dilakukan, setiap email menunjuk domain lama tanpa gejala apa pun.
 *
 * Urutan sumber, dari yang paling berhak: nilai di basis data (diatur admin
 * lewat UI Settings), lalu `APP_URL` sebagai warisan, lalu localhost. Env var
 * sengaja DIPERTAHANKAN sebagai cadangan supaya pemasangan lama tidak patah,
 * tetapi begitu admin mengisi kolomnya di UI, basis data yang menang.
 */
export async function ambilAppUrl(): Promise<string> {
  let dariDb = "";
  try {
    const config = await getEmailIntegrationConfig();
    dariDb = (config.appUrl || "").trim();
  } catch {
    // Basis data tidak terbaca — jatuh ke env var di bawah.
  }
  const nilai = dariDb || process.env.APP_URL || "http://localhost:3000";
  return nilai.replace(/\/+$/, "");
}

export async function kirimEmail(input: KirimEmailInput): Promise<KirimEmailResult> {
  const { to, subject, html, text, from } = input;

  const penerima = Array.isArray(to) ? to : [to];
  if (penerima.length === 0) {
    return { success: false, error: "Daftar penerima (to) tidak boleh kosong" };
  }

  for (const email of penerima) {
    if (!validasiFormatEmail(email)) {
      return { success: false, error: `Format alamat email tidak valid: ${email}` };
    }
  }

  if (!subject || subject.trim().length === 0) {
    return { success: false, error: "Subjek email tidak boleh kosong" };
  }

  if (!html || html.trim().length === 0) {
    return { success: false, error: "Konten HTML email tidak boleh kosong" };
  }

  // Baca konfigurasi dari Database PostgreSQL
  let dbConfig: EmailIntegrationConfig | null = null;
  try {
    dbConfig = await getEmailIntegrationConfig();
  } catch (e) {
    // Fallback silent
  }

  const apiKey = dbConfig?.apiKey || ambilApiKey();
  const hasDbSmtpConfig = Boolean(dbConfig && dbConfig.provider === "smtp" && dbConfig.smtpPass);
  const provider = hasDbSmtpConfig
    ? "smtp"
    : apiKey || dbConfig?.provider === "resend"
      ? "resend"
      : dbConfig?.provider || "smtp";

  // ── Jalur 1: SMTP Server (Domain IDHost / cPanel / Custom) ──────────────────
  if (provider === "smtp" && (dbConfig?.smtpPass || process.env.SMTP_PASS)) {
    const smtpHost = dbConfig?.smtpHost || process.env.SMTP_HOST || "mail.lanpro.my.id";
    const smtpPort = dbConfig?.smtpPort || Number(process.env.SMTP_PORT || 465);
    const smtpUser = dbConfig?.smtpUser || process.env.SMTP_USER || "admin@lanpro.my.id";
    const smtpPass = dbConfig?.smtpPass || process.env.SMTP_PASS || "";
    const smtpSecure = dbConfig?.smtpSecure ?? smtpPort === 465;
    const senderEmail = dbConfig?.senderEmail || smtpUser;
    const senderName = dbConfig?.senderName || "LanPro System";
    const pengirimFormatted = from || `"${senderName}" <${senderEmail}>`;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === "production",
        },
      });

      const info = await transporter.sendMail({
        from: pengirimFormatted,
        to: penerima,
        subject,
        html,
        text,
      });

      return {
        success: true,
        messageId: info.messageId || `smtp-${Date.now()}`,
      };
    } catch (err: any) {
      console.error("[EMAIL SMTP] Galat saat mengirim email via SMTP:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Gagal mengirim email melalui server SMTP",
      };
    }
  }

  // ── Jalur 2: Resend REST API ────────────────────────────────────────────────
  const pengirim = (from || dbConfig?.senderEmail || ambilEmailPengirim()).trim();

  // Mode mock di development bila API key belum disetel
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      const err = "RESEND_API_KEY belum dikonfigurasi di environment production";
      console.error(`[EMAIL] Gagal kirim: ${err}`);
      return { success: false, error: err };
    }

    console.info(
      `[EMAIL MOCK] Mengirim email ke: ${penerima.join(", ")} | Subjek: "${subject}" | Pengirim: ${
        pengirim || "(EMAIL_FROM belum disetel)"
      }`
    );
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  if (!pengirim) {
    const err =
      "EMAIL_FROM belum dikonfigurasi — alamat pengirim harus memakai domain yang terverifikasi di Resend";
    console.error(`[EMAIL] Gagal kirim: ${err}`);
    return { success: false, error: err };
  }

  try {
    const payload: Record<string, any> = {
      from: pengirim,
      to: penerima,
      subject,
      html,
    };

    if (text) {
      payload.text = text;
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: any =
      response && typeof response.json === "function"
        ? await response.json().catch(() => ({}))
        : {};

    if (!response || !response.ok) {
      const errorMsg =
        data?.message ||
        data?.error ||
        (response
          ? `HTTP ${response.status} ${response.statusText}`
          : "Layanan email tidak merespons");
      console.error(`[EMAIL] Resend API menolak pengiriman ke ${penerima.join(", ")}:`, errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    return {
      success: true,
      messageId: data?.id || `resend-${Date.now()}`,
    };
  } catch (err: any) {
    console.error("[EMAIL] Galat koneksi saat menghubungi Resend API:", err?.message || err);
    return {
      success: false,
      error: err?.message || "Gagal menghubungi layanan email",
    };
  }
}

export interface WelcomeEmailData {
  email: string;
  nama?: string;
  username: string;
}

/**
 * Mengirim email selamat datang kepada pengguna yang baru mendaftar (F6.3).
 */
export async function kirimEmailSelamatDatang(data: WelcomeEmailData): Promise<KirimEmailResult> {
  const { email, nama, username } = data;
  const namaPanggilan = (nama || username || "").trim();
  const appUrl = await ambilAppUrl();

  const subject = "Selamat Datang di LanPro - Akun Anda Telah Terdaftar";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px 12px; background-color: #f8fafc; color: #1e293b;">
      <!-- Main White Card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
        <tr>
          <td style="padding: 32px 28px;">
            <!-- Card Top Hero -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="64" style="vertical-align: middle;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 56px; height: 56px; background-color: #eef2ff; border-radius: 50%; text-align: center;">
                    <tr>
                      <td align="center" valign="middle">
                        <span style="font-size: 24px;">✉️</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align: middle; padding-left: 12px;">
                  <h1 style="color: #0f172a; font-size: 22px; margin: 0 0 4px 0; font-weight: 700; line-height: 1.2;">Selamat Datang di LanPro!</h1>
                  <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 500;">Sistem Manajemen Proyek &amp; Kolaborasi Tim</p>
                </td>
              </tr>
            </table>

            <!-- Middle Info Card (Blueish) -->
            <div style="background-color: #f0f5ff; border-radius: 12px; padding: 20px 22px; margin-top: 24px;">
              <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #0f172a;">👋 Halo, ${namaPanggilan}!</p>
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.4; color: #475569;">
                Akun Anda telah berhasil dibuat dengan informasi sebagai berikut:
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; border-spacing: 0 10px;">
                <tr>
                  <td width="36" style="vertical-align: middle;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #dbe4ff; text-align: center; line-height: 28px; font-size: 14px;">👤</div>
                  </td>
                  <td width="90" style="vertical-align: middle; font-size: 13px; color: #64748b; font-weight: 500;">Username</td>
                  <td style="vertical-align: middle; font-size: 13px; font-weight: 700; color: #0f172a;">${username}</td>
                </tr>
                <tr>
                  <td width="36" style="vertical-align: middle;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #dbe4ff; text-align: center; line-height: 28px; font-size: 14px;">✉️</div>
                  </td>
                  <td width="90" style="vertical-align: middle; font-size: 13px; color: #64748b; font-weight: 500;">Email</td>
                  <td style="vertical-align: middle; font-size: 13px;">
                    <a href="mailto:${email}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td width="36" style="vertical-align: middle;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #dbe4ff; text-align: center; line-height: 28px; font-size: 14px;">💼</div>
                  </td>
                  <td width="90" style="vertical-align: middle; font-size: 13px; color: #64748b; font-weight: 500;">Status</td>
                  <td style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; border: 1px solid #bbf7d0;">
                      <span style="display: inline-block; width: 7px; height: 7px; background-color: #16a34a; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                      Menunggu Persetujuan Admin (Pending)
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Next Steps Info Box (Greenish) -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 18px; margin-top: 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="36" style="vertical-align: top; padding-top: 2px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid #16a34a; color: #16a34a; text-align: center; line-height: 22px; font-size: 13px; font-weight: 700;">ⓘ</div>
                  </td>
                  <td style="vertical-align: top; padding-left: 6px;">
                    <p style="font-size: 13px; font-weight: 700; color: #166534; margin: 0 0 4px 0;">Apa yang terjadi selanjutnya?</p>
                    <p style="font-size: 12px; color: #15803d; line-height: 1.5; margin: 0;">
                      Akun Anda akan segera ditinjau dan disetujui oleh Administrator sistem. Setelah disetujui, Anda akan dapat masuk ke dalam sistem dan mulai menggunakannya.
                    </p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Action Button (CTA) -->
            <div style="text-align: center; margin-top: 28px;">
              <a href="${appUrl}" style="display: inline-block; background-color: #3b52d4; color: #ffffff; font-size: 14px; font-weight: 700; padding: 12px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(59, 82, 212, 0.25);">
                🚀 &nbsp;Buka LanPro &nbsp;&rarr;
              </a>
            </div>

            <!-- Footer Note inside Card -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-top: 28px;">
              <tr>
                <td align="center" style="padding: 10px 16px; font-size: 11px; color: #64748b; line-height: 1.4;">
                  ⓘ &nbsp;Email ini dikirim secara otomatis oleh sistem LanPro. Jangan membalas email ini.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = `Halo ${namaPanggilan},\n\nAkun LanPro Anda berhasil didaftarkan.\nUsername: ${username}\nEmail: ${email}\nStatus: Menunggu Persetujuan Admin (Pending)\n\nKunjungi aplikasi: ${appUrl}`;

  return kirimEmail({
    to: email,
    subject,
    html,
    text,
  });
}

export interface ActivationEmailData {
  email: string;
  nama?: string;
  username: string;
}

/**
 * Mengirim email aktivasi akun setelah akun disetujui admin (Item #261).
 */
export async function kirimEmailAktivasiAkun(data: ActivationEmailData): Promise<KirimEmailResult> {
  const { email, nama, username } = data;
  const namaPanggilan = (nama || username || "").trim();
  const appUrl = await ambilAppUrl();

  const subject = "[LanPro] Akun Anda Telah Diaktifkan";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #059669; font-size: 22px; margin: 0 0 8px 0; font-weight: 700;">Akun Anda Telah Aktif</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">LanPro Project Management System</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Halo, ${namaPanggilan}!</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">
          Kabar baik! Akun LanPro Anda dengan username <strong>${username}</strong> telah disetujui dan diaktifkan oleh Administrator.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.5; color: #334155;">
          Sekarang Anda sudah dapat masuk ke sistem dan mulai berkolaborasi bersama tim.
        </p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${appUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">Masuk ke LanPro Sekarang</a>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
        Email ini dikirim secara otomatis oleh sistem LanPro. Jangan membalas email ini.
      </p>
    </div>
  `;

  const text = `Halo ${namaPanggilan},\n\nAkun LanPro Anda (${username}) telah diaktifkan oleh Administrator.\n\nMasuk ke aplikasi: ${appUrl}`;

  return kirimEmail({
    to: email,
    subject,
    html,
    text,
  });
}

export interface TaskDigestItem {
  id: string;
  key?: string;
  title: string;
  projectName?: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  isOverdue?: boolean;
}

export interface TaskDigestEmailData {
  email: string;
  nama?: string;
  username: string;
  tasks: TaskDigestItem[];
  tanggal?: string;
}

/**
 * Mengirim email digest tugas tertunda harian / mingguan (F6.4).
 */
export async function kirimEmailTaskDigest(data: TaskDigestEmailData): Promise<KirimEmailResult> {
  const { email, nama, username, tasks, tanggal } = data;
  const namaPanggilan = (nama || username || "").trim();
  const appUrl = await ambilAppUrl();
  const tanggalFormatted =
    tanggal ||
    new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const jumlahTugas = tasks.length;
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const highPriorityCount = tasks.filter((t) =>
    ["high", "tinggi", "urgent", "kritis"].includes(t.priority?.toLowerCase())
  ).length;

  const subject = `[LanPro] Ringkasan Tugas Tertunda: ${jumlahTugas} Tugas (${tanggalFormatted})`;

  const taskRowsHtml = tasks
    .map((t) => {
      const priorityColor = ["high", "tinggi", "urgent", "kritis"].includes(
        t.priority?.toLowerCase()
      )
        ? "#ef4444"
        : ["medium", "sedang"].includes(t.priority?.toLowerCase())
          ? "#f59e0b"
          : "#64748b";

      const dueBadge = t.isOverdue
        ? `<span style="background-color: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">Overdue (${t.dueDate || "-"})</span>`
        : t.dueDate
          ? `<span style="color: #64748b; font-size: 12px;">${t.dueDate}</span>`
          : `<span style="color: #94a3b8; font-size: 12px;">-</span>`;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 8px; font-size: 12px; font-family: monospace; color: #64748b;">${t.key || "-"}</td>
          <td style="padding: 10px 8px;">
            <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${t.title}</div>
            ${t.projectName ? `<div style="font-size: 11px; color: #64748b;">Proyek: ${t.projectName}</div>` : ""}
          </td>
          <td style="padding: 10px 8px; text-align: center;">
            <span style="display: inline-block; font-size: 11px; font-weight: 600; color: ${priorityColor}; background-color: ${priorityColor}15; padding: 2px 8px; border-radius: 9999px;">
              ${t.priority || "Medium"}
            </span>
          </td>
          <td style="padding: 10px 8px; font-size: 12px; color: #475569; text-align: center;">${t.status}</td>
          <td style="padding: 10px 8px; text-align: right;">${dueBadge}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="margin-bottom: 20px; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
        <h1 style="color: #0f172a; font-size: 22px; margin: 0 0 4px 0; font-weight: 700;">LanPro Daily Task Digest</h1>
        <p style="color: #64748b; font-size: 13px; margin: 0;">${tanggalFormatted}</p>
      </div>

      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600;">Halo, ${namaPanggilan}!</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #475569;">
          Berikut adalah rekapitulasi tugas tertunda yang membutuhkan perhatian Anda hari ini:
        </p>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${jumlahTugas}</div>
          <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Pending</div>
        </div>
        ${
          overdueCount > 0
            ? `
        <div style="flex: 1; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #dc2626;">${overdueCount}</div>
          <div style="font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Lewat Deadline</div>
        </div>
        `
            : ""
        }
        ${
          highPriorityCount > 0
            ? `
        <div style="flex: 1; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #d97706;">${highPriorityCount}</div>
          <div style="font-size: 11px; font-weight: 600; color: #92400e; text-transform: uppercase;">Prioritas Tinggi</div>
        </div>
        `
            : ""
        }
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; text-align: left;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Key</th>
            <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Judul Tugas</th>
            <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: center;">Prioritas</th>
            <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: center;">Status</th>
            <th style="padding: 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: right;">Deadline</th>
          </tr>
        </thead>
        <tbody>
          ${taskRowsHtml}
        </tbody>
      </table>

      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
        <a href="${appUrl}" style="display: inline-block; background-color: #405189; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 24px; border-radius: 6px;">Buka Dashboard LanPro</a>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px;">
        Anda menerima email digest ini karena terdaftar sebagai anggota tim aktif di LanPro.
      </p>
    </div>
  `;

  const textTasks = tasks
    .map(
      (t) =>
        `- [${t.key || "-"}] ${t.title} (Status: ${t.status}, Prioritas: ${t.priority}, Deadline: ${t.dueDate || "-"})`
    )
    .join("\n");

  const text = `Halo ${namaPanggilan},\n\nBerikut ringkasan ${jumlahTugas} tugas tertunda Anda (${tanggalFormatted}):\n\n${textTasks}\n\nBuka dashboard LanPro: ${appUrl}`;

  return kirimEmail({
    to: email,
    subject,
    html,
    text,
  });
}

export interface ResetPasswordEmailData {
  email: string;
  nama?: string;
  username: string;
  resetUrl?: string;
  temporaryPassword?: string;
  expiresInMinutes?: number;
}

/**
 * Mengirim email kata sandi baru acak kepada pengguna (Item #27).
 */
export async function kirimEmailPasswordBaru(data: {
  email: string;
  nama?: string;
  username: string;
  temporaryPassword: string;
  /** Item #296 — kapan kata sandi sementara ini berhenti berlaku. */
  berlakuSampai?: Date;
}): Promise<KirimEmailResult> {
  const { email, nama, username, temporaryPassword, berlakuSampai } = data;
  const namaPanggilan = (nama || username || "").trim();
  const appUrl = await ambilAppUrl();

  /**
   * Waktu kedaluwarsa ditulis dalam zona waktu Asia/Jakarta dan disebut
   * lengkap dengan tanggalnya (#296).
   *
   * Menulis "berlaku 2 jam" saja tidak cukup: penerima tidak tahu 2 jam
   * dihitung sejak kapan, dan email bisa saja baru dibuka setengah jam
   * kemudian. Menyebut jam pastinya menghapus tebakan itu.
   */
  const kedaluwarsaTeks = berlakuSampai
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(berlakuSampai) + " WIB"
    : null;

  const subject = "[LanPro] Kata Sandi Baru Akun Anda";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="margin-bottom: 24px; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
        <h1 style="color: #0f172a; font-size: 22px; margin: 0 0 6px 0; font-weight: 700;">Kata Sandi Baru Akun LanPro</h1>
        <p style="color: #64748b; font-size: 13px; margin: 0;">LanPro Project Management</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Halo, ${namaPanggilan}!</p>
        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #475569;">
          Kami telah mengatur ulang kata sandi untuk akun LanPro Anda (<strong>${username}</strong>) sesuai permintaan Anda.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #475569;">
          Gunakan kata sandi sementara berikut untuk masuk ke akun Anda:
        </p>
      </div>

      <div style="text-align: center; margin: 24px 0; background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 6px;">Kata Sandi Sementara:</div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 700; color: #1e293b; letter-spacing: 2px;">
          ${temporaryPassword}
        </div>
      </div>

      ${
        kedaluwarsaTeks
          ? `<div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 14px; margin: 0 0 20px 0;">
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9a3412;">
          Kata sandi sementara ini <strong>berlaku sampai ${kedaluwarsaTeks}</strong>. Lewat waktu itu Anda perlu meminta lupa kata sandi sekali lagi.
        </p>
      </div>`
          : ""
      }

      <div style="text-align: center; margin: 24px 0;">
        <a href="${appUrl}" style="display: inline-block; background-color: #405189; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">Masuk ke LanPro</a>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #334155;">Catatan Keamanan:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #64748b; line-height: 1.5;">
          <li>Setelah masuk, LanPro akan <strong>meminta Anda membuat kata sandi baru</strong> sebelum dapat melanjutkan.</li>
          <li>Jangan berikan kata sandi ini kepada siapa pun demi keamanan akun Anda.</li>
        </ul>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
        Email ini dikirim secara otomatis oleh sistem LanPro. Jangan membalas email ini.
      </p>
    </div>
  `;

  const text = `Halo ${namaPanggilan},\n\nKata sandi akun LanPro Anda (${username}) telah diatur ulang.\n\nKata Sandi Sementara: ${temporaryPassword}${
    kedaluwarsaTeks ? `\nBerlaku sampai: ${kedaluwarsaTeks}` : ""
  }\n\nKunjungi aplikasi: ${appUrl}\n\nSetelah berhasil masuk, LanPro akan meminta Anda membuat kata sandi baru sebelum dapat melanjutkan.`;

  return kirimEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Mengirim email instruksi pengaturan ulang kata sandi / reset password (F6.5 / Item #27).
 */
export async function kirimEmailResetPassword(
  data: ResetPasswordEmailData
): Promise<KirimEmailResult> {
  if (data.temporaryPassword) {
    return kirimEmailPasswordBaru({
      email: data.email,
      nama: data.nama,
      username: data.username,
      temporaryPassword: data.temporaryPassword,
    });
  }

  const { email, nama, username, resetUrl = "", expiresInMinutes = 15 } = data;
  const namaPanggilan = (nama || username || "").trim();

  const subject = "[LanPro] Permintaan Pengaturan Ulang Kata Sandi";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="margin-bottom: 24px; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
        <h1 style="color: #0f172a; font-size: 22px; margin: 0 0 6px 0; font-weight: 700;">Pengaturan Ulang Kata Sandi</h1>
        <p style="color: #64748b; font-size: 13px; margin: 0;">LanPro Project Management</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Halo, ${namaPanggilan}!</p>
        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #475569;">
          Kami menerima permintaan untuk mengatur ulang kata sandi akun LanPro Anda (<strong>${username}</strong>).
        </p>
        <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.5; color: #475569;">
          Silakan klik tombol di bawah ini untuk membuat kata sandi baru Anda:
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">Atur Ulang Kata Sandi</a>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #334155;">Catatan Keamanan:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #64748b; line-height: 1.5;">
          <li>Tautan di atas hanya berlaku selama <strong>${expiresInMinutes} menit</strong>.</li>
          <li>Jika Anda tidak merasa meminta pengaturan ulang kata sandi ini, abaikan email ini dengan aman. Akun Anda tetap terlindungi.</li>
        </ul>
      </div>

      <div style="font-size: 11px; color: #94a3b8; line-height: 1.4; border-top: 1px solid #f1f5f9; padding-top: 14px;">
        <p style="margin: 0 0 4px 0;">Jika tombol di atas tidak berfungsi, salin dan buka tautan berikut di browser Anda:</p>
        <p style="margin: 0; word-break: break-all; color: #64748b;">${resetUrl}</p>
      </div>
    </div>
  `;

  const text = `Halo ${namaPanggilan},\n\nKami menerima permintaan untuk mengatur ulang kata sandi akun LanPro Anda (${username}).\n\nBuka tautan berikut untuk membuat kata sandi baru (berlaku ${expiresInMinutes} menit):\n${resetUrl}\n\nJika Anda tidak meminta pengaturan ulang ini, abaikan email ini.`;

  return kirimEmail({
    to: email,
    subject,
    html,
    text,
  });
}
