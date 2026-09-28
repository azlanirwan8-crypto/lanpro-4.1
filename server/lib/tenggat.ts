/**
 * #563 — perhitungan tenggat untuk modal login.
 *
 * Berdiri sendiri supaya aritmetika tanggalnya bisa diuji tanpa basis data dan
 * tanpa express: kolom tanggal di `Tasks` berbentuk VARCHAR(50) bebas isi, jadi
 * justru bagian inilah yang paling mudah salah — dan kesalahan di sini berarti
 * menagih user dengan angka yang salah di layar pertama ia masuk.
 */
import { statusSelesai } from "./statusSelesai";

/** "Segera" = hari ini, besok, dan lusa. 2 hari sesuai permintaan pemilik proyek. */
export const HARI_TENGGAT_DEKAT = 2;

export type TenggatSaya = {
  id: string;
  judul: string;
  status: string;
  proyek: string;
  tanggal: string;
  selisihHari: number;
  terlambat: boolean;
};

/** `endDate` duluan; `startDate` hanya kalau endDate memang tidak diisi. */
export const tanggalTenggat = (t: any): string =>
  String(t?.endDate || t?.startDate || "")
    .trim()
    .slice(0, 10);

const utc = (tahun: number, bulanNolBasis: number, hari: number) =>
  Date.UTC(tahun, bulanNolBasis, hari);

/**
 * Selisih hari kalender, bukan jam: tanggal tugas tidak membawa zona waktu, jadi
 * membandingkan timestamp mentah akan menggeser "besok" jadi "hari ini" di
 * belakang jam 00:00 lokal.
 */
function selisihHariKalender(yyyyMmDd: string, sekarang: Date): number | null {
  const [tahun, bulan, hari] = yyyyMmDd.split("-").map(Number);
  if (!tahun || !bulan || !hari || bulan > 12 || hari > 31) return null;
  const ms = utc(tahun, bulan - 1, hari);
  if (Number.isNaN(ms)) return null;
  const hariIni = utc(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  return Math.round((ms - hariIni) / 86400000);
}

export function hitungTenggat(baris: any[], sekarang: Date = new Date()): TenggatSaya[] {
  return (baris || [])
    .filter((t: any) => t && t.id && !statusSelesai(t.status))
    .map((t: any) => {
      const tanggal = tanggalTenggat(t);
      const selisih = tanggal ? selisihHariKalender(tanggal, sekarang) : null;
      if (selisih === null) return null;
      return {
        id: String(t.id),
        judul: String(t.title || ""),
        status: String(t.status || ""),
        proyek: String(t.projectName || ""),
        tanggal,
        selisihHari: selisih,
        terlambat: selisih < 0,
      };
    })
    .filter((t: any): t is TenggatSaya => t !== null && t.selisihHari <= HARI_TENGGAT_DEKAT)
    .sort((a, b) => a.selisihHari - b.selisihHari);
}
