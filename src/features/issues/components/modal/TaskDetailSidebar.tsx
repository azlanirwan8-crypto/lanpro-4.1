import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
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
  Flag,
} from "lucide-react";
import { format } from "date-fns";
import { cn, ensureDate } from "../../../../lib/utils";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import { UncontrolledInput } from "./TaskDetailPrimitives";
import { LanproDatePicker } from "../../../../components/ui/LanproDatePicker";
import { confirmDeleteAlert, showSuccessAlert } from "../../../../lib/sweetalert";
import { Task, MasterData, UserProfile, Sprint } from "../../../../types";
import { fetchMilestones, type Milestone } from "../../../timeline/milestone.service";
import { fetchTaskWorkLogs, createTaskWorkLog } from "../../../../services/taskService";
import { toast } from "sonner";

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
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [logHours, setLogHours] = useState("");
  const [logNote, setLogNote] = useState("");
  const [logSaving, setLogSaving] = useState(false);

  useEffect(() => {
    if (!task.projectId) {
      setMilestones([]);
      setWorkLogs([]);
      return;
    }
    let cancelled = false;
    void fetchMilestones(task.projectId)
      .then((data) => {
        if (!cancelled) setMilestones(data);
      })
      .catch(() => {
        if (!cancelled) setMilestones([]);
      });
    void fetchTaskWorkLogs(task.projectId, task.id)
      .then((res: any) => {
        if (!cancelled) setWorkLogs(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setWorkLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [task.projectId, task.id]);

  const submitWorkLog = async () => {
    const hours = parseFloat(logHours);
    if (!task.projectId || !Number.isFinite(hours) || hours <= 0 || logSaving) return;
    setLogSaving(true);
    try {
      const res: any = await createTaskWorkLog(task.projectId, task.id, {
        hours,
        note: logNote,
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setWorkLogs(rows);
      setLogHours("");
      setLogNote("");
      const total = rows.reduce((a: number, r: any) => a + Number(r.hours || 0), 0);
      void updateTaskField(task.id, "loggedHours", total);
      toast.success(t("issueDetail.workLogAdded", "Jam kerja dicatat"));
    } catch (e: any) {
      toast.error(e?.message || t("issueDetail.workLogFailed", "Gagal mencatat jam"));
    } finally {
      setLogSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "lg:col-span-4 bg-surface-sunken/70/40 p-3.5 sm:p-4 md:p-5 space-y-3 sm:space-y-4 border-t lg:border-t-0 lg:border-l border-border-subtle/80 min-h-full transition-opacity text-left",
        isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none"
      )}
    >
      {/* Header Title */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle/80">
        <h4 className="text-[11px] font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
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
                  className="text-[10px] font-normal text-primary hover:text-primary flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" /> AI
                </button>
              )}
            </div>
            <UncontrolledInput
              type="number"
              initialValue={task.storyPoints || ""}
              onSave={(val: any) => updateTaskField(task.id, "storyPoints", parseInt(val) || 0)}
              className="h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs outline-none text-content-body"
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

        {/* Release (MasterData) — terpisah dari Milestone tabel */}
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

        {/* Milestone (tabel Milestones / #312) */}
        <div className="space-y-1">
          <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
            <Flag className="w-3 h-3 text-content-subtle" />
            {t("issueDetail.milestone")}
          </label>
          <StyledDropdown
            value={task.milestoneId || ""}
            onChange={(val) => updateTaskField(task.id, "milestoneId", val || null)}
            options={[
              { id: "", label: t("issueDetail.selectMilestone"), icon: "Flag" },
              ...milestones.map((m) => ({
                id: m.id,
                label: m.name,
                icon: "Flag",
              })),
            ]}
            type="milestone"
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
            <LanproDatePicker
              value={task.startDate ? format(ensureDate(task.startDate), "yyyy-MM-dd") : ""}
              onChange={(val) => updateTaskField(task.id, "startDate", val)}
              buttonClassName={cn(
                "h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2 shadow-2xs text-content-body",
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
            <LanproDatePicker
              value={task.endDate ? format(ensureDate(task.endDate), "yyyy-MM-dd") : ""}
              onChange={(val) => updateTaskField(task.id, "endDate", val)}
              minDate={
                task.startDate ? format(ensureDate(task.startDate), "yyyy-MM-dd") : undefined
              }
              buttonClassName={cn(
                "h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2 shadow-2xs text-content-body",
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
            <LanproDatePicker
              value={task.dueDate ? format(ensureDate(task.dueDate), "yyyy-MM-dd") : ""}
              onChange={(val) => updateTaskField(task.id, "dueDate", val)}
              minDate={
                task.startDate ? format(ensureDate(task.startDate), "yyyy-MM-dd") : undefined
              }
              buttonClassName={cn(
                "h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2 shadow-2xs text-content-body",
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
              className="h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-1 focus:ring-primary/20 focus:border-primary shadow-2xs outline-none text-content-body"
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
              className="h-[32px] w-full text-xs font-normal bg-surface border border-border-subtle/80 hover:border-border-subtle rounded-md px-2.5 focus:ring-1 focus:ring-primary/20 focus:border-primary shadow-2xs outline-none text-content-body"
              disabled={!isEditable}
              placeholder={t("issueDetail.egHours")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
              <LineChart className="w-3 h-3 text-primary" />
              {t("issueDetail.loggedHours")}
            </label>
            <UncontrolledInput
              type="number"
              min="0"
              step="0.5"
              initialValue={task.loggedHours || ""}
              onSave={(val: any) => updateTaskField(task.id, "loggedHours", parseFloat(val) || 0)}
              className="h-[32px] w-full text-xs font-normal bg-primary/10 border border-primary/30 hover:border-primary/30 rounded-md px-2.5 focus:ring-1 focus:ring-primary/20 focus:border-primary shadow-2xs outline-none text-primary"
              disabled={!isEditable}
              placeholder={t("issueDetail.egLogged")}
            />
          </div>
        </div>

        {/* #343 — entri jam kerja sederhana */}
        {isEditable && (
          <div className="mt-3 space-y-2 rounded-md border border-border-subtle/80 bg-surface p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-content-subtle">
              {t("issueDetail.workLogTitle", "Catat jam kerja")}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                placeholder="h"
                className="w-16 h-8 text-xs rounded-md border border-border-subtle bg-surface-muted px-2 text-content"
              />
              <input
                type="text"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder={t("issueDetail.workLogNote", "Catatan (opsional)")}
                className="flex-1 min-w-0 h-8 text-xs rounded-md border border-border-subtle bg-surface-muted px-2 text-content"
              />
              <button
                type="button"
                disabled={logSaving || !logHours}
                onClick={() => void submitWorkLog()}
                className="h-8 px-2.5 text-[10px] font-medium rounded-md bg-primary text-content-inverse disabled:opacity-50 shrink-0"
              >
                {t("issueDetail.workLogAdd", "Tambah")}
              </button>
            </div>
            {workLogs.length > 0 && (
              <ul className="max-h-28 overflow-y-auto space-y-1 pt-1">
                {workLogs.slice(0, 8).map((w) => (
                  <li
                    key={w.id}
                    className="flex justify-between gap-2 text-[10px] text-content-muted border-t border-border-faint pt-1"
                  >
                    <span className="truncate">
                      {Number(w.hours)}h{w.note ? ` — ${w.note}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {w.logged_at ? String(w.logged_at).slice(0, 10) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
