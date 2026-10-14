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
 *
 * #724 — LEVEL DARI MASTER DATA MENJADI SUMBER KEBENARAN; TABEL KUNCI JADI
 * CUPLIKAN. Pemilik proyek membuat jenis "Sub Bug" dan memilih *Hierarchy
 * level: Subtask* di layar Master Data, tetapi jenis itu tidak pernah muncul di
 * baris tambah anak: `ANAK_BOLEH` hanya mengenali lima kunci tetap dan
 * `kunciTipe("Sub Bug")` = `subbug` tidak ada di daftar siapa pun — dibuang
 * DIAM-DIAM. Yang lebih buruk, teks `Hierarchy: Subtask` yang ditulis layar
 * Master Data tidak dibaca OLEH SIAPA PUN, jadi pilihan itu hiasan.
 *
 * Sekarang tingkat sebuah jenis dibaca dari sana (`tingkatTipe`), dengan dua
 * pagar yang dipisah sadar:
 *  - `tingkatDariDeskripsi` hanya mempercayai tiga NILAI yang dituliskan
 *    aplikasi ini sendiri. Kolom `description` juga dipakai sebagai catatan
 *    bebas — "Cacat pada fungsi yang sudah berjalan." adalah isinya yang nyata —
 *    dan catatan manusia BUKAN konfigurasi. Menebak level dari kalimat orang
 *    adalah persis kesalahan yang baru dicabut ini.
 *  - `tingkatDariKunci` adalah cuplikan untuk baris yang tidak menyatakan
 *    levelnya, termasuk seluruh baris lama proyek ini.
 *
 * Ledakan yang dikunci oleh pemisahan itu: jenis buatan pengguna yang tidak
 * dikenal `ANAK_BOLEH` tidak boleh bisa menghilang lagi — untuk mereka
 * aturannya "setingkat atau lebih dalam", bukan "harus ada di daftar".
 */

import {
  ANGKA_TINGKAT as ANGKA,
  kunciTipe,
  tingkatDariKunci,
  type Tingkat,
} from "../../lib/tingkatIsu";

/**
 * Lima kunci yang dikenali aturan lama. Yang TIDAK ada di sini adalah jenis
 * buatan pengguna — dan justru untuk mereka level dari Master Data dipakai.
 */
const KUNCI_BAWAAN = new Set(["epic", "story", "task", "bug", "subtask"]);

/** Tipe yang boleh hidup DI BAWAH sebuah tipe bawaan. Urutan = saran. */
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
 *
 * Argumen `tingkat` (#724) berisi level Master Data per label. TANPA argumen
 * itu fungsi ini menjawab persis seperti sebelum #724 — itu bukan kemalasan,
 * itu pagar supaya panggilan lama tidak tiba-tiba berubah jawaban tanpa
 * testnya.
 */
export function tipeBoleDitawarkan(
  tipeInduk: string | null | undefined,
  semuaLabel: string[],
  tingkat?: Map<string, Tingkat>,
  anakBawaan?: Map<string, string>
): string[] {
  const tingkatDari = (label: string): Tingkat | null =>
    tingkat?.get(kunciTipe(label)) ?? tingkatDariKunci(kunciTipe(label));

  const kunciInduk = kunciTipe(tipeInduk);
  const induk = tipeInduk ? tingkatDari(tipeInduk) : null;

  const hasil = semuaLabel.filter((l) => {
    if (!l) return false;
    const kunci = kunciTipe(l);

    if (KUNCI_BAWAAN.has(kunci)) {
      if (!kunciInduk) return !BUTUH_INDUK.has(kunci);
      const boleh = ANAK_BOLEH[kunciInduk];
      if (!boleh) return kunci !== "epic";
      return boleh.includes(kunci);
    }

    // Jenis buatan pengguna (#724) — yang tidak dikenal `ANAK_BOLEH` sama
    // sekali. Di puncak, yang berlevel Subtask tetap tidak boleh berdiri tanpa
    // induk; di bawah sesuatu, yang berlevel Epic tidak pernah jadi anak;
    // sisanya "setingkat atau lebih dalam". Induk yang levelnya tidak terbaca
    // dianggap Standard supaya daftar tidak pernah jadi kosong.
    const anak = tingkatDari(l);
    if (!kunciInduk) return anak !== "Subtask";
    if (anak === "Epic") return false;
    const acuan = induk ?? "Standard";
    return ANGKA[anak ?? "Standard"] >= ANGKA[acuan];
  });

  // #737 — jenis anak yang DIPILIH pemilik proyek di Master Data menjadi saran
  // PERTAMA (urutan = saran, dan `tipeBawaan` mengambil kepala daftar). Konfigurasi
  // yang menunjuk jenis tidak legal di sini DIABAIKAN, bukan dipaksakan: pagar
  // level di atas tetap kebenaran.
  const pilihan = kunciInduk ? anakBawaan?.get(kunciInduk) : undefined;
  if (pilihan) {
    const idx = hasil.findIndex((l) => kunciTipe(l) === pilihan);
    if (idx > 0) hasil.unshift(hasil.splice(idx, 1)[0]);
  }
  return hasil;
}

/**
 * #737 — peta induk→anak dari konfigurasi Master Data: kunci jenis induk ke
 * kunci jenis yang tersimpan di `defaultChildCode`-nya. Baris tanpa konfigurasi
 * atau menunjuk code yang tidak ada tidak masuk peta, jadi perilaku lama tetap
 * menjadi jaring pengaman.
 */
export function petaAnakBawaan(
  baris: { label: string; code?: string | null; defaultChildCode?: string | null }[]
): Map<string, string> {
  const kodeKeKunci = new Map<string, string>();
  for (const b of baris || []) if (b.code) kodeKeKunci.set(b.code, kunciTipe(b.label));
  const peta = new Map<string, string>();
  for (const b of baris || []) {
    if (!b.defaultChildCode) continue;
    const anak = kodeKeKunci.get(b.defaultChildCode);
    if (anak) peta.set(kunciTipe(b.label), anak);
  }
  return peta;
}

/** Tipe bawaan sebuah baris baru: yang PERTAMA dari daftar yang legal. */
export function tipeBawaan(
  tipeInduk: string | null | undefined,
  semuaLabel: string[],
  tingkat?: Map<string, Tingkat>,
  anakBawaan?: Map<string, string>
): string | null {
  const boleh = tipeBoleDitawarkan(tipeInduk, semuaLabel, tingkat, anakBawaan);
  return boleh[0] ?? null;
}

/** Apakah sebuah label legal sebagai anak dari `tipeInduk`? */
export const tipeLegal = (
  label: string | null | undefined,
  tipeInduk: string | null | undefined,
  semuaLabel: string[],
  tingkat?: Map<string, Tingkat>
): boolean => {
  if (!label) return false;
  return tipeBoleDitawarkan(tipeInduk, semuaLabel, tingkat).some(
    (l) => kunciTipe(l) === kunciTipe(label)
  );
};
