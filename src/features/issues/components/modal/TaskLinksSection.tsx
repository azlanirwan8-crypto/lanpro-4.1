import { useTranslation } from "react-i18next";
import React, { useMemo } from "react";
import { Trash2, GitBranch } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./TaskDetailPrimitives";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import { Task, MasterData, LinkedTask } from "../../../../types";

interface TaskLinksSectionProps {
  task: Task;
  tasks: Task[];
  masterData: MasterData[];
  isEditable: boolean;
  isAddingTaskLinkLocal: boolean;
  setIsAddingTaskLinkLocal: (open: boolean) => void;
  taskLinkRelation: "blocks" | "is_blocked_by" | "relates_to";
  setTaskLinkRelation: (val: "blocks" | "is_blocked_by" | "relates_to") => void;
  taskLinkTargetId: string;
  setTaskLinkTargetId: (val: string) => void;
  handleAddLinkedTask: () => void;
  handleRemoveLinkedTask: (taskId: string, linkId: string) => void;
  wrapSubmit: (key: string, fn: () => Promise<void> | void) => () => Promise<void>;
  isSubmitting: Record<string, boolean>;
}

const RELATION_ORDER = ["blocks", "is_blocked_by", "relates_to", "clones", "is_cloned_by"] as const;

export const TaskLinksSection: React.FC<TaskLinksSectionProps> = ({
  task,
  tasks,
  masterData,
  isEditable,
  isAddingTaskLinkLocal,
  setIsAddingTaskLinkLocal,
  taskLinkRelation,
  setTaskLinkRelation,
  taskLinkTargetId,
  setTaskLinkTargetId,
  handleAddLinkedTask,
  handleRemoveLinkedTask,
  wrapSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();

  /** #344 — kelompokkan daftar dependensi (bukan graph engine). */
  const grouped = useMemo(() => {
    const links = (task.linkedTasks || []) as LinkedTask[];
    const map = new Map<string, LinkedTask[]>();
    for (const link of links) {
      const key = link.relationType || (link as any).linkType || "relates_to";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(link);
    }
    const ordered: { relation: string; items: LinkedTask[] }[] = RELATION_ORDER.filter((r) =>
      map.has(r)
    ).map((r) => ({
      relation: r,
      items: map.get(r)!,
    }));
    for (const [k, items] of map) {
      if (!RELATION_ORDER.includes(k as (typeof RELATION_ORDER)[number])) {
        ordered.push({ relation: k, items });
      }
    }
    return ordered;
  }, [task.linkedTasks]);

  const relationLabel = (rel: string) => {
    if (rel === "blocks") return t("issues.relation_blocks", "Blocks");
    if (rel === "is_blocked_by") return t("issues.relation_is_blocked_by", "Is blocked by");
    if (rel === "relates_to") return t("issues.relation_relates_to", "Relates to");
    return rel.replace(/_/g, " ");
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border-faint">
      <div className="flex items-center justify-between">
        <h4 className="text-xs sm:text-[10px] font-normal uppercase tracking-widest text-content-subtle flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-primary" />
          {t("issues.dependenciesPanel", t("issues.relatedIssues"))}
        </h4>
        {isEditable && (
          <button
            type="button"
            onClick={() => setIsAddingTaskLinkLocal(!isAddingTaskLinkLocal)}
            className="text-xs sm:text-[10px] font-medium text-indigo-600 hover:underline"
          >
            {t("issues.link")}
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <p className="text-xs text-content-muted py-2">
          {t("issues.dependenciesEmpty", "Belum ada dependensi. Tambah tautan isu.")}
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ relation, items }) => (
            <div key={relation} className="space-y-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-content-subtle">
                {relationLabel(relation)}
                <span className="ml-1 tabular-nums text-content-muted">({items.length})</span>
              </div>
              {items.map((link, linkIdx) => {
                const target = (tasks || []).find((t) => t.id === link.targetTaskId);
                if (!target) return null;
                return (
                  <div
                    key={link.id ? `${link.id}-${linkIdx}` : `link-${linkIdx}`}
                    className="p-3 bg-surface rounded-xl border border-border-faint shadow-soft space-y-2 group/link relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-[10px] font-mono font-medium text-content-subtle">
                        {target.key}
                      </span>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLinkedTask(task.id, link.id)}
                          className="text-content-subtle hover:text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-colors opacity-0 group-hover/link:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-medium text-content-body truncate">
                      {target.title}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isAddingTaskLinkLocal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/30 space-y-3"
        >
          <StyledDropdown
            value={taskLinkRelation}
            onChange={(val) => setTaskLinkRelation(val as any)}
            options={[
              { id: "blocks", label: relationLabel("blocks") },
              { id: "is_blocked_by", label: relationLabel("is_blocked_by") },
              { id: "relates_to", label: relationLabel("relates_to") },
            ]}
            masterData={masterData}
            className="w-full"
            buttonClassName="text-[13px] font-medium bg-surface border border-border-subtle rounded-xl px-4 py-2 shadow-soft"
          />
          <StyledDropdown
            value={taskLinkTargetId}
            onChange={(val) => setTaskLinkTargetId(val)}
            options={[
              { id: "", label: t("issues.selectTask", "Select task...") },
              ...tasks
                .filter((t) => t.id !== task.id)
                .map((t) => ({
                  id: t.id,
                  label: `${t.key}: ${t.title}`,
                })),
            ]}
            masterData={masterData}
            className="w-full"
            buttonClassName="text-[13px] font-medium bg-surface border border-border-subtle rounded-xl px-4 py-2 shadow-soft"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setIsAddingTaskLinkLocal(false)}>
              {t("issues.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={wrapSubmit("addLinkedTask", () => {
                handleAddLinkedTask();
                setIsAddingTaskLinkLocal(false);
              })}
              disabled={isSubmitting["addLinkedTask"] || !taskLinkTargetId}
            >
              {t("issues.addLink2")}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
