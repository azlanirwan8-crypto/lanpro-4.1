import React from "react";
import { useTranslation } from "react-i18next";
import { Edit2, Link2, Plus, Trash2, Upload, X } from "lucide-react";
import { StyledDropdown } from "../../../components/ui/CommonComponents";
import { LanproDatePicker } from "../../../components/ui/LanproDatePicker";
import { PemilihJamak, type OpsiJamak } from "./PemilihJamak";
import type { DiscussionPoint, MasterData, TautanDiskusi } from "../../../types";
import { cn } from "../../../lib/utils";

/**
 * #703/#704 — LACI SUNTING satu titik diskusi, dikeluarkan dari
 * `DiscussionPointsTable.tsx` (1.255 baris, melewati batas 800 §4) sambil
 * enam permintaan pemilik proyek dipasang. Dua hal itu dikerjakan sekaligus,
 * bukan berurutan: memecah lalu menumpuk enam field ke berkas yang sama akan
 * membuat berkas itu melewati batasnya lagi pada commit berikutnya.
 *
 * Perubahan bentuk isian yang diminta pemilik:
 *  - Notes/Remarks dan Follow-up jadi TEXTAREA (isinya bisa berparagraf).
 *    Concern sudah textarea lebih dulu, jadi tiga-duanya kini sama.
 *  - PIC JAMAK (keputusan B2 = b) lewat `PemilihJamak`.
 *  - Context/Tags diambil dari DAFTAR ISU proyek (keputusan B1 = a), bukan
 *    lagi dari label MasterData. Kolom `fitur` yang lama TIDAK dibuang — ia
 *    tetap punya kontrolnya sendiri di bawah, karena datanya masih terbaca.
 *  - Tautan jamak (#704, keputusan B3) dan gambar jamak (#704).
 *
 * Tidak ada satu pun teks layar yang ditulis di sini: semuanya lewat `t()`,
 * dan tidak ada warna keras (§22).
 */

const labelKelas =
  "text-xs sm:text-[10px] uppercase font-normal text-content-muted tracking-normal";
const isianKelas =
  "w-full px-3.5 py-2 bg-surface border border-border-subtle rounded-md text-xs font-normal text-content-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs";
const tombolKelas =
  "w-full h-9 px-3 bg-surface border border-border-subtle text-xs text-left text-content-body rounded-md font-medium shadow-2xs";

interface FormDiskusiProps {
  form: Partial<DiscussionPoint>;
  onUbah: (bagian: Partial<DiscussionPoint>) => void;
  onSave: () => void;
  onBatal: () => void;
  isSaving: boolean;
  /** Anggota proyek sebagai opsi PIC. */
  opsiPenerima: OpsiJamak[];
  /** Isu dari Daftar Isu proyek sebagai opsi Context/Tags. */
  opsiIsu: OpsiJamak[];
  masterData: MasterData[];
  /** #704 — unggah bayt lalu daftarkan barisnya; milik induk (rute tabel). */
  onUnggah?: (file: File) => Promise<void>;
  onHapusBerkas?: (fileId: string) => Promise<void>;
  sedangMengunggah?: boolean;
}

export const FormDiskusi: React.FC<FormDiskusiProps> = ({
  form,
  onUbah,
  onSave,
  onBatal,
  isSaving,
  opsiPenerima,
  opsiIsu,
  masterData,
  onUnggah,
  onHapusBerkas,
  sedangMengunggah,
}) => {
  const { t } = useTranslation();

  const tautan = Array.isArray(form.links) ? (form.links as TautanDiskusi[]) : [];
  const gantiTautan = (daftar: TautanDiskusi[]) => onUbah({ links: daftar });
  const tambahTautan = () =>
    gantiTautan([...tautan, { id: `link-${Date.now()}-${tautan.length}`, label: "", url: "" }]);
  const ubahTautan = (id: string, bagian: Partial<TautanDiskusi>) =>
    gantiTautan(tautan.map((l) => (l.id === id ? { ...l, ...bagian } : l)));
  const hapusTautan = (id: string) => gantiTautan(tautan.filter((l) => l.id !== id));

  const berkas = Array.isArray(form.files) ? form.files : [];
  const gambar = berkas.filter((b) => (b.mimetype || "").startsWith("image/"));
  const lainnya = berkas.filter((b) => !(b.mimetype || "").startsWith("image/"));

  return (
    <div className="fixed inset-0 bg-overlay/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
      <div className="bg-surface rounded-lg w-full max-w-2xl shadow-xl border border-border-subtle flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-5 py-4 border-b border-border-faint flex items-center justify-between bg-surface-sunken/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shrink-0">
              <Edit2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-content-strong tracking-tight">
                {t("discussion.editPoint")}
              </h3>
              <p className="text-xs text-content-muted font-normal">
                {t("discussion.editPointHint")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBatal}
            className="p-1.5 text-content-subtle hover:text-content-secondary hover:bg-surface-muted rounded-md transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-1.5">
            <label className={labelKelas}>{t("discussion.concernTopic")} *</label>
            <textarea
              className={cn(isianKelas, "min-h-[80px]")}
              value={form.concern || ""}
              onChange={(e) => onUbah({ concern: e.target.value })}
            />
          </div>

          {/* #703 — Notes dan Follow-up ikut jadi textarea. Keduanya dulu
              `<input type="text">` padahal kolomnya `TEXT` dan isinya bisa
              berparagraf: pemilik proyek, "ini dalam bentuk text area ya field
              isian nya karena dia bisa jadi dalam paragraf". */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelKelas}>{t("discussion.notesLabel")}</label>
              <textarea
                className={cn(isianKelas, "min-h-[72px]")}
                value={form.keterangan || ""}
                onChange={(e) => onUbah({ keterangan: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelKelas}>{t("discussion.followUp")}</label>
              <textarea
                className={cn(isianKelas, "min-h-[72px]")}
                value={form.tindakanLanjut || ""}
                onChange={(e) => onUbah({ tindakanLanjut: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* #703 (B2 = b) — PIC boleh lebih dari satu orang. */}
            <div className="space-y-1.5">
              <label className={labelKelas}>{t("discussion.picAssignedTo")}</label>
              <PemilihJamak
                nilai={Array.isArray(form.assigneeIds) ? form.assigneeIds : []}
                opsi={opsiPenerima}
                onChange={(id) => onUbah({ assigneeIds: id })}
                kosong={t("newTask.unassigned")}
                cari={t("discussion.cariAnggota")}
                buttonClassName={tombolKelas}
              />
            </div>
            {/* #703 (B1 = a) — Context/Tags dari Daftar Isu. */}
            <div className="space-y-1.5">
              <label className={labelKelas}>{t("discussion.thContextTags")}</label>
              <PemilihJamak
                nilai={(form.tags || []).map((s) => s.id)}
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelKelas}>{t("discussion.feature")}</label>
              <StyledDropdown
                value={form.fitur || ""}
                onChange={(val) => onUbah({ fitur: val })}
                options={masterData
                  .filter((m) => m.type?.toLowerCase() === "fitur")
                  .map((m) => ({
                    id: m.label,
                    label: m.label,
                    color: m.color,
                    icon: m.icon,
                  }))}
                type="fitur"
                masterData={masterData}
                buttonClassName={tombolKelas}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelKelas}>{t("discussion.targetDate")}</label>
              <LanproDatePicker
                value={form.targetDate || ""}
                onChange={(val) => onUbah({ targetDate: val })}
                buttonClassName={tombolKelas}
              />
            </div>
          </div>

          {/* #704 (B3) — tautan jamak. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className={labelKelas}>{t("discussion.tautan")}</label>
              <button
                type="button"
                onClick={tambahTautan}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-normal bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {t("discussion.tambahTautan")}
              </button>
            </div>
            {tautan.length === 0 ? (
              <p className="text-[11px] text-content-subtle italic">
                {t("discussion.belumAdaTautan")}
              </p>
            ) : (
              tautan.map((l) => (
                <div key={l.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      type="text"
                      placeholder={t("discussion.labelTautan")}
                      value={l.label || ""}
                      onChange={(e) => ubahTautan(l.id, { label: e.target.value })}
                      className={cn(isianKelas, "py-1.5")}
                    />
                    <input
                      type="url"
                      placeholder="https://"
                      value={l.url || ""}
                      onChange={(e) => ubahTautan(l.id, { url: e.target.value })}
                      className={cn(isianKelas, "py-1.5")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => hapusTautan(l.id)}
                    title={t("discussion.hapusTautan")}
                    className="p-1.5 mt-1 text-content-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* #704 — gambar jamak. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className={labelKelas}>{t("discussion.gambar")}</label>
              <label
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-normal bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 transition-colors cursor-pointer",
                  (sedangMengunggah || !onUnggah) && "opacity-50 pointer-events-none"
                )}
              >
                <Upload className="w-3 h-3" />
                {sedangMengunggah ? t("discussion.mengunggah") : t("discussion.unggahGambar")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={sedangMengunggah || !onUnggah}
                  onChange={(e) => {
                    const daftar = Array.from(e.target.files || []);
                    e.target.value = "";
                    daftar.forEach((f) => onUnggah?.(f));
                  }}
                />
              </label>
            </div>

            {gambar.length === 0 && lainnya.length === 0 ? (
              <p className="text-[11px] text-content-subtle italic">
                {t("discussion.belumAdaGambar")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gambar.map((b) => (
                  <div
                    key={b.id}
                    className="relative w-20 h-20 rounded-md border border-border-subtle overflow-hidden bg-surface-sunken"
                  >
                    <img
                      src={b.url || ""}
                      alt={b.name || b.originalName || ""}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onHapusBerkas?.(b.id)}
                      title={t("discussion.hapusGambar")}
                      className="absolute top-0.5 right-0.5 p-1 rounded-md bg-surface-inverse-strong text-content-inverse opacity-90 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {lainnya.map((b) => (
                  <a
                    key={b.id}
                    href={b.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-md text-[11px] font-normal bg-surface-sunken text-content-body border border-border-subtle"
                  >
                    <Link2 className="w-3 h-3 shrink-0 text-content-subtle" />
                    <span className="break-words">{b.name || b.originalName || b.fileRef}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-border-faint flex justify-end gap-2.5 bg-surface-sunken shrink-0">
          <button
            type="button"
            onClick={onBatal}
            className="px-4 py-2 text-xs font-medium text-content-secondary hover:bg-surface-muted rounded-md border border-border-subtle bg-surface transition-all cursor-pointer shadow-2xs"
          >
            {t("discussion.cancel")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse rounded-md text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? t("common.saving") : t("common.saveChanges2")}
          </button>
        </div>
      </div>
    </div>
  );
};
