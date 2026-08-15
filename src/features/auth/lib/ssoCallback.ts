/**
 * Pembacaan hasil kembalian SSO dari query string.
 *
 * Fungsi murni: teks masuk, data keluar. Tanpa DOM, tanpa jaringan, tanpa
 * state — sesuai aturan lapisan `lib/`. Dengan begitu seluruh cabangnya bisa
 * diuji tanpa merender apa pun.
 *
 * Backend mengembalikan pengguna ke akar aplikasi dengan salah satu bentuk:
 *   ?sso_token=<jwt>                        -> berhasil masuk
 *   ?sso_error=<kode>&sso_message=<pesan>   -> ditolak, tampilkan pesannya
 *   ?sso_lengkapi=1&email=..&nama=..        -> perlu memilih username dulu
 */

export type HasilSso =
  | { jenis: "tidak_ada" }
  | { jenis: "token"; token: string }
  | { jenis: "galat"; kode: string; pesan: string }
  | { jenis: "lengkapi"; email: string; nama: string };

/** Pesan cadangan bila backend tidak mengirimkan `sso_message`. */
const PESAN_CADANGAN = "Login dibatalkan atau gagal. Silakan coba lagi.";

export function bacaHasilSso(search: string): HasilSso {
  const p = new URLSearchParams(search || "");

  const token = p.get("sso_token");
  if (token) return { jenis: "token", token };

  const kode = p.get("sso_error");
  if (kode) {
    return { jenis: "galat", kode, pesan: p.get("sso_message") || PESAN_CADANGAN };
  }

  if (p.get("sso_lengkapi") === "1") {
    return { jenis: "lengkapi", email: p.get("email") || "", nama: p.get("nama") || "" };
  }

  return { jenis: "tidak_ada" };
}

/**
 * Membuang jejak SSO dari query string.
 *
 * Token tidak boleh tertinggal di address bar: ia ikut tersalin saat pengguna
 * membagikan tautan, dan ikut tercatat di riwayat peramban.
 */
export function bersihkanQuerySso(search: string): string {
  const p = new URLSearchParams(search || "");
  ["sso_token", "sso_error", "sso_message", "sso_lengkapi", "email", "nama"].forEach((k) =>
    p.delete(k)
  );
  const sisa = p.toString();
  return sisa ? `?${sisa}` : "";
}
