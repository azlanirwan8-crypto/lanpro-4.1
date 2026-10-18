import { differenceInCalendarDays, format, isSameDay, isSameYear } from "date-fns";
import { ensureDate } from "./utils";
import { localeTanggal } from "./localeTanggal";

/**
 * #791 — SATU stempel waktu untuk semua permukaan pesan.
 *
 * Pemilik proyek, 18 Okt, menunjuk utas diskusi: "kok tidak ada tanggal ny jika
 * itu lewat hari ... biasanya di medsos sekarang hanya ada jam saja". Yang
 * terjadi memang begitu: `LaciUtas.tsx`, `LiveChatWidget.tsx` dan
 * `QADetailDrawer.tsx` masing-masing memanggil
 * `toLocaleTimeString("id-ID", {hour, minute})` sehingga pesan sebulan lalu
 * tetap berbunyi "14.45" tanpa penanda hari apa pun, sementara sisa aplikasi
 * sudah bercabang jadi tiga konvensi lain ("dd MMM, HH:mm" di notifikasi,
 * "MMM d, HH:mm" di komentar tugas, "MMM d, yyyy HH:mm" di rincian isu).
 *
 * Aturan yang dipakai aplikasi pesan pada umumnya, dan yang dipakai di sini:
 * hari ini → jam; kemarin → kata; enam hari terakhir → nama hari; tahun ini →
 * "12 Okt"; selain itu → "12 Okt 2025".
 *
 * Locale TIDAK diimpor sendiri di sini: `localeTanggal()` (#722) sudah menjadi
 * satu-satunya sumber yang menyelaraskan tanggal dengan bahasa aktif, dan
 * `ensureDate()` mengenal `Date`, ISO, maupun `Timestamp` Firestore.
 */
export type BentukWaktu = "jam" | "kemarin" | "hari" | "tanggal" | "tanggalTahun";

/** Bentuknya dipisah supaya bisa diuji tanpa kamus dan tanpa `t`. */
export const bentukWaktu = (tanggal: Date, sekarang: Date): BentukWaktu => {
  if (isSameDay(tanggal, sekarang)) return "jam";
  const selisih = differenceInCalendarDays(sekarang, tanggal);
  if (selisih === 1) return "kemarin";
  if (selisih > 1 && selisih <= 6) return "hari";
  return isSameYear(tanggal, sekarang) ? "tanggal" : "tanggalTahun";
};

const tagHidung = (bahasa?: string | null) =>
  (bahasa || "").toLowerCase().startsWith("id") ? "id-ID" : "en-US";

export const waktuPesan = (
  nilai: unknown,
  {
    t,
    bahasa,
    sekarang = new Date(),
  }: { t: (kunci: string) => string; bahasa?: string | null; sekarang?: Date }
): string => {
  const tanggal = ensureDate(nilai);
  switch (bentukWaktu(tanggal, sekarang)) {
    case "jam":
      return tanggal.toLocaleTimeString(tagHidung(bahasa), { hour: "2-digit", minute: "2-digit" });
    case "kemarin":
      return t("waktuPesan.kemarin");
    case "hari":
      return format(tanggal, "EEEE", { locale: localeTanggal(bahasa) });
    case "tanggal":
      return format(tanggal, "d MMM", { locale: localeTanggal(bahasa) });
    default:
      return format(tanggal, "d MMM yyyy", { locale: localeTanggal(bahasa) });
  }
};
