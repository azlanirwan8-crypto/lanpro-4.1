import { useTranslation } from "react-i18next";
import React from "react";
import {
  Activity,
  User,
  Zap,
  Sparkles,
  ShieldAlert,
  Layers,
  Tag,
  Calendar,
  Clock,
  LineChart,
  Trash2,
} from "lucide-react";
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
  /** Item #201 — hanya Admin/Manager/Head atau Reporter: menggerbangi Assignee & Reporter. */
  canManage: boolean;
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
  canManage,
  canDelete,
  isUpdatingTask,
  updateTaskField,
  toggleBlockedStatus,
  handleSuggestStoryPoints,
  deleteTask,
  onClose,
  safeFormat,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "lg:col-span-4 bg-surface-sunken/70/40 p-4 md:p-5 space-y-4 border-l border-border-subtle/80 min-h-full transition-opacity text-left",
        isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none"
      )}
    >
      {/* Header Title */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle/80">
        <h4 className="text-[11px] font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          {t("issueDetail.issueAttributes")}
        </h4>
        <span className="text-[10px] font-normal text-content-muted bg-surface-strong/60 px-2 py-0.5 rounded">
          {task.key || "ATTR"}
        </span>
      </div>

      {/* Main Lifecycle Status Select */}
      <div className="space-y-1">
        <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-content-subtle" />
          {t("issueDetail.lifecycleStatus")}
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
          buttonClassName="h-[32px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2.5 text-xs font-normal"
        />
      </div>

      <div className="h-px bg-surface-strong/70 my-1.5" />

      {/* Metadata Controls List */}
      <div className="space-y-3">
        {/* Assignee */}
        <div className="space-y-1">
          <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3 h-3 text-content-subtle" />
            {t("issueDetail.assignee")}
          </label>
          <StyledDropdown
            value={task.assigneeId || ""}
            onChange={(val) => updateTaskField(task.id, "assigneeId", val)}
            options={[
              { id: "", label: t("newTask.unassigned") },
              ...(projectMembers || []).map((m) => ({
                id: m?.uid || "",
                label: m?.displayName || m?.email || "Unknown",
              })),
            ]}
            members={projectMembers}
            type="member"
            masterData={[]}
            className={cn("w-full", !canManage && "pointer-events-none opacity-80")}
            buttonClassName="h-[32px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2.5 text-xs font-normal text-content-body"
            disabled={!canManage}
          />
        </div>

        {/* Reporter */}
        <div className="space-y-1">
          <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3 h-3 text-content-subtle" />
            {t("issueDetail.reporter")}
          </label>
          <StyledDropdown
            value={task.reporterId || ""}
            onChange={(val) => updateTaskField(task.id, "reporterId", val)}
            options={[
              { id: "", label: t("common.linkNone") },
              ...(projectMembers || []).map((m) => ({
                id: m?.uid || "",
                label: m?.displayName || m?.email || "Unknown",
              })),
            ]}
            members={projectMembers}
            type="member"
            masterData={[]}
            className={cn("w-full", !canManage && "pointer-events-none opacity-80")}
            buttonClassName="h-[32px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2.5 text-xs font-normal text-content-body"
            disabled={!canManage}
          />
        </div>

        {/* Priority & Points Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-content-subtle" />
              {t("issueDetail.priority")}
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
              buttonClassName="h-[32px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2.5 text-xs font-normal"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider">
                {t("issueDetail.points")}
              </label>
              {isEditable && (!isProjectMember || isReporter) && (
                <button
                  onClick={() => handleSuggestStoryPoints(task)}
                  className="text-[10px] font-normal text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" /> AI
                </button>
              )}
            </div>
            <UncontrolledInput
              type="number"
              initialValue={task.storyPoints || ""}
              onSave={(val: any) => updateTaskField(task.id, "storyPoints", parseInt(val) || 0)}
              className="h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs outline-none text-content-body"
              disabled={!isEditable || blockMember}
              placeholder="0"
            />
          </div>
        </div>

        {/* Blocked Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-content-subtle" />
            {t("issueDetail.blockedStatus")}
          </label>
          <button
            onClick={() => toggleBlockedStatus(task.id)}
            disabled={!isEditable || blockMember}
            className={cn(
              "h-[32px] w-full flex items-center justify-between px-2.5 rounded-md border transition-all text-xs font-normal tracking-tight shadow-2xs",
              task.isBlocked
                ? "bg-red-500/10 border-red-500/30 text-red-600 shadow-xs"
                : "bg-surface border-border-subtle/80 text-content-muted hover:border-red-500/30 hover:text-red-500",
              blockMember && "pointer-events-none opacity-80"
            )}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className={cn("w-3.5 h-3.5", task.isBlocked && "animate-pulse")} />
              {task.isBlocked ? t("issueDetail.blocked") : t("issueDetail.clear")}
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
          <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-content-subtle" />
            {t("issueDetail.currentSprint")}
          </label>
          <StyledDropdown
            value={task.sprintId || ""}
            onChange={(val) => updateTaskField(task.id, "sprintId", val || null)}
            options={[
              { id: "", label: t("issueDetail.noSprintAssigned"), icon: "Box" },
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
            buttonClassName="h-[32px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2.5 text-xs font-normal text-content-body"
          />
        </div>

        {/* Release / Milestone */}
        <div className="space-y-1">
          <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-content-subtle" />
            {t("issueDetail.releaseMilestone")}
          </label>
          <StyledDropdown
            value={task.release || ""}
            onChange={(val) => updateTaskField(task.id, "release", val)}
            options={[
              { id: "", label: t("issueDetail.selectRelease"), icon: "Box" },
              ...masterData
                .filter((d) => d.type === "release")
                .map((d) => ({
                  id: d.label,
                  label: d.label,
                  icon: d.icon,
                })),
            ]}
            type="release"
            masterData={masterData}
            disabled={!isEditable || blockMember}
            className={cn("w-full", blockMember && "pointer-events-none opacity-80")}
            buttonClassName="h-[32px] bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2.5 text-xs font-normal text-content-body"
          />
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-content-subtle" />
              {t("issueDetail.startDate")}
            </label>
            <UncontrolledInput
              type="date"
              initialValue={task.startDate ? format(ensureDate(task.startDate), "yyyy-MM-dd") : ""}
              onSave={(val: any) => updateTaskField(task.id, "startDate", val)}
              className={cn(
                "h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs outline-none text-content-body",
                blockMember && "opacity-70 cursor-not-allowed"
              )}
              disabled={!isEditable || blockMember}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-content-subtle" />
              {t("issueDetail.endDate")}
            </label>
            <UncontrolledInput
              type="date"
              initialValue={task.endDate ? format(ensureDate(task.endDate), "yyyy-MM-dd") : ""}
              onSave={(val: any) => updateTaskField(task.id, "endDate", val)}
              className={cn(
                "h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs outline-none text-content-body",
                blockMember && "opacity-70 cursor-not-allowed"
              )}
              disabled={!isEditable || blockMember}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-content-subtle" />
              {t("issueDetail.dueDate")}
            </label>
            <UncontrolledInput
              type="date"
              initialValue={task.dueDate ? format(ensureDate(task.dueDate), "yyyy-MM-dd") : ""}
              onSave={(val: any) => updateTaskField(task.id, "dueDate", val)}
              className={cn(
                "h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs outline-none text-content-body",
                blockMember && "opacity-70 cursor-not-allowed"
              )}
              disabled={!isEditable || blockMember}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-content-subtle" />
              {t("issueDetail.labels")}
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
              placeholder={t("issueDetail.addTags")}
              className="h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs outline-none text-content-body"
              disabled={!isEditable}
            />
          </div>
        </div>

        {/* Time Tracking Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-content-subtle" />
              {t("issueDetail.estHours")}
            </label>
            <UncontrolledInput
              type="number"
              min="0"
              step="0.5"
              initialValue={task.estimatedHours || ""}
              onSave={(val: any) =>
                updateTaskField(task.id, "estimatedHours", parseFloat(val) || 0)
              }
              className="h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs outline-none text-content-body"
              disabled={!isEditable}
              placeholder={t("issueDetail.egHours")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <LineChart className="w-3 h-3 text-indigo-500" />
              {t("issueDetail.loggedHours")}
            </label>
            <UncontrolledInput
              type="number"
              min="0"
              step="0.5"
              initialValue={task.loggedHours || ""}
              onSave={(val: any) => updateTaskField(task.id, "loggedHours", parseFloat(val) || 0)}
              className="h-[32px] w-full text-xs font-normal bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-500/30 rounded-md px-2.5 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs outline-none text-indigo-700"
              disabled={!isEditable}
              placeholder={t("issueDetail.egLogged")}
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-surface-strong/70 my-1.5" />

      {/* Footer Metadata */}
      <div className="pt-1.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-content-muted">
          <span>{t("issueDetail.created")}</span>
          <span className="font-normal text-content-body">
            {safeFormat(task.createdAt, "MMM d, yyyy HH:mm")}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-content-muted">
          <span>{t("issueDetail.updated")}</span>
          <span className="font-normal text-content-body">
            {safeFormat(task.updatedAt, "MMM d, yyyy HH:mm")}
          </span>
        </div>
        {canDelete && (
          <div className="pt-2">
            <button
              className="w-full h-8 text-xs font-normal text-red-600 bg-red-500/10 hover:bg-red-500/15 border border-red-500/30 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
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
              {t("issueDetail.deleteIssue")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
