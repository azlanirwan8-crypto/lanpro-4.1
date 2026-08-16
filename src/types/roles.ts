/**
 * SATU-SATUNYA definisi nama peran yang sah. AUDIT.md §19.8 tahap 1.
 *
 * KENAPA ADA.
 *
 * §19.2 mengukur LIMA kosakata peran yang tidak pernah bertemu — gabungan 17
 * nama, hanya 6 di antaranya punya data, dan tidak satu tempat pun
 * mendefinisikannya. Sebelas nama sisanya (`superadmin`, `administrator`,
 * `assistant`, `qa`, `lead`, `sadm`, `admn`, `system admin`, `super admin`,
 * `designer`, `member`) hidup hanya di dalam `role === "..."` yang tersebar.
 *
 * Yang membuatnya bisa hidup selama itu adalah `| string` di ujung `AppRole`:
 * ia membuat SETIAP string lolos sebagai peran, sehingga salah ketik pun
 * dianggap benar oleh kompilator. Berkas ini menutup pintu itu.
 *
 * KENAPA DUA ENUM, BUKAN SATU.
 *
 * §19.8 tahap 1 menulis "satu enum peran". Setelah katalog final disemai,
 * itu ternyata TIDAK BISA dilakukan tanpa merusak otorisasi: dua kode
 * bertabrakan antar lingkup.
 *
 *   code `admin`   -> SYSTEM: Administrator   PROJECT: Project Admin
 *   code `viewer`  -> SYSTEM: Observer        PROJECT: Viewer
 *
 * Tabrakan `admin` berbahaya, bukan sekadar membingungkan. Di
 * `server/middleware/rbac.ts` nilai `admin` memicu GOD MODE lintas proyek.
 * Satu enum gabungan membuat kompilator tidak lagi bisa membedakan Project
 * Admin dari Administrator sistem — dan Project Admin akan terbaca sebagai
 * pemegang God Mode di seluruh proyek.
 *
 * Karena itu lingkupnya dipisah di tingkat TIPE, bukan hanya di data. Yang
 * dituntut §19 — satu tempat, tanpa `| string` — tetap terpenuhi.
 *
 * SUMBER ANGKA-ANGKANYA.
 *
 * Daftar di bawah adalah kolom `code` dari `scripts/db/seed-katalog-peran.cjs`,
 * penyemai yang mengisi `MasterData.type = 'project_role'`. Keduanya WAJIB
 * sama; `src/types/roles.test.ts` menegakkannya dengan membaca berkas penyemai,
 * supaya menambah peran di satu tempat saja langsung memerahkan test.
 *
 * Yang disimpan ke database adalah `code` INI, bukan label. Lihat
 * `src/lib/roleCatalog.ts`.
 */

/** Peran sistem — mengatur hal DI LUAR proyek. §19.4 */
export const SYSTEM_ROLES = ["admin", "head", "user", "viewer"] as const;

/** Peran proyek — mengatur hal DI DALAM satu proyek. §19.5 */
export const PROJECT_ROLES = [
  "owner",
  "admin",
  "manager",
  "system_analyst",
  "business_analyst",
  "developer",
  "qa",
  "viewer",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type ProjectRole = (typeof PROJECT_ROLES)[number];

/** Lingkup sebuah peran. Dipakai saat keduanya harus dibawa bersama. */
export type LingkupPeran = "SYSTEM" | "PROJECT";

/**
 * Peran EFEKTIF — gabungan kedua lingkup. Tipe ini mencatat sebuah CACAT, bukan
 * merestuinya.
 *
 * `useAuth` menyediakan `effectiveRole`, dan nilainya bisa datang dari
 * `Users.role` (lingkup SYSTEM) MAUPUN dari `ProjectMembers.role` (lingkup
 * PROJECT), tergantung apakah pengguna sedang berada di dalam sebuah proyek.
 * Nilai itulah yang mengalir ke `hasPermission` dan `getUserPermissions`.
 *
 * Ditemukan saat `| string` dicabut: kompilator menandai perbandingan
 * `normRole === 'manager'` sebagai mustahil, sebab `manager` bukan peran
 * SYSTEM. Perbandingan itu ternyata TIDAK mati — `ProjectMembers.role` memang
 * memuat `manager` (2 baris, §19.2), dan nilainya benar-benar sampai ke sana.
 *
 * Jadi satu variabel membawa dua kosakata yang berbeda artinya. Inilah bentuk
 * konkret dari #76: selama lingkup tidak ikut dibawa, tidak ada cara memastikan
 * peran diperiksa terhadap matriks yang benar. Tahap 4 yang membereskannya —
 * dengan memisahkan pemeriksaan system role dari project role sesuai §19.6.
 *
 * Sampai saat itu tipe ini membuat percampurannya TERLIHAT dan bisa dilacak:
 * setiap pemakaian `PeranEfektif` adalah satu tempat yang tahap 4 harus datangi.
 */
export type PeranEfektif = SystemRole | ProjectRole | PeranWarisan;

/**
 * Nilai peran lama yang MASIH ADA di database atau di penjaga rute, tetapi
 * BUKAN peran yang sah menurut katalog.
 *
 * Sengaja didaftarkan alih-alih dibiarkan lolos lewat `| string`: selama ia
 * punya nama di sini, ia bisa dihitung, dicari, dan dihapus. `| string` membuat
 * hal yang sama mustahil.
 *
 *   `member`    7 dari 10 baris ProjectMembers + 6 penjaga rute. Pemetaannya ke
 *               peran katalog MENUNGGU keputusan pemilik proyek.
 *   `designer`  1 penjaga rute, NOL baris data.
 *   `head`      dipakai 15 penjaga rute proyek, padahal `head` adalah peran
 *               SISTEM. §19.6 aturan 1: di dalam proyek, system role tidak
 *               dipakai kecuali Administrator.
 *
 * Daftar ini harus MENYUSUT menuju kosong. Bila ia bertambah, ada yang salah.
 */
export const PERAN_WARISAN = ["member", "designer", "head"] as const;
export type PeranWarisan = (typeof PERAN_WARISAN)[number];

const setSistem: ReadonlySet<string> = new Set(SYSTEM_ROLES);
const setProyek: ReadonlySet<string> = new Set(PROJECT_ROLES);
const setWarisan: ReadonlySet<string> = new Set(PERAN_WARISAN);

/**
 * Normalisasi nilai peran dari database.
 *
 * Data lama menyimpan campuran huruf besar-kecil (`Admin`, `admin`, `ADMIN`)
 * dan pernah menyimpan LABEL alih-alih kode (`"Department Head"` bukan `head`).
 * Semua pembanding peran wajib lewat sini lebih dulu.
 */
export const normalkanPeran = (nilai: unknown): string =>
  String(nilai ?? "")
    .trim()
    .toLowerCase();

export const adalahPeranSistem = (nilai: unknown): nilai is SystemRole =>
  setSistem.has(normalkanPeran(nilai));

export const adalahPeranProyek = (nilai: unknown): nilai is ProjectRole =>
  setProyek.has(normalkanPeran(nilai));

export const adalahPeranWarisan = (nilai: unknown): nilai is PeranWarisan =>
  setWarisan.has(normalkanPeran(nilai));

/**
 * Peran yang sama sekali tidak dikenal — bukan katalog, bukan warisan.
 *
 * Inilah yang dipakai penjaga saat boot (tahap 2) untuk menolak menyala.
 */
export const peranTakDikenal = (nilai: unknown, lingkup: LingkupPeran): boolean => {
  const n = normalkanPeran(nilai);
  if (n === "") return true;
  if (adalahPeranWarisan(n)) return false;
  return lingkup === "SYSTEM" ? !setSistem.has(n) : !setProyek.has(n);
};

/**
 * Menyempitkan nilai mentah — misalnya `e.target.value` dari sebuah `<select>` —
 * menjadi peran sistem yang sah.
 *
 * Nilai `<select>` bertipe `string` menurut DOM, dan sebelum ini disuapkan
 * langsung ke state peran lewat `| string`. Artinya opsi apa pun, termasuk yang
 * salah ketik, tersimpan sebagai peran tanpa ada yang menegur.
 *
 * Cadangannya `user` — peran dengan hak paling kecil di antara yang punya data,
 * sejalan dengan deny-by-default §19.6 aturan 3.
 */
export const sebagaiPeranSistem = (nilai: unknown): SystemRole =>
  adalahPeranSistem(nilai) ? (normalkanPeran(nilai) as SystemRole) : "user";
