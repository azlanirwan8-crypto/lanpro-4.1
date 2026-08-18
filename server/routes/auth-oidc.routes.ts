/**
 * Rute SSO Google/Microsoft (F5.4).
 *
 * Berkas terpisah dari `auth.routes.ts` supaya jalur lama tidak tersentuh sama
 * sekali. Batasan mutlak F5: login username+password dan pendaftaran manual
 * TIDAK BOLEH berubah perilakunya, dan cara paling andal menjaminnya adalah
 * tidak menulis satu baris pun di berkas itu.
 *
 * State (nonce + PKCE verifier + mode) dititipkan di cookie httpOnly berisi
 * token bertanda tangan. Cookie dipilih karena stateless: tidak ada memori
 * proses yang harus bertahan, sehingga alurnya tetap benar di platform
 * serverless yang menjalankan banyak instance.
 */
import express from "express";
import { generateToken } from "../middleware/auth";
import {
  providerTersedia,
  siapkanOtorisasi,
  tukarCode,
  verifikasiIdToken,
  bacaState,
  tandaTanganiState,
  type ProviderOidc,
  type IdentitasOidc,
} from "../services/oidc.service";
import {
  putuskanKebijakan,
  buatAkunDariSso,
  daftarkanSesi,
  PESAN_TOLAK,
} from "../services/sso.service";

const router = express.Router();

const NAMA_COOKIE_STATE = "lanpro_oidc_state";
const NAMA_COOKIE_PENDAFTARAN = "lanpro_oidc_daftar";

/** Membaca satu cookie tanpa menambah dependensi cookie-parser. */
function bacaCookie(req: any, nama: string): string | null {
  const mentah = req.headers?.cookie;
  if (!mentah) return null;
  for (const bagian of String(mentah).split(";")) {
    const [k, ...v] = bagian.trim().split("=");
    if (k === nama) return decodeURIComponent(v.join("="));
  }
  return null;
}

function pasangCookie(res: any, nama: string, nilai: string, maksUmurDetik: number) {
  res.cookie(nama, nilai, {
    httpOnly: true,
    sameSite: "lax", // "lax" wajib: cookie harus ikut terkirim saat provider mengembalikan pengguna
    secure: process.env.NODE_ENV === "production",
    maxAge: maksUmurDetik * 1000,
    path: "/",
  });
}

function hapusCookie(res: any, nama: string) {
  res.clearCookie(nama, { path: "/" });
}

/**
 * Alamat aplikasi untuk mengembalikan pengguna.
 *
 * `APP_URL` dipakai HANYA bila ia benar-benar URL absolut. Repo ini pernah
 * memuat nilai placeholder harfiah (`MY_APP_URL`), dan nilai semacam itu
 * membuat `res.redirect` memperlakukannya sebagai jalur relatif sehingga
 * pengguna dilempar ke alamat yang tidak ada. Menurunkannya dari request
 * membuat alur tetap benar walau konfigurasinya belum diisi.
 */
function urlFrontend(req: any): string {
  const dariEnv = process.env.APP_URL || "";
  if (/^https?:\/\//i.test(dariEnv)) return dariEnv.replace(/\/$/, "");

  const protokol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protokol}://${host}`;
}

/** Mengembalikan pengguna ke aplikasi dengan pesan galat yang bisa dibaca. */
function kembaliDenganGalat(req: any, res: any, kode: string) {
  const pesan = (PESAN_TOLAK as any)[kode] || "Login dibatalkan atau gagal. Silakan coba lagi.";
  const params = new URLSearchParams({ sso_error: kode, sso_message: pesan });
  return res.redirect(`${urlFrontend(req)}/?${params.toString()}`);
}

/**
 * Provider mana yang tombolnya perlu ditampilkan.
 * Tanpa endpoint ini, UI akan menampilkan tombol yang pasti gagal saat diklik.
 */
router.get("/api/auth/oidc/providers", (_req, res) => {
  try {
    return res.json({ status: "success", providers: providerTersedia() });
  } catch (err: any) {
    // Konfigurasi separuh melempar. Kembalikan daftar kosong agar layar login
    // tetap tampil — jangan sampai salah konfigurasi SSO menjatuhkan halaman
    // login yang seharusnya masih bisa dipakai dengan username+password.
    console.error("[OIDC] Konfigurasi bermasalah:", err.message);
    return res.json({ status: "success", providers: [] });
  }
});

/** Mulai alur. `mode` menentukan boleh-tidaknya membuat akun. */
router.get("/api/auth/oidc/:provider/start", async (req: any, res) => {
  try {
    const provider = req.params.provider as ProviderOidc;
    if (provider !== "google" && provider !== "microsoft") {
      return res.status(400).json({ status: "error", message: "Provider tidak dikenal." });
    }
    const mode = req.query.mode === "daftar" ? "daftar" : "login";

    const { url, stateToken } = await siapkanOtorisasi(provider, mode);
    pasangCookie(res, NAMA_COOKIE_STATE, stateToken, 10 * 60);
    return res.redirect(url);
  } catch (err: any) {
    console.error("[OIDC] Gagal memulai otorisasi:", err.message);
    return kembaliDenganGalat(req, res, "gagal_mulai");
  }
});

/** Provider mengembalikan pengguna ke sini. */
router.get("/api/auth/oidc/callback", async (req: any, res) => {
  try {
    if (req.query.error) {
      return kembaliDenganGalat(req, res, "dibatalkan");
    }

    const code = String(req.query.code || "");
    const stateDariUrl = String(req.query.state || "");
    const stateDariCookie = bacaCookie(req, NAMA_COOKIE_STATE);
    hapusCookie(res, NAMA_COOKIE_STATE);

    const tokenState = stateDariCookie || stateDariUrl;
    if (!code || !tokenState) return kembaliDenganGalat(req, res, "state_hilang");

    // Bila cookie dan URL sama-sama ada, pastikan tidak bertentangan
    if (stateDariCookie && stateDariUrl && stateDariUrl !== stateDariCookie) {
      return kembaliDenganGalat(req, res, "state_tidak_cocok");
    }

    const state = bacaState(tokenState);
    const idToken = await tukarCode(state.provider, code, state.codeVerifier);
    const identitas = await verifikasiIdToken(state.provider, idToken, state.nonce);

    const keputusan = await putuskanKebijakan(identitas, state.mode);

    if (keputusan.aksi === "tolak") {
      return kembaliDenganGalat(req, res, keputusan.alasan);
    }

    if (keputusan.aksi === "lengkapi_pendaftaran") {
      // Identitas dititipkan lagi sebagai token bertanda tangan. Akun belum
      // dibuat — kalau pengguna menutup layar sekarang, tidak ada baris
      // setengah jadi yang tertinggal di database.
      const titipan = tandaTanganiState({
        provider: identitas.provider,
        nonce: identitas.sub,
        codeVerifier: JSON.stringify(identitas),
        mode: "daftar",
      });
      pasangCookie(res, NAMA_COOKIE_PENDAFTARAN, titipan, 15 * 60);
      const params = new URLSearchParams({
        sso_lengkapi: "1",
        email: identitas.email,
        nama: identitas.nama,
      });
      return res.redirect(`${urlFrontend(req)}/?${params.toString()}`);
    }

    const token = generateToken(keputusan.user);

    // Tanpa langkah ini, penegakan sesi tunggal di authenticateJWT akan
    // membalas 401 untuk setiap permintaan berikutnya — dan gagalnya senyap,
    // karena callback ini sendiri sukses. Lihat daftarkanSesi().
    const userId = keputusan.user.id || keputusan.user.uid;
    await daftarkanSesi(String(userId), token, {
      ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "SSO"),
      browser: String(req.headers["user-agent"] || "SSO").slice(0, 120),
    });

    return res.redirect(`${urlFrontend(req)}/?sso_token=${encodeURIComponent(token)}`);
  } catch (err: any) {
    console.error("[OIDC] Callback gagal:", err.message);
    return kembaliDenganGalat(req, res, "verifikasi_gagal");
  }
});

/** Langkah terakhir pendaftaran: pengguna memilih username, akun baru dibuat. */
router.post("/api/auth/oidc/lengkapi-pendaftaran", async (req: any, res) => {
  try {
    const titipan = bacaCookie(req, NAMA_COOKIE_PENDAFTARAN);
    if (!titipan) {
      return res.status(400).json({
        status: "error",
        message: "Sesi pendaftaran sudah kedaluwarsa. Ulangi dari awal.",
      });
    }

    const state = bacaState(titipan);
    const identitas: IdentitasOidc = JSON.parse(state.codeVerifier);

    const hasil = await buatAkunDariSso(identitas, String(req.body?.username || ""));
    if (hasil.hasil === "gagal") {
      return res.status(400).json({ status: "error", message: PESAN_TOLAK[hasil.alasan] });
    }

    hapusCookie(res, NAMA_COOKIE_PENDAFTARAN);

    // Akun berstatus `pending`, jadi TIDAK diterbitkan token. Pengguna menunggu
    // persetujuan admin, sama seperti pendaftaran manual.
    return res.status(201).json({
      status: "success",
      message: "Pendaftaran berhasil. Akun Anda menunggu persetujuan admin.",
    });
  } catch (err: any) {
    console.error("[OIDC] Lengkapi pendaftaran gagal:", err.message);
    return res.status(400).json({ status: "error", message: "Sesi pendaftaran tidak sah." });
  }
});

export default router;
