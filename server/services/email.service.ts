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
  return (process.env.EMAIL_FROM || "").trim() || "LanPro <lanpro@rajonet.com>";
}

export function emailTerkonfigurasi(): boolean {
  return ambilApiKey().length > 0;
}

export function statusEmailService() {
  return {
    aktif: emailTerkonfigurasi(),
    provider: "Resend",
    from: ambilEmailPengirim(),
  };
}

/**
 * Mengirim email transaksional via Resend REST API.
 */
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

  const apiKey = ambilApiKey();
  const pengirim = (from || ambilEmailPengirim()).trim();

  // Mode mock di development bila API key belum disetel
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      const err = "RESEND_API_KEY belum dikonfigurasi di environment production";
      console.error(`[EMAIL] Gagal kirim: ${err}`);
      return { success: false, error: err };
    }

    console.info(
      `[EMAIL MOCK] Mengirim email ke: ${penerima.join(", ")} | Subjek: "${subject}" | Pengirim: ${pengirim}`
    );
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
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

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data?.message || data?.error || `HTTP ${response.status} ${response.statusText}`;
      console.error(
        `[EMAIL] Resend API menolak pengiriman ke ${penerima.join(", ")}:`,
        errorMsg
      );
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
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const subject = "Selamat Datang di LanPro - Akun Anda Telah Terdaftar";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">Selamat Datang di LanPro</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Sistem Manajemen Proyek & Kolaborasi Tim</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Halo, ${namaPanggilan}!</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">
          Akun Anda telah berhasil dibuat dengan informasi sebagai berikut:
        </p>
        <ul style="margin: 12px 0 0 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Status:</strong> Menunggu Persetujuan Admin (Pending)</li>
        </ul>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        Akun Anda saat ini berstatus <strong>Pending</strong>. Administrator sistem akan meninjau dan mengaktifkan akun Anda sebelum Anda dapat masuk ke sistem.
      </p>

      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
        <a href="${appUrl}" style="display: inline-block; background-color: #405189; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 6px;">Buka LanPro</a>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
        Email ini dikirim secara otomatis oleh sistem LanPro. Jangan membalas email ini.
      </p>
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

