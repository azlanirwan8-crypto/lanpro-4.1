import { enUS, id as idLocale } from "date-fns/locale";

/**
 * #722 — locale date-fns mengikuti bahasa aplikasi.
 *
 * Tanpa ini pemanggil `format`/`formatDistanceToNow` berbicara Inggris selalu:
 * layar rincian Isu berbahasa Indonesia menampilkan "Updated about 23 hours
 * ago" dan "Oct 12, 2026 09:58". Satu pembantu kecil supaya semua pemanggil
 * menyepakati sumber yang sama — bahasa aktif i18n — alih-alih masing-masing
 * mengimpor locale sendiri dan perlahan bercabang.
 */
export const localeTanggal = (bahasa?: string | null) =>
  (bahasa || "").toLowerCase().startsWith("id") ? idLocale : enUS;
