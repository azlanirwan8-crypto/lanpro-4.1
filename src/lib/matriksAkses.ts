/**
 * MATRIKS OTORISASI TERPUSAT — satu sumber kebenaran. AUDIT.md §19.8 tahap 2.
 *
 * KENAPA ADA.
 *
 * §18.3 memetakan 25 temuan F2 ke OWASP dan menemukan 14 di antaranya (56%)
 * jatuh ke A01 Broken Access Control. Itu bukan 14 kekeliruan terpisah,
 * melainkan SATU kelemahan struktural: tidak ada tempat yang menyatakan siapa
 * boleh apa. Setiap penjaga rute mengarangnya sendiri, sehingga 63 penjaga
 * menghasilkan 8 daftar peran berbeda — dan 32 di antaranya (51%) berbunyi
 * `['*']`, yang artinya "anggota mana pun", termasuk `viewer` yang lalu bisa
 * menghapus data (#66, #72).
 *
 * Berkas ini memindahkan keputusan itu ke SATU tempat. Rute tidak lagi
 * menyebutkan peran; ia menyebutkan **modul dan aksi**, lalu matriks ini yang
 * menjawab boleh atau tidak.
 *
 * BERKAS INI BELUM MENEGAKKAN APA PUN.
 *
 * Ia data dan fungsi murni — nol query, nol Express, nol perubahan perilaku.
 * Yang menegakkannya adalah tahap 4 (`verifyProjectAccess`). Dipisah dengan
 * sengaja: matriksnya bisa diuji lengkap terhadap §19 sebelum ada satu
 * permintaan pun yang ditolak olehnya.
 *
 * KONTRAK DENGAN DOKUMEN.
 *
 * Isi matriks ini WAJIB sama dengan tabel §19.4 dan §19.5 di AUDIT.md.
 * `src/lib/matriksAkses.test.ts` menegakkannya dengan MEMBACA AUDIT.md dan
 * membandingkan baris per baris. Jadi mengubah matriks tanpa mengubah dokumen —
 * atau sebaliknya — langsung memerahkan test.
 *
 * Itu disengaja. §13.14 mencatat gerbang F0 pernah "dinyatakan lulus" padahal
 * tak pernah dijalankan, dan §19.10 mencatat data yang benar tetapi kontraknya
 * putus dengan UI. Dokumen yang tidak diikat ke kode akan menyimpang, dan
 * penyimpangannya baru ketahuan saat ada yang dirugikan.
 */

import type { ProjectRole, SystemRole } from "../types/roles";
import { normalkanPeran } from "../types/roles";

/** Satu huruf CRUD. §19.7 memetakan tiap huruf ke operasi nyata. */
export type Aksi = "C" | "R" | "U" | "D";

/** Modul DI DALAM proyek. §19.5 */
export type ModulProyek =
  | "dashboard"
  | "access"
  | "list"
  | "board"
  | "sprints"
  | "timeline"
  | "wiki"
  | "flowchart"
  | "meetingNotes"
  | "qa"
  | "notebooklm";

/** Modul DI LUAR proyek. §19.4 */
export type ModulSistem = "userManagement" | "masterData" | "auditLog" | "dbExplorer" | "settings";

/**
 * Matriks proyek. Peran yang TIDAK disebut pada sebuah modul berarti **tidak
 * punya akses apa pun** ke modul itu — deny-by-default, §19.6 aturan 3.
 *
 * Perhatikan sebaran `D`: di luar modul yang dikuasainya, tiga peran fungsional
 * TIDAK PERNAH menghapus. Itu bukan kelalaian penulisan, melainkan ketetapan
 * §19.7 yang menutup #66 dan #72 secara struktural, bukan per rute.
 */
export const MATRIKS_PROYEK: Record<ModulProyek, Partial<Record<ProjectRole, readonly Aksi[]>>> = {
  dashboard: {
    owner: ["R"],
    admin: ["R"],
    manager: ["R"],
    system_analyst: ["R"],
    business_analyst: ["R"],
    developer: ["R"],
    qa: ["R"],
    viewer: ["R"],
  },
  access: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["R", "U"],
    system_analyst: ["R"],
    business_analyst: ["R"],
    developer: ["R"],
    qa: ["R"],
    viewer: ["R"],
  },
  list: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    system_analyst: ["C", "R", "U"],
    business_analyst: ["C", "R", "U"],
    developer: ["C", "R", "U"],
    qa: ["C", "R", "U"],
    viewer: ["R"],
  },
  board: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    system_analyst: ["R", "U"],
    business_analyst: ["R", "U"],
    developer: ["R", "U"],
    qa: ["R", "U"],
    viewer: ["R"],
  },
  sprints: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    system_analyst: ["R"],
    business_analyst: ["R"],
    developer: ["R"],
    qa: ["R"],
    viewer: ["R"],
  },
  timeline: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    system_analyst: ["R"],
    business_analyst: ["R"],
    developer: ["R"],
    qa: ["R"],
    viewer: ["R"],
  },
  wiki: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    system_analyst: ["C", "R", "U", "D"], // wilayah kuasanya
    business_analyst: ["C", "R", "U"],
    developer: ["R"],
    qa: ["R"],
    viewer: ["R"],
  },
  flowchart: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    system_analyst: ["C", "R", "U", "D"], // wilayah kuasanya
    business_analyst: ["C", "R", "U"],
    developer: ["R"],
    qa: ["R"],
    viewer: ["R"],
  },
  meetingNotes: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    business_analyst: ["C", "R", "U", "D"], // wilayah kuasanya
    system_analyst: ["C", "R", "U"],
    qa: ["C", "R", "U"],
    developer: ["R"],
    viewer: ["R"],
  },
  qa: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    qa: ["C", "R", "U", "D"], // wilayah kuasanya
    system_analyst: ["R", "U"],
    business_analyst: ["R", "U"],
    developer: ["R", "U"],
    viewer: ["R"],
  },
  notebooklm: {
    owner: ["C", "R", "U", "D"],
    admin: ["C", "R", "U", "D"],
    manager: ["C", "R", "U", "D"],
    system_analyst: ["C", "R", "U"],
    business_analyst: ["C", "R", "U"],
    developer: ["R"],
    qa: ["R"],
    viewer: ["R"],
  },
};

/**
 * Matriks sistem. §19.4
 *
 * `Project Manager` sengaja TIDAK ADA di sini, atas ketetapan pemilik proyek
 * 16 Agu 2026: sesudah pembuatan proyek dibatasi ke Administrator, peran itu
 * tidak menyisakan pembeda apa pun dari Standard User.
 */
export const MATRIKS_SISTEM: Record<ModulSistem, Partial<Record<SystemRole, readonly Aksi[]>>> = {
  userManagement: { admin: ["C", "R", "U", "D"], head: ["R"] },
  masterData: { admin: ["C", "R", "U", "D"], head: ["R"] },
  auditLog: { admin: ["C", "R", "U", "D"], head: ["R"] },
  dbExplorer: { admin: ["C", "R", "U", "D"] },
  settings: { admin: ["C", "R", "U", "D"], head: ["R"] },
};

/**
 * Menghapus PROYEK — sengaja di luar `MATRIKS_PROYEK`.
 *
 * Ia bukan operasi pada sebuah modul, melainkan pada proyek itu sendiri, dan
 * §19.5 memberikannya HANYA kepada Project Owner. Menaruhnya sebagai modul akan
 * membuatnya ikut terbawa aturan umum dan mengaburkan keistimewaannya.
 */
export const bolehHapusProyek = (peran: unknown): boolean => normalkanPeran(peran) === "owner";

/**
 * Membuat PROYEK — hanya Administrator sistem. §19.4
 *
 * Inilah yang menutup #80: `POST /api/projects/generate-bni-demo` membuat proyek
 * tanpa penjaga admin sama sekali — pintu kedua ke operasi yang sudah dijaga di
 * pintu pertama.
 */
export const bolehBuatProyek = (peranSistem: unknown): boolean =>
  normalkanPeran(peranSistem) === "admin";

/**
 * Administrator sistem menembus seluruh proyek. §19.6 langkah 3b.
 *
 * ⚠️ §19.6 aturan 2 mewajibkan SETIAP pemakaiannya tercatat di `AuditLogs`.
 * Fungsi ini sengaja tidak mencatat sendiri — ia fungsi murni. Kewajiban itu
 * milik pemanggilnya di tahap 4, dan wajib diuji di sana.
 */
export const punyaGodMode = (peranSistem: unknown): boolean =>
  normalkanPeran(peranSistem) === "admin";

/**
 * Boleh atau tidak — DI DALAM proyek.
 *
 * Deny-by-default: peran yang tidak dikenal, modul yang tidak dikenal, dan peran
 * yang tidak disebut pada modul itu, semuanya menghasilkan `false`. Tidak ada
 * cabang yang mengembalikan `true` karena "tidak ada aturan yang melarang" —
 * pembalikan itulah yang menutup #68, #70, #71, dan #80 sekaligus, sebab
 * keempatnya lolos justru karena bawaannya "izinkan".
 */
export function bolehDiProyek(peran: unknown, modul: ModulProyek | string, aksi: Aksi): boolean {
  const baris = MATRIKS_PROYEK[modul as ModulProyek];
  if (!baris) return false;
  const izin = baris[normalkanPeran(peran) as ProjectRole];
  if (!izin) return false;
  return izin.indexOf(aksi) !== -1;
}

/**
 * Boleh atau tidak — DI LUAR proyek. Aturan mainnya sama: deny-by-default.
 */
export function bolehDiSistem(
  peranSistem: unknown,
  modul: ModulSistem | string,
  aksi: Aksi
): boolean {
  const baris = MATRIKS_SISTEM[modul as ModulSistem];
  if (!baris) return false;
  const izin = baris[normalkanPeran(peranSistem) as SystemRole];
  if (!izin) return false;
  return izin.indexOf(aksi) !== -1;
}
