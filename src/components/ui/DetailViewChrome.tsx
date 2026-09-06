import React from "react";
import { ChevronLeft, Edit2, Trash2 } from "lucide-react";
import { Card } from "./CoreUI";
import { cn } from "../../lib/utils";

/**
 * #425 — Standar detail shell (U0/U1):
 * satu Card: baris aksi kiri (Back + Edit + Delete) + trailing opsional;
 * di bawahnya meta + judul tipografi Velzon (15px / semibold).
 */

const btnBack =
  "inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 px-3 py-1.5 rounded-md transition-all cursor-pointer shrink-0 shadow-2xs";

const btnIcon =
  "p-1.5 text-content-muted hover:text-primary hover:bg-primary/10 rounded-md transition-all cursor-pointer border border-border-subtle bg-surface shadow-2xs";

const btnDanger =
  "p-1.5 text-content-muted hover:text-danger-text hover:bg-danger/10 rounded-md transition-all cursor-pointer border border-border-subtle bg-surface shadow-2xs";

export type DetailViewChromeProps = {
  backLabel: string;
  onBack: () => void;
  title: React.ReactNode;
  titleIcon?: React.ReactNode;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  editTitle?: string;
  deleteTitle?: string;
  /** Konten kanan baris aksi (download, join, toggle, …) */
  trailing?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function DetailViewChrome({
  backLabel,
  onBack,
  title,
  titleIcon,
  meta,
  description,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  editTitle,
  deleteTitle,
  trailing,
  className,
  children,
}: DetailViewChromeProps) {
  return (
    <Card className={cn("p-4 md:p-5 shadow-2xs shrink-0 rounded-lg space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={btnBack} title={backLabel}>
          <ChevronLeft className="w-4 h-4" /> {backLabel}
        </button>

        {canEdit && onEdit && (
          <button type="button" onClick={onEdit} className={btnIcon} title={editTitle}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {canDelete && onDelete && (
          <button type="button" onClick={onDelete} className={btnDanger} title={deleteTitle}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {trailing ? (
          <div className="flex items-center gap-2 shrink-0 ml-auto">{trailing}</div>
        ) : null}
      </div>

      <div>
        {meta ? (
          <div className="flex flex-wrap items-center gap-2 select-none mb-2">{meta}</div>
        ) : null}

        <h2 className="text-[15px] font-semibold text-content-strong tracking-wide leading-snug flex items-center gap-2 min-w-0">
          {titleIcon}
          <span className="truncate">{title}</span>
        </h2>

        {description}
      </div>

      {children}
    </Card>
  );
}
