/**
 * Lapisan akses data Settings.
 *
 * Diekstrak dari components/BroadcastMonitor.tsx (Fase 3 — Anti-God-Object).
 */

import { apiRequest } from "../../../lib/api";

/** Bentuk respons standar backend. */
export interface SettingsApiResponse<T = any> {
  status: string;
  data?: T;
  message?: string;
}

export interface EmailStatusData {
  aktif: boolean;
  provider: string;
  from: string;
  isMock: boolean;
}

/** Mengambil daftar pengguna untuk daftar penerima broadcast. */
export async function fetchUsers(): Promise<SettingsApiResponse> {
  return apiRequest("/api/users");
}

export interface EmailConfigData {
  provider: "smtp" | "resend";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string;
  smtpPassMasked?: string;
  hasSmtpPass?: boolean;
  smtpSecure: boolean;
  senderEmail: string;
  senderName: string;
  apiKey?: string;
  apiKeyMasked?: string;
  hasApiKey?: boolean;
  subjectTemplate?: string;
  bodyTemplate?: string;
  /** Item #278: URL aplikasi untuk tautan di dalam email. Kosong = pakai env APP_URL. */
  appUrl?: string;
  updatedAt?: string;
}

/** Mengambil status konfigurasi integrasi email dari backend (Item #45). */
export async function fetchEmailSettings(): Promise<SettingsApiResponse<EmailStatusData>> {
  return apiRequest("/api/settings/email");
}

/** Mengambil konfigurasi lengkap email dari database PostgreSQL (Item #264, #270). */
export async function fetchEmailConfig(): Promise<SettingsApiResponse<EmailConfigData>> {
  return apiRequest("/api/settings/email/config");
}

/** Menyimpan konfigurasi email ke database PostgreSQL (Item #264, #270). */
export async function saveEmailConfig(
  config: Partial<EmailConfigData>
): Promise<SettingsApiResponse<EmailConfigData>> {
  return apiRequest("/api/settings/email/config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });
}

/** Mengirim email uji coba koneksi ke alamat email tujuan (Item #45). */
export async function testEmailConnection(targetEmail: string): Promise<SettingsApiResponse> {
  return apiRequest("/api/settings/email/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targetEmail }),
  });
}

export interface BroadcastConfigData {
  channel: string;
  scheduleDays: string[];
  scheduleTime: string;
  recipientIds: string[];
  messageTemplate: string | null;
}

/** Mengambil jadwal, penerima, dan template broadcast WhatsApp (Item #193). */
export async function fetchWhatsAppBroadcastConfig(): Promise<
  SettingsApiResponse<BroadcastConfigData>
> {
  return apiRequest("/api/settings/whatsapp/broadcast-config");
}

/** Menyimpan jadwal, penerima, dan template broadcast WhatsApp (Item #193). */
export async function saveWhatsAppBroadcastConfig(
  config: Pick<
    BroadcastConfigData,
    "scheduleDays" | "scheduleTime" | "recipientIds" | "messageTemplate"
  >
): Promise<SettingsApiResponse<BroadcastConfigData>> {
  return apiRequest("/api/settings/whatsapp/broadcast-config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });
}
