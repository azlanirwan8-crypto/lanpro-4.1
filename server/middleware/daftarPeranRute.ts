/**
 * PENJAGA SAAT BOOT — mendata peran yang dipakai penjaga rute. §19.8 tahap 2.
 *
 * TUJUAN AKHIRNYA: server MENOLAK MENYALA bila ada rute yang menjaga dirinya
 * dengan nama peran di luar katalog. Itu menutup #73 (`"*"` diselipkan ke dalam
 * daftar peran sehingga penjaganya korslet) dan #80 (rute pembuat proyek tanpa
 * penjaga admin).
 *
 * ⚠️ SEKARANG IA BELUM MENOLAK APA PUN — ia hanya MELAPOR.
 *
 * Itu disengaja, dan alasannya konkret. Diukur 16 Agu 2026, 7 penjaga rute
 * memakai `member` (6) dan `designer` (1), dan 15 memakai `head` — sementara
 * `member` dan `designer` bukan peran katalog, dan `head` adalah peran SISTEM
 * yang menurut §19.6 aturan 1 tidak boleh dipakai di dalam proyek. Menyalakan
 * penolakan hari ini membuat server LANGSUNG MATI, dan pemetaan `member` masih
 * MENUNGGU keputusan pemilik proyek.
 *
 * Jadi urutannya: lapor dulu, petakan, baru tolak. Menaikkannya jadi penolakan
 * cukup mengubah satu nilai — lihat `MODE`.
 *
 * KENAPA MENDAFTAR SAAT RUTE DIPASANG, BUKAN MEMINDAI BERKAS.
 *
 * §0.6 mencatat bahwa memeriksa rute lewat status 401 TIDAK VALID, dan §13.11
 * mencatat aturan "hasil pemindaian bukan temuan, wajib dibaca isinya" — lalu
 * #80 tetap luput karena nama rutenya terbaca seperti utilitas demo. Memindai
 * teks berkas mengulang kelemahan yang sama: ia melihat apa yang TERTULIS.
 *
 * Berkas ini mencatat apa yang BENAR-BENAR DIPANGGIL. `verifyProjectAccess`
 * dieksekusi ketika modul rute dimuat, jadi setiap penjaga yang benar-benar
 * terpasang akan mendaftarkan dirinya sendiri — tidak ada yang bisa bersembunyi
 * di balik nama berkas atau format penulisan yang tak terduga.
 */

import { normalkanPeran, peranTakDikenal } from "../../src/types/roles";
import { MATRIKS_PROYEK, type Aksi, type ModulProyek } from "../../src/lib/matriksAkses";

export type ModePenjaga = "LAPOR" | "TOLAK";

/**
 * Dinaikkan ke `"TOLAK"` pada 16 Agu 2026, sesudah tiga syaratnya terpenuhi:
 * `member` dimigrasikan ke `developer` (tahap 3), `designer` dibuang, dan
 * `head` dicabut dari penjaga proyek (#83) — ketiganya lenyap dengan
 * sendirinya begitu 54 rute pindah ke penjaga matriks.
 *
 * Sejak sekarang, server MENOLAK MENYALA bila ada rute yang menjaga dirinya
 * dengan nama peran di luar katalog. Itu yang menutup #73 dan #80 secara
 * permanen: kesalahan ketik pada nama peran berhenti jadi lubang senyap dan
 * berubah jadi kegagalan boot yang keras.
 */
export const MODE: ModePenjaga = "TOLAK";

export interface PendaftaranPenjaga {
  peran: string[];
}

const terdaftar: PendaftaranPenjaga[] = [];

/**
 * Pendaftaran penjaga MATRIKS. Item #90.
 *
 * Sesudah 54 rute pindah ke `jagaProyek`, `verifyProjectAccess` tidak lagi
 * punya pemakai — dan penjaga boot yang hanya mengawasinya berubah jadi
 * gerbang yang MENGUKUR HIMPUNAN KOSONG. Ia akan melapor bersih apa pun yang
 * terjadi pada 54 rute itu.
 *
 * Itu bentuk kegagalan §13.14: gerbang yang tidak bisa gagal lebih buruk
 * daripada gerbang yang tidak ada, sebab ia memberi rasa aman. Jadi penjaga
 * baru ikut mendaftarkan dirinya, dan yang divalidasi kini modul + aksinya.
 */
export interface PendaftaranMatriks {
  modul: string;
  aksi: string;
}

const terdaftarMatriks: PendaftaranMatriks[] = [];

/** Dipanggil `jagaProyek` setiap kali sebuah penjaga matriks dibuat. */
export function catatPenjagaMatriks(modul: string, aksi: string): void {
  terdaftarMatriks.push({ modul: String(modul), aksi: String(aksi) });
}

/** Dipanggil `verifyProjectAccess` setiap kali sebuah penjaga dibuat. */
export function catatPenjaga(allowedRoles: string[]): void {
  terdaftar.push({ peran: Array.isArray(allowedRoles) ? [...allowedRoles] : [] });
}

/** Dipakai test; produksi tidak memanggilnya. */
export function kosongkanPendaftaran(): void {
  terdaftar.length = 0;
  terdaftarMatriks.length = 0;
}

export interface HasilPemeriksaan {
  /** Diskriminan STRING, bukan boolean — §0.6: tsconfig tanpa `strict`. */
  hasil: "bersih" | "bermasalah";
  jumlahPenjaga: number;
  /** Peran di luar katalog DAN di luar daftar warisan. Ini yang kelak menolak boot. */
  takDikenal: string[];
  /** Peran warisan yang masih terpakai. Ditoleransi sementara, wajib menyusut. */
  warisanTerpakai: string[];
  /** Penjaga yang menyelipkan `"*"` bersama peran lain — #73. */
  bintangKorslet: number;
  /** Penjaga yang HANYA `["*"]` — "anggota mana pun". Badan #66 dan #72. */
  bintangPolos: number;
  /** Jumlah penjaga MATRIKS yang terdaftar. Inilah yang kini benar-benar diukur. */
  jumlahPenjagaMatriks: number;
  /** Modul yang dipakai penjaga tetapi TIDAK ADA di `MATRIKS_PROYEK`. */
  modulAsing: string[];
  /** Pasangan modul+aksi yang tidak memberi izin kepada SIAPA PUN. */
  kombinasiMati: string[];
}

/**
 * Memeriksa seluruh penjaga yang terdaftar.
 *
 * `"*"` diperlakukan khusus, bukan sebagai nama peran. Yang dilaporkan adalah
 * dua bentuk pemakaiannya, karena keduanya masalah yang BERBEDA:
 *
 *   `["*"]` polos          — sah secara sintaks, tetapi berarti "anggota mana
 *                            pun", sehingga `viewer` ikut boleh menghapus.
 *   `"*"` + peran lain     — penjaganya KORSLET: daftar perannya jadi tidak
 *                            berarti apa-apa, sebab `"*"` meloloskan semuanya
 *                            lebih dulu. Inilah #73.
 */
export function periksaPenjaga(): HasilPemeriksaan {
  const takDikenal = new Set<string>();
  const warisan = new Set<string>();
  let bintangKorslet = 0;
  let bintangPolos = 0;

  for (const p of terdaftar) {
    const punyaBintang = p.peran.some((r) => normalkanPeran(r) === "*");
    const selainBintang = p.peran.filter((r) => normalkanPeran(r) !== "*");

    if (punyaBintang && selainBintang.length > 0) bintangKorslet++;
    else if (punyaBintang) bintangPolos++;

    for (const r of selainBintang) {
      const n = normalkanPeran(r);
      // Penjaga rute proyek dinilai terhadap kosakata PROJECT — §19.6 aturan 1.
      if (peranTakDikenal(n, "PROJECT")) takDikenal.add(n);
      else if (n === "member" || n === "designer" || n === "head") warisan.add(n);
    }
  }

  // --- penjaga matriks (#90) ---------------------------------------------
  const modulAsing = new Set<string>();
  const kombinasiMati = new Set<string>();

  for (const p of terdaftarMatriks) {
    const baris = MATRIKS_PROYEK[p.modul as ModulProyek];
    if (!baris) {
      modulAsing.add(p.modul);
      continue;
    }
    // Modul yang ada tetapi tidak memberi aksi ini kepada peran mana pun.
    // Rutenya akan menolak SEMUA ORANG diam-diam — kegagalan yang tidak
    // memunculkan galat apa pun, hanya keluhan pengguna berbulan kemudian.
    const adaYangBoleh = Object.keys(baris).some((peran) => {
      const izin = baris[peran as keyof typeof baris];
      return Array.isArray(izin) && (izin as readonly Aksi[]).indexOf(p.aksi as Aksi) !== -1;
    });
    if (!adaYangBoleh) kombinasiMati.add(`${p.modul}:${p.aksi}`);
  }

  return {
    hasil:
      takDikenal.size > 0 || modulAsing.size > 0 || kombinasiMati.size > 0
        ? "bermasalah"
        : "bersih",
    jumlahPenjagaMatriks: terdaftarMatriks.length,
    modulAsing: [...modulAsing].sort(),
    kombinasiMati: [...kombinasiMati].sort(),
    jumlahPenjaga: terdaftar.length,
    takDikenal: [...takDikenal].sort(),
    warisanTerpakai: [...warisan].sort(),
    bintangKorslet,
    bintangPolos,
  };
}

/**
 * Dipanggil server SESUDAH seluruh rute terpasang.
 *
 * Dalam mode `TOLAK`, ia melempar — dan `server.ts` harus membiarkan lemparan
 * itu menghentikan boot. §0.6 mencatat migrasi yang gagal pernah hanya menjadi
 * `warning` sementara server menyala seolah sehat; penjaga ini tidak boleh
 * mengulanginya.
 */
export function laporkanPenjaga(cetak: (pesan: string) => void = console.warn): HasilPemeriksaan {
  const h = periksaPenjaga();

  cetak(
    `[RBAC] ${h.jumlahPenjagaMatriks} penjaga matriks · ${h.jumlahPenjaga} penjaga lama · ` +
      `${h.bintangPolos} ber-["*"] polos · ${h.bintangKorslet} korslet (#73)`
  );

  if (h.warisanTerpakai.length > 0) {
    cetak(
      `[RBAC] peran warisan masih terpakai: ${h.warisanTerpakai.join(", ")} — ` +
        `menunggu pemetaan, §19.8 tahap 3`
    );
  }

  if (h.hasil === "bermasalah") {
    const bagian: string[] = [];
    if (h.takDikenal.length > 0) {
      bagian.push(
        `peran DI LUAR katalog dipakai penjaga rute: ${h.takDikenal.join(", ")} — ` +
          `tambahkan ke katalog Master Data, atau perbaiki penjaganya`
      );
    }
    if (h.modulAsing.length > 0) {
      bagian.push(
        `modul TIDAK ADA di MATRIKS_PROYEK: ${h.modulAsing.join(", ")} — ` +
          `salah ketik nama modul menolak semua orang diam-diam`
      );
    }
    if (h.kombinasiMati.length > 0) {
      bagian.push(
        `modul+aksi yang tidak mengizinkan SIAPA PUN: ${h.kombinasiMati.join(", ")} — ` +
          `rutenya mustahil dipakai; perbaiki §19.5 atau aksinya`
      );
    }
    const pesan = `[RBAC] ${bagian.join(" | ")}`;
    if (MODE === "TOLAK") throw new Error(pesan);
    cetak(pesan);
  }

  return h;
}
