/**
 * Daftar & CRUD Milestone di tab Peta Jalan (#312).
 * Memakai API /api/projects/:id/milestones yang sudah ada — tanpa skema baru.
 */
import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useState } from "react";
import { Flag, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { confirmDeleteAlert } from "../../lib/sweetalert";
import {
  createMilestone,
  deleteMilestone,
  fetchMilestones,
  updateMilestone,
  type Milestone,
} from "./milestone.service";

interface MilestonePanelProps {
  projectId: string;
  canWrite?: boolean;
}

export const MilestonePanel: React.FC<MilestonePanelProps> = ({ projectId, canWrite = true }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDue, setEditDue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMilestones(projectId);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || t("roadmap.milestoneLoadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await createMilestone(projectId, {
        name: name.trim(),
        dueDate: dueDate || null,
      });
      setName("");
      setDueDate("");
      toast.success(t("roadmap.milestoneCreated"));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("roadmap.milestoneSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (m: Milestone) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditDue(m.dueDate ? String(m.dueDate).slice(0, 10) : "");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || saving) return;
    setSaving(true);
    try {
      await updateMilestone(projectId, editingId, {
        name: editName.trim(),
        dueDate: editDue || null,
      });
      setEditingId(null);
      toast.success(t("roadmap.milestoneUpdated"));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("roadmap.milestoneSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: Milestone) => {
    const ok = await confirmDeleteAlert(m.name);
    if (!ok) return;
    try {
      await deleteMilestone(projectId, m.id);
      toast.success(t("roadmap.milestoneDeleted"));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("roadmap.milestoneSaveError"));
    }
  };

  const markDone = async (m: Milestone) => {
    try {
      await updateMilestone(projectId, m.id, {
        status: m.status === "done" ? "planned" : "done",
      });
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("roadmap.milestoneSaveError"));
    }
  };

  return (
    <section
      className="shrink-0 rounded-md border border-border-subtle/80 bg-surface px-4 py-3 md:px-5 shadow-2xs"
      data-testid="milestone-panel"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary-surface/10 text-primary border border-primary/20">
          <Flag className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-content tracking-tight">
            {t("roadmap.milestones")}
          </h3>
          <p className="text-xs text-content-muted">{t("roadmap.milestonesHint")}</p>
        </div>
      </div>

      {canWrite && (
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("roadmap.milestoneNamePlaceholder")}
            className="flex-1 min-w-0 rounded-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content placeholder:text-content-subtle focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-content-inverse px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t("roadmap.milestoneAdd")}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-content-muted py-2">{t("roadmap.milestoneLoading")}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-content-muted py-2">{t("roadmap.milestoneEmpty")}</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <li
                key={m.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-surface-muted px-3 py-2",
                  m.status === "done" && "opacity-70"
                )}
              >
                {isEditing ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 min-w-[120px] rounded border border-border-subtle bg-surface px-2 py-1 text-sm text-content"
                    />
                    <input
                      type="date"
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                      className="rounded border border-border-subtle bg-surface px-2 py-1 text-sm text-content"
                    />
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      className="p-1.5 text-success hover:bg-success/10 rounded"
                      aria-label={t("roadmap.milestoneSave")}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-content-muted hover:bg-surface rounded"
                      aria-label={t("roadmap.milestoneCancel")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => canWrite && void markDone(m)}
                      className={cn(
                        "text-left flex-1 min-w-0",
                        m.status === "done" && "line-through text-content-muted"
                      )}
                      disabled={!canWrite}
                    >
                      <span className="block text-sm font-medium text-content truncate">
                        {m.name}
                      </span>
                      <span className="block text-xs text-content-muted">
                        {m.dueDate ? String(m.dueDate).slice(0, 10) : t("roadmap.milestoneNoDue")}
                        {typeof m.progress === "number" ? ` · ${m.progress}%` : ""}
                      </span>
                    </button>
                    {canWrite && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="p-1.5 text-content-muted hover:text-content hover:bg-surface rounded"
                          aria-label={t("roadmap.milestoneEdit")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(m)}
                          className="p-1.5 text-content-muted hover:text-danger hover:bg-danger/10 rounded"
                          aria-label={t("roadmap.milestoneDelete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
