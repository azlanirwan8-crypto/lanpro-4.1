/**
 * Penahan tautan yang akan masuk ke `href` (#584).
 *
 * Kenapa perlu: lampiran flowchart disimpan sebagai JSON di kolom `canvasData`,
 * dan kolom itu ditulis oleh klien, bukan server — jadi perangkat mana pun yang
 * bisa menulis barisnya bisa menaruh
 * `link: "javascript:..."`, dan `canvasData` ditulis oleh klien, bukan server.
 * Validasi saat menyimpan TIDAK cukup: baris lama (dan baris yang dibuat
 * sebelum validasi itu ada) tetap terbaca oleh layar yang sama. Satu-satunya
 * tempat yang aman untuk memutuskan adalah tepat sebelum nilai dipakai.
 */

const SKEMA_HIDUP = /^(?:https?:|mailto:|tel:)/i;
const HOST_TANPA_AWALAN = /^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s]*)?$/i;

/**
 * Tautan yang boleh diklik; selain itu `null`.
 *
 * Yang lolos hanya yang jelas berupa alamat: awalan yang hidup, atau host polos
 * seperti "docs.google.com/abc" (baris lama menyimpan tautan tanpa `https://`)
 * yang diberi awalan. Teks bebas dan skema apa pun — termasuk `javascript:`
 * dan `data:` — tidak pernah masuk ke `href`.
 */
export function tautanAman(nilai?: string | null): string | null {
  const v = (nilai || "").trim();
  if (SKEMA_HIDUP.test(v)) return v;
  if (HOST_TANPA_AWALAN.test(v)) return `https://${v}`;
  return null;
}

/**
 * Data URL untuk tombol unduh berkas lama (base64). `text/html` dikecualikan
 * karena ia bisa dieksekusi saat berkas hasil unduhan dibuka. MIME kosong
 * dibiarkan: lampiran tanpa ekstensi dikenal disimpan begitu saja oleh
 * peramban, dan menolaknya membuat berkas lama tidak bisa diunduh.
 */
export function dataUnduhAman(nilai?: string | null): string | null {
  const v = (nilai || "").trim();
  if (!v.startsWith("data:")) return null;
  const tipe = /^data:([^;,]*)/i.exec(v)?.[1]?.toLowerCase() || "";
  if (tipe === "text/html" || tipe === "application/xhtml+xml") return null;
  return v;
}
