#!/usr/bin/env node
/**
 * LanPro Setup Doctor
 *
 * Memeriksa apakah environment siap menjalankan aplikasi, lalu memberi tahu
 * persis apa yang harus diperbaiki bila ada yang kurang.
 *
 * Jalankan: npm run doctor
 *
 * Tidak pernah mencetak nilai kredensial — hanya status dan sidik jari pendek.
 */

require('dotenv/config');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Password Neon yang pernah bocor di histori git publik. Doctor menolak
// environment yang masih memakainya.
const LEAKED_DB_PASSWORDS = ['npg_CVZvaYbF8W2s'];

let failed = 0;
let warned = 0;

const c = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m',
};

function ok(msg, detail) {
  console.log(`  ${c.green}OK${c.reset}    ${msg}${detail ? c.dim + '  ' + detail + c.reset : ''}`);
}
function fail(msg, fix) {
  failed++;
  console.log(`  ${c.red}GAGAL${c.reset} ${msg}`);
  if (fix) console.log(`        ${c.dim}-> ${fix}${c.reset}`);
}
function warn(msg, fix) {
  warned++;
  console.log(`  ${c.yellow}WARN${c.reset}  ${msg}`);
  if (fix) console.log(`        ${c.dim}-> ${fix}${c.reset}`);
}
function section(title) {
  console.log(`\n${c.bold}${title}${c.reset}`);
}
function fingerprint(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);
}

// ── 1. File environment ───────────────────────────────────────────
section('1. File environment');

if (!fs.existsSync(path.join(ROOT, '.env'))) {
  fail('.env tidak ditemukan', 'Salin .env.example jadi .env lalu isi nilainya');
} else {
  ok('.env ditemukan');
}

// .env tidak boleh ter-track git
try {
  const { execSync } = require('child_process');
  const tracked = execSync('git ls-files .env', { cwd: ROOT, encoding: 'utf8' }).trim();
  if (tracked) {
    fail('.env TER-TRACK oleh git — rahasia bisa ikut ter-push',
         'Jalankan: git rm --cached .env');
  } else {
    ok('.env tidak ter-track git');
  }
} catch {
  warn('Tidak bisa memeriksa status git untuk .env');
}

// ── 2. Variabel wajib ─────────────────────────────────────────────
section('2. Variabel yang wajib ada');

const REQUIRED = [
  ['DATABASE_URL', 'Connection string Neon Postgres'],
  ['JWT_SECRET', 'Kunci penandatangan token login'],
];

for (const [key, desc] of REQUIRED) {
  if (!process.env[key]) {
    fail(`${key} kosong  ${c.dim}(${desc})${c.reset}`, `Isi ${key} di file .env`);
  } else {
    ok(`${key} terisi`, `sidik jari ${fingerprint(process.env[key])}`);
  }
}

if (!process.env.POSTGRES_URL) {
  warn('POSTGRES_URL kosong', 'Sebagian kode membacanya sebagai cadangan — isi sama dengan DATABASE_URL');
} else if (process.env.POSTGRES_URL !== process.env.DATABASE_URL) {
  warn('POSTGRES_URL berbeda dari DATABASE_URL',
       'Biasanya keduanya harus sama. Pastikan ini memang disengaja');
} else {
  ok('POSTGRES_URL sama dengan DATABASE_URL');
}

// ── 3. Kesehatan connection string ────────────────────────────────
section('3. Connection string database');

let dbUrl = null;
try {
  dbUrl = new URL(process.env.DATABASE_URL || '');
} catch {
  if (process.env.DATABASE_URL) {
    fail('DATABASE_URL bukan URL yang valid', 'Pastikan diawali postgresql:// dan diapit tanda kutip di .env');
  }
}

if (dbUrl) {
  if (LEAKED_DB_PASSWORDS.includes(dbUrl.password)) {
    fail('DATABASE_URL memakai password yang SUDAH BOCOR di GitHub',
         'Rotasi password di console.neon.tech lalu perbarui .env');
  } else {
    ok('Password bukan yang pernah bocor');
  }

  if (!dbUrl.hostname.includes('-pooler')) {
    warn('Host tidak memakai connection pooling Neon',
         `DB_CONNECTION_LIMIT=${process.env.DB_CONNECTION_LIMIT || '100'} berisiko menabrak limit. Pakai host "-pooler"`);
  } else {
    ok('Memakai connection pooling Neon');
  }

  if (!dbUrl.searchParams.get('sslmode')) {
    warn('sslmode tidak diset di connection string', 'Tambahkan ?sslmode=require');
  } else {
    ok(`sslmode=${dbUrl.searchParams.get('sslmode')}`);
  }
}

// ── 4. Rahasia yang ter-hardcode di source ────────────────────────
section('4. Pemindaian rahasia di source code');

const SCAN_PATTERNS = [
  [/npg_[A-Za-z0-9]{8,}/g, 'password Neon'],
  [/api\.vercel\.com\/v1\/integrations\/deploy\/prj_[A-Za-z0-9]+/g, 'Vercel deploy hook'],
  [/aivencloud\.com/g, 'host Aiven warisan MySQL'],
];

const SCAN_DIRS = ['src', 'server', 'api', '.github', 'config', 'infrastructure'];
const SKIP_DIR = new Set(['node_modules', 'dist', 'coverage', '.git', 'uploads']);
const hits = [];

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIR.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx|js|cjs|mjs|yml|yaml|json)$/.test(e.name)) continue;
    let content;
    try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
    for (const [re, label] of SCAN_PATTERNS) {
      if (new RegExp(re.source).test(content)) {
        hits.push({ file: path.relative(ROOT, full), label });
      }
    }
  }
}

for (const d of SCAN_DIRS) walk(path.join(ROOT, d));

// server.ts berada di root, bukan di dalam SCAN_DIRS — periksa terpisah.
try {
  const serverTs = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
  for (const [re, label] of SCAN_PATTERNS) {
    if (new RegExp(re.source).test(serverTs)) hits.push({ file: 'server.ts', label });
  }
} catch {}

if (hits.length === 0) {
  ok('Tidak ada rahasia ter-hardcode di source aktif');
} else {
  for (const h of hits) {
    fail(`${h.label} ter-hardcode di ${h.file}`, 'Pindahkan ke environment variable / GitHub Secret');
  }
}

// ── 5. Konfigurasi keamanan ───────────────────────────────────────
// Memeriksa invarian yang pernah gagal di repo ini, agar tidak terulang diam-diam.
section('5. Konfigurasi keamanan');

// 5a. Allowlist gitleaks tidak boleh memuat nilai rahasia.
//     Versi lama file ini mendaftar-putihkan password Neon dan dua Google API
//     key secara harfiah, sehingga pemindai bungkam pada kebocoran sungguhan.
try {
  const gl = fs.readFileSync(path.join(ROOT, '.gitleaks.toml'), 'utf8');
  const nilaiRahasia = [
    [/AIza[0-9A-Za-z_-]{30,}/, 'Google API key'],
    [/npg_[A-Za-z0-9]{8,}/, 'password Neon'],
    [/postgres(ql)?:\/\/[^\s'"]+:[^\s'"@]+@/, 'connection string berkredensial'],
  ];
  const bocor = nilaiRahasia.filter(([re]) => re.test(gl)).map(([, label]) => label);
  if (bocor.length) {
    fail(`.gitleaks.toml memuat nilai rahasia di allowlist: ${bocor.join(', ')}`,
         'Kecualikan COMMIT-nya (commits = [...]), bukan nilai rahasianya');
  } else {
    ok('.gitleaks.toml tidak mendaftar-putihkan nilai rahasia');
  }
} catch {
  warn('.gitleaks.toml tidak ditemukan', 'Pemindaian rahasia di CI tidak aktif');
}

// 5b. Socket.IO tidak boleh menerima origin mana pun.
// 5c. Endpoint autentikasi harus punya pembatas laju sendiri (anti brute force).
try {
  const srv = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');

  if (/cors:\s*\{[^}]*origin:\s*["']\*["']/.test(srv)) {
    fail('Socket.IO menerima origin mana pun (origin: "*")',
         'Batasi ke daftar origin yang diizinkan');
  } else {
    ok('Socket.IO memakai daftar origin terbatas');
  }

  // Memeriksa invariannya, bukan nama variabelnya: setiap endpoint auth harus
  // dipasangi middleware pembatas laju lewat app.use.
  //
  // Versi pertama cek ini mencari nama harfiah "authLimiter" dan langsung salah
  // lapor begitu variabelnya dipecah menjadi loginLimiter dan registerLimiter,
  // padahal proteksinya justru bertambah kuat.
  const endpointAuth = [
    ['/api/auth/login', 'login'],
    ['/api/auth/register', 'register'],
  ];
  const tanpaPembatas = endpointAuth.filter(([path]) => {
    const re = new RegExp(
      'app\\.use\\(\\s*(?:\\[[^\\]]*)?["\']' + path.replace(/\//g, '\\/') + '["\'][^)]*?[A-Za-z_$][\\w$]*[Ll]imiter',
    );
    return !re.test(srv);
  });
  if (tanpaPembatas.length === 0) {
    ok('Endpoint autentikasi punya pembatas laju sendiri');
  } else {
    fail(`Endpoint tanpa pembatas laju: ${tanpaPembatas.map(([, n]) => n).join(', ')}`,
         'Pasang middleware rateLimit lewat app.use pada endpoint tersebut');
  }
} catch {
  warn('server.ts tidak terbaca, pemeriksaan konfigurasi dilewati');
}

// 5d. APP_URL harus URL absolut yang sungguhan.
//
//     Repo ini menyimpan nilai placeholder harfiah "MY_APP_URL" selama entah
//     berapa lama. Ia lolos setiap pemeriksaan "kosong atau tidak" karena
//     memang tidak kosong, tetapi tidak berguna: res.redirect
//     memperlakukan nilai non-absolut sebagai jalur RELATIF, sehingga pengguna
//     yang kembali dari Google sempat dilempar ke alamat yang tidak ada.
//     Di production nilai ini juga menentukan daftar origin Socket.IO.
{
  const appUrl = process.env.APP_URL || '';
  const absolut = /^https?:\/\/.+/i.test(appUrl);

  if (!appUrl) {
    warn('APP_URL kosong',
      'Diperlukan di production untuk daftar origin Socket.IO dan alamat kembali SSO');
  } else if (!absolut) {
    fail(`APP_URL bukan URL absolut: "${appUrl}"`,
      'Isi dengan alamat lengkap, contoh http://localhost:3000 atau https://lanpro.example.com. ' +
      'Nilai non-absolut diperlakukan sebagai jalur relatif saat redirect');
  } else if (process.env.NODE_ENV === 'production' && appUrl.includes('localhost')) {
    fail('APP_URL masih menunjuk localhost di production',
      'Ganti dengan domain production yang sebenarnya');
  } else {
    ok('APP_URL berbentuk URL absolut', appUrl);
  }
}

// ── 6. Penyimpanan berkas ────────────────────────────────────────────────────
section('6. Penyimpanan berkas unggahan');

{
  const driver = process.env.STORAGE_DRIVER || 'local';
  if (driver === 's3') {
    const kurang = ['STORAGE_BUCKET', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY']
      .filter((k) => !process.env[k]);
    if (kurang.length) {
      fail(`STORAGE_DRIVER=s3 tetapi belum lengkap: ${kurang.join(', ')}`,
        'Isi variabel tersebut, atau kembalikan STORAGE_DRIVER=local untuk pengembangan');
    } else {
      ok('Object storage terkonfigurasi', `bucket ${process.env.STORAGE_BUCKET}`);
      ok('Berkas unggahan akan bertahan antar deploy');
    }
  } else {
    // Peringatan, bukan kegagalan: driver lokal memang benar untuk pengembangan.
    warn('Penyimpanan memakai disk lokal (STORAGE_DRIVER=local)',
      'Untuk PRODUKSI isi STORAGE_DRIVER=s3. Di platform serverless disk bersifat sementara — ' +
      'setiap deploy menghapus seluruh berkas unggahan sementara baris database tetap menunjuknya');
  }
}

// ── 7. Koneksi database sungguhan ─────────────────────────────────
(async () => {
  // ── 6b. Domain pengirim email ─────────────────────────────────────
  section('6b. Domain pengirim email (Resend)');

  // #127 — #44 mencatat domain `rajonet.com` sudah terverifikasi, lalu 21 Agu 2026
  // Resend menolak pengiriman dengan "The rajonet.com domain is not verified".
  // Item yang ditandai selesai bisa berbalik tanpa satu pun berkas berubah, karena
  // keadaannya hidup di layanan pihak ketiga. Tidak ada gerbang yang menangkapnya,
  // jadi kegagalannya hanya muncul sebagai satu baris di log server saat email
  // benar-benar dikirim — yaitu tepat saat pengguna sedang menunggunya.
  // #157 — Cadangan `LanPro <lanpro@rajonet.com>` DIHAPUS dari sini. Selama ia
  // ada, `EMAIL_FROM` yang kosong diperiksa seolah-olah domainnya sudah diisi,
  // sehingga doctor bisa melaporkan sesuatu yang tidak dipakai kode mana pun.
  const kunciResend = (process.env.RESEND_API_KEY || '').trim();
  const pengirim = (process.env.EMAIL_FROM || '').trim();
  const domainPengirim = (pengirim.match(/@([^>\s]+)/) || [])[1] || '';

  if (!pengirim) {
    warn('EMAIL_FROM kosong — tidak ada alamat pengirim',
      'Pengiriman ditolak sebelum menyentuh Resend. Isi dengan bentuk ' +
      '"Nama <alamat@domain>" memakai domain yang sudah terverifikasi');
  } else if (!kunciResend) {
    warn('RESEND_API_KEY belum diisi — status domain tidak bisa diperiksa',
      'Di PRODUKSI ini berarti tidak ada email yang terkirim sama sekali: ' +
      'verifikasi akun, tautan lupa kata sandi, dan digest harian semuanya diam');
  } else if (!domainPengirim) {
    warn(`EMAIL_FROM tidak memuat domain yang bisa dibaca: ${pengirim}`,
      'Isi dengan bentuk "Nama <alamat@domain>"');
  } else {
    try {
      const r = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${kunciResend}` },
      });
      if (!r.ok) {
        warn(`Resend menolak permintaan status domain (HTTP ${r.status})`,
          'Periksa RESEND_API_KEY masih berlaku dan punya izin membaca domain');
      } else {
        const data = await r.json();
        const daftar = Array.isArray(data && data.data) ? data.data : [];
        const cocok = daftar.find((d) => (d && d.name || '').toLowerCase() === domainPengirim.toLowerCase());
        // Sama seperti bagian 6: di PRODUKSI ini menahan rilis, di pengembangan
        // cukup peringatan — domain email memang sering belum disiapkan di lokal.
        const produksi = (process.env.NODE_ENV || '').toLowerCase() === 'production';
        const angkat = produksi ? fail : warn;
        if (!cocok) {
          angkat(`Domain pengirim ${domainPengirim} TIDAK terdaftar di Resend`,
            `EMAIL_FROM memakai ${pengirim}, tetapi domain itu tidak ada di akun Resend. ` +
            'Tambahkan dan verifikasi domainnya, atau ganti EMAIL_FROM ke domain yang sudah ada');
        } else if (String(cocok.status || '').toLowerCase() !== 'verified') {
          angkat(`Domain pengirim ${domainPengirim} BELUM terverifikasi (status: ${cocok.status})`,
            'Selesaikan verifikasi DNS di https://resend.com/domains. ' +
            'Sampai itu selesai, SETIAP pengiriman ditolak dan hanya terlihat sebagai baris log');
        } else {
          ok(`Domain pengirim ${domainPengirim} terverifikasi`, pengirim);
        }
      }
    } catch (e) {
      warn('Gagal menghubungi Resend untuk memeriksa domain',
        `Pemeriksaan DILEWATI, jangan diartikan domainnya sehat: ${e && e.message ? e.message : e}`);
    }
  }

  // ── 6c. Alamat aplikasi untuk tautan di dalam email ─────────────────
  section('6c. APP_URL (tautan di dalam email)');

  // #157 — `urlFrontend()` MENGUTAMAKAN APP_URL di atas header permintaan bila
  // nilainya berawalan http(s). Artinya APP_URL yang tertinggal di localhost
  // tidak diabaikan di produksi, melainkan MENANG: tautan atur-ulang kata sandi
  // yang dikirim ke pengguna menunjuk ke mesin mereka sendiri, dan tidak ada
  // galat di mana pun karena emailnya terkirim dengan sukses.
  const appUrl = (process.env.APP_URL || '').trim();
  const diProduksi = (process.env.NODE_ENV || '').toLowerCase() === 'production';

  if (!appUrl) {
    warn('APP_URL kosong — tautan email mengikuti header permintaan',
      'Biasanya benar di belakang reverse proxy, tetapi menjadi salah bila ' +
      'Host dapat dipalsukan. Isi eksplisit untuk produksi');
  } else if (!/^https?:\/\//i.test(appUrl)) {
    warn(`APP_URL tidak berawalan http:// atau https:// (${appUrl})`,
      'Nilai tanpa skema DIABAIKAN diam-diam oleh urlFrontend()');
  } else if (/localhost|127\.0\.0\.1/i.test(appUrl)) {
    (diProduksi ? fail : ok)(
      diProduksi
        ? `APP_URL masih menunjuk localhost di PRODUKSI: ${appUrl}`
        : `APP_URL localhost (wajar di pengembangan)`,
      diProduksi
        ? 'Tautan atur-ulang kata sandi akan menunjuk mesin pengguna sendiri ' +
          'dan mustahil diselesaikan. Ganti ke domain aplikasi sungguhan'
        : appUrl);
  } else if (diProduksi && appUrl.startsWith('http://')) {
    warn(`APP_URL memakai http:// polos di produksi: ${appUrl}`,
      'Tautan bertoken atur-ulang kata sandi akan melintas tanpa enkripsi');
  } else {
    ok('APP_URL siap dipakai untuk tautan email', appUrl);
  }

  section('7. Uji koneksi database');

  if (!process.env.DATABASE_URL) {
    fail('Dilewati — DATABASE_URL kosong');
  } else {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    const t0 = Date.now();
    try {
      const r = await pool.query('SELECT current_user AS u, current_database() AS d');
      ok(`Terhubung (${Date.now() - t0}ms)`, `user=${r.rows[0].u} db=${r.rows[0].d}`);
    } catch (e) {
      fail(`Tidak bisa connect: ${e.code || ''} ${e.message}`,
           e.code === '28P01'
             ? 'Password salah. Ambil ulang connection string dari console.neon.tech'
             : 'Cek koneksi internet dan status project di console.neon.tech');
    } finally {
      await pool.end().catch(() => {});
    }
  }

  // ── 8. Kelengkapan schema ────────────────────────────────────────
  //
  // Migrasi otomatis pernah gagal dengan timeout sementara server tetap
  // menyala seolah sehat, sehingga tabel yang dibutuhkan fitur baru tidak
  // pernah terbentuk. Kegagalannya baru ketahuan setelah fiturnya dicoba dan
  // gagal dengan pesan yang sama sekali tidak menyinggung migrasi. Pemeriksaan
  // ini menyatakan keadaan schema secara langsung, bukan menyimpulkannya dari
  // log boot yang mungkin sudah tergulung.
  section('8. Kelengkapan schema database');

  if (!process.env.DATABASE_URL) {
    fail('Dilewati — DATABASE_URL kosong');
  } else {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      // Tabel inti yang ketiadaannya pasti merusak fitur, bukan seluruh daftar.
      const wajib = ['Users', 'Projects', 'Tasks', 'Documents', 'UserIdentities'];
      const r = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1)`,
        [wajib]
      );
      const ada = r.rows.map((x) => x.table_name);
      const hilang = wajib.filter((t) => !ada.includes(t));

      if (hilang.length === 0) {
        ok('Seluruh tabel inti ada', wajib.join(', '));
      } else {
        fail(`Tabel inti HILANG: ${hilang.join(', ')}`,
          'Migrasi kemungkinan gagal saat boot. Jalankan ulang server dan perhatikan ' +
          'blok [MIGRASI], atau periksa GET /api/health');
      }

      // Baris yatim pernah mengunci sebuah email selamanya dari pendaftaran.
      if (ada.includes('UserIdentities')) {
        const y = await pool.query(
          `SELECT COUNT(*)::int AS n FROM "UserIdentities" ui
           WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = ui."userId")`
        );
        if (y.rows[0].n === 0) {
          ok('Tidak ada identitas SSO yatim');
        } else {
          fail(`${y.rows[0].n} identitas SSO yatim`,
            'Baris ini mengunci email pemiliknya dari pendaftaran ulang. ' +
            'Jalankan migrasi ulang untuk membersihkannya');
        }
      }
    } catch (e) {
      warn(
        `Tidak bisa memeriksa schema: ${e.message}`,
        'Pemeriksaan ini DILEWATI — jangan diartikan sebagai schema yang benar'
      );
    } finally {
      await pool.end().catch(() => {});
    }
  }

  // ── Ringkasan ───────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(58));
  if (failed === 0 && warned === 0) {
    console.log(`${c.green}${c.bold}SIAP JALAN.${c.reset} Semua pemeriksaan lolos.`);
    console.log(`${c.dim}Jalankan aplikasi: npm run dev${c.reset}`);
  } else if (failed === 0) {
    console.log(`${c.yellow}${c.bold}SIAP JALAN, dengan ${warned} peringatan.${c.reset}`);
    console.log(`${c.dim}Aplikasi bisa dijalankan, tapi sebaiknya peringatan di atas ditindaklanjuti.${c.reset}`);
  } else {
    console.log(`${c.red}${c.bold}BELUM SIAP: ${failed} masalah${c.reset}${warned ? `, ${warned} peringatan` : ''}.`);
    console.log(`${c.dim}Perbaiki baris bertanda GAGAL di atas, lalu jalankan lagi: npm run doctor${c.reset}`);
  }
  console.log('─'.repeat(58));

  process.exit(failed > 0 ? 1 : 0);
})();
