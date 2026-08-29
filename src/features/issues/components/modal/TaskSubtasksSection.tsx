import { useTranslation } from "react-i18next";
import React from "react";
import { Layout, Trash2 } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { UncontrolledInput } from "./TaskDetailPrimitives";
import { UserAvatar } from "../../../../components/ui/UserAvatar";
import { PriorityIcon } from "../../../../components/ui/CommonComponents";
import { confirmDeleteAlert, showSuccessAlert } from "../../../../lib/sweetalert";
import { Task, MasterData, UserProfile } from "../../../../types";

interface TaskSubtasksSectionProps {
  task: Task;
  tasks: Task[];
  isEditable: boolean;
  isUpdatingTask?: Record<string, boolean>;
  updateTaskField: (id: string, field: string, value: any) => Promise<any> | void;
  deleteTask: (id: string) => Promise<void> | void;
  projectMembers: UserProfile[];
  masterData: MasterData[];
}

export const TaskSubtasksSection: React.FC<TaskSubtasksSectionProps> = ({
  task,
  tasks,
  isEditable,
  isUpdatingTask,
  updateTaskField,
  deleteTask,
  projectMembers,
  masterData,
}) => {
  const { t } = useTranslation();
  const childSubtasks = tasks.filter((t) => t.parentId === task.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-normal text-content uppercase tracking-widest flex items-center gap-2">
          <Layout className="w-4 h-4 text-blue-500" />
          {t("subtasks.list")}
        </h3>
      </div>
      <div className="space-y-3 p-4 bg-surface-sunken/50 rounded-lg border border-dashed border-border-subtle shadow-xs">
        {childSubtasks.map((st, stIdx) => (
          <div
            key={st.id ? `${st.id}-${stIdx}` : `sub-${stIdx}`}
            className={cn(
              "flex items-center gap-4 p-3 bg-surface hover:bg-indigo-500/10 rounded-xl group border border-border-faint transition-all shadow-soft",
              isUpdatingTask?.[st.id]
                ? "opacity-50 pointer-events-none"
                : "hover:border-indigo-500/30"
            )}
          >
            <input
              type="checkbox"
              className="w-5 h-5 rounded-lg border-border-subtle text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer shadow-soft"
              checked={st.status === "Done"}
              onChange={() =>
                updateTaskField(st.id, "status", st.status === "Done" ? "To Do" : "Done")
              }
              disabled={!isEditable}
            />
            <span className="text-xs sm:text-[10px] font-mono font-normal text-content-subtle bg-surface-sunken px-1.5 py-0.5 rounded border border-border-subtle shrink-0 select-all uppercase tracking-tighter">
              {st.key}
            </span>
            <UncontrolledInput
              className={cn(
                "text-[13px] font-medium text-content-body bg-transparent border-none focus:ring-0 flex-1 min-w-0 disabled:text-content-subtle transition-all",
                st.status === "Done" && "line-through opacity-50"
              )}
              initialValue={st.title}
              onSave={(val: string) => updateTaskField(st.id, "title", val)}
              onAutoSave={(val: string) => updateTaskField(st.id, "title", val)}
              placeholder={t("subtasks.untitled")}
              disabled={!isEditable}
            />
            <div className="flex items-center gap-3 shrink-0">
              <UserAvatar
                uid={st.assigneeId || ""}
                members={projectMembers}
                className="w-6 h-6 border border-surface shadow-soft ring-1 ring-border-faint"
              />
              <div className="h-4 w-px bg-surface-strong" />
              <PriorityIcon
                priority={st.priority || "Medium"}
                masterData={masterData}
                className="w-3.5 h-3.5"
              />
              {isEditable && (
                <button
                  type="button"
                  onClick={async () => {
                    const isConfirmed = await confirmDeleteAlert(
                      "Hapus Subtask?",
                      `Apakah Anda yakin ingin menghapus subtask "${st.title || "Untitled Subtask"}"? Tindakan ini tidak dapat dibatalkan.`
                    );
                    if (isConfirmed) {
                      deleteTask(st.id);
                      showSuccessAlert("Berhasil!", "Subtask berhasil dihapus.");
                    }
                  }}
                  className="p-1 text-content-subtle hover:text-danger-text hover:bg-danger/10 rounded-lg transition-colors ml-1"
                  title={t("subtasks.delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {childSubtasks.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-xs font-normal text-content-subtle uppercase tracking-widest italic">
              {t("subtasks.empty")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
