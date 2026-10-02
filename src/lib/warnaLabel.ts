import type { CSSProperties } from "react";
import type { MasterData } from "../types";

/**
 * #564 — SATU sumber warna untuk label bekerja (status, jenis isu, prioritas).
 *
 * MASALAH AWAL. Sebelum berkas ini ada, tiap panel menulis pemetaan
 * status→warna sendiri: 16 fungsi berbeda untuk kosakata yang sama, memakai
 * tiga kamus (label Inggris, label Indonesia, `code` snake_case) dan empat
 * bentuk keluaran (kelas token, kelas palet mentah, string `var(--color-*)`,
 * hex/RGB). Hasilnya terukur dan saling bertentangan: "In Review" tampil
 * biru-merek di dropdown, biru-info di planning, ungu di dasbor, sian di
 * master data, dan abu-abu di ekspor PDF. "Selesai" — label yang aplikasi ini
 * sendiri cetak di layar Indonesia — bahkan tidak dikenali pemetaannya
 * Timeline, jadi ia jatuh ke warna "To Do".
 *
 * ATURANNYA. Warna sebuah label = warna yang memang sudah melekat pada label
 * itu: kolom `color` di MasterData, yang bisa diubah pemilik lewat menu Master
 * Data. `BAKU` di bawah hanyalah nilai yang sama dengan seed
 * (`scripts/db/seed-master-data.cjs`) untuk keadaan master data belum termuat
 * atau barisnya tidak punya warna — jadi panel tanpa `masterData` di scope
 * tetap sepakat dengan panel yang punya, bukan memakai kamus keempat.
 *
 * KONTRAS. Kelas `.label-chip` (index.css) menurunkan warna TEKS dari hex yang
 * sama lewat `color-mix` dengan `--color-content`, yang nilainya gelap di mode
 * terang dan terang di mode gelap. Karena itu tidak perlu penimpaan manual per
 * mode dan teks chip tidak bisa lagi bertengkar dengan titik di sebelahnya:
 * keduanya berasal dari satu hex yang sama.
 */

export type KelompokLabel = "status" | "issue_type" | "priority";

/** Label tanpa warna apa pun: abu-abu, bukan warna merek yang menyamar jadi status. */
export const WARNA_NETRAL = "#64748B";

const normal = (nilai?: string | null) =>
  String(nilai ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Palet baku — salinan nilai seed MasterData. Bila seed berubah, tabel ini ikut;
 * `warnaLabel.baku.test.ts` mengikat keduanya supaya tidak melompat diam-diam.
 */
export const BAKU: Record<KelompokLabel, Record<string, string>> = {
  status: {
    backlog: "#94A3B8",
    rencana: "#94A3B8",
    todo: "#3B82F6",
    inprogress: "#8B5CF6",
    progress: "#8B5CF6",
    doing: "#8B5CF6",
    aktif: "#8B5CF6",
    dikerjakan: "#8B5CF6",
    inreview: "#06B6D4",
    review: "#06B6D4",
    tinjau: "#06B6D4",
    codereview: "#06B6D4",
    testing: "#F59E0B",
    uji: "#F59E0B",
    uat: "#EC4899",
    blocked: "#DC2626",
    terhalang: "#DC2626",
    blokir: "#DC2626",
    done: "#10B981",
    selesai: "#10B981",
    completed: "#10B981",
    cancelled: "#64748B",
    batal: "#64748B",
    ditolak: "#64748B",
  },
  issue_type: {
    epic: "#8B5CF6",
    story: "#10B981",
    task: "#3B82F6",
    subtask: "#06B6D4",
    bug: "#EF4444",
    meeting: "#F59E0B",
    document: "#64748B",
    approval: "#EC4899",
  },
  priority: {
    highest: "#B91C1C",
    blocker: "#B91C1C",
    p0blocker: "#B91C1C",
    urgent: "#B91C1C",
    critical: "#EF4444",
    high: "#EF4444",
    p1critical: "#EF4444",
    major: "#F59E0B",
    medium: "#F59E0B",
    p2major: "#F59E0B",
    sedang: "#F59E0B",
    minor: "#10B981",
    low: "#10B981",
    p3minor: "#10B981",
    lowest: "#64748B",
    hold: "#64748B",
    mendesak: "#EF4444",
    tinggi: "#EF4444",
    rendah: "#10B981",
  },
};

/**
 * Hanya grammar warna yang boleh masuk ke properti kustom CSS. Kolom `color`
 * master data bisa diisi lewat form; nilai seperti `red;background:url(...)`
 * tidak boleh sampai ke `style`.
 */
const POLA_WARNA =
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$|^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+%?\s*)?\)$/i;

export const warnaSah = (nilai?: string | null): nilai is string =>
  POLA_WARNA.test(String(nilai ?? "").trim());

/**
 * Hex sebuah label. Urutan: warna master data → tabel baku berdasar `code` →
 * tabel baku berdasar `label` → netral.
 */
export function warnaLabel({
  kelompok,
  label,
  kode,
  warnaMaster,
}: {
  kelompok: string;
  label?: string | null;
  kode?: string | null;
  warnaMaster?: string | null;
}): string {
  if (warnaSah(warnaMaster)) return warnaMaster.trim();
  const tabel = BAKU[kelompok as KelompokLabel] ?? {};
  const kunci = [normal(kode), normal(label)].filter(Boolean);
  for (const k of kunci) {
    const hex = tabel[k];
    if (hex) return hex;
  }
  // "P1 - Critical" dan sebangsanya: cocokkan kata kunci terpanjang di dalamnya.
  const gabungan = kunci.join(" ");
  let terbaik: { kunci: string; hex: string } | null = null;
  for (const [k, hex] of Object.entries(tabel)) {
    if (k.length < 4 || !gabungan.includes(k)) continue;
    if (!terbaik || k.length > terbaik.kunci.length) terbaik = { kunci: k, hex };
  }
  return terbaik?.hex ?? WARNA_NETRAL;
}

/**
 * Cari baris master data untuk sebuah nilai.
 *
 * Semua pemanggil lama membandingkan `label` secara persis — dan meleset untuk
 * dua alasan yang terukur: `Tasks.status` menyimpan `code` (`in_progress`, lihat
 * `statusKolom.ts`), sementara label master punya varian ("Sub-task" vs
 * `subtask`). Dicocokkan lewat `normal()` pada `code`, `id`, lalu `label`.
 */
export function cariMaster(
  daftar: MasterData[] | undefined,
  kelompok: string,
  nilai?: string | null
): MasterData | undefined {
  if (!daftar?.length || !nilai) return undefined;
  const cari = normal(nilai);
  if (!cari) return undefined;
  const baris = daftar.filter((m) => m.type === kelompok);
  return (
    baris.find((m) => normal(m.code) === cari) ??
    baris.find((m) => normal(m.id) === cari) ??
    baris.find((m) => normal(m.label) === cari)
  );
}

/** Versi satu panggilan untuk pemanggil yang punya daftar master di scope. */
export function warnaDariMaster(
  daftar: MasterData[] | undefined,
  kelompok: string,
  nilai?: string | null
): string {
  const baris = cariMaster(daftar, kelompok, nilai);
  return warnaLabel({
    kelompok,
    label: baris?.label ?? nilai,
    kode: baris?.code,
    warnaMaster: baris?.color,
  });
}

/** Ikon + titik + chip sebuah label harus memakai hex yang sama. */
export const gayaLabel = (hex: string): CSSProperties =>
  ({ "--lbr": warnaSah(hex) ? hex : WARNA_NETRAL }) as CSSProperties;

/**
 * Rona untuk kelas yang tidak bisa dibangun dari hex (batang Gantt Timeline
 * memakai gradien + pegangan geser). Namanya menjelaskan fungsinya, bukan
 * kosakata warna baru.
 */
export type NadaLabel = "selesai" | "berjalan" | "tinjau" | "terhenti" | "awal" | "netral";

const NADA: Record<string, NadaLabel> = {
  "#94A3B8": "awal",
  "#3B82F6": "awal",
  "#8B5CF6": "berjalan",
  "#06B6D4": "tinjau",
  "#F59E0B": "tinjau",
  "#EC4899": "tinjau",
  "#DC2626": "terhenti",
  "#EF4444": "terhenti",
  "#B91C1C": "terhenti",
  "#10B981": "selesai",
  "#64748B": "netral",
};

export const nadaLabel = (hex: string): NadaLabel =>
  NADA[warnaSah(hex) ? hex.trim().toUpperCase() : ""] ?? "netral";
