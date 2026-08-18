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
