/**
 * Konfigurasi i18next (item #134).
 *
 * Bahasa BAWAAN adalah Indonesia — itu bahasa produk ini, dan Inggris adalah
 * alternatif, bukan sebaliknya. `fallbackLng` juga "id" supaya kunci yang
 * belum diterjemahkan tampil sebagai teks Indonesia, bukan sebagai nama kunci
 * mentah di layar.
 *
 * Pilihan bahasa disimpan di localStorage lewat `safeLocalStorage`, sehingga
 * gagal-baca di mode privat tidak menjatuhkan aplikasi.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { safeLocalStorage } from "../lib/safeStorage";
import { id } from "./locales/id";
import { en } from "./locales/en";

export const BAHASA_TERSEDIA = ["id", "en"] as const;
export type Bahasa = (typeof BAHASA_TERSEDIA)[number];

const KUNCI_SIMPAN = "bahasa";

export const bacaBahasaTersimpan = (): Bahasa => {
  try {
    const t = safeLocalStorage.getItem(KUNCI_SIMPAN);
    return t === "en" || t === "id" ? t : "id";
  } catch {
    return "id";
  }
};

export const simpanBahasa = (b: Bahasa) => {
  try {
    safeLocalStorage.setItem(KUNCI_SIMPAN, b);
  } catch {
    /* mode privat: pilihan tidak persisten, tapi aplikasi tetap jalan */
  }
};

/**
 * #515 — satu pintu untuk memuat kamus sebuah bahasa, dipakai dari pembungkus
 * `changeLanguage` di bawah.
 *
 * Saat ini `id` dan `en` dua-duanya sudah ikut `init()`, jadi fungsi ini umumnya
 * langsung kembali. Jalur muatnya disiapkan lebih dulu supaya #515 tinggal
 * memindahkan kamus nonaktif ke luar potongan awal — dan supaya test membaca
 * bundel dari keadaan yang sama dengan produksi, bukan dari kebetulan.
 *
 * SENGAJA tidak diekspor: satu-satunya cara yang benar untuk sampai ke sebuah
 * kamus adalah menukar bahasa, dan pembungkus di bawah sudah menjaganya.
 */
async function muatKamus(bahasa: Bahasa): Promise<void> {
  if (i18n.hasResourceBundle(bahasa, "translation")) return;
  const kamus =
    bahasa === "en" ? (await import("./locales/en")).en : (await import("./locales/id")).id;
  i18n.addResourceBundle(bahasa, "translation", kamus, true, true);
}

const bahasaDikenal = new Set<string>(BAHASA_TERSEDIA);

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: bacaBahasaTersimpan(),
  fallbackLng: "id",
  interpolation: { escapeValue: false },
});

/**
 * #515 — penukaran bahasa wajib memastikan kamus tujuannya sudah ada.
 *
 * `fallbackLng` bernilai "id", jadi `changeLanguage("en")` yang kamusnya belum
 * termuat TIDAK menampilkan nama kunci dan TIDAK menulis galat: layar Inggris
 * sekadar berisi kalimat Indonesia. Gejalanya persis "bahasanya masih campur"
 * yang dilaporkan pemilik proyek pada item #134.
 */
const gantiBahasaDasar = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (async (lng?: string, callback?: (err: unknown, t: unknown) => void) => {
  if (lng && bahasaDikenal.has(lng)) {
    await muatKamus(lng as Bahasa).catch(() => undefined);
  }
  return gantiBahasaDasar(lng, callback);
}) as typeof i18n.changeLanguage;

export default i18n;
