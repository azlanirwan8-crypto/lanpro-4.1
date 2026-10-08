/**
 * Label manusia untuk sebuah tautan berkas (#648).
 *
 * MENGAPA ADA. Kartu "Document List" flowchart menampilkan `doc.link` apa
 * adanya. Alamat SharePoint adalah token mesin — `?d=wcd23c…&csf=1&web=1&e=YbCQMC`,
 * ±200 karakter tanpa satu spasi — jadi ia menjebol border kartu saat dipaksa
 * satu baris (#646 sebelum), atau memecah kartu jadi lima baris tak terbaca
 * saat diizinkan berganti baris (#646 sesudah). Dua-duanya salah.
 *
 * Yang dicari pengguna dari sebuah tautan hanya dua: **milik siapa** dan
 * **berkas apa**. Keduanya ada di sini, sudah dibuka dari percent-encoding.
 * Alamat mentahnya tidak hilang — terpasang di `title` baris dan bisa disalin
 * utuh dengan satu klik.
 */
export interface LabelTautan {
  /** Host tanpa `www.`, mis. `bankbniitbk-my.sharepoint.com`. Kosong bila bukan URL. */
  host: string;
  /** Segmen path terakhir, sudah didekode dan tanpa query. Kosong bila tidak ada. */
  berkas: string;
}

export function labelTautan(url?: string | null): LabelTautan {
  const kosong = { host: "", berkas: "" };
  const v = (url || "").trim();
  if (!v) return kosong;

  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return kosong;
  }
  // Hanya alamat web yang punya "milik siapa". Data URL lampiran perangkat
  // (`data:application/pdf;base64,…`) tidak punya host, dan path-nya justru
  // menghasilkan sampah seperti "pdf;base64,JVB" kalau diuraikan di sini —
  // berkas jenis itu ditampilkan lewat `doc.fileName`, bukan lewat label ini.
  if (u.protocol !== "https:" && u.protocol !== "http:") return kosong;

  const host = u.hostname.replace(/^www\./i, "");
  const ekor = u.pathname.split("/").filter(Boolean).pop() || "";
  let berkas = ekor;
  try {
    // Nama berkas SharePoint datang ter-percent-encode: "DAC%20wondr%20…"
    berkas = decodeURIComponent(ekor);
  } catch {
    // Percent-encoding rusak: tampilkan apa adanya, jangan buang namanya.
  }

  return { host, berkas };
}
