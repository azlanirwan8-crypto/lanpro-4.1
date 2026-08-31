/**
 * Fondasi OpenID Connect untuk SSO Google & Microsoft (F5.3).
 *
 * SATU ADAPTOR UNTUK DUA PROVIDER. Google dan Microsoft sama-sama mengikuti
 * OpenID Connect, sehingga yang berbeda hanya URL discovery dan kredensial
 * klien. Menulis dua adaptor terpisah berarti menduplikasi verifikasi token —
 * bagian yang paling tidak boleh salah.
 *
 * TANPA DEPENDENSI BARU. Verifikasi signature memakai `crypto.createPublicKey`
 * dengan format JWK, tersedia sejak Node 16 dan terpasang di Node 24 yang
 * dipakai repo ini. Menambah `jwks-rsa` atau `jose` hanya memperluas permukaan
 * risiko untuk pekerjaan yang sudah bisa dilakukan pustaka bawaan.
 *
 * SCOPE SENGAJA MINIMAL: `openid email profile`. Tidak ada scope Drive di sini.
 * Meminta akses berkas di layar login membuat pengguna menolak consent, dan
 * SSO memang hanya butuh membuktikan identitas.
 *
 * MODUL INI TIDAK MENYENTUH DATABASE DAN TIDAK MEMBUAT AKUN. Ia hanya
 * mengubah `code` dari provider menjadi identitas terverifikasi. Kebijakan
 * siapa yang boleh masuk atau didaftarkan ada di F5.4.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../helpers/jwtSecret";

export type ProviderOidc = "google" | "microsoft";

/** Identitas terverifikasi. Bentuknya seragam untuk semua provider. */
export interface IdentitasOidc {
  provider: ProviderOidc;
  sub: string;
  email: string;
  emailTerverifikasi: boolean;
  nama: string;
}

/** Isi state yang dititipkan ke provider selama pengguna berada di layar login. */
export interface StateOidc {
  provider: ProviderOidc;
  nonce: string;
  codeVerifier: string;
  /** "login" tidak pernah membuat akun; "daftar" boleh. Lihat ketetapan F5.1 #3. */
  mode: "login" | "daftar";
}

interface KonfigProvider {
  clientId: string;
  clientSecret: string;
  urlDiscovery: string;
}

const TTL_STATE_DETIK = 10 * 60;
const TTL_CACHE_MS = 60 * 60 * 1000;

/**
 * Konfigurasi dibaca dari environment TANPA nilai fallback.
 *
 * Provider yang tidak dikonfigurasi sama sekali dianggap "tidak dipakai" dan
 * tombolnya cukup disembunyikan — itu keadaan yang sah. Yang TIDAK sah adalah
 * konfigurasi separuh: client id tanpa secret berarti seseorang bermaksud
 * menyalakan provider ini tetapi belum selesai, dan itu harus gagal terbuka
 * (ARCHITECTURE.md §3.2).
 */
function bacaKonfig(provider: ProviderOidc): KonfigProvider | null {
  const awalan = provider === "google" ? "OIDC_GOOGLE" : "OIDC_MICROSOFT";
  const clientId = process.env[`${awalan}_CLIENT_ID`] || "";
  const clientSecret = process.env[`${awalan}_CLIENT_SECRET`] || "";

  if (!clientId && !clientSecret) return null;

  if (!clientId || !clientSecret) {
    throw new Error(
      `[OIDC] Konfigurasi ${provider} tidak lengkap: ` +
        `${awalan}_CLIENT_ID dan ${awalan}_CLIENT_SECRET harus diisi bersamaan. ` +
        `Konfigurasi separuh harus gagal sekarang, bukan saat pengguna mencoba masuk.`
    );
  }

  const urlDiscovery =
    provider === "google"
      ? "https://accounts.google.com/.well-known/openid-configuration"
      : `https://login.microsoftonline.com/${process.env.OIDC_MICROSOFT_TENANT || "common"}/v2.0/.well-known/openid-configuration`;

  return { clientId, clientSecret, urlDiscovery };
}

/** Provider yang benar-benar siap dipakai. Dipakai UI untuk menentukan tombol mana yang tampil. */
export function providerTersedia(): ProviderOidc[] {
  return (["google", "microsoft"] as ProviderOidc[]).filter((p) => bacaKonfig(p) !== null);
}

/**
 * Nilai `OIDC_MICROSOFT_TENANT` yang BUKAN direktori tertentu (#305).
 *
 * Ketiganya adalah endpoint kumpulan milik Microsoft, bukan satu organisasi:
 * `common` menerima akun kerja MAUPUN akun pribadi, `organizations` menerima
 * akun kerja dari organisasi mana pun, `consumers` hanya akun pribadi.
 * Pada ketiganya, alamat email yang dibawa `id_token` TIDAK dijamin berasal
 * dari direktori yang kita percayai.
 */
const TENANT_KUMPULAN = new Set(["common", "organizations", "consumers"]);

/**
 * Apakah Microsoft dikonfigurasi ke SATU direktori tertentu (#305).
 *
 * Ini yang membedakan "alamat email diterbitkan organisasi yang kita tunjuk"
 * dari "alamat email milik akun Microsoft mana pun di dunia", dan pembedaan
 * itulah yang membuat `emailBolehDipercaya()` di bawah aman.
 */
export function tenantMicrosoftSpesifik(): boolean {
  const tenant = (process.env.OIDC_MICROSOFT_TENANT || "common").trim().toLowerCase();
  return tenant !== "" && !TENANT_KUMPULAN.has(tenant);
}

/**
 * Apakah alamat pada `id_token` boleh dianggap terverifikasi (#305).
 *
 * Persoalannya nyata dan menahan seluruh #305: **Entra ID sering tidak
 * mengirim klaim `email_verified` sama sekali**, sementara Google
 * mengirimnya dengan andal. Ketiadaan klaim diperlakukan sebagai "belum
 * terverifikasi" (ketetapan F5.4), sehingga pendaftaran dan penautan lewat
 * Microsoft SELALU ditolak — bukan karena akunnya bermasalah, melainkan
 * karena kebijakan kita sendiri.
 *
 * Urutan yang dipakai di sini, dari yang paling kuat:
 *
 *   1. `email_verified === true` — pernyataan eksplisit provider. Berlaku
 *      untuk provider mana pun, dan inilah satu-satunya jalur Google.
 *   2. `xms_edov === true` — klaim Entra ID "email domain owner verified".
 *      Hanya dikirim sebagian tenant, jadi tidak bisa diandalkan sendirian,
 *      tetapi bila ada ia setara dengan (1).
 *   3. Microsoft pada tenant SPESIFIK — alamatnya diterbitkan dan dikelola
 *      direktori yang kita tunjuk sendiri lewat `OIDC_MICROSOFT_TENANT`.
 *      Tidak ada orang luar yang bisa mengarang alamat di direktori itu.
 *
 * **Kenapa (3) TIDAK berlaku di `common`.** Di endpoint kumpulan, penanda
 * masuk boleh berupa akun Microsoft pribadi, dan alamat pada akun pribadi
 * bisa berupa alamat apa pun yang pernah diverifikasikan pemiliknya ke
 * Microsoft. Mempercayai domainnya di sana berarti mempercayai daftar domain
 * kita sendiri untuk menjaga sesuatu yang tidak dijaganya.
 *
 * **Google sengaja TIDAK ikut aturan (3).** Ia sudah mengirim klaimnya
 * dengan andal; melonggarkannya berarti membuang jaminan yang sudah dimiliki
 * tanpa mendapat apa pun.
 */
export function emailBolehDipercaya(provider: ProviderOidc, payload: any): boolean {
  // Pernyataan eksplisit provider selalu menang, KE DUA ARAH. `false` di sini
  // bukan ketiadaan informasi melainkan penyangkalan: provider mengatakan
  // alamat ini TIDAK terverifikasi. Menimpanya dengan "tetapi tenant-nya
  // milik kita" akan membalik arti klaimnya sendiri.
  //
  // Versi pertama fungsi ini hanya memeriksa `=== true` lalu jatuh ke aturan
  // tenant, sehingga `email_verified: false` dari tenant spesifik justru
  // DITERIMA. Tertangkap tesnya sendiri sebelum sempat dipakai.
  if (typeof payload?.email_verified === "boolean") return payload.email_verified;

  // Sisanya hanya berlaku bila klaimnya memang TIDAK ADA.
  if (provider !== "microsoft") return false;
  if (payload?.xms_edov === true) return true;
  return tenantMicrosoftSpesifik();
}

function ambilKonfigWajib(provider: ProviderOidc): KonfigProvider {
  const k = bacaKonfig(provider);
  if (!k) throw new Error(`[OIDC] Provider ${provider} belum dikonfigurasi.`);
  return k;
}

function ambilRedirectUri(): string {
  const uri = process.env.OIDC_REDIRECT_URI;
  if (uri && /^https?:\/\//i.test(uri)) {
    return uri;
  }
  const hostVercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    (process.env.APP_URL ? process.env.APP_URL.replace(/^https?:\/\//, "") : "");
  if (hostVercel) {
    const proto = hostVercel.startsWith("localhost") ? "http" : "https";
    return `${proto}://${hostVercel.replace(/\/$/, "")}/api/auth/oidc/callback`;
  }
  if (uri) return uri;
  throw new Error(
    "[OIDC] OIDC_REDIRECT_URI belum diisi. Nilai ini harus sama persis dengan " +
      "yang didaftarkan di Google Cloud Console / Azure Portal."
  );
}

// ── Discovery & JWKS ─────────────────────────────────────────────────────────
// Keduanya di-cache karena isinya jarang berubah dan diambil pada setiap login.
// Cache disimpan per proses; bila proses mati, cache ikut hilang tanpa akibat.

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

const cacheDiscovery = new Map<ProviderOidc, { data: Discovery; kedaluwarsa: number }>();
const cacheJwks = new Map<string, { kunci: any[]; kedaluwarsa: number }>();

export async function ambilDiscovery(provider: ProviderOidc): Promise<Discovery> {
  const tersimpan = cacheDiscovery.get(provider);
  if (tersimpan && tersimpan.kedaluwarsa > Date.now()) return tersimpan.data;

  const { urlDiscovery } = ambilKonfigWajib(provider);
  const respons = await fetch(urlDiscovery);
  if (!respons.ok) {
    throw new Error(`[OIDC] Gagal mengambil discovery ${provider}: HTTP ${respons.status}`);
  }
  const data = (await respons.json()) as Discovery;
  cacheDiscovery.set(provider, { data, kedaluwarsa: Date.now() + TTL_CACHE_MS });
  return data;
}

async function ambilKunciJwks(jwksUri: string, kid: string): Promise<any> {
  const tersimpan = cacheJwks.get(jwksUri);
  let kunci = tersimpan && tersimpan.kedaluwarsa > Date.now() ? tersimpan.kunci : null;

  if (!kunci) {
    const respons = await fetch(jwksUri);
    if (!respons.ok) throw new Error(`[OIDC] Gagal mengambil JWKS: HTTP ${respons.status}`);
    const data: any = await respons.json();
    kunci = data.keys || [];
    cacheJwks.set(jwksUri, { kunci: kunci as any[], kedaluwarsa: Date.now() + TTL_CACHE_MS });
  }

  const cocok = (kunci as any[]).find((k) => k.kid === kid);
  if (cocok) return cocok;

  // Provider merotasi kuncinya. Ambil ulang sekali sebelum menyerah — kalau
  // tidak, seluruh login gagal sampai cache kedaluwarsa dengan sendirinya.
  cacheJwks.delete(jwksUri);
  const responsUlang = await fetch(jwksUri);
  if (!responsUlang.ok) throw new Error(`[OIDC] Gagal mengambil JWKS: HTTP ${responsUlang.status}`);
  const dataUlang: any = await responsUlang.json();
  const kunciUlang: any[] = dataUlang.keys || [];
  cacheJwks.set(jwksUri, { kunci: kunciUlang, kedaluwarsa: Date.now() + TTL_CACHE_MS });

  const cocokUlang = kunciUlang.find((k) => k.kid === kid);
  if (!cocokUlang) throw new Error(`[OIDC] Kunci dengan kid "${kid}" tidak ditemukan di JWKS.`);
  return cocokUlang;
}

// ── PKCE & state ─────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buatCodeVerifier(): string {
  return base64url(crypto.randomBytes(32));
}

export function hitungCodeChallenge(codeVerifier: string): string {
  return base64url(crypto.createHash("sha256").update(codeVerifier).digest());
}

/**
 * State dititipkan sebagai token bertanda tangan, BUKAN disimpan di memori.
 *
 * Memori proses tidak bisa diandalkan di platform serverless: setiap instance
 * punya memorinya sendiri, sehingga pengguna yang kembali dari provider bisa
 * mendarat di instance lain dan login gagal secara acak. Token bertanda tangan
 * membuat langkahnya stateless — tanpa tabel baru, tanpa infrastruktur baru.
 *
 * Rutenya nanti menaruh token ini di cookie httpOnly (F5.4).
 */
export function tandaTanganiState(state: StateOidc): string {
  return jwt.sign(state, getJwtSecret(), { expiresIn: TTL_STATE_DETIK });
}

export function bacaState(token: string): StateOidc {
  return jwt.verify(token, getJwtSecret()) as unknown as StateOidc;
}

// ── Alur otorisasi ───────────────────────────────────────────────────────────

/** Membangun URL tujuan pengguna, sekaligus state yang harus disimpan pemanggil. */
export async function siapkanOtorisasi(
  provider: ProviderOidc,
  mode: "login" | "daftar"
): Promise<{ url: string; stateToken: string }> {
  const { clientId } = ambilKonfigWajib(provider);
  const discovery = await ambilDiscovery(provider);

  const nonce = base64url(crypto.randomBytes(16));
  const codeVerifier = buatCodeVerifier();
  const stateToken = tandaTanganiState({ provider, nonce, codeVerifier, mode });

  const redirectUri = ambilRedirectUri();
  console.info(
    `[OIDC] Memulai otorisasi provider=${provider} mode=${mode} redirect_uri=${redirectUri} ` +
      `(OIDC_REDIRECT_URI=${process.env.OIDC_REDIRECT_URI || "(kosong)"} ` +
      `VERCEL_URL=${process.env.VERCEL_URL || "(kosong)"} ` +
      `VERCEL_PROJECT_PRODUCTION_URL=${process.env.VERCEL_PROJECT_PRODUCTION_URL || "(kosong)"})`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid email profile",
    state: stateToken,
    nonce,
    code_challenge: hitungCodeChallenge(codeVerifier),
    code_challenge_method: "S256",
    // Selalu tampilkan pemilih akun. Tanpa ini pengguna dengan beberapa akun
    // Google akan masuk memakai akun terakhir tanpa sempat memilih.
    prompt: "select_account",
  });

  return { url: `${discovery.authorization_endpoint}?${params.toString()}`, stateToken };
}

/** Menukar `code` dengan `id_token`. Tidak memverifikasi — itu tugas verifikasiIdToken. */
export async function tukarCode(
  provider: ProviderOidc,
  code: string,
  codeVerifier: string
): Promise<string> {
  const { clientId, clientSecret } = ambilKonfigWajib(provider);
  const discovery = await ambilDiscovery(provider);

  const respons = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: ambilRedirectUri(),
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier,
    }).toString(),
  });

  const data: any = await respons.json().catch(() => ({}));
  if (!respons.ok || !data.id_token) {
    throw new Error(
      `[OIDC] Penukaran code gagal (${provider}): ${data.error_description || data.error || `HTTP ${respons.status}`}`
    );
  }
  return data.id_token as string;
}

/**
 * Memverifikasi `id_token` dan mengembalikan identitasnya.
 *
 * Inti keamanan seluruh SSO ada di fungsi ini. Sebuah `id_token` yang tidak
 * diverifikasi hanyalah teks yang dikirim peramban — siapa pun bisa
 * mengarangnya. Karena itu SEMUA hal berikut diperiksa: signature terhadap
 * kunci publik provider, penerbit, audience, kedaluwarsa, dan nonce.
 */
export async function verifikasiIdToken(
  provider: ProviderOidc,
  idToken: string,
  nonceDiharapkan: string
): Promise<IdentitasOidc> {
  const { clientId } = ambilKonfigWajib(provider);
  const discovery = await ambilDiscovery(provider);

  const header: any = jwt.decode(idToken, { complete: true })?.header;
  if (!header?.kid) throw new Error("[OIDC] id_token tanpa kid pada header.");

  const jwk = await ambilKunciJwks(discovery.jwks_uri, header.kid);
  const kunciPublik = crypto.createPublicKey({ key: jwk, format: "jwk" });

  const payload: any = jwt.verify(idToken, kunciPublik, {
    algorithms: ["RS256"],
    audience: clientId,
    issuer: discovery.issuer,
  });

  // Nonce mengikat token ini pada permintaan login yang ini juga. Tanpanya,
  // token sah milik sesi lain bisa dipasang ulang oleh penyerang.
  if (!payload.nonce || payload.nonce !== nonceDiharapkan) {
    throw new Error("[OIDC] Nonce tidak cocok.");
  }

  const email = String(payload.email || "").toLowerCase();
  if (!email) throw new Error("[OIDC] id_token tidak memuat email.");

  return {
    provider,
    sub: String(payload.sub),
    email,
    // Microsoft tidak selalu mengirim email_verified. Aturannya sekarang ada
    // di `emailBolehDipercaya()` (#305): klaim eksplisit lebih dulu, lalu
    // `xms_edov`, lalu — khusus Microsoft pada tenant SPESIFIK — direktori
    // yang kita tunjuk sendiri. Google tidak ikut pelonggaran itu.
    emailTerverifikasi: emailBolehDipercaya(provider, payload),
    nama: String(payload.name || payload.given_name || ""),
  };
}

/**
 * Apakah domain email diizinkan.
 *
 * Wajib sejak pendaftaran lewat SSO ditetapkan: tanpa batas ini siapa pun
 * dengan alamat Gmail bisa membuat akun. Daftar kosong berarti belum
 * dikonfigurasi, dan itu diperlakukan sebagai MENOLAK SEMUA — bukan
 * mengizinkan semua.
 */
export function domainDiizinkan(email: string, daftarKhusus?: string[]): boolean {
  const daftar =
    daftarKhusus !== undefined
      ? daftarKhusus
      : (process.env.SSO_ALLOWED_DOMAINS || "")
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);

  if (daftar.length === 0) return false;

  const domain = email.toLowerCase().split("@")[1] || "";
  return daftar.includes(domain);
}
