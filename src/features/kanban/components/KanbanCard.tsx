import { useTranslation } from "react-i18next";
import { safeLocalStorage } from "../../../lib/safeStorage";
import React, { useState } from "react";
import { motion } from "motion/react";
import { cn, ensureDate } from "../../../lib/utils";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { RenderIcon } from "../../../components/RenderIcon";
import { LabelChip } from "../../../components/ui/CommonComponents";
import { useAppStore } from "../../../store/useAppStore";
import { statusSelesai } from "../../../lib/statusSelesai";
import { cariMaster, gayaLabel, warnaDariMaster } from "../../../lib/warnaLabel";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  MessageSquare,
} from "lucide-react";

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
    const { t } = useTranslation();
    // ...
    // Line 94 (approx):
    // ...
    // isDragging && "..."
    // shakingTaskId === task.id && "animate-shake"
    const { density, updateTask } = useAppStore();
    const [isExpanded, setIsExpanded] = useState(false);
    /** #564 — satu hex untuk titik, teks dan ikon: warna labelnya sendiri. */
    const statusColor = warnaDariMaster(mArr, "status", task.status);
    const priorityInfo = cariMaster(mArr, "priority", task.priority);
    const priorityColor = warnaDariMaster(mArr, "priority", task.priority);
    const isCompact = density === "compact";

    const subtasks = task.subtasks || [];
    const hasUnfinishedSubtasks = subtasks.some((st: any) => !statusSelesai(st.status, mArr));
    const totalCount = subtasks.length;
    const completedCount = subtasks.filter((st: any) => statusSelesai(st.status, mArr)).length;
    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleToggleSubtask = (subtask: any) => {
      const terminal =
        mArr.find((m) => m.type === "status" && (m.isTerminal === true || m.isTerminal === 1))
          ?.label || "Done";
      const todo =
        mArr.find((m) => m.type === "status" && !(m.isTerminal === true || m.isTerminal === 1))
          ?.label || "TODO";
      const newStatus = statusSelesai(subtask.status, mArr) ? todo : terminal;
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
        style={task.isBlocked ? undefined : { borderLeftColor: priorityColor }}
        className={cn(
          "bg-surface rounded-lg shadow-2xs border cursor-pointer group flex flex-col overflow-hidden",
          "transition-all duration-200 ease-out select-none border-l-4",
          isCompact ? "p-2 gap-1.5" : "p-3 gap-2",
          task.isBlocked
            ? "border-l-danger border-danger/30 bg-danger/5 hover:border-danger shadow-xs"
            : "border-border-subtle/80",
          hasUnfinishedSubtasks && "border-danger/30 bg-danger/5",
          isDragging &&
            "z-[9999] cursor-grabbing opacity-90 shadow-xl ring-2 ring-primary !transition-none pointer-events-none",
          shakingTaskId === task.id && "animate-shake"
        )}
      >
        {/* Top row: alert/blocked/QA/due badges (hanya jika ada) */}
        {(task.isBlocked || hasUnfinishedSubtasks || qaStatus || isDueSoon) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 transition-colors flex-wrap">
              {task.isBlocked && (
                <span
                  className={cn(
                    "font-normal text-danger-text bg-danger/10 rounded animate-pulse border border-danger/20 text-[10px] px-1.5 py-0.5"
                  )}
                >
                  Blocked
                </span>
              )}
              {hasUnfinishedSubtasks && (
                <div className="text-danger-text cursor-help" title={t("kanban.blockedCardHint")}>
                  <AlertTriangle className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
                </div>
              )}
              {qaStatus && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-[10px] font-normal text-content-subtle">QA:</span>
                  <LabelChip
                    kelompok="qa_status"
                    nilai={qaStatus}
                    masterData={mArr}
                    className={isCompact ? "text-[8px] px-1 py-0" : undefined}
                  />
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
        )}

        {/* Task Title */}
        <h4
          className={cn(
            "text-content-body leading-snug group-hover:text-content transition-colors duration-200",
            isCompact ? "font-normal text-xs line-clamp-1" : "font-normal text-xs line-clamp-2"
          )}
        >
          {task.title}
        </h4>

        {/* Info Row: Priority, Status, Category & Avatar */}
        <div
          className={cn(
            "flex items-center justify-between border-t border-border-faint",
            isCompact ? "mt-1 pt-1" : "mt-2 pt-2"
          )}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.priority && (
              <div
                style={gayaLabel(priorityColor)}
                className={cn(
                  "label-chip flex items-center gap-1 rounded border text-[10px] font-normal",
                  isCompact ? "px-1.5 py-0" : "px-1.5 py-0.5"
                )}
              >
                {priorityInfo?.icon && (
                  <RenderIcon
                    iconName={priorityInfo.icon}
                    className={cn(
                      "transition-transform duration-200",
                      isCompact ? "w-2.5 h-2.5" : "w-3 h-3"
                    )}
                    style={{ color: priorityColor }}
                  />
                )}
                <span>{task.priority}</span>
              </div>
            )}
            <div
              style={gayaLabel(statusColor)}
              className={cn(
                "label-chip flex items-center gap-1 border transition-colors duration-300 rounded-full",
                isCompact ? "px-1.5 py-0" : "px-2 py-0.5"
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              <span
                className={cn(
                  "font-normal transition-colors duration-300",
                  isCompact ? "text-[10px]" : "text-xs"
                )}
              >
                {task.status}
              </span>
            </div>
            {task.category && (
              <LabelChip
                kelompok="category"
                nilai={task.category}
                masterData={mArr}
                className={isCompact ? "text-[8px] sm:px-1.5 sm:py-0" : undefined}
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {Number(task.commentsCount || 0) > 0 && (
              <div
                className="flex items-center gap-1 text-content-muted hover:text-content text-[10px] font-normal transition-colors select-none"
                title={`${task.commentsCount} ${t("comments.tabComments", "Komentar")}`}
              >
                <MessageSquare className={cn(isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
                <span>{task.commentsCount}</span>
              </div>
            )}
            <div className="flex items-center group-hover:scale-105 transition-transform duration-300">
              <UserAvatar
                uid={task.assigneeId || ""}
                members={pArr}
                className={cn("ring-2 ring-surface shadow-soft", isCompact ? "w-5 h-5" : "w-6 h-6")}
              />
            </div>
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
                    ? "bg-surface-marker"
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
                    {statusSelesai(st.status, mArr) ? (
                      <CheckSquare className="w-3 h-3 text-success-text" />
                    ) : (
                      <Square className="w-3 h-3 text-content-subtle" />
                    )}
                    <span
                      className={
                        statusSelesai(st.status, mArr) ? "line-through text-content-subtle" : ""
                      }
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
