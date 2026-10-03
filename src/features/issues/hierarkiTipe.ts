/**
 * HIERARKI TIPE ISU — satu-satunya tempat aturan "siapa boleh menjadi anak siapa".
 *
 * KENAPA ADA. Baris tambah di dalam pohon (child) dan bilah tambah di bawah
 * (top-level) sama-sama menampilkan SEMUA tipe dari Master Data — jadi bisa
 * membuat Epic di bawah Task, dan Sub-task tanpa induk. Keluhan pemilik proyek
 * 03 Okt: "kita harus pastikan urutannya agar tidak bingung ... epic nya tidak
 * ada lagi, sub nya task terus sub nya lagi epic". Aturan yang sama juga
 * menentukan tipe bawaan yang benar: item baru di puncak adalah Epic, anak dari
 * Epic adalah Story, anak dari Task adalah Sub-task.
 *
 * KENAPA TIDAK DI KOMPONEN. Dua komponen pemilih tipe (IssueQuickCreateBar dan
 * IssueTableInlineAddRow) akan berhenti setuju begitu salah satunya disentuh —
 * persis pola yang membuat #564 punya 16 pemetaan warna berbeda.
 *
 * Label dibandingkan lewat `kunciTipe` (huruf kecil, tanpa spasi/tanda hubung),
 * jadi "Sub-task", "Sub Task" dan "subtask" satu kunci yang sama. Yang
 * DIPULANGKAN selalu label asli dari Master Data, supaya casing di layar ikut
 * data master (#590), bukan hasil terkaan kita.
 */

export const kunciTipe = (label?: string | null): string =>
  (label || "").toLowerCase().replace(/[\s_-]+/g, "");

/** Tipe yang boleh hidup DI BAWAH sebuah tipe. Urutan = urutan yang disarankan. */
const ANAK_BOLEH: Record<string, string[]> = {
  epic: ["story", "task", "bug", "subtask"],
  story: ["task", "bug", "subtask"],
  task: ["subtask"],
  bug: ["subtask"],
  subtask: ["subtask"],
};

/** Yang tidak boleh berdiri tanpa induk. */
const BUTUH_INDUK = new Set(["subtask"]);

/**
 * Label yang boleh ditawarkan. `tipeInduk` null berarti baris puncak.
 *
 * Tipe yang tidak dikenal (pengguna menamai ulang Master Data-nya) TIDAK
 * membuat daftar jadi kosong — itu akan mengunci pengguna dari membuat tugas
 * sama sekali. Untuk induk tak dikenal yang tersisa hanyalah "jangan sodorkan
 * Epic di bawah sesuatu", dan untuk puncak "jangan sodorkan Sub-task".
 */
export function tipeBoleDitawarkan(
  tipeInduk: string | null | undefined,
  semuaLabel: string[]
): string[] {
  const induk = kunciTipe(tipeInduk);
  if (!induk) return semuaLabel.filter((l) => !BUTUH_INDUK.has(kunciTipe(l)));
  const boleh = ANAK_BOLEH[induk];
  if (!boleh) return semuaLabel.filter((l) => l && kunciTipe(l) !== "epic");
  return semuaLabel.filter((l) => boleh.includes(kunciTipe(l)));
}

/** Tipe bawaan sebuah baris baru: yang PERTAMA dari daftar yang legal. */
export function tipeBawaan(
  tipeInduk: string | null | undefined,
  semuaLabel: string[]
): string | null {
  const boleh = tipeBoleDitawarkan(tipeInduk, semuaLabel);
  return boleh[0] ?? null;
}

/** Apakah sebuah label legal sebagai anak dari `tipeInduk`? */
export const tipeLegal = (
  label: string | null | undefined,
  tipeInduk: string | null | undefined,
  semuaLabel: string[]
): boolean => {
  if (!label) return false;
  return tipeBoleDitawarkan(tipeInduk, semuaLabel).some((l) => kunciTipe(l) === kunciTipe(label));
};
