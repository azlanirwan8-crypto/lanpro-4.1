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
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { DiscussionPoint, DiscussionPointComment, UserProfile, MasterData } from "../../../types";

interface DiscussionPointMobileCardViewProps {
  points: DiscussionPoint[];
  projectMembers: UserProfile[];
  masterData: MasterData[];
  commentsMap: Record<string, DiscussionPointComment[]>;
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
  commentsMap,
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

        const contextMeta = masterData.find(
          (m) =>
            m.type === "fitur" &&
            (m.label?.toLowerCase() === p.fitur?.toLowerCase() || m.id === p.fitur)
        );

        const pointComments = (p.id && commentsMap[p.id]) || [];

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
              <span className="text-[10px] font-medium uppercase tracking-wider text-content-subtle block mb-0.5">
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
                <span className="text-[10px] font-medium uppercase tracking-wider text-content-subtle block mb-0.5">
                  {t("discussion.thNotes")}
                </span>
                <p className="whitespace-pre-wrap">{p.keterangan}</p>
              </div>
            )}

            {/* Meta Row: Feature Tag, PIC, Target Date */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-faint text-xs text-content-muted">
              {/* Context Tag */}
              <div className="flex items-center gap-1 min-w-0">
                {p.fitur ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 truncate max-w-[130px]">
                    <Tag className="w-3 h-3 shrink-0" />
                    {contextMeta?.label || p.fitur}
                  </span>
                ) : (
                  <span className="text-[10px] text-content-subtle italic">
                    {t("discussion.noTags")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* PIC */}
                <div className="flex items-center gap-1 text-[11px] text-content-body">
                  <User className="w-3 h-3 text-content-subtle shrink-0" />
                  <span className="truncate max-w-[90px]">{assigneeName}</span>
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
          </div>
        );
      })}
    </div>
  );
};
