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

export type ModePenjaga = "LAPOR" | "TOLAK";

/**
 * Naikkan ke `"TOLAK"` HANYA sesudah `member` dipetakan dan `designer` dibuang.
 * Sebelum itu, server tidak akan menyala sama sekali.
 */
export const MODE: ModePenjaga = "LAPOR";

export interface PendaftaranPenjaga {
  peran: string[];
}

const terdaftar: PendaftaranPenjaga[] = [];

/** Dipanggil `verifyProjectAccess` setiap kali sebuah penjaga dibuat. */
export function catatPenjaga(allowedRoles: string[]): void {
  terdaftar.push({ peran: Array.isArray(allowedRoles) ? [...allowedRoles] : [] });
}

/** Dipakai test; produksi tidak memanggilnya. */
export function kosongkanPendaftaran(): void {
  terdaftar.length = 0;
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

  return {
    hasil: takDikenal.size > 0 ? "bermasalah" : "bersih",
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
    `[RBAC] ${h.jumlahPenjaga} penjaga rute terdaftar · ` +
      `${h.bintangPolos} ber-["*"] polos · ${h.bintangKorslet} korslet ("*" + peran lain, #73)`
  );

  if (h.warisanTerpakai.length > 0) {
    cetak(
      `[RBAC] peran warisan masih terpakai: ${h.warisanTerpakai.join(", ")} — ` +
        `menunggu pemetaan, §19.8 tahap 3`
    );
  }

  if (h.hasil === "bermasalah") {
    const pesan =
      `[RBAC] peran DI LUAR katalog dipakai penjaga rute: ${h.takDikenal.join(", ")}. ` +
      `Tambahkan ke katalog Master Data, atau perbaiki penjaganya.`;
    if (MODE === "TOLAK") throw new Error(pesan);
    cetak(pesan);
  }

  return h;
}
