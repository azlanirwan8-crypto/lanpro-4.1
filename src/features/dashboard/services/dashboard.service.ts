/**
 * Lapisan akses data Dashboard.
 *
 * Diekstrak dari index.tsx (Fase 3 — Anti-God-Object).
 *
 * Dashboard hanya membaca ringkasan dari sumber daya milik fitur lain;
 * tidak ada operasi tulis di sini. Fetch daftar rapat/dokumen dipindah ke
 * moduleDataCache (#317); berkas ini menyimpan helper ID yang masih dipakai.
 */

/** Bentuk respons standar backend. */
export interface DashboardApiResponse {
  status: string;
  data?: any;
  message?: string;
}

/**
 * Menentukan ID pengguna untuk header `x-user-id`.
 * Backend menerima "guest" sebagai penanda pengguna tak dikenal.
 */
export function resolveUserId(user: any): string {
  return user?.uid || user?.id || "guest";
}
