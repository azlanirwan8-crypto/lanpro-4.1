import React from "react";
import { Activity, User, Zap, Sparkles, ShieldAlert, Layers, Tag, Calendar, Clock, LineChart, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn, ensureDate } from "../../../../lib/utils";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import { UncontrolledInput } from "./TaskDetailPrimitives";
import { confirmDeleteAlert, showSuccessAlert } from "../../../../lib/sweetalert";
import { Task, MasterData, UserProfile, Sprint } from "../../../../types";

interface TaskDetailSidebarProps {
  task: Task;
  masterData: MasterData[];
  projectMembers: UserProfile[];
  sprints: Sprint[];
  isEditable: boolean;
  blockMember: boolean;
  isProjectMember: boolean;
  isReporter: boolean;
  canDelete: boolean;
  isUpdatingTask?: Record<string, boolean>;
  updateTaskField: (id: string, field: string, value: any) => Promise<any> | void;
  toggleBlockedStatus: (id: string) => void;
  handleSuggestStoryPoints: (task: Task) => void;
  deleteTask: (id: string) => Promise<void> | void;
  onClose: () => void;
  safeFormat: (date: any, formatStr: string, fallback?: string) => string;
}

export const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({
  task,
  masterData,
  projectMembers,
  sprints,
  isEditable,
  blockMember,
  isProjectMember,
  isReporter,
  canDelete,
  isUpdatingTask,
  updateTaskField,
  toggleBlockedStatus,
  handleSuggestStoryPoints,
  deleteTask,
  onClose,
  safeFormat,
}) => {
  return (
    <div
      className={cn(
        "lg:col-span-4 bg-surface-sunken/70/40 p-4 md:p-5 space-y-4 border-l border-border-subtle/80 min-h-full transition-opacity text-left",
        isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none"
      )}
    >
      {/* Header Title */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle/80">
        <h4 className="text-xs font-medium text-content-strong uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          Issue Attributes
        </h4>
        <span className="text-xs sm:text-[10px] font-medium text-content-muted bg-surface-strong/60 px-2 py-0.5 rounded-md">
          {task.key || "ATTR"}
        </span>
      </div>

      {/* Main Lifecycle Status Select */}
      <div className="space-y-1.5">
        <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-content-subtle" />
          Lifecycle Status
        </label>
        <StyledDropdown
          value={task.status}
          options={masterData
            .filter((m) => m.type?.toLowerCase() === "status")
            .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color }))}
          masterData={masterData}
          type="status"
          onChange={(val) => updateTaskField(task.id, "status", val)}
          disabled={!isEditable}
          className="w-full"
          buttonClassName="h-[38px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-3 text-xs font-medium"
        />
      </div>

      <div className="h-px bg-surface-strong/70 my-2" />

      {/* Metadata Controls List */}
      <div className="space-y-3.5">
        {/* Assignee */}
        <div className="space-y-1">
          <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3 h-3 text-content-subtle" />
            Assignee
          </label>
          <StyledDropdown
            value={task.assigneeId || ""}
            onChange={(val) => updateTaskField(task.id, "assigneeId", val)}
            options={[
              { id: "", label: "Unassigned" },
              ...(projectMembers || []).map((m) => ({
                id: m?.uid || "",
                label: m?.displayName || m?.email || "Unknown",
              })),
            ]}
            members={projectMembers}
            type="member"
            masterData={[]}
            className={cn("w-full", blockMember && "pointer-events-none opacity-80")}
            buttonClassName="h-[38px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-3 text-xs font-medium text-content-body"
            disabled={!isEditable || blockMember}
          />
        </div>

        {/* Reporter */}
        <div className="space-y-1">
          <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3 h-3 text-content-subtle" />
            Reporter
          </label>
          <StyledDropdown
            value={task.reporterId || ""}
            onChange={(val) => updateTaskField(task.id, "reporterId", val)}
            options={[
              { id: "", label: "None" },
              ...(projectMembers || []).map((m) => ({
                id: m?.uid || "",
                label: m?.displayName || m?.email || "Unknown",
              })),
            ]}
            members={projectMembers}
            type="member"
            masterData={[]}
            className={cn("w-full", blockMember && "pointer-events-none opacity-80")}
            buttonClassName="h-[38px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-3 text-xs font-medium text-content-body"
            disabled={!isEditable || blockMember}
          />
        </div>

        {/* Priority & Points Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-content-subtle" />
              Priority
            </label>
            <StyledDropdown
              value={task.priority ?? ""}
              options={masterData
                .filter((m) => m.type?.toLowerCase() === "priority")
                .map((p) => ({
                  id: p.label,
                  label: p.label,
                  icon: p.icon,
                  color: p.color,
                }))}
              masterData={masterData}
              type="priority"
              onChange={(val) => updateTaskField(task.id, "priority", val)}
              disabled={!isEditable || blockMember}
              className={cn("w-full", blockMember && "pointer-events-none opacity-80")}
              buttonClassName="h-[38px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-3 text-xs font-medium"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider">
                Points
              </label>
              {isEditable && (!isProjectMember || isReporter) && (
                <button
                  onClick={() => handleSuggestStoryPoints(task)}
                  className="text-xs sm:text-[10px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" /> AI
                </button>
              )}
            </div>
            <UncontrolledInput
              type="number"
              initialValue={task.storyPoints || ""}
              onSave={(val: any) =>
                updateTaskField(task.id, "storyPoints", parseInt(val) || 0)
              }
              className="h-[38px] w-full text-xs font-medium bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-3 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all shadow-2xs outline-none text-content-body"
              disabled={!isEditable || blockMember}
              placeholder="0"
            />
          </div>
        </div>

        {/* Blocked Status */}
        <div className="space-y-1">
          <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-content-subtle" />
            Blocked Status
          </label>
          <button
            onClick={() => toggleBlockedStatus(task.id)}
            disabled={!isEditable || blockMember}
            className={cn(
              "h-[38px] w-full flex items-center justify-between px-3 rounded-md border transition-all text-xs font-medium uppercase tracking-wider shadow-2xs",
              task.isBlocked
                ? "bg-red-500/10 border-red-500/30 text-red-600 shadow-xs"
                : "bg-surface border-border-subtle/80 text-content-muted hover:border-red-500/30 hover:text-red-500",
              blockMember && "pointer-events-none opacity-80"
            )}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={cn("w-3.5 h-3.5", task.isBlocked && "animate-pulse")}
              />
              {task.isBlocked ? "Blocked" : "Clear"}
            </div>
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                task.isBlocked
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  : "bg-surface-marker"
              )}
            />
          </button>
        </div>

        {/* Current Sprint */}
        <div className="space-y-1">
          <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-content-subtle" />
            Current Sprint
          </label>
          <StyledDropdown
            value={task.sprintId || ""}
            onChange={(val) => updateTaskField(task.id, "sprintId", val || null)}
            options={[
              { id: "", label: "No sprint assigned", icon: "Box" },
              ...sprints.map((s) => ({
                id: s.id,
                label: `${s.name} (${s.status})`,
                icon: "IterationCcw",
              })),
            ]}
            type="sprint"
            masterData={masterData}
            disabled={!isEditable || blockMember}
            className={cn("w-full", blockMember && "pointer-events-none opacity-80")}
            buttonClassName="h-[38px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-3 text-xs font-medium text-content-body"
          />
        </div>

        {/* Release / Milestone */}
        <div className="space-y-1">
          <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-content-subtle" />
            Release / Milestone
          </label>
          <StyledDropdown
            value={task.release || ""}
            onChange={(val) => updateTaskField(task.id, "release", val)}
            options={[
              { id: "", label: "Select release...", icon: "Box" },
              ...masterData
                .filter((d) => d.type === "release")
                .map((d) => ({
                  id: d.label,
                  label: d.label,
                  icon: "Box",
                })),
            ]}
            type="release"
            masterData={masterData}
            disabled={!isEditable || blockMember}
            className={cn("w-full", blockMember && "pointer-events-none opacity-80")}
            buttonClassName="h-[38px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-3 text-xs font-medium text-content-body"
          />
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-content-subtle" />
              Start Date
            </label>
            <UncontrolledInput
              type="date"
              initialValue={
                task.startDate ? format(ensureDate(task.startDate), "yyyy-MM-dd") : ""
              }
              onSave={(val: any) => updateTaskField(task.id, "startDate", val)}
              className={cn(
                "h-[38px] w-full text-xs font-medium bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 shadow-2xs outline-none text-content-body",
                blockMember && "opacity-70 cursor-not-allowed"
              )}
              disabled={!isEditable || blockMember}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-content-subtle" />
              End Date
            </label>
            <UncontrolledInput
              type="date"
              initialValue={
                task.endDate ? format(ensureDate(task.endDate), "yyyy-MM-dd") : ""
              }
              onSave={(val: any) => updateTaskField(task.id, "endDate", val)}
              className={cn(
                "h-[38px] w-full text-xs font-medium bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 shadow-2xs outline-none text-content-body",
                blockMember && "opacity-70 cursor-not-allowed"
              )}
              disabled={!isEditable || blockMember}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-content-subtle" />
              Due Date
            </label>
            <UncontrolledInput
              type="date"
              initialValue={
                task.dueDate ? format(ensureDate(task.dueDate), "yyyy-MM-dd") : ""
              }
              onSave={(val: any) => updateTaskField(task.id, "dueDate", val)}
              className={cn(
                "h-[38px] w-full text-xs font-medium bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 shadow-2xs outline-none text-content-body",
                blockMember && "opacity-70 cursor-not-allowed"
              )}
              disabled={!isEditable || blockMember}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-content-subtle" />
              Labels
            </label>
            <UncontrolledInput
              initialValue={task.labels?.join(", ") || ""}
              onSave={(val: any) =>
                updateTaskField(
                  task.id,
                  "labels",
                  val
                    .split(",")
                    .map((l: any) => l.trim())
                    .filter(Boolean)
                )
              }
              placeholder="Add tags..."
              className="h-[38px] w-full text-xs font-medium bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 shadow-2xs outline-none text-content-body"
              disabled={!isEditable}
            />
          </div>
        </div>

        {/* Time Tracking Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-content-subtle" />
              Est. Hours
            </label>
            <UncontrolledInput
              type="number"
              min="0"
              step="0.5"
              initialValue={task.estimatedHours || ""}
              onSave={(val: any) =>
                updateTaskField(task.id, "estimatedHours", parseFloat(val) || 0)
              }
              className="h-[38px] w-full text-xs font-medium bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-3 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 shadow-2xs outline-none text-content-body"
              disabled={!isEditable}
              placeholder="e.g. 5"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider flex items-center gap-1.5">
              <LineChart className="w-3 h-3 text-indigo-500" />
              Logged Hours
            </label>
            <UncontrolledInput
              type="number"
              min="0"
              step="0.5"
              initialValue={task.loggedHours || ""}
              onSave={(val: any) =>
                updateTaskField(task.id, "loggedHours", parseFloat(val) || 0)
              }
              className="h-[38px] w-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-500/30 rounded-md px-3 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 shadow-2xs outline-none text-indigo-700"
              disabled={!isEditable}
              placeholder="e.g. 2.5"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-surface-strong/70 my-2" />

      {/* Footer Metadata */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-xs sm:text-[11px] text-content-muted">
          <span>Created</span>
          <span className="font-medium text-content-body">
            {safeFormat(task.createdAt, "MMM d, yyyy HH:mm")}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs sm:text-[11px] text-content-muted">
          <span>Updated</span>
          <span className="font-medium text-content-body">
            {safeFormat(task.updatedAt, "MMM d, yyyy HH:mm")}
          </span>
        </div>
        {canDelete && (
          <div className="pt-3">
            <button
              className="w-full h-9 text-xs font-medium text-red-600 bg-red-500/10 hover:bg-red-500/15 border border-red-500/30 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              onClick={async () => {
                const isConfirmed = await confirmDeleteAlert(
                  "Hapus Task / Issue Permanen?",
                  `Apakah Anda yakin ingin menghapus "${task.title}"? Tindakan ini tidak dapat dibatalkan. Semua data terkait akan terhapus permanen.`
                );
                if (isConfirmed) {
                  deleteTask(task.id);
                  onClose();
                  showSuccessAlert("Berhasil!", "Task / Issue telah dihapus.");
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
