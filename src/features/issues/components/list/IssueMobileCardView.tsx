import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  ChevronRight,
  MoreVertical,
  Zap,
  CircleDot,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { cn, ensureDate } from "../../../../lib/utils";
import { RenderIcon } from "../../../../components/RenderIcon";
import { Task, MasterData, UserProfile, Sprint } from "../../../../types";

interface IssueMobileCardViewProps {
  tasks: Task[];
  masterData: MasterData[];
  projectMembers: UserProfile[];
  sprints: Sprint[];
  isUserReporter: (issue: Task) => boolean;
  canDeleteIssue: (issue: Task) => boolean;
  canEditIssue: (issue: Task) => boolean;
  canManageIssue: (issue: Task) => boolean;
  deleteTask?: (id: string) => void;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  updateTaskField: (id: string, field: string, value: any) => void;
  selectedTaskIds: Set<string>;
  handleToggleSelectOne: (id: string) => void;
}

export const IssueMobileCardView: React.FC<IssueMobileCardViewProps> = ({
  tasks,
  masterData,
  projectMembers,
  sprints,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  updateTaskField,
  selectedTaskIds,
  handleToggleSelectOne,
}) => {
  const { t } = useTranslation();

  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <div className="sm:hidden flex flex-col divide-y divide-border-subtle/60 pb-20">
      {tasks.map((task) => {
        const isSelected = selectedTaskIds.has(task.id);
        const assignee = projectMembers.find(
          (m) => m.id === task.assigneeId || (m as any).uid === task.assigneeId
        );
        const statusMeta = masterData.find(
          (m) =>
            m.type === "status" &&
            (m.label?.toLowerCase() === task.status?.toLowerCase() || m.id === task.status)
        );
        const priorityMeta = masterData.find(
          (m) =>
            m.type === "priority" &&
            (m.label?.toLowerCase() === task.priority?.toLowerCase() || m.id === task.priority)
        );
        const typeMeta = masterData.find(
          (m) =>
            (m.type === "issue_type" || m.type === "issueType") &&
            (m.label?.toLowerCase() === task.type?.toLowerCase() || m.id === task.type)
        );
        const sprint = sprints.find((s) => s.id === task.sprintId);

        return (
          <div
            key={task.id}
            onClick={() => {
              setSelectedTaskForDetail(task);
              setIsTaskDetailModalOpen(true);
            }}
            className={cn(
              "p-3.5 bg-surface hover:bg-surface-sunken/60 active:bg-surface-sunken transition-all cursor-pointer flex flex-col gap-2.5",
              isSelected && "bg-primary/5"
            )}
          >
            {/* Header: Type icon, Key, Status Chip, Story Points */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="shrink-0">
                  {typeMeta?.icon ? (
                    <RenderIcon iconName={typeMeta.icon} className="w-4 h-4 text-primary" />
                  ) : task.type === "epic" ? (
                    <Zap className="w-4 h-4 text-purple-600" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-primary" />
                  )}
                </div>
                <span className="text-xs font-semibold text-content-body tracking-wider shrink-0">
                  {task.key || `#${task.id.slice(0, 5)}`}
                </span>
                {sprint && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-content-muted border border-border-subtle truncate max-w-[90px]">
                    {sprint.name}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div className="shrink-0 flex items-center gap-1.5">
                {task.storyPoints !== undefined && task.storyPoints !== null && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-strong text-content-body">
                    {task.storyPoints} pts
                  </span>
                )}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border-subtle/80 bg-surface-sunken text-content-body inline-flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: statusMeta?.color || "#405189" }}
                  />
                  {statusMeta?.label || task.status}
                </span>
              </div>
            </div>

            {/* Title / Summary */}
            <h4 className="text-sm font-medium text-content-strong leading-snug line-clamp-2">
              {task.title}
            </h4>

            {/* Footer info: Priority, Assignee Avatar, Due date */}
            <div className="flex items-center justify-between pt-1 border-t border-border-faint text-xs text-content-muted">
              {/* Priority badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium inline-flex items-center gap-1 text-content-body">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: priorityMeta?.color || "#94a3b8" }}
                  />
                  {priorityMeta?.label || task.priority || "Normal"}
                </span>
                {task.dueDate && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-content-muted ml-2">
                    <Clock className="w-3 h-3 text-content-subtle" />
                    {format(ensureDate(task.dueDate), "dd MMM")}
                  </span>
                )}
              </div>

              {/* Assignee Avatar */}
              <div className="flex items-center gap-1.5">
                {assignee ? (
                  <div className="flex items-center gap-1">
                    {assignee.avatarUrl || (assignee as any).avatar_url ? (
                      <img
                        src={assignee.avatarUrl || (assignee as any).avatar_url}
                        alt={assignee.name || assignee.displayName || "Assignee"}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-border-subtle"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                        {(assignee.name || assignee.displayName || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-[11px] text-content-body truncate max-w-[80px]">
                      {assignee.name || assignee.displayName}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-content-subtle italic">
                    {t("newTask.unassigned")}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-content-subtle ml-1" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
