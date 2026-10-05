/**
 * Bentuk ulang tautan Google menjadi URL yang BOLEH dibingkai `<iframe>`.
 *
 * KENAPA. Panel "Pratinjau Dokumen Utama" (`WikiView.tsx`) memasang tautan
 * dokumen ke iframe. Editor Google (`/edit`, `/view`) menolak dibingkai, dan yang
 * dimunculkan Google ke dalam bingkai itu adalah halaman abu-abu "This content is
 * blocked. Contact the site owner to fix the issue." — terlihat seperti aplikasi
 * kita yang rusak, padahal yang salah hanya bentuk URL-nya. Yang boleh dibingkai
 * adalah bentuk *preview* / *embed* tiap aplikasi.
 *
 * CARA. ID berkas diekstrak dari URL lalu URL kanonik disusun ulang — bukan
 * `split("/edit")` seperti sebelumnya, yang hanya mengenali SATU bentuk dan
 * kehilangan sisanya: `/view`, `/mobile/edit`, awalan multi-akun `/u/1/`,
 * `?usp=sharing` pada tautan tanpa `/edit`, dan tautan Drive. Tautan yang SUDAH
 * dipublikasikan (`/d/e/<idPublikasi>/pubhtml`) dibiarkan apa adanya: segmen `e/`
 * itu ID publikasi, bukan ID berkas, jadi menyusun `/preview` darinya justru
 * merusak tautan yang hari ini sudah tampil.
 *
 * BATAS yang tidak bisa diselesaikan kode ini: iframe tidak ikut membawa sesi
 * login Google pengguna. Berkas yang dibagikan "Hanya orang tertentu" tetap
 * ditolak Google walau URL-nya sudah benar — itu pengaturan berbagi, dan satu-
 * satunya jalan keluar yang jujur adalah membukanya di tab baru.
 */

/** ID berkas Google: 20-44 karakter dasar64. Yang lebih pendek dicurigai bukan ID. */
const PANJANG_MIN_ID = 10;
const POLA_ID = /^[A-Za-z0-9_-]+$/;

export function urlSematanGoogle(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return trimmed;
  }
  if (u.protocol !== "https:") return trimmed;

  if (u.hostname === "drive.google.com") {
    const id = u.pathname.match(/\/file\/d\/([^/?#]+)/)?.[1] ?? u.searchParams.get("id");
    return id && id.length >= PANJANG_MIN_ID && POLA_ID.test(id)
      ? `https://drive.google.com/file/${id}/preview`
      : trimmed;
  }

  if (u.hostname !== "docs.google.com") return trimmed;

  // Google menaruh awalan akun di DUA tempat tergantung aplikasi dan cara
  // tautannya dibuat: `/document/u/1/d/<id>/edit` dan
  // `/spreadsheets/u/0/d/<id>/edit`. Keduanya harus dikenali; kalau tidak,
  // URL-nya lolos apa adanya ke iframe dan Google menampilkan halaman blocked.
  const cocok = u.pathname.match(
    /^\/(?:u\/\d+\/)?(document|spreadsheets|presentation|forms)\/(?:u\/\d+\/)?d\/(.+)$/
  );
  if (!cocok) return trimmed;
  const [, jenis, sisa] = cocok;
  if (sisa.startsWith("e/")) return trimmed; // sudah bentuk publikasi — jangan disentuh

  const id = sisa.split("/")[0];
  if (id.length < PANJANG_MIN_ID || !POLA_ID.test(id)) return trimmed;

  if (jenis === "spreadsheets") {
    // Lembar kerja yang dipilih pengguna ada di hash, bukan di path.
    const gid = u.hash.match(/gid=(\d+)/)?.[1];
    return `https://docs.google.com/spreadsheets/d/${id}/preview${gid ? `#gid=${gid}` : ""}`;
  }
  if (jenis === "presentation") {
    return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`;
  }
  if (jenis === "forms") {
    return `https://docs.google.com/forms/d/${id}/viewform?embedded=true`;
  }
  return `https://docs.google.com/document/d/${id}/preview`;
}

/**
 * #633 — host yang boleh diuji kelayakan sematannya.
 *
 * Satu sumber untuk dua sisi: peramban memakainya untuk memutuskan apakah
 * perlu bertanya, server memakainya sebagai pagar — tanpa pagar itu rute
 * pemeriksa berubah menjadi proxy umum.
 */
const HOST_SEMAT_BOLEH = new Set(["docs.google.com", "drive.google.com"]);

/** Hanya https, hanya dua host di atas, kecocokan persis (bukan awalan). */
export function urlSematBolehDiuji(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && HOST_SEMAT_BOLEH.has(u.hostname);
  } catch {
    return false;
  }
}

/**
 * #634 — berkas Word/Excel/PowerPoint dari SharePoint dan OneDrive.
 *
 * KENAPA. Panel ini selama ini hanya mengenal Google. Tautan SharePoint
 * (`https://tenant.sharepoint.com/:x:/s/RetailChannelService/...`) lolos APA
 * ADANYA ke `<iframe>`, dan Office membalas halaman "This content is blocked.
 * Contact the site owner to fix the issue." — gejala yang sama persis dengan
 * #600, di host yang sama sekali tidak disentuh #600, #632, maupun #633.
 *
 * Yang boleh dibingkai adalah penampil Office for the Web, bukan URL berbagi
 * aslinya: `view.officeapps.live.com/op/embed.aspx?src=<tautan ditakar>`.
 *
 * BATAS. Penampil itu mengambil berkasnya SECARA ANONIM. Kalau berkas hanya
 * dibuka untuk orang tertentu di tenant, Office juga menolaknya — sama seperti
 * Google di #633. Yang bisa diperbaiki kode adalah bentuk URL-nya; pengaturan
 * baginya tetap milik pemilik berkas.
 */
const POLA_HOST_KANTOR = /(?:^|\.)(?:sharepoint\.com|onedrive\.live\.com|1drv\.ms)$/i;
/** Tautan "Share": `/:x:/` Excel, `/:w:/` Word, `/:p:/` PowerPoint, `/:b:/` keduanya. */
const POLA_TAUTAN_BERBAGI = /^\/:[xwpb]:(?:\/r)?\//i;
/** Versi pendek tautan yang sama di 1drv.ms: `/x/s!...`. */
const POLA_TAUTAN_PENDEK = /^\/[xwpb](?:\/|$)/i;
const POLA_BERKAS_KANTOR = /\.(?:xlsx?|docx?|pptx?|ppsx?|odt|ods|odp)$/i;

export function urlSematanKantor(url?: string): string {
  if (!url) return "";
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.protocol !== "https:" || !POLA_HOST_KANTOR.test(u.hostname)) return url;
  const pendek = u.hostname.toLowerCase() === "1drv.ms";
  // Halaman situs (/sites/..., /sites/.../SitePages/...) bukan berkas: tidak ada
  // yang bisa dipandang Office, jadi jangan dikirim ke penampilnya.
  const berkas =
    POLA_TAUTAN_BERBAGI.test(u.pathname) ||
    POLA_BERKAS_KANTOR.test(u.pathname) ||
    (pendek && POLA_TAUTAN_PENDEK.test(u.pathname));
  if (!berkas) return url;
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

/**
 * Satu pintu masuk untuk panel: Google dulu, lalu SharePoint/OneDrive.
 * Komponen tidak boleh tahu-menahu soal host — kalau tidak, #634 terulang
 * sebagai host ketiga.
 */
export function urlSematanDokumen(url?: string): string {
  if (!url) return "";
  const google = urlSematanGoogle(url);
  return google === url ? urlSematanKantor(url) : google;
}
