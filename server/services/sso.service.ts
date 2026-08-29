/**
 * Kebijakan akun untuk SSO (F5.4).
 *
 * Modul ini menjawab satu pertanyaan: identitas yang sudah diverifikasi
 * `oidc.service` ini BOLEH APA. Pemisahan itu disengaja — verifikasi kriptografis
 * dan kebijakan bisnis punya alasan berubah yang berbeda, dan mencampurnya
 * membuat keduanya sulit diuji sendiri-sendiri.
 *
 * KETETAPAN YANG DIKODEKAN DI SINI (AUDIT.md §1.5 F5.1):
 *
 *   1. Tombol LOGIN tidak pernah membuat akun. Email yang belum terdaftar
 *      ditolak dengan pesan, titik.
 *   2. Tombol DAFTAR boleh membuat akun, tetapi berstatus `pending` dan hanya
 *      SETELAH pengguna memilih username sendiri (opsi C).
 *   3. Penautan ke akun yang sudah ada hanya sah bila `email_verified=true`.
 *      Ini penutup satu-satunya lubang keamanan serius di rencana SSO: tanpa
 *      syarat itu, seseorang bisa membuat akun provider memakai alamat email
 *      orang lain lalu masuk ke akun korban.
 *   4. Domain email wajib ada di daftar yang diizinkan.
 *   5. Satu identitas provider hanya boleh menunjuk satu akun LanPro.
 */
import crypto from "crypto";
import db from "../../src/lib/db";
import { activeUserSessions } from "../middleware/auth";
import { authRepository } from "../repositories/auth.repository";
import type { IdentitasOidc } from "./oidc.service";
import { kirimEmailSelamatDatang, kirimEmailLatarBelakang } from "./email.service";
import { domainDiizinkan } from "./oidc.service";

/** Alasan penolakan. Dipakai UI untuk memilih pesan yang tepat. */
export type AlasanTolak =
  | "domain_tidak_diizinkan"
  | "email_belum_terverifikasi"
  | "belum_terdaftar"
  | "akun_belum_aktif"
  | "identitas_milik_akun_lain"
  | "email_sudah_terdaftar"
  | "tautan_kedaluwarsa";

export type HasilKebijakan =
  | { aksi: "masuk"; user: any }
  | { aksi: "lengkapi_pendaftaran"; identitas: IdentitasOidc }
  | { aksi: "tolak"; alasan: AlasanTolak };

async function cariUserByEmail(email: string) {
  const [rows]: any = await db.query("SELECT * FROM Users WHERE LOWER(email) = ?", [
    email.toLowerCase(),
  ]);
  return rows && rows[0] ? rows[0] : null;
}

async function cariIdentitas(provider: string, sub: string) {
  const [rows]: any = await db.query(
    'SELECT * FROM "UserIdentities" WHERE provider = ? AND sub = ?',
    [provider, sub]
  );
  return rows && rows[0] ? rows[0] : null;
}

async function cariUserById(userId: string) {
  const [rows]: any = await db.query("SELECT * FROM Users WHERE id = ?", [userId]);
  return rows && rows[0] ? rows[0] : null;
}

/** Akun dianggap bisa dipakai hanya bila statusnya aktif. */
function akunAktif(user: any): boolean {
  const s = String(user?.status || "").toLowerCase();
  return s !== "pending" && s !== "rejected";
}

/**
 * Membuang tautan identitas yang sudah tidak menunjuk user mana pun.
 *
 * Dipakai untuk memulihkan diri dari baris yatim. Tanpa ini, email yang
 * akunnya pernah dihapus tidak akan pernah bisa mendaftar lagi.
 */
async function hapusIdentitas(provider: string, sub: string) {
  await db.query('DELETE FROM "UserIdentities" WHERE provider = ? AND sub = ?', [provider, sub]);
}

async function tautkanIdentitas(userId: string, identitas: IdentitasOidc) {
  await db.query(
    'INSERT INTO "UserIdentities" (id, "userId", provider, sub, email) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), userId, identitas.provider, identitas.sub, identitas.email]
  );
}

/**
 * Menentukan apa yang boleh dilakukan sebuah identitas.
 *
 * Urutan pemeriksaan dipilih agar yang paling murah dan paling menentukan
 * dijalankan lebih dulu, dan agar tidak ada jalur yang bisa melewati syarat
 * keamanan di bawahnya.
 */
export async function putuskanKebijakan(
  identitas: IdentitasOidc,
  mode: "login" | "daftar"
): Promise<HasilKebijakan> {
  // 1. Domain. Berlaku untuk KEDUA tombol — termasuk login, supaya akun lama
  //    yang domainnya sudah tidak diizinkan tidak bisa masuk lewat jalur SSO.
  if (!domainDiizinkan(identitas.email)) {
    return { aksi: "tolak", alasan: "domain_tidak_diizinkan" };
  }

  // 2. Identitas yang sudah pernah ditautkan. Diperiksa sebelum email, karena
  //    inilah tautan yang paling kuat: `sub` dari provider tidak pernah berubah
  //    walaupun pengguna mengganti alamat emailnya.
  const identitasTersimpan = await cariIdentitas(identitas.provider, identitas.sub);
  if (identitasTersimpan) {
    const user = await cariUserById(identitasTersimpan.userId);

    if (user) {
      // #177 — tautan sub->user TIDAK berarti email itu masih milik user ini.
      // `sub` sengaja dipercaya di atas email (lihat komentar di bawah), supaya
      // pengguna yang mengganti emailnya SENDIRI tetap bisa SSO tanpa menaut
      // ulang — itu tetap harus jalan. Tapi bila email yang dilaporkan provider
      // SEKARANG sudah dipakai user AKTIF LAIN di tabel Users, tandanya beda:
      // email itu sudah dipindah (mis. lewat panel admin) ke akun lain sejak
      // tautan ini dibuat. Mempercayai tautan lama di sini berarti siapa pun
      // yang memegang akun Google/Microsoft itu otomatis masuk ke identitas
      // LAMA meski emailnya kini sah milik orang lain. TIDAK diarahkan otomatis
      // ke pemilik baru pula — arah itu sama bahayanya, sebab tautan provider
      // untuk akun baru itu belum pernah diverifikasi. Tautan basi diputus
      // (pola sama seperti identitas yatim di bawah) supaya proses berikutnya
      // bisa menaut ulang dengan bersih lewat jalur yang sah, bukan terkunci
      // permanen ke akun lama.
      const pemilikEmailSekarang = await cariUserByEmail(identitas.email);
      if (
        pemilikEmailSekarang &&
        String(pemilikEmailSekarang.id) !== String(user.id) &&
        akunAktif(pemilikEmailSekarang)
      ) {
        console.warn(
          `[SSO] Tautan identitas basi diputus: ${identitas.provider}/${identitas.sub} menunjuk user ${user.id}, tetapi email ${identitas.email} kini milik user ${pemilikEmailSekarang.id}.`
        );
        await hapusIdentitas(identitas.provider, identitas.sub);
        return { aksi: "tolak", alasan: "tautan_kedaluwarsa" };
      }

      if (!akunAktif(user)) return { aksi: "tolak", alasan: "akun_belum_aktif" };
      return { aksi: "masuk", user };
    }

    // IDENTITAS YATIM: barisnya ada, tetapi user yang ditunjuknya sudah tidak
    // ada — biasanya karena akunnya dihapus admin sementara identitasnya
    // tertinggal.
    //
    // Versi pertama kode ini menolak dengan "belum_terdaftar" tanpa memandang
    // mode, sehingga email tersebut TERKUNCI SELAMANYA: tombol Daftar pun ikut
    // tertolak karena pemeriksaan ini terjadi sebelum cabang login/daftar.
    // Ditemukan pemilik proyek saat mencoba mendaftar dan justru diberi tahu
    // "belum terdaftar".
    //
    // Baris basi itu kini dibersihkan, lalu alurnya diteruskan seolah identitas
    // ini belum pernah ada — sehingga mode `daftar` bisa membuat akun baru dan
    // mode `login` memberi pesan yang benar di bawah.
    console.warn(
      `[SSO] Identitas yatim dibersihkan: ${identitas.provider}/${identitas.sub} menunjuk user ${identitasTersimpan.userId} yang tidak ada.`
    );
    await hapusIdentitas(identitas.provider, identitas.sub);
  }

  // 3. Email terverifikasi. Diperiksa SEBELUM penautan berdasarkan email,
  //    karena justru penautan itulah yang berbahaya bila emailnya tidak benar.
  if (!identitas.emailTerverifikasi) {
    return { aksi: "tolak", alasan: "email_belum_terverifikasi" };
  }

  const userSeemail = await cariUserByEmail(identitas.email);

  if (mode === "login") {
    // Tombol LOGIN tidak pernah membuat akun (ketetapan F5.1 #3).
    if (!userSeemail) return { aksi: "tolak", alasan: "belum_terdaftar" };
    if (!akunAktif(userSeemail)) return { aksi: "tolak", alasan: "akun_belum_aktif" };
    await tautkanIdentitas(userSeemail.id, identitas);
    return { aksi: "masuk", user: userSeemail };
  }

  // mode === "daftar"
  if (userSeemail) {
    // Sudah punya akun. Tautkan lalu perlakukan seperti login — jangan membuat
    // duplikat hanya karena pengguna menekan tombol yang berbeda.
    if (!akunAktif(userSeemail)) return { aksi: "tolak", alasan: "akun_belum_aktif" };
    await tautkanIdentitas(userSeemail.id, identitas);
    return { aksi: "masuk", user: userSeemail };
  }

  // Belum ada akun. Pengguna harus memilih username lebih dulu; akun BARU
  // dibuat setelah itu. Membuatnya sekarang akan meninggalkan baris tanpa
  // username bila pengguna menutup layar.
  return { aksi: "lengkapi_pendaftaran", identitas };
}

/** Username mengikuti aturan baru (#214): huruf saja, maks 25. */
export function usernameSah(username: string): boolean {
  return /^[a-zA-Z]+$/.test(username) && username.length <= 25;
}

export async function usernameTersedia(username: string): Promise<boolean> {
  const [rows]: any = await db.query("SELECT id FROM Users WHERE username = ?", [username]);
  return !rows || rows.length === 0;
}

/**
 * Diskriminan sengaja berupa string, bukan `ok: boolean`.
 *
 * `tsconfig.json` repo ini belum menyalakan `strict`, dan tanpa
 * `strictNullChecks` penyempitan tipe lewat diskriminan boolean tidak bekerja —
 * `if (!hasil.ok)` gagal mempersempit union sehingga `tsc` menolaknya.
 * Diskriminan string bekerja di kedua mode.
 */
export type HasilBuatAkun =
  { hasil: "berhasil"; user: any } | { hasil: "gagal"; alasan: AlasanTolak | "username_tidak_sah" };

/**
 * Membuat akun dari identitas SSO setelah username dipilih.
 *
 * Akun lahir berstatus `pending` — sama seperti pendaftaran manual — dan
 * TANPA password. `passwordHash` sengaja dibiarkan NULL, bukan diisi string
 * kosong: string kosong berisiko lolos sebagai password yang sah bila suatu
 * saat ada jalur perbandingan yang lengah.
 */
export async function buatAkunDariSso(
  identitas: IdentitasOidc,
  username: string
): Promise<HasilBuatAkun> {
  if (!usernameSah(username)) return { hasil: "gagal", alasan: "username_tidak_sah" };
  if (!domainDiizinkan(identitas.email))
    return { hasil: "gagal", alasan: "domain_tidak_diizinkan" };
  if (!identitas.emailTerverifikasi) return { hasil: "gagal", alasan: "email_belum_terverifikasi" };

  if (await cariUserByEmail(identitas.email)) {
    return { hasil: "gagal", alasan: "email_sudah_terdaftar" };
  }
  if (await cariIdentitas(identitas.provider, identitas.sub)) {
    return { hasil: "gagal", alasan: "identitas_milik_akun_lain" };
  }
  if (!(await usernameTersedia(username))) {
    return { hasil: "gagal", alasan: "username_tidak_sah" };
  }

  const id = crypto.randomUUID();

  // DUA TABEL, SATU TRANSAKSI. Versi pertama menulis Users lalu UserIdentities
  // sebagai dua operasi lepas. Bila yang kedua gagal, akun tercipta tanpa
  // tautan; bila urutannya terbalik, tautan tercipta tanpa akun — dan tautan
  // yatim itulah yang mengunci email pengguna selamanya. Transaksi membuat
  // keduanya jadi lahir bersama atau tidak sama sekali.
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO Users (id, uid, username, nama_lengkap, email, "displayName", role, status, "passwordHash")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [id, id, username, identitas.nama, identitas.email, identitas.nama, "user", "pending"]
    );

    await connection.query(
      'INSERT INTO "UserIdentities" (id, "userId", provider, sub, email) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), id, identitas.provider, identitas.sub, identitas.email]
    );

    await connection.commit();

    // #26 (F6.3) Pengiriman email selamat datang pendaftaran SSO secara non-blocking
    kirimEmailLatarBelakang(
      kirimEmailSelamatDatang({
        email: identitas.email,
        nama: identitas.nama,
        username,
      }),
      `Email selamat datang pendaftaran SSO untuk ${identitas.email}`
    );
  } catch (err: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Rollback yang gagal tidak boleh menutupi galat aslinya.
      }
    }
    console.error("[SSO] Gagal membuat akun:", err?.message);
    return { hasil: "gagal", alasan: "username_tidak_sah" };
  } finally {
    if (connection) connection.release();
  }

  const user = await cariUserById(id);
  return { hasil: "berhasil", user };
}

/**
 * Mendaftarkan sesi SSO yang baru terbit.
 *
 * WAJIB dipanggil setiap kali SSO menerbitkan JWT. LanPro menegakkan sesi
 * tunggal di `authenticateJWT`: bila `Users.currentSessionToken` terisi dan
 * BERBEDA dari token yang dibawa, seluruh permintaan API dibalas 401.
 *
 * Versi pertama callback SSO hanya menerbitkan token tanpa memperbarui kolom
 * itu. Akibatnya pengguna yang pernah login memakai password tidak bisa masuk
 * lewat Google sama sekali — dan gagalnya SENYAP, tanpa pesan apa pun, karena
 * callback-nya sendiri sukses dan kegagalan baru muncul pada permintaan API
 * berikutnya. Ditemukan pemilik proyek 16 Agu 2026.
 *
 * `activeUserSessions` ikut diisi karena middleware memakainya sebagai jalur
 * cadangan bila kueri database gagal.
 */
export async function daftarkanSesi(
  userId: string,
  token: string,
  info: {
    ip?: string;
    browser?: string;
    device?: string;
    userAgent?: string;
    os?: string;
    city?: string;
    country?: string;
    location?: string;
  } = {}
): Promise<void> {
  await db.query("UPDATE Users SET currentSessionToken = ?, lastSeen = ? WHERE id = ?", [
    token,
    String(Date.now()),
    String(userId),
  ]);

  activeUserSessions.set(String(userId), {
    token,
    ip: info.ip || "SSO",
    browser: info.browser || "SSO",
    device: info.device || "SSO",
    lastActiveAt: Date.now(),
    browserSessionId: "",
  });

  const sessionId = crypto.randomUUID();
  setImmediate(async () => {
    try {
      await authRepository.recordSessionLogin({
        id: sessionId,
        userId: String(userId),
        ipAddress: info.ip || null,
        userAgent: info.userAgent || null,
        browser: info.browser || "SSO",
        os: info.os || null,
        device: info.device || "SSO",
        city: info.city || null,
        country: info.country || null,
        location: info.location || null,
        token: token || null,
      });
    } catch (err) {
      console.error("[SSO] Gagal mencatat UserSession login:", err);
    }
  });
}

/** Pesan yang ditampilkan ke pengguna. Spesifik, supaya tidak terkesan aplikasi rusak. */
export const PESAN_TOLAK: Record<string, string> = {
  // Pesan ini muncul saat pengguna menekan tombol MASUK dengan email yang belum
  // punya akun. Versi sebelumnya menyuruh menghubungi admin — itu menyesatkan,
  // karena pengguna sebenarnya bisa mendaftar sendiri lewat tombol di layar
  // pendaftaran. Pemilik proyek menemukannya saat mengira sedang mendaftar
  // padahal menekan tombol masuk.
  belum_terdaftar:
    'Email ini belum terdaftar di LanPro. Silakan buka halaman Sign Up, lalu gunakan tombol "Daftar dengan Google".',
  email_belum_terverifikasi:
    "Email Google/Microsoft Anda belum terverifikasi, sehingga tidak dapat dipakai untuk masuk.",
  akun_belum_aktif: "Akun Anda belum aktif. Menunggu persetujuan admin.",
  domain_tidak_diizinkan:
    "Domain email Anda tidak diizinkan untuk masuk ke LanPro. Pastikan domain email Anda terdaftar pada SSO_ALLOWED_DOMAINS.",
  identitas_milik_akun_lain: "Akun Google/Microsoft ini sudah tertaut ke pengguna lain.",
  email_sudah_terdaftar: "Email ini sudah terdaftar. Silakan gunakan tombol masuk.",
  tautan_kedaluwarsa:
    "Tautan akun Google/Microsoft ini sudah tidak berlaku karena alamat emailnya kini terdaftar pada akun LanPro lain. Silakan masuk memakai kata sandi, atau hubungi admin untuk menautkan ulang.",
  username_tidak_sah: "Username hanya boleh berupa huruf, maksimal 10 karakter, dan belum dipakai.",
  gagal_mulai:
    "Gagal memulai otorisasi SSO. Pastikan kredensial OIDC dan JWT_SECRET telah dikonfigurasi di server.",
  dibatalkan: "Proses otorisasi Google/Microsoft dibatalkan.",
  state_hilang: "Sesi otorisasi kedaluwarsa atau state tidak ditemukan. Silakan coba lagi.",
  state_tidak_cocok: "Validasi keamanan state tidak cocok. Silakan coba lagi.",
  verifikasi_gagal: "Verifikasi identitas akun gagal. Silakan coba lagi.",
};
