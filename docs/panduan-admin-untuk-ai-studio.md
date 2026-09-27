# Panduan Implementasi Fitur Admin — Lanpro (untuk AI Studio)

> Dokumen ini ditulis untuk dipakai oleh alat AI eksternal ("AI Studio") sebagai
> rujukan TUNGGAL saat mengerjakan fitur admin di repo `lanpro-4.1`. Isinya hasil
> pembacaan kode langsung (bukan asumsi), disusun agar AI Studio mengikuti pola
> yang SUDAH ADA di repo, bukan mengarang pola baru.
>
> **Diukur dari:** branch `fix/175-klem-pool-koneksi`, 24 Agustus 2026.

---

## 0. BACA INI DULU — gerbang wajib sebelum baris kode pertama

Repo ini punya tata kelola sendiri di `AGENTS.md` dan `AUDIT.md` (akar repo).
Keduanya **mengikat**, dan mengalahkan dokumen ini bila bertentangan. Sebelum
AI Studio menyentuh kode apa pun untuk fitur admin ini:

1. **Buka `AUDIT.md`** bagian _MULAI DARI SINI_, lalu §20, lalu §1.1 (papan
   item yang belum selesai).
2. **Cari nomor item** untuk pekerjaan ini. Per 24 Agustus 2026, nomor item
   tertinggi di papan adalah **#176** — fitur di dokumen ini (log login/logout,
   panel riwayat login, audit trail global, widget statistik sistem) **BELUM
   punya nomor item**. Ini artinya:
   - AI Studio **belum boleh mengubah kode** berdasarkan dokumen ini saja.
   - Laporkan ke pemilik proyek bahwa pekerjaan ini belum ada di papan,
     usulkan nomor baru (mis. `#177`, `#178`, dst. — satu nomor per fitur, atau
     satu nomor payung dengan sub-item, terserah keputusan pemilik proyek),
     dan **tunggu jawaban** sebelum mulai.
3. **Alur wajib: review-first.** Analisa dan laporkan dulu (temuan, rencana
   perubahan, file yang akan disentuh), baru tunggu persetujuan pemilik
   proyek sebelum mengubah kode. Jangan langsung menulis kode dari dokumen ini.
4. Setelah item disetujui dan dikerjakan, `AUDIT.md` **wajib diperbarui**
   dengan entri baru — ikuti format entri yang sudah ada di §1.1 (lihat contoh
   item #175/#176 di file itu).

**Dokumen ini adalah bahan teknis untuk MENGERJAKAN, bukan izin untuk MULAI
mengerjakan.** Izin datang dari pemilik proyek lewat proses di atas.

---

## 1. Ruang lingkup

Empat kebutuhan berikut diangkat dari laporan gap-analysis dashboard admin
(dibuat 24 Agustus 2026, membandingkan menu admin Lanpro dengan kebutuhan
standar panel admin):

| #   | Fitur                                               | Status saat ini                                |
| --- | --------------------------------------------------- | ---------------------------------------------- |
| A   | Log login & logout per user                         | Tidak ada — hanya status di memori             |
| B   | Panel "Riwayat Login" di menu admin                 | Tidak ada                                      |
| C   | Audit trail lintas project (global)                 | Sebagian — backend sudah mampu, frontend belum |
| D   | Widget statistik sistem (total user, total project) | Tidak ada — hanya angka per-user               |

Satu kebutuhan **sengaja tidak dispesifikasikan** di sini:

| E | Traffic / analitik pemakaian aplikasi | Tidak ada fondasi sama sekali — butuh keputusan arsitektur (catat sendiri ke DB vs integrasi pihak ketiga) sebelum bisa dipecah jadi item kerja. Jangan dikerjakan dari dokumen ini. |

---

## 2. Konteks arsitektur (wajib dipahami sebelum menulis kode)

- **Stack:** React 18 + Vite (SPA, `src/`), satu backend Express (`server.ts` +
  `server/`), state via Zustand, i18n via `react-i18next`.
- **Tidak ada router terpisah untuk `/admin`.** Tampilan berpindah lewat
  `currentView` (string), bukan URL path. Status admin ditentukan oleh klaim
  `role` di JWT (`role === "admin"`).
- **Database: PostgreSQL (Neon) murni — tidak ada MySQL di mana pun.** Akses
  lewat adapter custom `src/lib/db.ts` yang menerima query bergaya
  `?`-placeholder dan mengonversinya ke sintaks Postgres. **`src/lib/db.ts`
  DILARANG disentuh** (§12 AUDIT.md / §3 AGENTS.md) — jangan pernah mengedit
  file ini untuk fitur apa pun di dokumen ini.
- **Tidak ada ORM, tidak ada folder `migrations/`.** Skema tabel didefinisikan
  di `src/lib/pg-migrate.ts` (dijalankan saat server boot) dan didokumentasikan
  di `docs/DATABASE_SCHEMA.md`. **Jangan cari `database/schema.sql`** — file
  itu direferensikan satu endpoint lama tapi bukan sumber kebenaran skema saat ini.
- **Penamaan tabel: PascalCase dengan tanda kutip ganda** (`"AuditLogs"`,
  bukan `auditlogs`). Postgres melipat identifier tanpa kutip jadi huruf kecil
  — ini pernah membuat tabel kembar di repo ini. Ikuti persis kapital yang
  sudah ada.
- **Tidak ada folder `server/controllers/`** meski `AGENTS.md` §4 menyebut
  struktur route/controller terpisah — **kenyataannya nol file mengikuti itu**,
  seluruh logika bisnis admin saat ini ditulis langsung di `*.routes.ts`.
  Karena ini bukan keputusan yang diambil dokumen ini, **tanyakan ke pemilik
  proyek** apakah fitur baru harus mulai memisahkan controller, atau tetap
  ikut pola 100% file yang ada (rekomendasi default: ikut pola yang ada,
  supaya tidak memperkenalkan struktur baru tanpa persetujuan).

---

## 3. Konvensi wajib — kutipan kode nyata, bukan parafrase

### 3.1 Skema tabel yang relevan

**`Users`** (`src/lib/pg-migrate.ts:19-42`) — kolom yang relevan untuk sesi:

```sql
"lastSeen"            VARCHAR(50),   -- string epoch-ms, BUKAN timestamp asli
"currentSessionToken" TEXT,          -- JWT mentah, bukan hash; NULL = tidak login
```

**Tidak ada tabel riwayat login/sesi.** Hanya kolom skalar "sesi saat ini" per
user. Ini mengonfirmasi fitur A & B memang belum ada, bukan sekadar belum
dipakai.

**`AuditLogs`** (`src/lib/pg-migrate.ts:308-324`, 131 baris hidup per
`docs/DATABASE_SCHEMA.md`):

```sql
CREATE TABLE IF NOT EXISTS "AuditLogs" (
  id           VARCHAR(255) PRIMARY KEY,
  "userId"     VARCHAR(255),
  "projectId"  VARCHAR(255),   -- NULLABLE — sudah mendukung entri global
  "entityName" VARCHAR(100),
  "entityId"   VARCHAR(255),
  "actionType" VARCHAR(50),
  changes      JSONB,
  "oldValues"  JSONB,
  "newValues"  JSONB,
  "ipAddress"  VARCHAR(50),
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP DEFAULT NOW()
);
```

**Gunakan tabel ini untuk fitur A, jangan buat tabel baru.** `projectId`
nullable berarti baris login/logout global (`projectId: null`) sudah didukung
skema — persis seperti yang sudah dilakukan `logForceLogout` di bawah.

Bentuk TypeScript-nya (`server/repositories/audit.repository.ts:3-14`):

```ts
export interface AuditLogEntity {
  id: string;
  userId: string;
  projectId?: string | null;
  actionType: string;
  entityName: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
  userName?: string;
}
```

### 3.2 Pola repository — CONTOH PERSIS yang harus ditiru

`server/repositories/auth.repository.ts` — method yang SUDAH menulis event
auth ke `AuditLogs` (satu-satunya preseden yang ada, untuk `FORCE_LOGOUT`):

```ts
import db from "../../src/lib/db";
import crypto from "crypto";

export class AuthRepository {
  // ...

  async logForceLogout(userId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO AuditLogs (id, userId, projectId, actionType, entityName, entityId, oldValues, newValues)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          userId,
          null,
          "FORCE_LOGOUT",
          "Authentication",
          userId,
          null,
          JSON.stringify({ action: "User initiated force logout from another device" }),
        ]
      );
    } finally {
      connection.release();
    }
  }
}

export const authRepository = new AuthRepository();
```

**Method baru untuk fitur A (`logLogin`, `logLoginFailed`, `logLogout`) HARUS
mengikuti bentuk ini persis**: import `db` dari `"../../src/lib/db"`, acquire
`connection` lalu `try { ... } finally { connection.release(); }`, placeholder
`?`, `crypto.randomUUID()` untuk id, `JSON.stringify(...)` untuk kolom JSONB,
`entityName: "Authentication"` (samakan dengan yang sudah ada), `actionType`
baru misalnya `"LOGIN"` / `"LOGIN_FAILED"` / `"LOGOUT"` — **nama `actionType`
ini USULAN, konfirmasikan ke pemilik proyek**, bukan standar baku yang sudah
ditentukan.

Query multi-filter (`server/repositories/audit.repository.ts`, method
`findLogs`) — dipakai sebagai contoh pola untuk fitur B & C:

```ts
async findLogs(filters: { projectId?: string; entityName?: string; entityId?: string; limit?: number }): Promise<AuditLogEntity[]> {
  const connection = await db.getConnection();
  try {
    let sql = "SELECT a.*, u.displayName as userName FROM AuditLogs a JOIN Users u ON a.userId = u.id";
    const params: any[] = [];
    const sqlFilters: string[] = [];

    if (filters.projectId) { sqlFilters.push("a.projectId = ?"); params.push(filters.projectId); }
    if (filters.entityName) { sqlFilters.push("a.entityName = ?"); params.push(filters.entityName); }
    if (filters.entityId) { sqlFilters.push("a.entityId = ?"); params.push(filters.entityId); }

    if (sqlFilters.length > 0) sql += " WHERE " + sqlFilters.join(" AND ");
    sql += " ORDER BY a.createdAt DESC LIMIT ?";
    const limitValue = Math.min(Math.max(filters.limit || 50, 1), 500);
    params.push(limitValue);

    const [rows]: any = await connection.query(sql, params);
    return rows || [];
  } finally {
    connection.release();
  }
}
```

**Penting:** `projectId` di sini opsional — kalau tidak dikirim, hasilnya
SUDAH lintas-project (global). Artinya **backend untuk fitur C (audit trail
global) sudah bisa jalan tanpa endpoint baru** — cukup panggil `findLogs`
tanpa `projectId`. Yang belum ada hanya jalur frontend yang memanggilnya
tanpa `selectedProject.id` dan gerbang admin di depannya.

### 3.3 Pola route + response shape

Contoh rute admin-only (`server/routes/user.routes.ts:376-394`), pola
middleware yang HARUS diikuti untuk endpoint baru:

```ts
router.delete(
  "/api/users/:id",
  authenticateJWT,
  verifyGlobalAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await userRepository.delete(id);
      res.json({ status: "success", code: "srv.user_deleted", message: "User deleted" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/users error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server_3",
        message: "Terjadi kesalahan internal server: " + error.message,
      });
    }
  }
);
```

**Aturan mengikat:**

- Selalu pasang **`authenticateJWT, verifyGlobalAdmin`** (dua middleware,
  urutan ini) untuk endpoint yang hanya boleh diakses admin global.
- Sukses: `{ status: "success", ... }`. Gagal: `{ status: "error", code:
"srv.xxx", message: "..." }` (pesan berbahasa Indonesia, `code` snake-ish
  dengan prefix `srv.`).
- Selalu `console.error("LOG ANOMALI CRITICAL: <konteks>:", error)` sebelum
  balas 500.

`verifyGlobalAdmin` (`server/middleware/auth.ts:35-47`) — hanya cek
`req.user?.role === "admin"`, harus jalan **setelah** `authenticateJWT`
mengisi `req.user`:

```ts
export const verifyGlobalAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role === "admin") {
    next();
  } else {
    res.status(403).json({
      status: "error",
      code: "srv.akses_ditolak_hanya_global",
      message: "Akses ditolak: Hanya Global Admin yang memiliki izin.",
    });
  }
};
```

**Jangan pakai `verifyProjectAccess`** dari `server/middleware/rbac.ts` — sudah
pensiun, nol rute memakainya. Untuk endpoint global-admin murni (bukan
per-project), `authenticateJWT + verifyGlobalAdmin` sudah cukup dan konsisten
dengan seluruh endpoint admin lain — **tidak perlu** `jagaProyek(modul, aksi)`
maupun pendaftaran di `daftarPeranRute.ts` (itu khusus guard MATRIKS
per-project).

**Pendaftaran router** di `server.ts` — tidak ada prefix path, router
mendeklarasikan path lengkapnya sendiri. Dua pola yang dipakai:

```ts
// statis, dekat baris 454-456
import auditRoutes from "./server/routes/audit.routes";
app.use(auditRoutes);

// dinamis, di dalam fungsi boot async
const { default: userRoutes } = await import("./server/routes/user.routes.ts");
app.use(userRoutes);
```

Router baru untuk fitur A/B/C/D bisa didaftarkan statis (dekat `auditRoutes`)
kalau tidak ada dependensi berat saat cold start.

### 3.4 Alur login/logout yang sudah ada (titik sisip untuk fitur A)

Data IP/device **sudah dihitung** saat login (`server/routes/auth.routes.ts:181-191`)
tapi hanya masuk map di memori, tidak pernah disimpan:

```ts
const parser = new UAParser(req.headers["user-agent"]);
const browserInfo = parser.getBrowser();
const osInfo = parser.getOS();
const deviceInfo = parser.getDevice();

const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown IP";
const browser = `${browserInfo.name || "Unknown Browser"} ${browserInfo.version || ""}`.trim();
let device = `${osInfo.name || "Unknown OS"} ${osInfo.version || ""}`.trim();
if (deviceInfo.vendor || deviceInfo.model) {
  device += ` (${deviceInfo.vendor || ""} ${deviceInfo.model || ""})`.trim();
}
```

**Titik sisip untuk `logLogin`:** tepat setelah blok ini, di dalam
`POST /api/auth/login`, sudah ada `userId`, `ip`, `browser`, `device` yang
tinggal dipakai — tidak perlu parsing baru.

Logout (`server/routes/auth.routes.ts:335-346`, dikutip penuh) **tidak
memakai `authenticateJWT`** — token didekode manual, toleran terhadap token
kedaluwarsa:

```ts
router.post("/api/auth/logout", async (req, res) => {
  try {
    const userId = idDariToken(req); // bukan req.user — decode manual
    if (userId) {
      activeUserSessions.delete(userId.toString());
      await authRepository.clearSessionToken(userId.toString());
    }
    return res.json({ status: "success" });
  } catch (e) {
    return res.json({ status: "success" });
  }
});
```

**Titik sisip untuk `logLogout`:** panggil pakai `userId` dari `idDariToken(req)`,
BUKAN `req.user`, karena `req.user` tidak ada di handler ini.

JWT hanya berisi klaim ini (`server/middleware/auth.ts:21-33`, fungsi
`generateToken`): `id`, `uid`, `username`, `role`, `displayName` (+ `iat`/`exp`
standar, `expiresIn: "2h"`). Jangan asumsikan klaim lain ada di `req.user`
tanpa mengecek — `authenticateJWT` memang memperkaya `req.user` dengan
`role`/`status` terbaru dari DB, tapi field lain tetap terbatas pada daftar ini.

### 3.5 Pola routing tampilan frontend (untuk panel admin baru)

Ada **dua lapis** routing tampilan — jangan campur keduanya:

**(a) `src/AppContainer.tsx`** menangani view global admin-only **sebelum**
`AppRoutes.tsx` dicek — ini pola yang benar untuk fitur B (panel Riwayat
Login) dan D (widget statistik), karena keduanya tidak butuh project
terpilih. Contoh persis (`AppContainer.tsx` sekitar baris 3600-3633, untuk
`currentView === "users"`):

```tsx
) : currentView === "users" ? (
  !hasPermission(
    effectiveRole,
    "userManagement",
    "read",
    false,
    currentUserProfile?.permissions
  ) ? (
    <div className="flex flex-col items-center justify-center w-full flex-1 p-8 text-center bg-surface-sunken">
      <ShieldAlert className="w-16 h-16 text-danger mb-4" />
      <h2 className="text-2xl font-medium text-content-strong mb-2">
        {t("appShell.forbidden")}
      </h2>
      <p className="text-content-muted max-w-md">{t("appShell.forbiddenUsers")}</p>
    </div>
  ) : (
    <AdminUserPanel
      projects={projects}
      tasks={tasks}
      masterData={masterData}
      userRole={effectiveRole}
      currentUserId={currentUser?.uid || user?.uid}
      onAddUser={() => {}}
      onRefreshProjects={fetchProjects}
      onSelectUserForDetail={(u) => bukaDetailPengguna(u)}
    />
  )
) : currentView === "master" ? (
  ...
```

**Ikuti bentuk ini persis** untuk `currentView === "loginHistory"` (fitur B):
cabang baru, gerbang `hasPermission(effectiveRole, "<modulBaru>", "read",
false, currentUserProfile?.permissions)`, tampilkan layar "forbidden" yang
sama kalau gagal, render komponen panel baru kalau lolos.

**(b) `src/routes/AppRoutes.tsx`** untuk view yang project-scoped, contoh
`"auditLog"` (baris 431-437):

```tsx
case "enterprise-audit":
case "auditLog":
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <EnterpriseAuditDashboard selectedProject={selectedProject} currentUser={currentUser} />
    </div>
  );
```

Untuk **fitur C (audit trail global)**, jangan taruh di sini kalau memang
harus lepas dari `selectedProject` — pola yang benar adalah menambah cabang
baru di `AppContainer.tsx` (seperti `"users"`), bukan menumpangi case ini,
KECUALI keputusan pemilik proyek adalah memperluas `EnterpriseAuditDashboard`
yang sama dengan mode "semua project" opsional. **Ini keputusan desain, tanyakan
dulu** — dokumen ini tidak memutuskannya.

### 3.6 Sidebar

Seksi `"administration"` (`src/features/sidebar/config.tsx:154-192`, dikutip
penuh):

```tsx
{
  id: "administration",
  title: "sidebar.administration",
  items: [
    { id: "master", label: "sidebar.masterData", icon: <Database className="w-4 h-4" />, module: "masterData" },
    { id: "users", label: "sidebar.userManagement", icon: <UserCog className="w-4 h-4" />, module: "userManagement" },
    { id: "auditLog", label: "sidebar.enterpriseAudit", icon: <History className="w-4 h-4" />, butuhProyek: true, module: "auditLog" },
    { id: "dbExplorer", label: "sidebar.dbExplorer", icon: <Database className="w-4 h-4" />, butuhProyek: true, module: "dbExplorer" },
    { id: "settingsIntegration", label: "sidebar.settingIntegration", icon: <Settings2 className="w-4 h-4" />, butuhProyek: true, module: "settings" },
  ],
},
```

Bentuk tipe (`SidebarItemConfig`, baris 26-54):

```tsx
export interface SidebarItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  module: string;
  action?: "read" | "create" | "update" | "delete";
  butuhProyek?: boolean; // true = disembunyikan bila belum ada project terpilih
  tetapTampil?: boolean;
  badge?: string;
  badgeColor?: "orange" | "emerald" | "blue" | "purple";
  children?: SidebarSubItemConfig[];
}
```

Item `"users"` **tidak punya `butuhProyek`** — ini preseden untuk item baru
`"loginHistory"` (fitur B) dan widget statistik (fitur D, kalau memang butuh
entri sidebar sendiri dan bukan sekadar kartu di halaman lain): item baru
harus **tanpa `butuhProyek`**, dengan `module` baru (lihat §3.8).

### 3.7 i18n — WAJIB dua bahasa, satu struktur

`src/i18n/locales/en.ts` dan `src/i18n/locales/id.ts`, masing-masing
`export const en = {...}` / `export const id = {...}`. Aturan tertulis di
komentar atas `en.ts`: **"Strukturnya WAJIB sama persis dengan `id.ts`"** —
kunci yang hilang di satu bahasa jatuh diam-diam ke bahasa Indonesia (ini
persis penyebab item #176 di `AUDIT.md`, jangan diulang).

Contoh kunci sidebar yang sudah ada:

```ts
// en.ts
sidebar: { userManagement: "User Management", enterpriseAudit: "Enterprise Audit", ... }
// id.ts
sidebar: { userManagement: "Manajemen Pengguna", enterpriseAudit: "Audit Perusahaan", ... }
```

**Untuk fitur B, tambahkan DI KEDUA FILE, kedalaman nesting sama:**

- `sidebar.loginHistory` — en: `"Login History"`, id: mis. `"Riwayat Login"`
- Blok baru setingkat `users: {...}`, mis. `loginHistory: { title, subtitle,
ipAddress, device, browser, loginAt, logoutAt, ... }` — nama-nama field ini
  **usulan**, sesuaikan dengan kolom yang benar-benar ditampilkan di UI.

Akses selalu lewat `useTranslation()`: `const { t } = useTranslation(); t("sidebar.loginHistory")`.
**Jangan pernah hardcode string Indonesia di JSX/handler** — ini pelanggaran
yang sudah tercatat sebagai item #176 di `AUDIT.md`.

### 3.8 Sistem permission — dua tempat, dua-duanya wajib diisi

Modul yang valid didefinisikan di `DEFAULT_PERMISSIONS`
(`src/lib/permissions.ts:21-192`) — daftar modul yang ada saat ini:
`dashboard, access, list, board, sprints, timeline, wiki, flowchart,
meetingNotes, qa, userManagement, masterData, auditLog, dbExplorer, settings`.

**Fitur baru butuh modul baru** (mis. `"loginHistory"`, dan/atau
`"systemStats"` untuk fitur D) yang harus ditambahkan **ke setiap peran** di
`DEFAULT_PERMISSIONS` — persis seperti `auditLog`/`userManagement` sudah ada
per peran di objek yang sama (admin biasanya `FULL_ACCESS` atau minimal
`READ_ONLY`, peran lain `NO_ACCESS` kecuali diputuskan lain oleh pemilik
proyek).

`hasPermission` short-circuit untuk admin (baris 317-320): peran
`admin`/`administrator`/`superadmin` selalu `true` ("God Mode") — jadi secara
teknis admin akan tetap bisa akses meski modul belum didaftarkan, TAPI
mendaftarkan modulnya tetap wajib supaya (a) peran lain bisa diberi akses
kelak dan (b) konsisten dengan `auditLog`/`userManagement`.

**Ada matriks kedua**: `src/lib/matriksAkses.ts` (`MATRIKS_SISTEM`) dipakai
`can(action, module, context)` untuk modul sistem (`userManagement,
masterData, auditLog, dbExplorer, settings`). **File ini terikat ke tabel di
`AUDIT.md` §19.4/§19.5 lewat test yang membaca `AUDIT.md` langsung** —
mengubah salah satu tanpa yang lain akan membuat test merah **dengan
sengaja**. Modul baru (`loginHistory`, `systemStats`) kemungkinan besar perlu
ditambahkan di sini juga — **AI Studio harus membaca file ini dan
`AUDIT.md` §19.4/§19.5 sebelum menambah modul**, bukan menebak.

Backend **tidak punya** sistem permission sehalus ini untuk rute admin-only —
semua rute admin sistem (§3.3) memakai gerbang biner `verifyGlobalAdmin`
(`role === "admin"`), bukan cek per-modul. Ikuti pola ini untuk endpoint fitur
A/B/C/D — jangan berusaha membuat pemeriksaan permission granular di backend
yang tidak konsisten dengan endpoint admin lain yang sudah ada.

### 3.9 Pola UI kartu statistik (untuk fitur D)

`AdminUserPanel.tsx:499-502` — angka dihitung di frontend dari data yang
sudah ada di memori, **bukan endpoint agregasi terpisah**:

```tsx
const totalUsersCount = users.length;
const approvedUsersCount = users.filter((u) => u.status === "approved").length;
const pendingUsersCount = users.filter((u) => u.status === "pending").length;
const adminUsersCount = users.filter((u) => u.role === "admin").length;
```

Satu kartu (dari grid 4 kartu, baris 571-625):

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
  <div className="bg-surface p-3.5 rounded-lg border border-border-subtle/60 shadow-2xs flex items-center gap-3 transition-all hover:shadow-xs">
    <div className="w-9 h-9 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center border border-blue-500/30 shrink-0">
      <Users className="w-4.5 h-4.5" />
    </div>
    <div>
      <div className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider">
        {t("users.totalUser")}
      </div>
      <div className="text-lg font-medium text-content-strong leading-none mt-1">
        {totalUsersCount}
      </div>
    </div>
  </div>
  {/* 3 kartu lain: emerald+CheckCircle (approved), amber+Clock (pending), rose+Shield (admin) */}
</div>
```

**Untuk widget "Total Project" & "Total User Sistem" (fitur D):** ikuti bentuk
kartu ini persis (`w-9 h-9` icon-chip bertinta, label uppercase kecil, angka
`text-lg font-medium`). **Perhatikan §22 `AUDIT.md`**: semua warna di sini
adalah **token** (`bg-surface`, `border-border-subtle`, `text-content-strong`,
`text-content-subtle`) — kecuali warna tinta ikon (`blue-500/10` dst.) yang
memang dipakai sebagai aksen kategori, bukan token latar/teks. **Jangan
menambah `dark:`**, jangan pakai kelas warna keras untuk latar/teks/garis
(`bg-content-*`, `text-surface-*` — kosakata yang bersilangan itu SALAH).

Karena angka "total user" di panel ini dihitung dari data per-halaman/per-role
yang sudah termuat, sedangkan fitur D butuh **angka SISTEM** (semua project,
semua user, bukan yang sudah termuat di satu panel) — ini **butuh endpoint
agregasi baru** (mis. `GET /api/admin/system-stats` dengan `SELECT COUNT(*)
FROM "Projects"` dan `SELECT COUNT(*) FROM "Users"`, digerbang
`authenticateJWT, verifyGlobalAdmin`), BUKAN dihitung ulang di frontend dari
seluruh data yang di-fetch (boros, dan `AppContainer.tsx` sudah di atas batas
800 baris — jangan menambah beban fetch di sana kalau bisa lewat endpoint
ringkas).

---

## 4. Larangan keras (dari `AGENTS.md`, berlaku untuk SEMUA fitur di dokumen ini)

- **Jangan sentuh `src/lib/db.ts`.**
- **Jangan pakai kredensial pemilik proyek** untuk verifikasi login — minta
  pemilik proyek login sendiri kalau perlu.
- **Jangan sabotase source untuk membuktikan test bisa merah** — pakai
  `git worktree` di luar repo.
- **Jangan hardcode daftar peran/status/prioritas/departemen** — ambil dari
  MasterData, simpan `code` bukan `label`. (Relevan bila `actionType` atau
  status baru di fitur A/B ternyata perlu tampil sebagai label — cek dulu
  apakah harus lewat MasterData atau cukup konstanta di kode, sesuai pola
  `actionType` yang sudah ada seperti `FORCE_LOGOUT` yang TIDAK lewat
  MasterData.)
- **Jangan taruh token/password/URL database langsung di `.ts`/`.tsx`** —
  pakai `process.env`.
- **Jangan bypass Global Error Handler.**
- **Jangan pakai sintaks MySQL** (`ON DUPLICATE KEY UPDATE`, dll.) — proyek ini
  Postgres murni. Pakai pola SELECT check → UPDATE/INSERT bila perlu upsert.
- **Kutip dua identifier camelCase** di SQL mentah (`"userId"`, bukan `userId`
  tanpa kutip) supaya tidak terlipat jadi huruf kecil oleh Postgres.
- **Warna wajib lewat token** `src/index.css` (`surface-*`, `content-*`,
  `border-*`) — jangan `dark:`, jangan kelas warna keras, jangan ubah nilai
  token demi satu layar (baca `AUDIT.md` §22 sebelum menyentuh warna apa pun).
- **File di atas 800 baris harus dipecah** — jangan menambah ke
  `AppContainer.tsx` yang sudah melewati batas ini kalau ada opsi menaruh
  logika di file/hook baru.

---

## 5. Definisi selesai — gerbang wajib, bukan opsional

Sebelum menyatakan fitur mana pun di atas "selesai", jalankan (dari
`AGENTS.md` §1):

```bash
npm run doctor && npm run lint && npm test && npm run build && npm run audit:papan && npm run audit:warna && npm run audit:tema
```

Lalu — **tidak bisa digantikan skrip apa pun** — buka aplikasi di tab
peramban yang **bersih** (bukan tab lama), login sebagai admin, dan pastikan
manual:

1. Login sekali, cek baris baru muncul di sumber data fitur A (tabel
   `AuditLogs`, `actionType = "LOGIN"` atau nama final yang disepakati).
2. Logout, cek baris `"LOGOUT"` juga tercatat.
3. Buka menu sidebar baru "Riwayat Login" (fitur B) sebagai admin — pastikan
   data yang baru saja dibuat di langkah 1-2 muncul.
4. Buka audit trail (fitur C) tanpa memilih project — pastikan menampilkan
   entri dari lebih dari satu project, bukan kosong/error.
5. Cek widget total project & total user (fitur D) menunjukkan angka yang
   cocok dengan jumlah asli di database (bandingkan manual, bukan asumsi).
6. Ganti bahasa ke Inggris, ulangi langkah 3-5 — pastikan tidak ada teks
   Indonesia yang bocor (ulangi kesalahan item #176 kalau ini tidak dicek).
7. Login sebagai user **non-admin** — pastikan menu baru ini **tidak
   terlihat**, dan mengetik `currentView` ke nilai baru secara paksa (lewat
   console/state) tetap ditolak oleh gerbang `hasPermission` (bukan hanya
   disembunyikan di sidebar — sidebar bukan penjaga, ini pelajaran yang sudah
   dicatat eksplisit di kode `AppContainer.tsx` untuk kasus `"users"`).

Kalau ada langkah yang tidak bisa diverifikasi, tulis **"belum
terverifikasi"** — jangan mengklaim selesai berdasarkan dugaan.

---

## 6. Checklist file yang kemungkinan tersentuh

**Backend**

- `server/repositories/auth.repository.ts` — tambah `logLogin`, `logLoginFailed`, `logLogout`
- `server/repositories/audit.repository.ts` — mungkin perlu varian `findLogs` khusus tanpa wajib `projectId`, atau dipakai apa adanya
- `server/routes/auth.routes.ts` — panggil method log di handler login & logout
- Route baru (nama file usulan): `server/routes/admin-stats.routes.ts` untuk fitur D (`GET /api/admin/system-stats`)
- `server.ts` — daftarkan router baru bila dibuat terpisah

**Frontend**

- `src/features/sidebar/config.tsx` — item sidebar baru (fitur B, dan D bila perlu entri sendiri)
- `src/AppContainer.tsx` — cabang `currentView` baru mengikuti pola `"users"`
- Komponen panel baru, mis. `src/features/users/LoginHistoryPanel.tsx` (fitur B) — folder `src/features/` sesuai konvensi `AGENTS.md` §4
- `src/lib/permissions.ts` — modul baru di `DEFAULT_PERMISSIONS` untuk setiap peran
- `src/lib/matriksAkses.ts` — cek apakah modul baru perlu masuk `MATRIKS_SISTEM` (dan `AUDIT.md` §19.4/§19.5 harus disinkronkan bila ya)
- `src/i18n/locales/en.ts` dan `src/i18n/locales/id.ts` — kunci baru di kedua file, struktur identik

**Dokumentasi wajib**

- `AUDIT.md` — item baru setelah disetujui, dan diperbarui setelah selesai
- `docs/DATABASE_SCHEMA.md` — bila ada perubahan kolom/pemakaian tabel yang perlu dicatat ulang (biasanya via `scripts/dump-schema.cjs`, bukan diedit manual)

---

## 7. Ringkasan hal yang SENGAJA tidak diputuskan dokumen ini

Supaya AI Studio tidak mengarang jawabannya sendiri, berikut keputusan yang
harus datang dari pemilik proyek, bukan dari dokumen ini:

- Nama persis `actionType` (`"LOGIN"` vs nama lain), nama modul permission
  baru (`"loginHistory"` vs nama lain), dan nomor item `AUDIT.md`.
- Apakah fitur C jadi mode baru di `EnterpriseAuditDashboard` yang sudah ada,
  atau panel terpisah.
- Apakah fitur D jadi kartu di dashboard admin yang sudah ada atau halaman
  sendiri.
- Apakah login gagal (`LOGIN_FAILED`) perlu dicatat juga, atau cukup login
  sukses + logout.
- Berapa lama retensi data riwayat login (tidak ada mekanisme purge di
  `AuditLogs` saat ini — menambah baris terus tanpa retensi adalah keputusan
  tersendiri).
- Fitur E (traffic/analytics) sama sekali di luar cakupan dokumen ini.
