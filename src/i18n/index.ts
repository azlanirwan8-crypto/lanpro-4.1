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

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: bacaBahasaTersimpan(),
  fallbackLng: "id",
  interpolation: { escapeValue: false },
});

export default i18n;
