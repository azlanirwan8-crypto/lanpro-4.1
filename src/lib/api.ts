import i18n from "../i18n";
import { safeLocalStorage, safeSessionStorage } from "./safeStorage";
import { toast } from "sonner";

/**
 * LanPro v1.3 - Centralized API Service with JWT & Conflict Handling
 */

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function isNetworkOrAuthError(e: any): boolean {
  if (!e) return false;
  const msg = e?.message || String(e);
  if (e?.status === 503 || e?.data?.networkError) return true;
  return (
    msg.includes("Gagal terhubung ke server") ||
    msg.includes("koneksi internet") ||
    msg.includes("Failed to fetch") ||
    msg.includes("fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Network Request Failed") ||
    msg.includes("Sesi Anda telah berakhir") ||
    msg.includes("Sesi berakhir") ||
    msg.includes("token tidak valid") ||
    msg.includes("Token autentikasi") ||
    msg.includes("Akses ditolak") ||
    msg.includes("429") ||
    msg.includes("Rate exceeded") ||
    msg.includes("rate") ||
    msg.includes("503")
  );
}

/**
 * #93 — token mengikuti pilihan "Remember Me", sama seperti profil sesi.
 *
 * Sebelumnya `setAuthToken` SELALU menulis ke localStorage, tanpa cabang
 * `remember` sama sekali, sementara profil sesi (`sessionUser`) memang
 * mengikutinya. Akibatnya tidak mencentang "Remember Me" hanya melupakan
 * PROFIL; KREDENSIALNYA tetap tinggal melewati penutupan peramban. Di komputer
 * bersama, menutup tab tidak mengakhiri sesi pada tingkat yang penting.
 *
 * localStorage dibaca lebih dulu supaya sesi "ingat saya" yang sudah ada tidak
 * berubah perilakunya; sessionStorage jadi cadangan untuk sesi sementara.
 */
export const getAuthToken = () => {
  try {
    return (
      safeLocalStorage.getItem("lanpro_jwt_token") || safeSessionStorage.getItem("lanpro_jwt_token")
    );
  } catch (e) {
    return null;
  }
};

/**
 * @param remember `true` menyimpan lintas sesi peramban, `false` hanya selama
 *   tab hidup. Bila DIHILANGKAN, lokasi token yang sekarang DIPERTAHANKAN —
 *   itu penting untuk pemanggil yang tidak tahu pilihan pengguna, yaitu
 *   penyegaran token dan kembalian SSO. Tanpa aturan ini, satu penyegaran akan
 *   memindahkan token sesi sementara ke penyimpanan permanen dan membatalkan
 *   pilihan penggunanya tanpa ada yang menyadari.
 */
export const setAuthToken = (token: string, remember?: boolean) => {
  try {
    const diSesi = safeSessionStorage.getItem("lanpro_jwt_token") !== null;
    const permanen = remember === undefined ? !diSesi : remember;

    if (permanen) {
      safeSessionStorage.removeItem("lanpro_jwt_token");
      safeLocalStorage.setItem("lanpro_jwt_token", token);
    } else {
      // Membuang salinan lama WAJIB: `getAuthToken` membaca localStorage
      // lebih dulu, jadi token permanen yang tertinggal akan menutupi token
      // sementara dan mengembalikan persis cacat #93.
      safeLocalStorage.removeItem("lanpro_jwt_token");
      safeSessionStorage.setItem("lanpro_jwt_token", token);
    }
  } catch (e) {}
};

export const clearAuthToken = () => {
  try {
    safeLocalStorage.removeItem("lanpro_jwt_token");
    safeSessionStorage.removeItem("lanpro_jwt_token");
    safeLocalStorage.removeItem("sessionUser");
    safeSessionStorage.removeItem("sessionUser");
    safeLocalStorage.removeItem("isAdminMode");
    safeSessionStorage.removeItem("isAdminMode");
  } catch (e) {}
};

interface FetchOptions extends RequestInit {
  body?: any;
}

export async function apiRequest(
  url: string,
  options: FetchOptions = {},
  retries = 3,
  backoff = 1000
): Promise<any> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  // Prevent Vercel Edge Caching for all API requests to ensure fresh data
  headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  headers.set("Pragma", "no-cache");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    fetchOptions.body =
      typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (fetchErr: any) {
    if (retries > 0) {
      console.warn(
        `Network request failed for ${url} (${fetchErr?.message || "Failed to fetch"}). Retrying in ${backoff}ms... (${retries} left)`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return apiRequest(url, options, retries - 1, backoff * 1.5);
    }
    throw new ApiError("Gagal terhubung ke server. Silakan periksa koneksi internet Anda.", 503, {
      networkError: true,
      rawMessage: fetchErr?.message,
    });
  }

  if (response.status === 429 && retries > 0 && !url.includes("/api/auth/")) {
    console.warn(`Rate limited (429) for ${url}. Retrying in ${backoff}ms...`);

    // Dispatch centralized rate limit status event for any global listener
    window.dispatchEvent(
      new CustomEvent("rate_limit_status", {
        detail: { active: true, url, backoff, retriesLeft: retries },
      })
    );

    toast.warning(
      `Permintaan terlalu cepat (429). Menghubungi server dalam ${(backoff / 1000).toFixed(1)} detik...`,
      {
        id: `rate-limit-${url}`,
        duration: backoff + 1000,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, backoff));

    try {
      const retryRes = await apiRequest(url, options, retries - 1, backoff * 2);

      // Clean up status on success
      window.dispatchEvent(
        new CustomEvent("rate_limit_status", {
          detail: { active: false, url },
        })
      );
      toast.success(i18n.t("toast.reconnected"), {
        id: `rate-limit-${url}`,
        duration: 2000,
      });

      return retryRes;
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("rate_limit_status", {
          detail: { active: false, url, failed: true },
        })
      );
      throw err;
    }
  } else if (response.status === 429 && retries === 0) {
    window.dispatchEvent(
      new CustomEvent("rate_limit_status", {
        detail: { active: false, url, failed: true },
      })
    );
    toast.error(i18n.t("toast.retryLimitReached"), {
      id: `rate-limit-${url}`,
      duration: 4000,
    });
  } else {
    // Any other non-429 response cleans up active rate-limit status for this URL
    window.dispatchEvent(
      new CustomEvent("rate_limit_status", {
        detail: { active: false, url },
      })
    );
  }

  // v1.6 Hardening: Safe JSON / Text parsing with fallback & Vercel error sanitization
  let responseData: any = null;

  const contentType = response.headers.get("content-type") || "";
  const isJsonHeader = contentType.includes("application/json");

  try {
    if (isJsonHeader) {
      responseData = await response.json().catch(async () => {
        const text = await response
          .clone()
          .text()
          .catch(() => "");
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      });
    } else {
      const rawText = await response.text().catch(() => "");
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = rawText;
      }
    }
  } catch (err) {
    responseData = null;
  }

  // v1.4: Enhanced Auth & Session Handling
  // v1.5: Only logout on 401 (Unauthenticated). 403 (Forbidden) should just show the error without clearing token.
  if (response.status === 401) {
    if (!url.includes("/api/auth/")) {
      const message =
        responseData && typeof responseData === "object" && responseData.message
          ? responseData.message
          : "Sesi berakhir. Silakan login kembali.";

      clearAuthToken();
      window.dispatchEvent(new Event("auth_expired"));
      throw new ApiError(message, 401, { authError: true });
    }
  }

  if (!response.ok) {
    let message = `Server error: ${response.status}`;
    let errorData: any = {};

    if (responseData && typeof responseData === "object" && !Array.isArray(responseData)) {
      errorData = responseData;
      // Item #150 — SATU titik terjemahan untuk seluruh pesan galat server.
      //
      // Server tidak tahu bahasa antarmuka, jadi ia mengirim KODE stabil
      // (mis. "auth.wrongPassword") beserta parameternya. Di sinilah kode itu
      // diterjemahkan. `message` bawaan server tetap dipakai bila kodenya
      // belum dikenal kamus, sehingga tidak ada pesan yang hilang selama
      // migrasi rute demi rute.
      const kode = responseData.code;
      const adaDiKamus = typeof kode === "string" && i18n.exists(`serverErr.${kode}`);
      message = adaDiKamus
        ? i18n.t(`serverErr.${kode}`, responseData.params || {})
        : responseData.message || responseData.error || message;
    } else if (typeof responseData === "string" && responseData.trim().length > 0) {
      const text = responseData.trim();
      if (
        text.includes("<html>") ||
        text.includes("<!DOCTYPE") ||
        text.startsWith("An error") ||
        text.includes("Vercel")
      ) {
        if (response.status === 403) {
          message = "Akses ditolak. Silakan periksa hak akses Anda.";
        } else if (response.status === 401) {
          message = "Sesi autentikasi tidak valid.";
        } else if (response.status === 429) {
          message = "Terlalu banyak permintaan. Silakan tunggu beberapa saat.";
        } else if (response.status >= 500) {
          message = `Gagal memproses permintaan pada server (${response.status}). Silakan coba beberapa saat lagi.`;
        } else {
          message = `Terjadi kesalahan pada server (${response.status}).`;
        }
      } else {
        message = text;
      }
    }

    // Sanitize any raw JS syntax error or unhandled Vercel error text
    if (
      typeof message === "string" &&
      (message.includes("Unexpected token") ||
        message.includes("is not valid JSON") ||
        message.startsWith("An error occurred") ||
        message.includes("JSON.parse"))
    ) {
      message = `Gagal memproses respons dari server (${response.status}). Silakan coba beberapa saat lagi.`;
    }

    throw new ApiError(message, response.status, errorData);
  }

  return responseData;
}

export const apiClient = {
  get: (url: string) => apiRequest(url, { method: "GET" }).then((data) => ({ data })),
  post: (url: string, body?: any) =>
    apiRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then((data) => ({ data })),
  put: (url: string, body?: any) =>
    apiRequest(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then((data) => ({ data })),
  delete: (url: string) => apiRequest(url, { method: "DELETE" }).then((data) => ({ data })),
};
