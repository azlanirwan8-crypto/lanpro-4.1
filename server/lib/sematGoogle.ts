/**
 * #633 — cek apakah sebuah tautan Google BOLEH dibingkai `<iframe>`.
 *
 * MENGAPA INI PERLU TANGGAN SERVER. Panel pratinjau (#600, #632) memasang
 * bentuk `/preview` milik Google. Untuk berkas yang dibagi "Hanya orang
 * tertentu", Google menolak dan menampilkan halaman abu-abu "This content is
 * blocked" — di DALAM bingkai, jadi pengguna kita melihat aplikasi seperti
 * rusak. Berkas yang sama terbuka normal di tab baru, karena cookie sesi Google
 * pengguna adalah `SameSite=Lax` dan TIDAK ikut terkirim ke permintaan
 * lintas-situs di dalam iframe.
 *
 * Konsekuensinya: permintaan iframe kita PERILAKUNYA SAMA DENGAN permintaan
 * anonim. Maka permintaan anonim dari server adalah cermin yang akurat — kalau
 * server bisa membuka bentuk `/preview` tanpa kredensial apa pun, iframe juga
 * bisa; kalau server dilempar ke halaman login, iframe juga akan ditolak, dan
 * panelnya tidak perlu memasang bingkai yang pasti gagal.
 *
 * Dari peramban ini tidak bisa diukur: `fetch(..., {mode:"no-cors"})`
 * menghasilkan respons opaque (status tidak terbaca) untuk DUA-duanya, dan
 * `onLoad` iframe tetap terpicu untuk halaman penolakan lintas-asal.
 *
 * BATAS KEAMANAN. Ini pada dasarnya proxy satu arah, jadi yang boleh diuji
 * HANYA dua host Google, hanya https, tanpa kredensial yang diteruskan, dan
 * redirect TIDAK diikuti (kalau diikuti, tautan Google bisa melompat ke host
 * mana pun dan server kita yang mengetuknya).
 */

/** Host yang boleh diuji. Kecocokan persis — bukan pencocokan awalan. */
import { urlSematBolehDiuji } from "../../src/features/wiki/embedUrl";

export type SebabSemat = "publik" | "butuh-akses" | "bukan-google" | "gagal";

export interface HasilSemat {
  bisa: boolean;
  sebab: SebabSemat;
}

/** Batas waktu uji. Di atas ini panelnya dianggap "belum tahu", bukan "tidak bisa". */
const BATAS_WAKTU_SEMAT_MS = 2500;

/**
 * Murni: mengubah status/arah respons menjadi keputusan. Dipisah supaya bisa
 * diuji tanpa jaringan.
 */
export function klasifikasiSemat(status: number, lokasi?: string | null): HasilSemat {
  // Google melempar berkas tertutup ke accounts.google.com. Status 0 = respons
  // opaque (peramban); 3xx = arah yang tidak kita ikuti.
  if (status === 0 || (status >= 300 && status < 400)) {
    if (lokasi && /accounts\.google\.com/i.test(lokasi))
      return { bisa: false, sebab: "butuh-akses" };
    // Lompatan ke host lain tidak kita ikuti dan tidak kita percaya.
    return { bisa: false, sebab: "butuh-akses" };
  }
  if (status === 401 || status === 403) return { bisa: false, sebab: "butuh-akses" };
  if (status >= 200 && status < 300) return { bisa: true, sebab: "publik" };
  return { bisa: false, sebab: "gagal" };
}

export async function cekSematGoogle(
  url: string,
  opsi: { fetchImpl?: typeof fetch; batasMs?: number } = {}
): Promise<HasilSemat> {
  if (!urlSematBolehDiuji(url)) return { bisa: false, sebab: "bukan-google" };

  const ambil = opsi.fetchImpl ?? fetch;
  const batasMs = opsi.batasMs ?? BATAS_WAKTU_SEMAT_MS;
  const rembat = new AbortController();
  const jam = setTimeout(() => rembat.abort(), batasMs);

  try {
    const respons = await ambil(url, {
      method: "GET",
      redirect: "manual",
      credentials: "omit",
      signal: rembat.signal,
      headers: { "User-Agent": "LanPro-PreviewCheck/1" },
    });

    // `redirect: "manual"` di undici memulangkan 3xx + header location; di
    // lingkungan lain ia memulangkan status 0. Dua-duanya ditangani di atas.
    const lokasi = respons.headers?.get?.("location") ?? null;
    const hasil = klasifikasiSemat(respons.status, lokasi);
    // Isi halaman tidak dibutuhkan dan bisa ratusan kilobita.
    void respons.body?.cancel?.().catch?.(() => {});
    return hasil;
  } catch {
    // Jaringan mati, DNS gagal, atau waktu habis. Bukan vonis "tertutup":
    // panel tidak boleh menghapus bingkai hanya karena ujiannya tidak selesai.
    return { bisa: true, sebab: "gagal" };
  } finally {
    clearTimeout(jam);
  }
}
