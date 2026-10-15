/**
 * #685 — satu keputusan di depan gerbang impor: berkas ini sumber draw.io,
 * konversi native dengan batas apa, atau bukan drawio sama sekali.
 *
 * KENAPA DI SINI, BUKAN DI `FlowchartContainer.tsx`.
 *
 * Kontainer itu 5.170 baris (utang yang sudah tercatat, #7). Menaruh keputusan
 * sumber di dalamnya berarti tidak ada yang bisa mengujinya tanpa merender
 * seluruh editor — dan keputusan ini justru yang menentukan apakah berkas
 * pengguna bertahan utuh. Bentuknya dibuat TIDAK melempar galat: penolakan
 * dikembalikan sebagai data supaya UI bisa menampilkan pesan yang benar, bukan
 * papan kosong atau toast hijau palsu.
 */

import { parseDrawIoXML, parseUniversalDiagram, type ParsedDiagram } from "./importers";
import {
  TolakSumber,
  bacaSumberDrawio,
  batasKonversi,
  type BatasKonversi,
  type HasilSumber,
  type PenguraiDeflate,
  type SebabTolakSumber,
} from "./sumberDrawio";

export interface KeputusanImpor {
  /** Bentuk + garis yang akan masuk ke papan native. Kosong bila ditolak. */
  hasil: ParsedDiagram;
  /** Byte asli berkas, bila ini draw.io. Yang disimpan sebagai sumber kanonik. */
  sumber: HasilSumber | null;
  /** Apa yang TIDAK akan bertahan dalam konversi native. Ditampilkan sebelum menerapkan. */
  batas: BatasKonversi | null;
  /** Alasan berkas ditolak; `pesan` adalah bentuk yang bisa dibaca pengguna. */
  sebab?: SebabTolakSumber;
  pesan?: string;
}

const KOSONG: ParsedDiagram = { nodes: [], edges: [] };

const hitungBatas = (sumber: HasilSumber): BatasKonversi | null => {
  try {
    const doc = new DOMParser().parseFromString(sumber.teksSiapJeraf, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) return null;
    return batasKonversi({ halaman: sumber.halaman }, doc);
  } catch {
    // Laporan batas tidak boleh menjatuhkan impor yang sudah berhasil; kalau
    // gagal dihitung, UI akan menampilkan "batas belum bisa diperiksa".
    return null;
  }
};

/**
 * `teks` adalah isi berkas yang sudah dibaca FileReader. Fungsi ini asinkron
 * karena membuka kompresi draw.io butuh `DecompressionStream`.
 */
export const putuskanImporDiagram = async (
  teks: string,
  namaBerkas: string,
  pengurai?: PenguraiDeflate
): Promise<KeputusanImpor> => {
  let sumber: HasilSumber;
  try {
    sumber = await bacaSumberDrawio(teks, namaBerkas, pengurai);
  } catch (err) {
    if (err instanceof TolakSumber && err.sebab === "bukan-drawio") {
      // Miro / Mermaid / JSON LanPro: jalurnya tidak berubah, dan TIDAK ada
      // sumber kanonik yang boleh disimpan untuk mereka.
      try {
        return { hasil: parseUniversalDiagram(teks, namaBerkas), sumber: null, batas: null };
      } catch (err2) {
        return {
          hasil: KOSONG,
          sumber: null,
          batas: null,
          sebab: "xml-rusak",
          pesan: err2 instanceof Error ? err2.message : String(err2),
        };
      }
    }
    return {
      hasil: KOSONG,
      sumber: null,
      batas: null,
      sebab: err instanceof TolakSumber ? err.sebab : "xml-rusak",
      pesan: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const hasil = parseDrawIoXML(sumber.teksSiapJeraf);
    return { hasil, sumber, batas: hitungBatas(sumber) };
  } catch (err) {
    // Sumbernya sah tapi tidak satu pun sel bisa dijeraf. Sumber TETAP
    // dikembalikan — menyimpannya membuat berkas pengguna tidak hilang, dan
    // pengguna boleh memilih untuk tidak mengonversi.
    return {
      hasil: KOSONG,
      sumber,
      batas: hitungBatas(sumber),
      sebab: "xml-rusak",
      pesan: err instanceof Error ? err.message : String(err),
    };
  }
};
