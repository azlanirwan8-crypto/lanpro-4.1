/**
 * Katalog peran — SATU-SATUNYA sumber daftar peran untuk seluruh antarmuka.
 *
 * KENAPA ADA (item #82, AUDIT.md §19.12).
 *
 * Sebelum ini, daftar peran ditulis langsung sebagai `<option>` di lima tempat
 * berbeda: dua di `UserDetailView`, dua di `AdminUserPanel`, satu di
 * `TeamManagementPanel`. Kelimanya berbeda isi, dan tidak satu pun membaca
 * katalog di Master Data.
 *
 * Akibatnya nyata dan sempat ditemukan pemilik proyek sendiri: dropdown System
 * Role menampilkan `Department Head` DUA KALI dengan nilai tersimpan berbeda
 * (`head` dan `Department Head`), sementara empat project role yang sudah ada di
 * katalog — System Analyst, Business Analyst, Developer, QA — sama sekali tidak
 * bisa dipilih.
 *
 * KETETAPAN PEMILIK PROYEK 16 Agu 2026: tidak boleh ada daftar peran yang
 * ditulis di kode. Semuanya berparameter, dan parameternya dari Master Data.
 *
 * KODE vs LABEL — dan kenapa dibedakan.
 *
 * Yang disimpan ke `Users.role` dan `ProjectMembers.role` adalah **`code`**,
 * bukan `label`. Dengan begitu mengganti nama tampilan sebuah peran di Master
 * Data tidak merusak otorisasi, dan sebaliknya kebutuhan otorisasi tidak memaksa
 * label tetap kaku. Label boleh berubah kapan saja; kode tidak.
 *
 * Baris katalog tanpa `code` sengaja DILEWATI, bukan diberi nilai cadangan dari
 * label. Menebak kode dari label persis cara `Department Head` dulu tersimpan
 * sebagai `"Department Head"` alih-alih `head`.
 */

/** Bentuk baris Master Data yang dipakai di sini. Sengaja longgar — sumbernya API. */
export interface BarisMasterData {
  id?: string;
  type?: string;
  code?: string | null;
  label?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  order?: number | null;
  role_type?: string | null;
  roleType?: string | null;
}

export interface PeranKatalog {
  /** Nilai yang DISIMPAN ke database. Stabil, tidak ikut berubah bila label diganti. */
  code: string;
  /** Nama yang ditampilkan. Boleh berubah kapan saja. */
  label: string;
  description: string;
  color: string | null;
  icon: string | null;
  order: number;
}

export type LingkupPeran = "SYSTEM" | "PROJECT";

/** Master Data mengirim `role_type` atau `roleType` tergantung jalurnya. */
const lingkupDari = (d: BarisMasterData): string =>
  String(d.role_type ?? d.roleType ?? "").toUpperCase();

/**
 * Mengambil daftar peran dari Master Data untuk satu lingkup.
 *
 * Baris tanpa `code` dilewati — lihat catatan di kepala berkas.
 */
export function ambilKatalogPeran(
  masterData: BarisMasterData[] | null | undefined,
  lingkup: LingkupPeran
): PeranKatalog[] {
  if (!Array.isArray(masterData)) return [];

  return masterData
    .filter((d) => d.type === "project_role" && lingkupDari(d) === lingkup)
    .filter((d) => typeof d.code === "string" && d.code.trim() !== "")
    .map((d) => ({
      code: String(d.code).trim(),
      label: d.label || String(d.code),
      description: d.description || "",
      color: d.color ?? null,
      icon: d.icon ?? null,
      order: typeof d.order === "number" ? d.order : 0,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

/** Peran sistem — mengatur hal DI LUAR proyek. */
export const katalogPeranSistem = (m: BarisMasterData[] | null | undefined) =>
  ambilKatalogPeran(m, "SYSTEM");

/** Peran proyek — mengatur hal DI DALAM satu proyek. */
export const katalogPeranProyek = (m: BarisMasterData[] | null | undefined) =>
  ambilKatalogPeran(m, "PROJECT");

/**
 * Mencari satu peran berdasarkan kode yang tersimpan.
 *
 * Perbandingannya tidak peka huruf besar-kecil karena data lama menyimpan
 * campuran (`Admin`, `admin`, `ADMIN`). Mengembalikan `null` bila tidak ada —
 * pemanggil wajib menyiapkan tampilan untuk peran yang tidak dikenal, karena
 * data lama memang memuat nilai di luar katalog (§19.2).
 */
export function cariPeran(
  katalog: PeranKatalog[],
  code: string | null | undefined
): PeranKatalog | null {
  if (!code) return null;
  const c = String(code).trim().toLowerCase();
  return katalog.find((p) => p.code.toLowerCase() === c) || null;
}

/**
 * Label untuk ditampilkan. Bila kodenya tidak ada di katalog, kode mentahnya
 * yang ditampilkan — supaya nilai lama yang menyimpang TERLIHAT, bukan
 * disembunyikan di balik teks yang ramah.
 */
export function labelPeran(
  katalog: PeranKatalog[],
  code: string | null | undefined
): string {
  return cariPeran(katalog, code)?.label || String(code || "");
}
