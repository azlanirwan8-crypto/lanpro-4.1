/**
 * Satu-satunya tempat fitur auth bicara ke backend soal SSO.
 *
 * Komponen dilarang memanggil `apiRequest` langsung (ARCHITECTURE.md §2), jadi
 * detail bentuk endpoint terkurung di sini. Kalau suatu saat jalur SSO berubah,
 * hanya berkas ini yang perlu menyesuaikan.
 */
import { apiRequest } from "../../../lib/api";

export type ProviderSso = "google" | "microsoft";

/**
 * Provider mana yang tombolnya boleh ditampilkan.
 *
 * Kegagalan sengaja dikembalikan sebagai daftar kosong, bukan dilempar:
 * layar login harus tetap tampil dan tetap bisa dipakai dengan
 * username+password walaupun konfigurasi SSO bermasalah.
 */
export async function ambilProviderSso(): Promise<ProviderSso[]> {
  try {
    const data: any = await apiRequest("/api/auth/oidc/providers");
    return Array.isArray(data?.providers) ? data.providers : [];
  } catch {
    return [];
  }
}

/**
 * Alamat untuk memulai alur SSO.
 *
 * Sengaja berupa navigasi penuh peramban, bukan `fetch`: alur OAuth
 * mengharuskan pengguna benar-benar berpindah ke halaman provider.
 */
export function urlMulaiSso(provider: ProviderSso, mode: "login" | "daftar"): string {
  return `/api/auth/oidc/${provider}/start?mode=${mode}`;
}

/** Langkah terakhir pendaftaran lewat SSO: mengirim username pilihan pengguna. */
export async function kirimLengkapiPendaftaran(
  username: string
): Promise<{ berhasil: boolean; pesan: string }> {
  try {
    const data: any = await apiRequest("/api/auth/oidc/lengkapi-pendaftaran", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
    return {
      berhasil: true,
      pesan: data?.message || "Pendaftaran berhasil. Akun Anda menunggu persetujuan admin.",
    };
  } catch (err: any) {
    return {
      berhasil: false,
      pesan: err?.data?.message || err?.message || "Pendaftaran gagal. Silakan ulangi.",
    };
  }
}
