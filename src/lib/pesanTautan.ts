/**
 * #808a — memecah isi pesan menjadi segmen teks dan segmen tautan.
 *
 * MENGAPA ADA. Isi komentar utas diskusi dirender apa adanya
 * (`LaciUtas.tsx`: `<p className="… whitespace-pre-wrap break-words">`), jadi
 * satu alamat SharePoint sepanjang ±300 karakter — `?sourcedoc=%7B85397E08…`
 * `&file=Design%20PPT%2020CI%2020BNI…` — dipecah `break-words` di tengah token
 * dan tampil sebagai tiga baris sampah yang tidak bisa diklik (tangkapan layar
 * pemilik proyek 02 Nov 2026). Yang salah bukan lebarnya: teksnya tidak pernah
 * tahu bahwa di dalamnya ada alamat.
 *
 * SATU PERILAKU, DUA TEMPAT DUDUK. `LiveChatWidget.tsx:614-627` sudah lama
 * menautkan alamat di dalam pesan obrolan. Penjaga ini menulis aturannya di
 * `src/lib/` supaya pemindahan berikutnya punya satu tempat untuk pindah, bukan
 * dua salinan yang berhenti sama pada bug pertama yang hanya diperbaiki di satu
 * layar (#645).
 *
 * KONTRAK YANG DIJAGA: `pecahPesan(x).map(s => s.isi).join("") === x`. Pemecah
 * ini hanya memindahkan batas, TIDAK pernah mengubah atau membuang karakter.
 * Isinya tetap teks mentah seperti yang tersimpan di `commentText` — yang
 * berubah hanyalah cara membacanya. Itu sebabnya alamat penuh tetap ada di
 * `title` tautan dan tidak ada pemendekan di sisi data.
 *
 * BATAS YANG DIAMBIL SADAR, bukan kelalaian:
 *  - Hanya `http://` dan `https://` yang ditautkan. Host polos seperti
 *    "sharepoint.com/abc" TIDAK di-linkify: membedakan "www." di awal kalimat
 *    dari "www." di tengah kata butuh heuristik yang salah tebak pada nama
 *    berkas dan singkatan, dan `tautanAman` sudah memayungi nilai host-utuh di
 *    tempat lain. Yang hilang karena batas ini tinggal diketik ulang oleh
 *    penulisnya; yang rusak karena tebakannya salah muncul di setiap komentar.
 *  - Tanda baca penutup kalimat (`. , ; : ! ? ) ] "` dan kutip lengkung) dibuang
 *    dari ujung tautan. Konsekuensinya: URL yang memang berakhir dengan tanda
 *    baca itu — misalnya penutup kurung yang seimbang, `…(2026)` — kehilangan
 *    satu karakter di alamat yang dituju dan sisanya kembali jadi teks.
 *    Menyeimbangkan kurung butuh penghitung, dan alamat yang benar-benar
 *    bergantung pada kurung akhir sangat jarang dibanding kalimat yang berakhir
 *    dengan tautan.
 *  - Tidak ada pemindaian markdown, mention, atau emoji.
 */

import { labelTautan } from "./labelTautan";

export type SegmenPesan = { jenis: "teks"; isi: string } | { jenis: "tautan"; isi: string };

const POLA_TAUTAN = /https?:\/\/[^\s<>"'`]+/gi;

/** Ekor yang hampir selalu tanda baca kalimat, bukan bagian alamat. */
const EKOR_TANDA_BACA = /[.,;:!?)\]"'`]+$/;

/** Buang tanda baca penutup kalimat dari ujung, berulang (`sudah.` lalu `)`). */
const buangEkor = (mentah: string): string => {
  let isi = mentah;
  for (;;) {
    const berikutnya = isi.replace(EKOR_TANDA_BACA, "");
    if (berikutnya === isi) return isi;
    isi = berikutnya;
  }
};

/**
 * Segmen teks dan tautan, berurutan. String kosong memberi daftar kosong, dan
 * tanpa tautan hasilnya satu segmen teks — jadi pemanggil tidak perlu cabang
 * khusus untuk pesan biasa.
 */
export function pecahPesan(teks?: string | null): SegmenPesan[] {
  const asal = teks || "";
  if (!asal) return [];

  const hasil: SegmenPesan[] = [];
  const pola = new RegExp(POLA_TAUTAN.source, "gi");
  let batas = 0;
  let cocok: RegExpExecArray | null;

  while ((cocok = pola.exec(asal))) {
    const isi = buangEkor(cocok[0]);
    if (!isi) continue;
    if (cocok.index > batas) {
      hasil.push({ jenis: "teks", isi: asal.slice(batas, cocok.index) });
    }
    hasil.push({ jenis: "tautan", isi });
    // Sisa yang dibuang (tanda baca) sengaja TIDAK dikonsumsi di sini: `batas`
    // berhenti tepat setelah alamat, jadi ia keluar lagi sebagai segmen teks.
    batas = cocok.index + isi.length;
    pola.lastIndex = batas;
  }

  if (batas < asal.length) hasil.push({ jenis: "teks", isi: asal.slice(batas) });
  return hasil;
}

/** Ada tidaknya tautan — dipakai pemanggil yang tidak butuh segmennya. */
export function adaTautan(teks?: string | null): boolean {
  return pecahPesan(teks).some((s) => s.jenis === "tautan");
}

/**
 * Label yang dibaca manusia untuk satu alamat.
 *
 * `labelTautan` (#648) sudah menjawab "milik siapa" dan "berkas apa" untuk
 * tautan kartu flowchart, yang nama berkasnya memang duduk di ujung path.
 * Alamat SharePoint yang diketik orang ke komentar bentuknya lain:
 * `…/personal/<user>/s/<TOKEN>?e=…&file=Design%20PPT%2020CI%2020BNI…` — ujung
 * path-nya token acak 40 karakter dan NAMA ASLINYA ada di parameter query.
 * Tanpa membaca query, labelnya tetap tidak terbaca, jadi itu yang ditambahkan
 * di sini. Yang tidak diubah: perilaku #648 di flowchart, karena tautannya tidak
 * punya parameter itu dan dua bentuk alamat tidak boleh dipaksa satu aturan.
 *
 * Nama panjang dipotong dengan elipsis. Itu bukan `truncate` yang #647 keluhkan:
 * alamat penuh tetap terpasang di `title` dan satu klik membukanya — sama seperti
 * `NamaBerkas` (#771) memotong pangkal dan menjaga ekor.
 */
const NAMA_DI_QUERY = ["file", "name", "title", "doc", "desc"];
const BATAS_LABEL = 60;

export function labelPesan(url: string): string {
  const { host, berkas } = labelTautan(url);
  let dariQuery = "";
  try {
    const u = new URL(url);
    for (const kunci of NAMA_DI_QUERY) {
      const nilai = u.searchParams.get(kunci);
      if (nilai) {
        dariQuery = nilai;
        break;
      }
    }
  } catch {
    // Bukan URL yang bisa diuraikan: label jatuh ke host, bukan melempar.
  }
  const ekor = dariQuery || berkas;
  const dipotong = ekor.length > BATAS_LABEL ? `${ekor.slice(0, BATAS_LABEL).trimEnd()}…` : ekor;
  return [host, dipotong].filter(Boolean).join(" · ") || url;
}
