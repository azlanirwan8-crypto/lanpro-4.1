import React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Image as IkonGambar,
  Link2,
  MessageSquare,
  Trash2,
} from "lucide-react";
import type { DiscussionPoint, MasterData } from "../../../types";
import { cn } from "../../../lib/utils";
import { ensureDate } from "../../../lib/utils";
import { localeTanggal } from "../../../lib/localeTanggal";
import { gayaLabel } from "../../../lib/warnaLabel";
import { getUserAvatarHex } from "../../../components/ui/UserAvatar";
import { SEL } from "./BagianPapan";
import { Paragraf } from "./Paragraf";

/**
 * #703/#704 — satu baris data tabel titik diskusi, dikeluarkan dari
 * `DiscussionPointsTable.tsx` (§4: induknya 1.255 baris) bersamaan dengan dua
 * kolom barunya.
 *
 * MENGAPA prop-nya bernama `p`, bukan `point` yang lebih sopan: test
 * `catatanLengkap-645.test.ts` MEMBACA SUMBER dan mengunci ekspresi keterangan
 * serta nama PIC baris ini — ia mencari kelas pemotong, bukan memanggil
 * komponennya. Nama yang berubah akan membuat test itu melempar "tidak
 * ditemukan", dan test yang selalu melempar adalah test yang pada akhirnya
 * dimatikan orang. Jadi ekspresinya dipertahankan apa adanya.
 *
 * (Catatan yang mahal: komentar ini sendiri TIDAK boleh menulis ulang ekspresi
 * itu secara harfiah. `indexOf` test membaca dari awal berkas, jadi kutipan di
 * dalam komentar menemukannya lebih dulu daripada kodenya — tiga gerbang di sesi
 * ini merah karena sebab yang sama persis.)
 *
 * Aturan #645/#647 tetap berlaku di seluruh berkas ini: TIDAK ADA `truncate`,
 * `line-clamp`, atau `whitespace-nowrap` pada nilai data. Kolom yang isinya
 * panjang melebar dan turun ke bawah; kepala tabel boleh satu baris.
 */
interface BarisDiskusiProps {
  p: DiscussionPoint;
  nomor: string;
  /** Nama satu penerima, sudah di-resolve dari anggota proyek. */
  assigneeName: string;
  /** Daftar penerima jamak (#703, B2 = b). #765: id-nya ikut dipakai untuk warna. */
  namaPenerima: { id: string; nama: string }[];
  masterData: MasterData[];
  /** #765 — id isu → hex prioritasnya (`lib/warnaTag.ts`). */
  warnaTag: Record<string, string>;
  jumlahKomentar: number;
  bolehSunting: boolean;
  bolehHapus: boolean;
  /**
   * #765 — boleh mengubah status. Dulu TIDAK ADA gerbangnya di baris desktop:
   * pil status dirender untuk setiap pemanggil sementara `handleToggleStatus`
   * tidak memeriksa izin, jadi pembaca-saja bisa mengkliknya, melihat statusnya
   * berubah, lalu melihatnya berubah kembali ketika papan dimuat ulang setelah
   * server menjawab 403. Kartu mobile justru sudah digerbangi (oleh `canAdd`,
   * izin yang salah untuk alasan yang benar). Sekarang satu aturan untuk kedua
   * jalur: status boleh diubah oleh orang yang boleh menyunting barisnya.
   */
  bolehUbahStatus: boolean;
  onOpenThread: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const kosong = (teks: string) => (
  <span className="text-content-subtle italic text-[11px]">{teks}</span>
);

/**
 * #708 — tiga sel teks di bawah diberi PLAFON TINGGI (`max-h` + gulir), bukan
 * plafon isi. Keputusan #645 melarang `line-clamp`/`truncate` pada catatan rapat
 * dan larangan itu tetap berlaku: seluruh teks masih ada dan masih bisa dibaca,
 * hanya barisnya yang tidak lagi memanjang tanpa batas. Bentuknya persis yang
 * ditunjuk gerbang `audit:label` sebagai pengganti potongan teks — "satu baris +
 * wadahnya yang menggulir" (#565/#566). Kelasnya ditulis HARFIAH di setiap sel,
 * bukan lewat konstanta: `catatanLengkap-645.test.ts` membaca 400 karakter sebelum
 * ekspresi datanya, dan sebuah nama konstanta membuat jaminan itu terbaca hilang
 * padahal tidak.
 *
 * #765 — angkanya turun dari 32 (128 px) ke 16 (64 px) atas laporan pemilik
 * proyek: dengan plafon 128 px satu baris tabel tingginya ±118 px, jadi hanya TIGA
 * baris yang muat di layar sebelum pengguna perlu menggulir. Di 64 px barisnya
 * ±86 px dan EMPAT baris terlihat, yang diminta. Teks tidak dipotong — hanya
 * jendela gulirnya yang lebih pendek, dan `tataletakPapan-707.test.ts` ikut
 * dipindah ke angka baru supaya penjaga ini tidak menyimpan angka lama.
 */

export const BarisDiskusi: React.FC<BarisDiskusiProps> = ({
  p,
  nomor,
  assigneeName,
  namaPenerima,
  masterData,
  warnaTag,
  jumlahKomentar,
  bolehSunting,
  bolehHapus,
  bolehUbahStatus,
  onOpenThread,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { t, i18n } = useTranslation();
  const isCompleted = p.status === "completed";
  const tag = Array.isArray(p.tags) ? p.tags : [];
  const tautan = Array.isArray(p.links) ? p.links : [];
  const berkas = Array.isArray(p.files) ? p.files : [];
  const gambar = berkas.filter((b) => (b.mimetype || "").startsWith("image/"));
  const bukanGambar = berkas.filter((b) => !(b.mimetype || "").startsWith("image/"));

  /* #794 — sel No ikut memikul tanggal dibuat barisnya, lewat `title`.
     `createdAt` sudah ada di basis data (`pg-migrate.ts:547`), sudah ikut
     kembali ke klien lewat `SELECT *` di repository, dan sudah menjadi kunci
     urutan di balik kepala "No" — yang belum ada hanyalah tempat membacanya.
     Kolom kedua atas nilai yang sama sengaja TIDAK dibuat: kepalanya sudah
     menawarkan urutan itu, jadi kolom baru hanya menduplikasi satu kontrol di
     layar yang sama.

     Dua nilai dihitung di sini, bukan di dalam JSX, supaya tag `<td>` tetap
     satu baris: penjaga `kepalaSelSejajar-715.test.ts` menghitung sel lewat
     pola yang menuntut spasi sesudah `<td`, dan tag yang terpecah ke baris
     kedua karena panjang tidak lagi terlihat olehnya — persis jebakan yang
     sudah dicatat di kepala `BagianPapan.tsx`.

     `ensureDate()` jatuh ke `new Date()` untuk nilai kosong, jadi tooltipnya
     hanya ada kalau tanggalnya memang ada: baris tanpa `createdAt` tidak boleh
     terlihat dibuat hari ini. */
  const kelasNo = cn(SEL, "py-2.5 text-center text-content-subtle font-normal align-top");
  const judulDibuat = p.createdAt
    ? t("discussion.dibuatPada", {
        date: format(ensureDate(p.createdAt), "d MMM yyyy HH:mm", {
          locale: localeTanggal(i18n.language),
        }),
      })
    : undefined;

  return (
    /* #715 — baris papan ikut `tableRow` kit rumah (`styles.ts` Daftar Isu):
       latar gulir `surface-strong`, bukan `surface-sunken`. Yang terakhir adalah
       warna KEPALA tabel, jadi selama hover memakainya baris yang disorot justru
       menyatu dengan kepala saat digulir — dan `opacity-75` pada baris selesai
       dibuang: pil "SELESAI" sudah menyatakan statusnya dengan kata, sementara
       opasitas 75 % menurunkan kontras catatan panjang yang justru paling banyak
       ditulis baris selesai (#645 melarang memotong teks, dan ini saudaranya). */
    <tr className="group hover:bg-surface-strong/60 transition-all duration-150 cursor-default">
      {/* #792 — kolom PERTAMA: keadaan baris ini, bukan perintah atasnya.
          Pil status dan badge komentar selama ini duduk di sel TERAKHIR papan
          1.626 px, jadi yang paling sering dibaca justru baru terlihat setelah
          menggulir horizontal. Kartu mobile sudah menaruh keduanya di atas
          sejak lama; desktop menyusul. */}
      <td className={cn(SEL, "py-2.5 align-top")}>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onToggleStatus}
            disabled={!bolehUbahStatus}
            className="cursor-pointer disabled:cursor-default transition-all active:scale-95 disabled:active:scale-100 inline-block"
            title={t("discussion.toggleStatus")}
          >
            {isCompleted ? (
              /* #715 — pil status pindah dari palet Tailwind ke TOKEN rumah,
                 sama seperti yang dipakai `CoreUI.tsx:290` untuk varian
                 `success` dan `styles.ts` Daftar Isu untuk `filterPillAmber`.
                 Kelas lama datang dari palet mentah dan tidak punya padanan mode
                 gelap, jadi teksnya ikut gelap di atas kartu gelap;
                 `--color-*-text` sudah diturunkan untuk kedua mode (§22). */
              <span className="flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] leading-none font-normal bg-success/10 text-success-text border border-success/30 shadow-2xs hover:bg-success/15">
                <CheckCircle2 className="w-3 h-3 text-success-text" />
                {t("discussion.statusDone")}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] leading-none font-normal bg-warning/10 text-warning-text border border-warning/30 shadow-2xs hover:bg-warning/15">
                <Clock className="w-3 h-3 text-warning-text" />
                {t("discussion.statusPending")}
              </span>
            )}
          </button>

          <button
            onClick={onOpenThread}
            className={cn(
              "inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-normal transition-all cursor-pointer border shadow-2xs active:scale-95",
              jumlahKomentar > 0
                ? "bg-primary/10 hover:bg-primary/15 text-primary border-primary/20"
                : "bg-surface-sunken hover:bg-surface-muted text-content-subtle border-border-subtle/60"
            )}
            title={t("discussion.openThread")}
          >
            <MessageSquare
              className={cn(
                "w-3.5 h-3.5",
                jumlahKomentar > 0 ? "text-primary fill-primary/20" : "text-content-subtle"
              )}
            />
            <span>{jumlahKomentar}</span>
          </button>
        </div>
      </td>

      {/* No. */}
      <td className={kelasNo} title={judulDibuat}>
        {nomor}
      </td>

      {/* Concern — follow-up tidak lagi menumpang di sel ini; ia kolom sendiri (#703 butir 3). */}
      <td className={cn(SEL, "py-2.5 align-top")}>
        <div className="font-normal text-content-strong leading-snug whitespace-pre-wrap break-words text-justify max-h-16 overflow-y-auto">
          <Paragraf teks={p.concern} />
        </div>
      </td>

      {/* Notes / Keterangan — #645: TIDAK boleh dipotong. */}
      <td className={cn(SEL, "py-2.5 align-top text-content-body font-normal")}>
        <div className="whitespace-pre-wrap break-words text-justify max-h-16 overflow-y-auto">
          <Paragraf teks={p.keterangan || p.comment || "-"} />
        </div>
      </td>

      {/* Context / Tags — #703 (B1 = a): isu nyata dari Daftar Isu, plus label
          `fitur` lama yang datanya tetap ada di basis data. */}
      <td className={cn(SEL, "py-2.5 align-top")}>
        <div className="flex flex-wrap gap-1 items-center">
          {tag.map((s) => (
            <span
              key={s.id}
              /* #765 — chip isu ikut warna PRIORITAS isu tertaut: `label-chip`
                 menurunkan latar, garis, dan teks dari satu hex (`--lbr`), sama
                 seperti chip di Daftar Isu. Tanpa prioritas, warna merek. */
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal border break-words",
                warnaTag[s.id] ? "label-chip" : "bg-primary/10 text-primary border-primary/20"
              )}
              style={warnaTag[s.id] ? gayaLabel(warnaTag[s.id]) : undefined}
            >
              {s.label}
            </span>
          ))}
          {p.fitur ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal bg-surface-sunken text-content-body border border-border-subtle break-words">
              {(() => {
                const meta = masterData.find(
                  (m) =>
                    m.type === "fitur" &&
                    (m.label?.toLowerCase() === p.fitur?.toLowerCase() || m.id === p.fitur)
                );
                return meta?.label || p.fitur;
              })()}
            </span>
          ) : null}
          {tag.length === 0 && !p.fitur && kosong("-")}
        </div>
      </td>

      {/* Follow-up — #703 butir 3: field-nya sudah ada dan sudah tersimpan
          (`"tindakanLanjut" TEXT`), hanya kolomnya yang belum pernah tampil. */}
      <td className={cn(SEL, "py-2.5 align-top text-content-body font-normal")}>
        {p.tindakanLanjut || p.next_action ? (
          <div className="whitespace-pre-wrap break-words text-justify max-h-16 overflow-y-auto">
            <Paragraf teks={p.tindakanLanjut || p.next_action} />
          </div>
        ) : (
          kosong("-")
        )}
      </td>

      {/* PIC — #703 (B2 = b): boleh lebih dari satu orang. #714 pernah
          menggabungkannya dengan Target Date; pemilik proyek menolaknya pada
          13 Okt ("datetime kenapa di gabung dengan pic, kolom pisah saja") dan
          ia kembali berdiri sendiri. Yang menahan tinggi baris bukan tanggalnya,
          melainkan lebar kolom PIC — itu yang naik dari 150 ke 200 px. */}
      <td className={cn(SEL, "py-2.5 align-top text-content-body font-normal")}>
        <div className="flex flex-wrap items-center gap-1">
          {namaPenerima.length > 0 ? (
            namaPenerima.map(({ id, nama }) => {
              /* #769 — chip PIC memakai pola chip yang SAMA dengan chip isu di
                 sebelahnya: `.label-chip` menurunkan latar 13 % dan garis 34 %
                 dari satu heksa, sementara TEKS-nya netral (diambil dari
                 `--color-content`, bukan dari heksa) sehingga tidak bisa gagal
                 kontras di kartu gelap. Heksanya tetap rona orang yang sama
                 dengan avatarnya (`getUserAvatarHex` sejajar indeks dengan
                 `getUserAvatarColors`), hanya nadanya yang turun dari blok pekat
                 ke warna susu. Versi pertama item ini menyalin `bg-*-700` + teks
                 putih dan ditolak pemilik proyek: "warna pic nya kasar". */
              return (
                <span
                  key={id}
                  className="label-chip px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal border break-words"
                  style={gayaLabel(getUserAvatarHex(id))}
                >
                  {nama}
                </span>
              );
            })
          ) : (
            /* #645 — nama PIC dulu dipotong pada 120 px, jadi "Gloria Handoyo"
               tampil sebagai "Gloria Hand…". Ekspresi `{assigneeName}` ini juga
               yang dibaca catatanLengkap-645.test.ts. */
            <span className="break-words">{assigneeName}</span>
          )}
        </div>
      </td>

      {/* Target Date — kolom sendiri, dan tetap satu baris tanggal yang bisa
          dibaca cepat. */}
      <td className={cn(SEL, "py-2.5 align-top text-content-muted font-normal")}>
        {p.targetDate ? (
          <div className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-content-subtle shrink-0" />
            <span className="break-words">{p.targetDate}</span>
          </div>
        ) : (
          kosong("-")
        )}
      </td>

      {/* #793 — TANGGAL SELESAI. Nilainya ditulis `useSelesaiCatatan` setiap
          kali status naik ke completed, dan dikosongkan lagi ketika turun.
          Baris yang sudah selesai SEBELUM item ini ada tetap berbintang "-":
          tidak ada satu pun sumber yang jujur tentang kapan ia diselesaikan,
          dan menambalnya berarti mengarang data rapat orang lain. */}
      <td className={cn(SEL, "py-2.5 align-top text-content-muted font-normal")}>
        {p.tanggalUpdateStatus ? (
          <div className="flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-content-subtle shrink-0" />
            <span className="break-words">{p.tanggalUpdateStatus}</span>
          </div>
        ) : (
          kosong("-")
        )}
      </td>

      {/* #704 butir 5 dan 6, sekarang satu sel "Lampiran" (#714). Isinya tetap
          lengkap: tautan dan berkas bukan-gambar sebagai chip, gambar sebagai
          miniatur. Yang berhenti adalah dua kolom terpisah yang keduanya hampir
          selalu berisi "-". */}
      <td className={cn(SEL, "py-2.5 align-top")}>
        {tautan.length === 0 && berkas.length === 0 ? (
          kosong("-")
        ) : (
          <div className="flex flex-wrap items-start gap-1.5 max-h-16 overflow-y-auto">
            {tautan.map((l) => (
              <a
                key={l.id}
                // `rel="noopener noreferrer"` wajib: tautan ini nilainya dari
                // pengguna lain di proyek yang sama.
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                title={l.url}
                className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal bg-primary/10 text-primary border border-primary/20 break-all"
              >
                <Link2 className="w-3 h-3 shrink-0" />
                <span className="break-words">{l.label || l.url}</span>
              </a>
            ))}
            {bukanGambar.map((b) => (
              <a
                key={b.id}
                href={b.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                title={b.name || b.originalName || ""}
                className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal bg-surface-sunken text-content-body border border-border-subtle break-all"
              >
                <IkonGambar className="w-3 h-3 shrink-0 text-content-subtle" />
                <span className="break-words">{b.name || b.originalName || b.fileRef}</span>
              </a>
            ))}
            {gambar.map((b) => (
              <a
                key={b.id}
                href={b.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                title={b.name || b.originalName || ""}
                className="block w-10 h-10 shrink-0 rounded-md border border-border-subtle overflow-hidden bg-surface-sunken"
              >
                <img
                  src={b.url || ""}
                  alt={b.name || b.originalName || ""}
                  // #711 — miniatur hanya boleh diunduh saat ia mendekati
                  // layar. Tanpa ini, baris yang punya banyak gambar menarik
                  // seluruh berkas bersama muat pertama, dan tata letak kolom
                  // berpindah setiap kali satu berkas selesai diunduh.
                  loading="lazy"
                  decoding="async"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </td>

      {/* #792 — sel kanan hanya menyisakan PERINTAH baris: sunting dan hapus.
          Keadaan baris (status, komentar) sudah pindah ke kolom pertama. */}
      <td className={cn(SEL, "py-2.5 align-top")}>
        <div className="flex flex-wrap items-center gap-1">
          {bolehSunting && (
            <button
              onClick={onEdit}
              className="p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-md transition-all cursor-pointer"
              title={t("discussion.editRow")}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {bolehHapus && (
            <button
              onClick={onDelete}
              className="p-1.5 text-content-muted hover:text-danger-text hover:bg-danger/10 rounded-md transition-all cursor-pointer"
              title={t("discussion.deleteRow")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
