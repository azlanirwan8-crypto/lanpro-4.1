/**
 * Membedakan teks untuk pengguna dari potongan kode — item #149.
 *
 * VERSI PERTAMA SALAH DAN MENYEMBUNYIKAN TEMUAN. Filternya membuang setiap
 * teks yang memuat `? ( ) & | [ ]`, dengan asumsi tanda-tanda itu menandakan
 * kode. Padahal tanda baca yang sama lazim dipakai kalimat biasa:
 *
 *     "Belum punya akun?"        -> dibuang karena tanda tanya
 *     "Kriteria Penerimaan (AC)" -> dibuang karena kurung
 *     "Wiki & Dokumentasi"       -> dibuang karena ampersand
 *
 * Ketiganya teks nyata di layar. Pemilik proyek menemukan yang pertama.
 *
 * Versi ini menilai POLA PEMAKAIAN, bukan keberadaan karakternya: pemanggilan
 * fungsi, operator, akses properti, dan sintaks JSX.
 */
const POLA_KODE = [
  /\w\(/, // pemanggilan fungsi: foo( — TANPA spasi, agar "Penerimaan (AC)" lolos
  /=>/, // panah fungsi
  /&&|\|\|/, // operator logika
  /\?\./, // akses opsional
  /\?\s*['"]/, // awal ternary berteks
  /[;{}]/, // pemisah pernyataan / blok
  /\b(const|let|var|return|import|export|function|typeof|instanceof)\b/,
  /\$\{/, // interpolasi template
  /^\w+\.\w+/, // akses properti: obj.prop
  /^(Promise|Record|Partial|Array|Set|Map|React|JSX|HTMLElement)\b/,
  /className|https?:\/\//,
  /[=!]==|\s\?\s*$|\($|\s\?\s.*\s:\s/, // perbandingan, atau potongan yang berakhir di '?' / '('
  // kurung/kurawal tutup tanpa pembukanya: sisa ekspresi yang terpotong
  /^[^([{]*[)\]}]/,
  /^[A-Za-z]+\s*[<>=]{1,2}\s*/, // perbandingan
];

/** Akronim, kode status, nama produk, dan satuan — bukan kebocoran bahasa. */
const BUKAN_TEKS =
  /^(?:[\s\d.,:;%/+\-–—•·|()[\]{}#*?!"']*|To Do|In Progress|In Review|Done|Blocked|Backlog|Cancelled|ID|EN|OK|QA|API|UI|UX|AI|PDF|CSV|XML|JSON|SQL|SVG|PNG|JPG|MB|KB|GB|VPC|SIT|UAT|PTR|DEV|PROD|STG|BRD|FSD|TSD|PRD|WA|HP|LAN|PRO|MOD|FREE|Esc|null|LANPRO|LAN PRO|Miro|Neon|PostgreSQL|MySQL|Redis|Resend|WhatsApp|Google|Microsoft|Figma|Excel|Word|Vercel|GitHub|Jira|Gemini AI|FlowKirim|defaultdb)$/i;

function teksUntukPengguna(s) {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 3 || t.length > 220) return false;
  if (BUKAN_TEKS.test(t)) return false;
  if (!/[A-Za-zÀ-ÿ]{3,}/.test(t)) return false;
  for (const p of POLA_KODE) if (p.test(t)) return false;
  return true;
}

module.exports = { teksUntukPengguna };
