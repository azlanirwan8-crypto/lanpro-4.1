/**
 * Lapisan akses data Settings.
 *
 * Diekstrak dari components/BroadcastMonitor.tsx (Fase 3 — Anti-God-Object).
 */

import { apiRequest } from '../../../lib/api';

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
  return apiRequest('/api/users');
}

/** Mengambil status konfigurasi integrasi email dari backend (Item #45). */
export async function fetchEmailSettings(): Promise<SettingsApiResponse<EmailStatusData>> {
  return apiRequest('/api/settings/email');
}

/** Mengirim email uji coba koneksi ke alamat email tujuan (Item #45). */
export async function testEmailConnection(targetEmail: string): Promise<SettingsApiResponse> {
  return apiRequest('/api/settings/email/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetEmail }),
  });
}

