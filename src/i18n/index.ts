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
 * #515 — satu pintu untuk memuat kamus sebuah bahasa.
 *
 * Hanya Indonesia yang ikut potongan awal. Inggris berukuran 148 kB mentah dan
 * separuh pengunjung tidak pernah membukanya, jadi kamusnya diimpor saat
 * diperlukan: lewat `siapBahasa` di bawah (bahasa pilihan sudah tersimpan) atau
 * lewat pembungkus `changeLanguage` (pengguna baru saja menekan bendera).
 *
 * SENGAJA tidak diekspor: jalan masuk yang benar ke sebuah kamus adalah
 * menukar bahasa, dan pembungkus di bawah sudah menjaganya.
 */
async function muatKamus(bahasa: Bahasa): Promise<void> {
  if (i18n.hasResourceBundle(bahasa, "translation")) return;
  const kamus =
    bahasa === "en" ? (await import("./locales/en")).en : (await import("./locales/id")).id;
  i18n.addResourceBundle(bahasa, "translation", kamus, true, true);
}

const bahasaDikenal = new Set<string>(BAHASA_TERSEDIA);
const bahasaAwal = bacaBahasaTersimpan();

i18n.use(initReactI18next).init({
  resources: { id: { translation: id } },
  lng: bahasaAwal,
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

/**
 * #515 — render baru boleh mulai setelah kamus bahasa pilihan ada di memori.
 *
 * Tanpa ini, pengguna Inggris yang membuka aplikasi langsung menerima kalimat
 * Indonesia sampai kamusnya tiba, dan `fallbackLng` membuat kejadian itu tidak
 * bersuara: tidak ada nama kunci mentah, tidak ada galat, tidak ada test yang
 * menangkapnya. Bagi pengguna Indonesia tidak ada yang ditunggu sama sekali:
 * kamusnya sudah ada sejak `init()`, jadi `siapBahasa` langsung selesai.
 *
 * Batas waktunya bukan hiasan: potongan kamus bisa menggantung di jaringan
 * hotspot. Menampilkan bahasa yang salah lebih murah daripada layar putih
 * tanpa sebab.
 */
export const siapBahasa: Promise<void> = i18n.hasResourceBundle(bahasaAwal, "translation")
  ? Promise.resolve()
  : Promise.race([
      muatKamus(bahasaAwal).catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);

export default i18n;
