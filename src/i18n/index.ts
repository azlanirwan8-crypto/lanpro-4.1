/**
 * Konfigurasi i18next (item #134, bawaan ditukar 26 Sep 2026).
 *
 * Bahasa BAWAAN adalah Inggris — keputusan pemilik proyek 26 Sep 2026,
 * satu paket dengan bawaan tema terang. Indonesia tetap bahasa produk yang
 * lengkap dan tetap bisa dipilih lewat tombol bendera; yang bertukar hanya
 * keadaan awal bagi pengunjung yang belum pernah memilih.
 *
 * `fallbackLng` ikut "en" supaya kunci yang belum ada di kamus aktif tampil
 * dalam bahasa yang sedang dibaca, bukan sebagai nama kunci mentah. Paritas
 * kedua kamus dijaga `__tests__/paritas-kamus.test.ts`.
 *
 * Pilihan bahasa disimpan di localStorage lewat `safeLocalStorage`, sehingga
 * gagal-baca di mode privat tidak menjatuhkan aplikasi.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { safeLocalStorage, safeSessionStorage } from "../lib/safeStorage";
import { en } from "./locales/en";

export const BAHASA_TERSEDIA = ["id", "en"] as const;
export type Bahasa = (typeof BAHASA_TERSEDIA)[number];

const KUNCI_SIMPAN = "bahasa";
/** #746 — niat yang dibawa melewati muat ulang, dan bendera anti-lingkaran. */
const KUNCI_TUNDA = "bahasa-tunda";
const KUNCI_MUAT_ULANG = "bahasa-muat-ulang";

export const bacaBahasaTersimpan = (): Bahasa => {
  try {
    const t = safeLocalStorage.getItem(KUNCI_SIMPAN);
    return t === "en" || t === "id" ? t : "en";
  } catch {
    return "en";
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
 * Hanya bahasa bawaan — Inggris sejak 26 Sep 2026 — yang ikut potongan awal.
 * Kamus Indonesia berukuran 154 kB mentah dan tidak lagi dibaca setiap
 * pengunjung, jadi ia diimpor saat diperlukan: lewat `siapBahasa` di bawah
 * (bahasa pilihan sudah tersimpan), lewat `praMuatKamus` saat kursor mendekati
 * bendera, atau lewat pembungkus `changeLanguage` (pengguna sudah menekan).
 *
 * SENGAJA tidak diekspor: jalan masuk yang benar ke sebuah kamus adalah
 * menukar bahasa, dan pembungkus di bawah sudah menjaganya.
 */
async function muatKamus(bahasa: Bahasa): Promise<boolean> {
  if (i18n.hasResourceBundle(bahasa, "translation")) return true;
  try {
    const kamus =
      bahasa === "en" ? (await import("./locales/en")).en : (await import("./locales/id")).id;
    i18n.addResourceBundle(bahasa, "translation", kamus, true, true);
    return true;
  } catch (error) {
    // Kenapa baris ini ada: `fallbackLng` membuat kegagalan ini TANPA GEJALA.
    // Kamus tujuan tidak pernah tiba, bahasa tetap "id", tapi yang tampil
    // tetap kalimat Inggris — di layar itu terbaca sebagai "tombol benderanya
    // mati". Penyebab paling umum: peramban memegang HTML build lama yang
    // menunjuk berkas kamus build lama yang sudah tidak ada.
    console.warn(`[I18N] kamus ${bahasa} gagal dimuat — layar akan tetap Inggris:`, error);
    return false;
  }
}

/**
 * #559 — panggil saat kursor/fokus menyentuh bendera.
 *
 * Mengubah "klik lalu tunggu jaringan" jadi "klik dan langsung tukar". Kalau
 * berkas kamusnya memang tidak ada (build basi), kegagalannya sudah tercatat
 * di log SEBELUM pengguna menekan, bukan sesudah.
 */
export const praMuatKamus = (bahasa: Bahasa) => {
  void muatKamus(bahasa);
};

/**
 * #603 — menukar bahasa yang MEMASTIKAN hasilnya.
 *
 * `changeLanguage` tidak pernah memantul kalau kamusnya tidak datang:
 * `fallbackLng: "en"` membuat layar tetap berbahasa Inggris padahal namanya
 * sudah berpindah. Bagi pengguna itu tombol benderanya "mati" — gejala yang sama
 * persis dengan #559, dan satu-satunya jejaknya `console.warn` yang tidak dibaca
 * siapa pun. Yang dipulangkan di sini `false` kalau bahasa tujuan benar-benar
 * tidak terpakai, supaya pemanggil boleh berkata jujur ke layar.
 *
 * Anggaran waktunya bukan hiasan: potongan kamus bisa menggantung di jaringan
 * hotspot, dan menunggu selamanya lebih buruk daripada gagal dalam empat detik
 * lalu menawarkan muat ulang.
 */
export const tukarBahasa = async (bahasa: Bahasa, anggaranMs = 4000): Promise<boolean> => {
  let batas: ReturnType<typeof setTimeout> | undefined;
  const kamusTiba = await Promise.race([
    muatKamus(bahasa),
    new Promise<false>((resolve) => {
      batas = setTimeout(() => resolve(false), anggaranMs);
    }),
  ]);
  if (batas) clearTimeout(batas);
  if (!kamusTiba) return false;

  // #746 — `changeLanguage` bisa MENOLAK, dan kontrak fungsi ini adalah boolean:
  // pemanggilnya (tombol bendera, pemulihan saat boot) memutuskan apa yang harus
  // dikatakan ke layar berdasarkan `false`, bukan berdasarkan try/catch sendiri.
  // Tanpa ini penolakannya lolos sebagai unhandled rejection dan tombolnya mati
  // tanpa jejak — persis gejala yang dilaporkan pemilik proyek.
  try {
    await i18n.changeLanguage(bahasa);
  } catch (error) {
    console.warn(`[I18N] changeLanguage(${bahasa}) menolak:`, error);
    return false;
  }
  return i18n.resolvedLanguage === bahasa && i18n.hasResourceBundle(bahasa, "translation");
};

/**
 * #746 — satu-satunya jalan keluar yang benar saat potongan kamus tidak tiba.
 *
 * Penyebab kegagalan yang paling umum adalah peramban memegang HTML build lama
 * yang menunjuk hash berkas lama yang sudah tidak ada di server. Tidak ada
 * jumlah klik yang menyembuhkan itu; hanya HTML baru yang bisa. Karena itu
 * kegagalannya dijawab dengan MUAT ULANG, bukan dengan kalimat suruhan yang di
 * ponsel tidak bisa dijalankan (sebelum ini toast-nya menyuruh Ctrl+Shift+R).
 *
 * Sekali, bukan berulang: bendera di sessionStorage membuat percobaan kedua
 * jatuh ke toast. Benderanya sengaja di sessionStorage, bukan localStorage —
 * tab baru boleh mencoba lagi, dan tab yang sama tidak akan pernah terperangkap
 * lingkaran muat ulang.
 *
 * Niatnya juga disimpan di sessionStorage, BUKAN di kunci `bahasa`: preferensi
 * yang kamusnya tidak pernah tiba tidak boleh dipersistenkan (penjaga #603),
 * tapi sesudah muat ulang niat itu harus masih ada supaya penukarannya
 * diselesaikan sendiri tanpa pengguna menekan apa pun lagi.
 *
 * @returns `false` bila muat ulang sudah pernah dicoba di tab ini — pemanggil
 *   wajib mengucapkan sesuatu ke layar, bukan diam.
 */
export const mintaMuatUlangBahasa = (bahasa: Bahasa): boolean => {
  if (safeSessionStorage.getItem(KUNCI_MUAT_ULANG)) return false;
  safeSessionStorage.setItem(KUNCI_MUAT_ULANG, "1");
  safeSessionStorage.setItem(KUNCI_TUNDA, bahasa);
  window.location.reload();
  return true;
};

/**
 * #746 — menyelesaikan penukaran yang tertunda sesudah muat ulang.
 *
 * @returns `null` bila tidak ada yang tertunda (jalur biasa), `true` bila
 *   bahasa berhasil dipakai, `false` bila gagal lagi — pemanggil boleh memakai
 *   `false` sebagai tanda bahwa pengguna perlu diberi tahu.
 */
export const selesaikanBahasaTertunda = async (): Promise<boolean | null> => {
  const tertunda = safeSessionStorage.getItem(KUNCI_TUNDA);
  if (tertunda !== "en" && tertunda !== "id") return null;
  safeSessionStorage.removeItem(KUNCI_TUNDA);

  const berhasil = await tukarBahasa(tertunda);
  if (!berhasil) return false;

  // Baru sekarang preferensinya layak dipersistenkan: kamusnya terbukti ada.
  simpanBahasa(tertunda);
  safeSessionStorage.removeItem(KUNCI_MUAT_ULANG);
  return true;
};

const bahasaDikenal = new Set<string>(BAHASA_TERSEDIA);
const bahasaAwal = bacaBahasaTersimpan();

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: bahasaAwal,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/**
 * #515 — penukaran bahasa wajib memastikan kamus tujuannya sudah ada.
 *
 * `fallbackLng` bernilai "en", jadi `changeLanguage("id")` yang kamusnya belum
 * termuat TIDAK menampilkan nama kunci dan TIDAK menulis galat: layar Indonesia
 * sekadar berisi kalimat Inggris. Gejalanya persis "bahasanya masih campur"
 * yang dilaporkan pemilik proyek pada item #134.
 */
const gantiBahasaDasar = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (async (lng?: string, callback?: (err: unknown, t: unknown) => void) => {
  if (lng && bahasaDikenal.has(lng)) await muatKamus(lng as Bahasa);
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
      muatKamus(bahasaAwal).then(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);

export default i18n;
