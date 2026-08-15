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
import type { IdentitasOidc } from "./oidc.service";
import { domainDiizinkan } from "./oidc.service";

/** Alasan penolakan. Dipakai UI untuk memilih pesan yang tepat. */
export type AlasanTolak =
  | "domain_tidak_diizinkan"
  | "email_belum_terverifikasi"
  | "belum_terdaftar"
  | "akun_belum_aktif"
  | "identitas_milik_akun_lain"
  | "email_sudah_terdaftar";

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
    if (!user) return { aksi: "tolak", alasan: "belum_terdaftar" };
    if (!akunAktif(user)) return { aksi: "tolak", alasan: "akun_belum_aktif" };
    return { aksi: "masuk", user };
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

/** Username mengikuti aturan lama yang TIDAK berubah: huruf saja, maks 10. */
export function usernameSah(username: string): boolean {
  return /^[a-zA-Z]+$/.test(username) && username.length <= 10;
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
  await db.query(
    `INSERT INTO Users (id, uid, username, nama_lengkap, email, "displayName", role, status, "passwordHash")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [id, id, username, identitas.nama, identitas.email, identitas.nama, "user", "pending"]
  );

  await tautkanIdentitas(id, identitas);

  const user = await cariUserById(id);
  return { hasil: "berhasil", user };
}

/** Pesan yang ditampilkan ke pengguna. Spesifik, supaya tidak terkesan aplikasi rusak. */
export const PESAN_TOLAK: Record<AlasanTolak | "username_tidak_sah", string> = {
  belum_terdaftar: "Akun Anda belum terdaftar di LanPro. Hubungi admin untuk dibuatkan akun.",
  email_belum_terverifikasi:
    "Email Google/Microsoft Anda belum terverifikasi, sehingga tidak dapat dipakai untuk masuk.",
  akun_belum_aktif: "Akun Anda belum aktif. Menunggu persetujuan admin.",
  domain_tidak_diizinkan: "Domain email Anda tidak diizinkan untuk masuk ke LanPro.",
  identitas_milik_akun_lain: "Akun Google/Microsoft ini sudah tertaut ke pengguna lain.",
  email_sudah_terdaftar: "Email ini sudah terdaftar. Silakan gunakan tombol masuk.",
  username_tidak_sah: "Username hanya boleh berupa huruf, maksimal 10 karakter, dan belum dipakai.",
};
