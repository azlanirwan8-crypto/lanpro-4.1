import React from "react";

/**
 * #708 — paragraf yang diketik orang harus sampai ke layar sebagai paragraf.
 *
 * KEPUTUSAN YANG DIAMBIL DI SINI BUKAN "WYSIWYG". Pemilik proyek memilih arah A
 * (13 Okt): text area tetap text area, datanya tetap teks biasa di kolom `TEXT`.
 * Yang dibetulkan hanya jaraknya.
 *
 * MENGAPA `whitespace-pre-wrap` MASIH DIPAKAI DI DALAM. Ia menjaga baris tunggal
 * di dalam satu blok tetap terlihat — orang yang menekan Enter sekali untuk
 * memenggal kalimat panjang tidak boleh kehilangan pemenggalannya. Yang dipecah
 * di sini hanyalah BARIS KOSONG: ia menjadi batas blok, dan jaraknya digantikan
 * ritme yang sama (`space-y-2`) di mana-mana, bukan tinggi baris kosong yang
 * bergantung pada font.
 *
 * MENGAPA `\r\n` DINORMALKAN TERLEBIH DAHULU. Catatan rapat paling sering
 * ditempel dari dokumen Windows, dan `/\n{2,}/` tidak mengenali `\r\n\r\n`
 * sebagai batas paragraf — tanpa baris itu, seluruh tempelan menjadi satu
 * blok raksasa persis pada data yang paling butuh dirapikan.
 *
 * TIDAK ada HTML yang dirender di sini: teks masuk sebagai anak elemen, jadi
 * tidak ada jalur injeksi baru. Itulah sebabnya markdown/WYSIWYG — yang menuntut
 * penyuntikan HTML mentah atau penyanitasi — sengaja tidak dipilih.
 */
export const Paragraf: React.FC<{ teks?: string | null }> = ({ teks }) => {
  const isi = (teks ?? "").replace(/\r\n/g, "\n").trim();
  if (!isi) return null;

  const blok = isi.split(/\n{2,}/);
  if (blok.length === 1) return <span className="whitespace-pre-wrap break-words">{isi}</span>;

  return (
    <div className="space-y-2">
      {blok.map((b, i) => (
        <p key={i} className="whitespace-pre-wrap break-words">
          {b}
        </p>
      ))}
    </div>
  );
};
