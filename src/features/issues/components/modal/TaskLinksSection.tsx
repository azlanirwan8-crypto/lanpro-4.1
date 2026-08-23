import { useTranslation } from "react-i18next";
import React from "react";
import { Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./TaskDetailPrimitives";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import { Task, MasterData } from "../../../../types";

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
  return (
    <div className="space-y-4 pt-4 border-t border-border-faint">
      <div className="flex items-center justify-between">
        <h4 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-subtle">
          {t("jsx.j92")}
        </h4>
        {isEditable && (
          <button
            onClick={() => setIsAddingTaskLinkLocal(!isAddingTaskLinkLocal)}
            className="text-xs sm:text-[10px] font-medium text-indigo-600 hover:underline"
          >
            {t("jsx.j93")}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {task.linkedTasks?.map((link, linkIdx) => {
          const target = (tasks || []).find((t) => t.id === link.targetTaskId);
          if (!target) return null;
          return (
            <div
              key={link.id ? `${link.id}-${linkIdx}` : `link-${linkIdx}`}
              className="p-3 bg-surface rounded-xl border border-border-faint shadow-soft space-y-2 group/link relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] leading-none sm:text-[9px] font-medium uppercase text-indigo-500 bg-indigo-500/10 px-1.5 py-[3px] rounded tracking-widest">
                  {link.relationType.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => handleRemoveLinkedTask(task.id, link.id)}
                  className="text-content-subtle hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors opacity-0 group-hover/link:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-[10px] font-mono font-medium text-content-subtle">
                  {target.key}
                </span>
                <span className="text-xs font-medium text-content-body truncate">
                  {target.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

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
              { id: "blocks", label: "Blocks" },
              { id: "is_blocked_by", label: "Is blocked by" },
              { id: "relates_to", label: "Relates to" },
            ]}
            masterData={masterData}
            className="w-full"
            buttonClassName="text-[13px] font-medium bg-surface border border-border-subtle rounded-xl px-4 py-2 shadow-soft"
          />
          <StyledDropdown
            value={taskLinkTargetId}
            onChange={(val) => setTaskLinkTargetId(val)}
            options={[
              { id: "", label: "Select task..." },
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
              {t("jsx.k64")}
            </Button>
            <Button
              size="sm"
              onClick={wrapSubmit("addLinkedTask", () => {
                handleAddLinkedTask();
                setIsAddingTaskLinkLocal(false);
              })}
              disabled={isSubmitting["addLinkedTask"] || !taskLinkTargetId}
            >
              {t("jsx.j95")}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
