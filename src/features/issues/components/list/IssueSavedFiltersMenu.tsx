import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Bookmark, Trash2, X } from "lucide-react";
import { cn } from "../../../../lib/utils";
import {
  deleteNamedFilter,
  loadNamedFilters,
  type IssueFilterSnapshot,
  type SavedIssueFilter,
  upsertNamedFilter,
} from "../../lib/issueFilterSnapshot";
import { toast } from "sonner";

interface IssueSavedFiltersMenuProps {
  projectId?: string;
  currentSnapshot: IssueFilterSnapshot;
  onApply: (snapshot: IssueFilterSnapshot) => void;
}

export const IssueSavedFiltersMenu: React.FC<IssueSavedFiltersMenuProps> = ({
  projectId,
  currentSnapshot,
  onApply,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SavedIssueFilter[]>([]);

  useEffect(() => {
    if (!projectId) {
      setSaved([]);
      return;
    }
    setSaved(loadNamedFilters(projectId));
  }, [projectId, open]);

  if (!projectId) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "p-2 bg-surface border border-border-subtle rounded-lg text-content-muted hover:text-primary hover:border-primary/30 transition-all shadow-soft cursor-pointer",
          open && "text-primary border-primary/40 bg-primary-surface/10"
        )}
        title={t("filters.savedFilters")}
        aria-label={t("filters.savedFilters")}
        aria-expanded={open}
      >
        <Bookmark className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-40 w-[min(18rem,calc(100vw-2rem))] bg-surface border border-border-subtle rounded-xl shadow-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-content-body">
              {t("filters.savedFilters")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 text-content-subtle hover:text-content-body cursor-pointer"
              aria-label={t("common.close")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("filters.saveFilterName")}
              className="flex-1 min-w-0 text-xs bg-surface-sunken border border-border-subtle rounded-md px-2 py-1.5 text-content-body"
              maxLength={40}
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) {
                  toast.error(t("toast.savedFilterNameEmpty"));
                  return;
                }
                const next = upsertNamedFilter(projectId, trimmed, currentSnapshot);
                setSaved(next);
                setName("");
                toast.success(t("toast.savedFilterSaved", { name: trimmed }));
              }}
              className="shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary-surface text-content-inverse cursor-pointer"
            >
              {t("filters.saveFilter")}
            </button>
          </div>

          {saved.length === 0 ? (
            <p className="text-[11px] text-content-subtle py-1">{t("filters.noSavedFilters")}</p>
          ) : (
            <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {saved.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-1 rounded-md border border-border-faint px-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onApply(f.snapshot);
                      setOpen(false);
                      toast.success(t("toast.savedFilterApplied", { name: f.name }));
                    }}
                    className="flex-1 min-w-0 text-left text-xs font-medium text-content-body truncate hover:text-primary cursor-pointer"
                    title={f.name}
                  >
                    {f.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = deleteNamedFilter(projectId, f.id);
                      setSaved(next);
                      toast.success(t("toast.savedFilterDeleted", { name: f.name }));
                    }}
                    className="p-1 text-content-subtle hover:text-rose-600 cursor-pointer"
                    title={t("filters.deleteSavedFilter")}
                    aria-label={t("filters.deleteSavedFilter")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
