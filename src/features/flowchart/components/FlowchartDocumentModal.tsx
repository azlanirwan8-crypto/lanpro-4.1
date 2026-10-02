/**
 * Modal buat/sunting metadata dokumen flowchart (#433 gelombang 1).
 *
 * #583 — form ini dulu menanyakan "External Link" dan "Architecture
 * Description" sementara yang pemilik proyek butuhkan adalah empat blok yang
 * ia tulis di slide: Problem Statement, Pain Point, How, Benefit. Kedua field
 * lama dihapus; empat blok baru disimpan di payload `canvasData` yang sama
 * dengan isi papan (lihat flowchart.service.ts), tanpa kolom database baru.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { CircleAlert, Layers, Lightbulb, Target, TrendingUp, Workflow, X } from "lucide-react";
import { StyledDropdown } from "../../../components/ui/CommonComponents";
import { warnaLabel } from "../../../lib/warnaLabel";
import type { KonteksFlowchart } from "../types";

interface EpicOption {
  id: string;
  key?: string;
  title: string;
}

interface FlowchartDocumentModalProps {
  open: boolean;
  modalMode: "create" | "edit";
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  flowName: string;
  setFlowName: (v: string) => void;
  flowCategory: string;
  setFlowCategory: (v: string) => void;
  opsiKategoriDokumen: { id: string; label: string }[];
  flowEpicId: string;
  setFlowEpicId: (v: string) => void;
  availableEpics: EpicOption[];
  flowKonteks: KonteksFlowchart;
  setFlowKonteks: (v: KonteksFlowchart) => void;
}

/**
 * SATU kelas untuk semua kontrol satu-baris (#587).
 *
 * Ukurannya diambil dari modal terbesar aplikasi ini (`NewTaskModal`): `h-10`
 * dengan `text-sm px-3`. Dua hal yang membuat form ini dulu tampak tidak
 * seragam:
 *
 * 1. `cn()` di `lib/utils.ts` hanya MERANTAI kelas — tidak ada tailwind-merge.
 *    Pemicu `StyledDropdown` selalu membawa `px-1.5 py-0.5` dari cabang bawaannya,
 *    dan di stylesheet Tailwind `px-*`/`py-*` dicetak SETELAH `p-*`, jadi
 *    padding yang ditulis pemanggil kalah. Karena itu tingginya dikunci lewat
 *    `h-10`, bukan lewat padding.
 * 2. Kelas kontrol didefinisikan ulang di setiap field, sehingga dropdown bisa
 *    berbeda dari kolom di sebelahnya tanpa ada yang menyentuhnya.
 */
const KONTROL_DASAR =
  "w-full text-left text-sm font-normal bg-surface border border-border-subtle rounded-lg px-3 text-content-strong placeholder:text-content-subtle focus:bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

const KONTROL = `${KONTROL_DASAR} h-10`;

/** Kotak teks multi-baris: sama ratanya, tingginya mengikuti isi. */
const KOTAK = `${KONTROL_DASAR} py-2 resize-y leading-relaxed`;

const LABEL = "flex items-center gap-1.5 text-xs font-medium text-content-body";

/** Ikon dan warna jenis "epic" — standar yang sama dipakai tabel Isu (#564). */
const IKON_EPIC = "Zap";
const WARNA_EPIC = warnaLabel({ kelompok: "issue_type", label: "Epic" });

export const FlowchartDocumentModal: React.FC<FlowchartDocumentModalProps> = ({
  open,
  modalMode,
  onClose,
  onSubmit,
  flowName,
  setFlowName,
  flowCategory,
  setFlowCategory,
  opsiKategoriDokumen,
  flowEpicId,
  setFlowEpicId,
  availableEpics,
  flowKonteks,
  setFlowKonteks,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  const blok: {
    isi: keyof KonteksFlowchart;
    judul: string;
    petunjuk: string;
    Ikon: typeof Target;
  }[] = [
    {
      isi: "masalah",
      judul: t("flowchart.blockMasalah"),
      petunjuk: t("flowchart.blockMasalahHint"),
      Ikon: Target,
    },
    {
      isi: "titikNyeri",
      judul: t("flowchart.blockTitikNyeri"),
      petunjuk: t("flowchart.blockTitikNyeriHint"),
      Ikon: CircleAlert,
    },
    {
      isi: "cara",
      judul: t("flowchart.blockCara"),
      petunjuk: t("flowchart.blockCaraHint"),
      Ikon: Lightbulb,
    },
    {
      isi: "manfaat",
      judul: t("flowchart.blockManfaat"),
      petunjuk: t("flowchart.blockManfaatHint"),
      Ikon: TrendingUp,
    },
  ];

  return (
    <div className="fixed inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border-subtle w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] text-content-strong">
        <div className="px-6 py-4 bg-surface border-b border-border-subtle flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-medium text-base text-content">
                {modalMode === "create"
                  ? t("flowchart.addFlowchartData")
                  : t("flowchart.editDocDetail")}
              </h3>
              <span className="text-xs text-content-subtle">{t("flowchart.modalSubtitle")}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-muted rounded-lg text-content-subtle hover:text-content-secondary transition-all"
            aria-label={t("flowchart.cancel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={LABEL}>
                  {t("flowchart.docNameLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("flowchart.docNamePlaceholder")}
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  className={KONTROL}
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL}>
                  {t("flowchart.docCategoryLabel")} <span className="text-rose-500">*</span>
                </label>
                <StyledDropdown
                  value={flowCategory}
                  onChange={(val: string) => setFlowCategory(val)}
                  options={opsiKategoriDokumen}
                  type="jenis_dokumen"
                  masterData={[]}
                  className="w-full"
                  buttonClassName={KONTROL}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={LABEL}>
                <Workflow className="w-4 h-4 text-primary" />
                {t("flowchart.linkedEpicLabel")}
              </label>
              <StyledDropdown
                value={flowEpicId}
                onChange={setFlowEpicId}
                options={[
                  { id: "", label: t("flowchart.connectWithEpic") },
                  ...availableEpics.map((epic) => ({
                    id: epic.id,
                    label: `[${epic.key}] ${epic.title}`,
                    icon: IKON_EPIC,
                    color: WARNA_EPIC,
                  })),
                ]}
                className="w-full"
                buttonClassName={KONTROL}
              />
              <p className="text-[11px] text-content-subtle leading-normal">
                {availableEpics.length > 0
                  ? t("flowchart.linkedEpicHint", { jumlah: availableEpics.length })
                  : t("flowchart.linkedEpicKosong")}
              </p>
            </div>

            <div className="border-t border-border-faint pt-5 space-y-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-content-subtle">
                {t("flowchart.detailDokumen")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {blok.map(({ isi, judul, petunjuk, Ikon }) => (
                  <div key={isi} className="space-y-1.5">
                    <label className={LABEL}>
                      <Ikon className="w-4 h-4 text-primary" />
                      {judul}
                    </label>
                    <textarea
                      rows={4}
                      placeholder={petunjuk}
                      value={flowKonteks[isi]}
                      onChange={(e) => setFlowKonteks({ ...flowKonteks, [isi]: e.target.value })}
                      className={KOTAK}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-between items-center gap-2 border-t border-border-subtle bg-surface-sunken/50 shrink-0">
            <span className="text-[11px] text-content-subtle">{t("flowchart.requiredNote")}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-surface-muted hover:bg-surface-strong font-medium text-content-body transition-all text-sm"
              >
                {t("flowchart.cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse font-medium rounded-lg text-sm shadow-xs transition-all"
              >
                {modalMode === "create"
                  ? t("flowchart.createDocument")
                  : t("flowchart.saveChanges")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
