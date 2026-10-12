import React from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { LanproDatePicker } from "../../../components/ui/LanproDatePicker";
import { PemilihJamak, type OpsiJamak } from "./PemilihJamak";
import { cn } from "../../../lib/utils";

/**
 * #703/#704 — baris "tambah cepat" (yang menempel di bawah tabel) dan blok
 * cepat versi HP, dikeluarkan dari `DiscussionPointsTable.tsx` (§4: induknya
 * 1.255 baris). Keduanya SATU sumber isian, supaya tidak lagi terjadi satu
 * field punya dua bentuk tergantung layar — pelajaran #645.
 *
 * Notes ikut jadi textarea di sini juga, bukan hanya di laci sunting: pemilik
 * proyek meminta field isian catatan berupa text area "karena dia bisa jadi
 * dalam paragraf", dan baris cepat adalah tempat catatan paling sering diketik.
 * Enter tidak lagi menyimpan dari kotak notes — di textarea Enter berarti ganti
 * baris, dan itulah gunanya. Simpan lewat tombol.
 */
export interface NilaiCepat {
  concern: string;
  keterangan: string;
  assigneeIds: string[];
  tags: { id: string; label: string }[];
  targetDate: string;
}

interface BarisCepatProps {
  nilai: NilaiCepat;
  onUbah: (bagian: Partial<NilaiCepat>) => void;
  onTambah: () => void;
  sedangMenyimpan: boolean;
  opsiPenerima: OpsiJamak[];
  opsiIsu: OpsiJamak[];
}

const isianKelas =
  "w-full px-3 py-1.5 bg-surface border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md text-xs font-normal text-content-strong outline-none shadow-2xs placeholder:text-content-subtle";
const tombolKelas =
  "w-full h-8 px-2.5 bg-surface border border-border-subtle text-xs text-left text-content-body rounded-md font-medium shadow-2xs";

/** Versi desktop: satu `<tr>` dengan sel yang sama rata dengan kepala tabel. */
export const BarisCepat: React.FC<BarisCepatProps> = (props) => {
  const { nilai, onUbah, onTambah, sedangMenyimpan, opsiPenerima, opsiIsu } = props;
  const { t } = useTranslation();

  return (
    <tr className="bg-primary/10 hover:bg-primary/10 transition-colors">
      <td className="py-2.5 px-4 text-center text-primary text-xs align-middle font-normal">+</td>

      <td className="py-2.5 px-4 align-middle">
        <input
          id="quick-add-concern-desktop"
          type="text"
          placeholder={t("discussion.newConcernPlaceholder")}
          value={nilai.concern}
          onChange={(e) => onUbah({ concern: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onTambah();
          }}
          className={isianKelas}
        />
      </td>

      {/* #703 — catatan jadi textarea; Enter tidak lagi menyimpan dari sini. */}
      <td className="py-2.5 px-4 align-middle">
        <textarea
          placeholder={t("discussion.notesPlaceholder")}
          value={nilai.keterangan}
          onChange={(e) => onUbah({ keterangan: e.target.value })}
          rows={2}
          className={cn(isianKelas, "min-h-[42px] resize-y")}
        />
      </td>

      <td className="py-2.5 px-4 align-middle">
        <PemilihJamak
          nilai={nilai.tags.map((s) => s.id)}
          opsi={opsiIsu}
          onChange={(id) =>
            onUbah({
              tags: id
                .map((s) => {
                  const o = opsiIsu.find((x) => x.id === s);
                  return o ? { id: o.id, label: o.label } : null;
                })
                .filter((s): s is { id: string; label: string } => !!s),
            })
          }
          kosong={t("discussion.belumAdaTag")}
          cari={t("discussion.cariIsu")}
          buttonClassName={tombolKelas}
        />
      </td>

      <td className="py-2.5 px-4 align-middle">
        <PemilihJamak
          nilai={nilai.assigneeIds}
          opsi={opsiPenerima}
          onChange={(id) => onUbah({ assigneeIds: id })}
          kosong={t("newTask.unassigned")}
          cari={t("discussion.cariAnggota")}
          buttonClassName={tombolKelas}
        />
      </td>

      <td className="py-2.5 px-4 align-middle">
        <LanproDatePicker
          value={nilai.targetDate}
          onChange={(val) => onUbah({ targetDate: val })}
          buttonClassName={tombolKelas}
        />
      </td>

      <td className="py-2.5 px-4 text-center align-middle text-content-subtle text-xs">-</td>

      <td className="py-2.5 px-4 text-center align-middle">
        <span className="px-2.5 py-1 rounded-md text-[10px] leading-none font-normal bg-amber-500/10 text-amber-700 border border-amber-500/30">
          {t("discussion.statusPending")}
        </span>
      </td>

      <td className="py-2.5 px-4 text-center align-middle">
        <button
          type="button"
          onClick={onTambah}
          disabled={sedangMenyimpan || !nilai.concern.trim()}
          className="px-3 py-1.5 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active disabled:opacity-40 text-content-inverse rounded-md text-xs font-normal shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
          title={t("discussion.addPoint")}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("discussion.add")}</span>
        </button>
      </td>
    </tr>
  );
};

/** Versi HP (< 640px): blok kartu di atas daftar, bukan baris tabel. */
export const BlokCepatMobile: React.FC<BarisCepatProps> = (props) => {
  const { nilai, onUbah, onTambah, sedangMenyimpan, opsiPenerima, opsiIsu } = props;
  const { t } = useTranslation();

  const isianMobile = cn(isianKelas, "py-2.5");

  return (
    <div
      id="quick-add-section"
      className="rounded-xl border border-primary/25 bg-primary-surface/5 p-3 space-y-2.5 shadow-2xs"
    >
      <div className="text-[11px] font-medium text-content-strong">{t("discussion.addPoint")}</div>
      <input
        id="quick-add-concern"
        type="text"
        placeholder={t("discussion.newConcernPlaceholder")}
        value={nilai.concern}
        onChange={(e) => onUbah({ concern: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onTambah();
        }}
        className={cn(isianMobile, "min-w-0")}
      />
      <textarea
        placeholder={t("discussion.notesPlaceholder")}
        value={nilai.keterangan}
        onChange={(e) => onUbah({ keterangan: e.target.value })}
        rows={2}
        className={cn(isianMobile, "min-w-0 min-h-[56px] resize-y")}
      />
      <div className="grid grid-cols-1 gap-2 min-w-0">
        <PemilihJamak
          nilai={nilai.tags.map((s) => s.id)}
          opsi={opsiIsu}
          onChange={(id) =>
            onUbah({
              tags: id
                .map((s) => {
                  const o = opsiIsu.find((x) => x.id === s);
                  return o ? { id: o.id, label: o.label } : null;
                })
                .filter((s): s is { id: string; label: string } => !!s),
            })
          }
          kosong={t("discussion.belumAdaTag")}
          cari={t("discussion.cariIsu")}
          buttonClassName={cn(tombolKelas, "py-2.5 h-auto")}
        />
        <PemilihJamak
          nilai={nilai.assigneeIds}
          opsi={opsiPenerima}
          onChange={(id) => onUbah({ assigneeIds: id })}
          kosong={t("newTask.unassigned")}
          cari={t("discussion.cariAnggota")}
          buttonClassName={cn(tombolKelas, "py-2.5 h-auto")}
        />
        <LanproDatePicker
          value={nilai.targetDate}
          onChange={(val) => onUbah({ targetDate: val })}
          buttonClassName={cn(tombolKelas, "py-2.5 h-auto")}
        />
      </div>
      <button
        type="button"
        onClick={onTambah}
        disabled={sedangMenyimpan || !nilai.concern.trim()}
        className="w-full min-h-11 px-3 py-2.5 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active disabled:opacity-40 text-content-inverse rounded-md text-xs font-medium shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        <span>{t("discussion.add")}</span>
      </button>
    </div>
  );
};
