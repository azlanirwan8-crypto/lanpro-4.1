import React from "react";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Tag,
  Link2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { DiscussionPoint, UserProfile, MasterData } from "../../../types";
import { Paragraf } from "./Paragraf";

interface DiscussionPointMobileCardViewProps {
  points: DiscussionPoint[];
  projectMembers: UserProfile[];
  masterData: MasterData[];
  onOpenThread: (point: DiscussionPoint) => void;
  onEditPoint: (point: DiscussionPoint) => void;
  onDeletePoint: (id: string) => void;
  onToggleStatus: (point: DiscussionPoint) => void;
  canEdit: (point: DiscussionPoint) => boolean;
  canDelete: (point: DiscussionPoint) => boolean;
  canToggleStatus: boolean;
  currentUserId?: string;
}

export const DiscussionPointMobileCardView: React.FC<DiscussionPointMobileCardViewProps> = ({
  points,
  projectMembers,
  masterData,
  onOpenThread,
  onEditPoint,
  onDeletePoint,
  onToggleStatus,
  canEdit,
  canDelete,
  canToggleStatus,
}) => {
  const { t } = useTranslation();

  if (!points || points.length === 0) {
    return null;
  }

  return (
    <div className="sm:hidden flex flex-col divide-y divide-border-subtle/60 pb-16">
      {points.map((p, index) => {
        const isCompleted = p.status === "completed";
        const assigneeUser = projectMembers.find(
          (m) => (m.uid || m.id) === (p.assignTo || p.assignee_id)
        );
        const assigneeName = assigneeUser
          ? assigneeUser.displayName || assigneeUser.name || assigneeUser.username
          : p.assignTo || t("newTask.unassigned");

        /* #703 (B2 = b) — kartu HP menampilkan daftar penerima yang SAMA dengan
         * tabel desktop. Aturan #645: satu field, satu perilaku, dua tampilan. */
        const idPenerima =
          Array.isArray(p.assigneeIds) && p.assigneeIds.length > 0
            ? p.assigneeIds
            : p.assignTo || p.assignee_id
              ? [String(p.assignTo || p.assignee_id)]
              : [];
        const namaPenerima = idPenerima
          .map((id) => {
            const orang = projectMembers.find((m) => (m.uid || m.id) === id);
            return orang ? orang.displayName || orang.name || orang.username || id : id;
          })
          .filter(Boolean);
        const tag = Array.isArray(p.tags) ? p.tags : [];
        const tautan = Array.isArray(p.links) ? p.links : [];
        const berkas = Array.isArray(p.files) ? p.files : [];
        const gambar = berkas.filter((b) => (b.mimetype || "").startsWith("image/"));

        const contextMeta = masterData.find(
          (m) =>
            m.type === "fitur" &&
            (m.label?.toLowerCase() === p.fitur?.toLowerCase() || m.id === p.fitur)
        );

        // #711 — balasannya ikut menempel pada titik diskusi (satu kueri untuk
        // seluruh halaman), bukan hasil permintaan per baris seperti sebelumnya.
        const pointComments = p.comments || [];

        return (
          <div
            key={p.id || index}
            className={cn(
              "p-3.5 bg-surface hover:bg-surface-sunken/60 active:bg-surface-sunken transition-all flex flex-col gap-2.5",
              isCompleted && "opacity-80"
            )}
          >
            {/* Header: No Badge, Status Toggle, & Actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-content-subtle">
                  #{String(index + 1).padStart(2, "0")}
                </span>

                {/* Status Badge */}
                <button
                  type="button"
                  onClick={() => canToggleStatus && onToggleStatus(p)}
                  disabled={!canToggleStatus}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-all",
                    isCompleted
                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/15"
                      : "bg-amber-500/10 text-amber-700 border border-amber-500/30 hover:bg-amber-500/15",
                    !canToggleStatus && "cursor-default"
                  )}
                  title={canToggleStatus ? t("discussion.toggleStatus") : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                  )}
                  <span>
                    {isCompleted ? t("discussion.statusDone") : t("discussion.statusPending")}
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Thread Button */}
                <button
                  type="button"
                  onClick={() => onOpenThread(p)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-surface-sunken hover:bg-primary-surface/10 text-content-body hover:text-primary rounded-md text-xs border border-border-subtle transition-all cursor-pointer shadow-2xs"
                  title={t("discussion.openThread")}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-medium">{pointComments.length}</span>
                </button>

                {canEdit(p) && (
                  <button
                    type="button"
                    onClick={() => onEditPoint(p)}
                    className="p-1 text-content-muted hover:text-primary hover:bg-primary/10 rounded-md transition-all cursor-pointer"
                    title={t("discussion.editRow")}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {canDelete(p) && (
                  <button
                    type="button"
                    onClick={() => p.id && onDeletePoint(p.id)}
                    className="p-1 text-content-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                    title={t("discussion.deleteRow")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Concern / Issue Title */}
            <div>
              <span className="text-[10px] font-normal uppercase tracking-normal text-content-subtle block mb-0.5">
                {t("discussion.thConcern")}
              </span>
              <p
                className={cn(
                  "text-xs font-semibold text-content-strong leading-relaxed",
                  isCompleted && "line-through text-content-muted"
                )}
              >
                {p.concern}
              </p>
            </div>

            {/* Notes / Keterangan */}
            {p.keterangan && (
              <div className="p-2 bg-surface-sunken/60 rounded-md border border-border-subtle/60 text-xs text-content-body leading-relaxed">
                <span className="text-[10px] font-normal uppercase tracking-normal text-content-subtle block mb-0.5">
                  {t("discussion.thNotes")}
                </span>
                <div className="whitespace-pre-wrap">
                  <Paragraf teks={p.keterangan} />
                </div>
              </div>
            )}

            {/* Follow-up — #703 butir 3: kolomnya baru ada di desktop, kartunya
                tidak boleh tertinggal (#645). */}
            {p.tindakanLanjut && (
              <div className="p-2 bg-primary-surface/5 rounded-md border border-primary/20 text-xs text-content-body leading-relaxed">
                <span className="text-[10px] font-normal uppercase tracking-normal text-content-subtle block mb-0.5">
                  {t("discussion.followUp")}
                </span>
                <div className="whitespace-pre-wrap break-words">
                  <Paragraf teks={p.tindakanLanjut} />
                </div>
              </div>
            )}

            {/* Meta Row: Feature Tag, PIC, Target Date */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-faint text-xs text-content-muted">
              {/* Context / Tags — #703 (B1 = a): isu nyata dari Daftar Isu. */}
              <div className="flex flex-wrap items-center gap-1 min-w-0">
                {tag.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 whitespace-normal break-words"
                  >
                    <Tag className="w-3 h-3 shrink-0" />
                    {s.label}
                  </span>
                ))}
                {p.fitur ? (
                  // #645 — label tag dan nama PIC tidak boleh dipotong; catatan
                  // di kartu ini sudah utuh, tinggal dua potongan ini yang tersisa.
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-sunken text-content-body border border-border-subtle whitespace-normal break-words">
                    {contextMeta?.label || p.fitur}
                  </span>
                ) : null}
                {tag.length === 0 && !p.fitur && (
                  <span className="text-[10px] text-content-subtle italic">
                    {t("discussion.noTags")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* PIC — #703: boleh lebih dari satu orang. */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-content-body min-w-0">
                  <User className="w-3 h-3 text-content-subtle shrink-0" />
                  {(namaPenerima.length > 0 ? namaPenerima : [assigneeName]).map((nama) => (
                    <span key={nama} className="break-words">
                      {nama}
                    </span>
                  ))}
                </div>

                {/* Target Date */}
                {p.targetDate && (
                  <div className="flex items-center gap-1 text-[10px] text-content-muted">
                    <Calendar className="w-3 h-3 text-content-subtle shrink-0" />
                    <span>{p.targetDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tautan dan gambar — #704 butir 5 dan 6, supaya HP tidak tertinggal
                dari desktop (#645: satu field, satu perilaku, dua tampilan). */}
            {(tautan.length > 0 || gambar.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {tautan.map((l) => (
                  <a
                    key={l.id}
                    // `rel` wajib: nilai ini datang dari pengguna lain di proyek
                    // yang sama dan ia menjadi `href`.
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 max-w-full text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 break-all"
                  >
                    <Link2 className="w-3 h-3 shrink-0" />
                    {l.label || l.url}
                  </a>
                ))}
                {gambar.map((b) => (
                  <a
                    key={b.id}
                    href={b.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-14 h-14 rounded-md border border-border-subtle overflow-hidden bg-surface-sunken shrink-0"
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
          </div>
        );
      })}
    </div>
  );
};
