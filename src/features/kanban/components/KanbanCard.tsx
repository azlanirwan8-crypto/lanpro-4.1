import { safeLocalStorage } from "../../../lib/safeStorage";
import React, { useState } from "react";
import { motion } from "motion/react";
import { cn, ensureDate } from "../../../lib/utils";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { RenderIcon } from "../../../components/RenderIcon";
import { useAppStore } from "../../../store/useAppStore";
import { AlertTriangle, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";

interface KanbanCardProps {
  task: any;
  mArr: any[];
  pArr: any[];
  onClick: () => void;
  isDragging?: boolean;
  shakingTaskId?: string | null;
}

export const KanbanCard = React.memo<KanbanCardProps>(
  ({ task, mArr, pArr, onClick, isDragging, shakingTaskId }) => {
    // ...
    // Line 94 (approx):
    // ...
    // isDragging && "..."
    // shakingTaskId === task.id && "animate-shake"
    const { density, updateTask } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const statusColor =
      mArr.find((m) => m.type === "status" && m.label === task.status)?.color || "#e2e8f0";
    const priorityInfo = mArr.find((m) => m.type === "priority" && m.label === task.priority);
    const isCompact = density === "compact";

    const subtasks = task.subtasks || [];
    const hasUnfinishedSubtasks = subtasks.some((st: any) => st.status !== "Done");
    const totalCount = subtasks.length;
    const completedCount = subtasks.filter((st: any) => st.status === "Done").length;
    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleToggleSubtask = (subtask: any) => {
      const newStatus = subtask.status === "Done" ? "TODO" : "Done";
      const updatedSubtasks = subtasks.map((st: any) =>
        st.id === subtask.id ? { ...st, status: newStatus } : st
      );
      updateTask(task.id, { ...task, subtasks: updatedSubtasks });
    };

    // Check if due date is within 48 hours
    const hasDueDate = !!task.dueDate;
    let isDueSoon = false;
    let isOverdue = false;
    let daysHoursText = "";

    if (hasDueDate) {
      const dueTime = ensureDate(task.dueDate).getTime();
      const nowTime = new Date().getTime();
      const diffMs = dueTime - nowTime;

      if (diffMs < 48 * 60 * 60 * 1000) {
        isDueSoon = true;
        if (diffMs < 0) {
          isOverdue = true;
        } else {
          const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
          if (diffHours >= 24) {
            daysHoursText = `${Math.floor(diffHours / 24)} hari`;
          } else {
            daysHoursText = `${diffHours} jam`;
          }
        }
      }
    }

    // Load QA test status for this task
    const projectId = task.projectId || "default";
    const savedQA = safeLocalStorage.getItem(`qa_test_cases_${projectId}`);
    let qaStatus: "passed" | "failed" | "blocked" | "untested" | null = null;
    if (savedQA) {
      try {
        const parsed = JSON.parse(savedQA);
        const linkedTestCase = parsed.find((tc: any) => tc.caseId === task.id);
        if (linkedTestCase) {
          qaStatus = linkedTestCase.status;
        }
      } catch (e) {}
    }

    const Component = isDragging ? "div" : motion.div;

    return (
      <Component
        {...(!isDragging
          ? {
              layout: true,
              transition: { type: "spring", stiffness: 350, damping: 30 },
              whileHover: { y: -2, transition: { duration: 0.15 } },
              whileTap: { scale: 0.99 },
            }
          : {})}
        onClick={onClick}
        className={cn(
          "bg-surface rounded-lg shadow-2xs border cursor-pointer group flex flex-col overflow-hidden",
          "transition-all duration-200 ease-out select-none border-l-4",
          isCompact ? "p-2 gap-1.5" : "p-3 gap-2",
          task.isBlocked
            ? "border-l-danger border-danger/30 bg-danger/5 hover:border-danger shadow-xs"
            : task.priority === "Highest" || task.priority === "High"
              ? "border-l-danger border-border-subtle/80 hover:border-danger/60 hover:shadow-xs"
              : task.priority === "Medium"
                ? "border-l-warning border-border-subtle/80 hover:border-warning/60 hover:shadow-xs"
                : "border-l-primary border-border-subtle/80 hover:border-primary/60 hover:shadow-xs",
          hasUnfinishedSubtasks && "border-danger/30 bg-danger/5",
          isDragging &&
            "z-[9999] cursor-grabbing opacity-90 shadow-xl ring-2 ring-primary !transition-none pointer-events-none",
          shakingTaskId === task.id && "animate-shake"
        )}
      >
        {/* Top row: task key + status badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 transition-colors flex-wrap">
            {priorityInfo ? (
              <RenderIcon
                iconName={priorityInfo.icon}
                className={cn(
                  "transition-transform duration-200",
                  isCompact ? "w-3 h-3" : "w-3.5 h-3.5"
                )}
                style={{ color: priorityInfo.color }}
              />
            ) : (
              <RenderIcon
                iconName="CheckSquare"
                className={cn(
                  "transition-transform duration-200",
                  isCompact ? "w-3 h-3" : "w-3.5 h-3.5"
                )}
              />
            )}
            <span className="font-mono font-semibold text-[10px] leading-none tracking-tight text-primary bg-primary-surface/10 px-1.5 py-[3px] rounded border border-primary/20">
              {task.key}
            </span>
            {task.priority && (
              <span
                className={cn(
                  "font-medium uppercase rounded tracking-wider border",
                  isCompact
                    ? "text-xs sm:text-[10px] sm:text-[8px] px-1 py-0.2"
                    : "text-xs sm:text-[11px] sm:text-[9px] px-1.5 py-0.2",
                  task.priority === "Highest" || task.priority === "High"
                    ? "bg-danger/10 text-danger-text border-danger/20"
                    : task.priority === "Medium"
                      ? "bg-warning/10 text-warning-text border-warning/20"
                      : "bg-surface-sunken text-content-secondary border-border-subtle"
                )}
              >
                {task.priority}
              </span>
            )}
            {task.isBlocked && (
              <span
                className={cn(
                  "font-medium uppercase text-danger-text bg-danger/10 rounded tracking-widest animate-pulse border border-danger/20",
                  isCompact
                    ? "text-xs sm:text-[10px] sm:text-[8px] px-1 py-0.5"
                    : "text-xs sm:text-[11px] sm:text-[9px] px-1.5 py-0.5"
                )}
              >
                Blocked
              </span>
            )}
            {hasUnfinishedSubtasks && (
              <div
                className="text-danger-text cursor-help"
                title="Kartu terbelenggu: Selesaikan semua subtask sebelum memindahkan ke Done"
              >
                <AlertTriangle className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              </div>
            )}
            {qaStatus && (
              <span
                className={cn(
                  "font-medium uppercase rounded tracking-widest",
                  isCompact
                    ? "text-xs sm:text-[10px] sm:text-[7.5px] px-1 py-0.5"
                    : "text-xs sm:text-[10px] sm:text-[8.5px] px-1.5 py-0.5",
                  qaStatus === "passed"
                    ? "bg-success/10 text-success-text border border-success/20"
                    : qaStatus === "failed"
                      ? "bg-danger/10 text-danger-text border border-danger/20 animate-pulse"
                      : qaStatus === "blocked"
                        ? "bg-warning/10 text-warning-text border border-warning/20"
                        : "bg-surface-muted text-content-muted border border-border-subtle"
                )}
              >
                QA:{" "}
                {qaStatus === "passed"
                  ? "PASS ✅"
                  : qaStatus === "failed"
                    ? "FAIL ❌"
                    : qaStatus === "blocked"
                      ? "BLOCKED ⚠️"
                      : "UNTESTED"}
              </span>
            )}
          </div>

          {/* Warning visual notification for due date within 48 hours */}
          {isDueSoon && (
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs sm:text-[11px] sm:text-[9px] font-medium tracking-tight select-none border animate-pulse shrink-0",
                isOverdue
                  ? "bg-danger/10 border-danger/20 text-danger-text"
                  : "bg-warning/10 border-warning/20 text-warning-text"
              )}
              title={
                isOverdue
                  ? "Terlambat! Tugas telah melewati tanggal jatuh tempo."
                  : `Tenggat waktu kurang dari 48 jam (${daysHoursText})`
              }
            >
              <AlertTriangle className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {!isCompact && <span>{isOverdue ? "Terlambat" : `Sisa ${daysHoursText}`}</span>}
            </div>
          )}
        </div>

        {/* Task Title */}
        <h4
          className={cn(
            "text-content-body leading-snug group-hover:text-content transition-colors duration-200",
            isCompact ? "font-medium text-xs line-clamp-1" : "font-medium text-sm line-clamp-2"
          )}
        >
          {task.title}
        </h4>

        {/* Info Row: Category & Avatar */}
        <div
          className={cn(
            "flex items-center justify-between border-t border-border-faint",
            isCompact ? "mt-1 pt-1" : "mt-2 pt-2"
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1 bg-surface-sunken border border-border-faint group-hover:bg-primary-surface/5 group-hover:border-primary/20 transition-colors duration-300 rounded-full",
                isCompact ? "px-1.5 py-0" : "px-2 py-0.5"
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              <span
                className={cn(
                  "font-medium text-content-muted group-hover:text-primary uppercase tracking-wider transition-colors duration-300",
                  isCompact ? "text-xs sm:text-[10px] sm:text-[8px]" : "text-xs sm:text-[10px]"
                )}
              >
                {task.status}
              </span>
            </div>
            {task.category && (
              <span
                className={cn(
                  "font-medium text-content-subtle capitalize px-1",
                  isCompact ? "text-xs sm:text-[10px] sm:text-[8px]" : "text-xs sm:text-[10px]"
                )}
              >
                {task.category}
              </span>
            )}
          </div>
          <div className="flex items-center group-hover:scale-105 transition-transform duration-300">
            <UserAvatar
              uid={task.assigneeId || ""}
              members={pArr}
              className={cn("ring-2 ring-surface shadow-soft", isCompact ? "w-5 h-5" : "w-6 h-6")}
            />
          </div>
        </div>

        {totalCount > 0 && (
          <div className="mt-2 pt-2 border-t border-border-faint">
            <div
              className="flex items-center justify-between text-xs sm:text-[10px] text-content-muted mb-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              <div className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-primary" />
                <span
                  className={cn(
                    "font-medium",
                    percentage === 100 ? "text-success-text" : "text-content-secondary"
                  )}
                >
                  {completedCount}/{totalCount} Subtasks ({Math.round(percentage)}%)
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3 text-content-subtle" />
              ) : (
                <ChevronDown className="w-3 h-3 text-content-subtle" />
              )}
            </div>
            <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  percentage === 0
                    ? "bg-border-subtle"
                    : percentage === 100
                      ? "bg-success-surface"
                      : "bg-primary-surface"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {isExpanded && (
              <div className="mt-2 space-y-1">
                {subtasks.map((st: any) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 text-xs sm:text-[10px] text-content-secondary cursor-pointer hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSubtask(st);
                    }}
                  >
                    {st.status === "Done" ? (
                      <CheckSquare className="w-3 h-3 text-success-text" />
                    ) : (
                      <Square className="w-3 h-3 text-content-subtle" />
                    )}
                    <span
                      className={st.status === "Done" ? "line-through text-content-subtle" : ""}
                    >
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Component>
    );
  }
) as any;
