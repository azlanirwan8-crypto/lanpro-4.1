import React from "react";
import { useTranslation } from "react-i18next";
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
  /** Daftar penerima jamak (#703, B2 = b) sebagai label siap tampil. */
  namaPenerima: string[];
  masterData: MasterData[];
  jumlahKomentar: number;
  bolehSunting: boolean;
  bolehHapus: boolean;
  onOpenThread: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const kosong = (teks: string) => (
  <span className="text-content-subtle italic text-[11px]">{teks}</span>
);

export const BarisDiskusi: React.FC<BarisDiskusiProps> = ({
  p,
  nomor,
  assigneeName,
  namaPenerima,
  masterData,
  jumlahKomentar,
  bolehSunting,
  bolehHapus,
  onOpenThread,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { t } = useTranslation();
  const isCompleted = p.status === "completed";
  const tag = Array.isArray(p.tags) ? p.tags : [];
  const tautan = Array.isArray(p.links) ? p.links : [];
  const berkas = Array.isArray(p.files) ? p.files : [];
  const gambar = berkas.filter((b) => (b.mimetype || "").startsWith("image/"));
  const bukanGambar = berkas.filter((b) => !(b.mimetype || "").startsWith("image/"));

  return (
    <tr
      className={cn(
        "hover:bg-surface-sunken/60 transition-colors group",
        isCompleted && "opacity-75"
      )}
    >
      {/* No. */}
      <td className="py-3 px-4 text-center text-content-subtle font-normal align-middle">
        {nomor}
      </td>

      {/* Concern — follow-up tidak lagi menumpang di sel ini; ia kolom sendiri (#703 butir 3). */}
      <td className="py-3 px-4 align-middle">
        <div className="font-normal text-content-strong leading-snug whitespace-pre-wrap break-words">
          {p.concern}
        </div>
      </td>

      {/* Notes / Keterangan — #645: TIDAK boleh dipotong. */}
      <td className="py-3 px-4 align-middle text-content-body font-normal">
        <div className="whitespace-pre-wrap break-words">{p.keterangan || p.comment || "-"}</div>
      </td>

      {/* Context / Tags — #703 (B1 = a): isu nyata dari Daftar Isu, plus label
          `fitur` lama yang datanya tetap ada di basis data. */}
      <td className="py-3 px-4 align-middle">
        <div className="flex flex-wrap gap-1 items-center">
          {tag.map((s) => (
            <span
              key={s.id}
              className="px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal bg-primary/10 text-primary border border-primary/20 break-words"
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
      <td className="py-3 px-4 align-middle text-content-body font-normal">
        {p.tindakanLanjut || p.next_action ? (
          <div className="whitespace-pre-wrap break-words">{p.tindakanLanjut || p.next_action}</div>
        ) : (
          kosong("-")
        )}
      </td>

      {/* PIC — #703 (B2 = b): boleh lebih dari satu orang. */}
      <td className="py-3 px-4 align-middle text-content-body font-normal">
        <div className="flex flex-wrap items-center gap-1">
          {namaPenerima.length > 0 ? (
            namaPenerima.map((nama) => (
              <span
                key={nama}
                className="px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal bg-surface-sunken text-content-body border border-border-subtle break-words"
              >
                {nama}
              </span>
            ))
          ) : (
            /* #645 — nama PIC dulu dipotong pada 120 px, jadi "Gloria Handoyo"
               tampil sebagai "Gloria Hand…". Ekspresi `{assigneeName}` ini juga
               yang dibaca catatanLengkap-645.test.ts. */
            <span className="break-words">{assigneeName}</span>
          )}
        </div>
      </td>

      {/* Target Date */}
      <td className="py-3 px-4 align-middle text-content-muted font-normal">
        {p.targetDate ? (
          <div className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-content-subtle shrink-0" />
            <span className="break-words">{p.targetDate}</span>
          </div>
        ) : (
          kosong("-")
        )}
      </td>

      {/* Tautan — #704 (butir 5, B3): satu kolom khusus, isinya boleh banyak. */}
      <td className="py-3 px-4 align-middle">
        {tautan.length === 0 && bukanGambar.length === 0 ? (
          kosong("-")
        ) : (
          <div className="flex flex-wrap gap-1">
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
                className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md text-[10px] leading-snug font-normal bg-surface-sunken text-content-body border border-border-subtle break-all"
              >
                <IkonGambar className="w-3 h-3 shrink-0 text-content-subtle" />
                <span className="break-words">{b.name || b.originalName || b.fileRef}</span>
              </a>
            ))}
          </div>
        )}
      </td>

      {/* Gambar — #704 (butir 6): miniatur, bukan nama berkas. */}
      <td className="py-3 px-4 align-middle">
        {gambar.length === 0 ? (
          kosong("-")
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {gambar.map((b) => (
              <a
                key={b.id}
                href={b.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                title={b.name || b.originalName || ""}
                className="block w-12 h-12 rounded-md border border-border-subtle overflow-hidden bg-surface-sunken"
              >
                <img
                  src={b.url || ""}
                  alt={b.name || b.originalName || ""}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </td>

      {/* Thread Comments */}
      <td className="py-3 px-4 text-center align-middle">
        <button
          onClick={onOpenThread}
          className={cn(
            "inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-normal transition-all cursor-pointer border shadow-2xs active:scale-95",
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
      </td>

      {/* Status Badge */}
      <td className="py-3 px-4 text-center align-middle">
        <button
          type="button"
          onClick={onToggleStatus}
          className="cursor-pointer transition-all active:scale-95 inline-block"
          title={t("discussion.toggleStatus")}
        >
          {isCompleted ? (
            <span className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[10px] leading-none font-normal bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 shadow-2xs hover:bg-emerald-500/15">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {t("discussion.statusDone")}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[10px] leading-none font-normal bg-amber-500/10 text-amber-700 border border-amber-500/30 shadow-2xs hover:bg-amber-500/15">
              <Clock className="w-3 h-3 text-amber-600" />
              {t("discussion.statusPending")}
            </span>
          )}
        </button>
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-center align-middle">
        <div className="flex items-center justify-center gap-1">
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
              className="p-1.5 text-content-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
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
