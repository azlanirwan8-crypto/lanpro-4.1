import { useTranslation } from "react-i18next";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Plus,
  ChevronDown,
  MoreVertical,
  Zap,
  CircleDot,
  Trash,
  ShieldAlert,
  LayoutGrid,
  Eye,
  CheckCircle2,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn, ensureDate } from "../../../../lib/utils";
import { UserAvatar } from "../../../../components/ui/UserAvatar";
import { StyledDropdown, UncontrolledInput } from "../../../../components/ui/CommonComponents";
import { RenderIcon } from "../../../../components/RenderIcon";
import { Task, MasterData, UserProfile, Sprint } from "../../../../types";
import { styles } from "../../styles";
import { IssueTableInlineAddRow } from "./IssueTableInlineAddRow";

interface IssueTableRowProps {
  task: Task;
  depth?: number;
  dragHandleProps?: any;
  canReorder: boolean;
  isCompact: boolean;
  isSelected: boolean;
  handleToggleSelectOne: (id: string) => void;
  issueTableColumns: any[];
  expandedTasks: Set<string>;
  toggleTaskExpansion: (id: string) => void;
  inlineAddingTaskId: string | null;
  setInlineAddingTaskId: (id: string | null) => void;
  inlineTitleMap: Record<string, string>;
  setInlineTitleMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  inlineAddType: string;
  setInlineAddType: (type: string) => void;
  isInlineTypeOpen: string | null;
  setIsInlineTypeOpen: (open: string | null) => void;
  inlineAddPriority: string;
  setInlineAddPriority: (val: string) => void;
  inlineAddAssigneeId: string;
  setInlineAddAssigneeId: (val: string) => void;
  isCreating: boolean;
  createSubtask: (parentId: string) => Promise<void>;
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
  setCurrentView: (view: any) => void;
  updateTaskField: (id: string, field: string, value: any) => void;
  activeContextMenuTaskId: string | null;
  setActiveContextMenuTaskId: (id: string | null) => void;
  issueSearch?: string;
  listFilterStatus?: string;
  listFilterPriority?: string;
  listFilterAssignee?: string;
  listFilterCategory?: string;
  listFilterSprint?: string;
  listFilterEnvironment?: string;
  listFilterProjectRisk?: string;
  listFilterRelease?: string;
  listFilterResolution?: string;
  listFilterLabel?: string;
  listFilterStartDate?: string;
  listFilterEndDate?: string;
  listFilterDateType?: string;
}

export const IssueTableRow: React.FC<IssueTableRowProps> = (props) => {
  const { t } = useTranslation();
  const {
    task,
    depth = 0,
    dragHandleProps,
    canReorder,
    isCompact,
    isSelected,
    handleToggleSelectOne,
    issueTableColumns,
    expandedTasks,
    toggleTaskExpansion,
    inlineAddingTaskId,
    setInlineAddingTaskId,
    inlineTitleMap,
    setInlineTitleMap,
    inlineAddType,
    setInlineAddType,
    isInlineTypeOpen,
    setIsInlineTypeOpen,
    inlineAddPriority,
    setInlineAddPriority,
    inlineAddAssigneeId,
    setInlineAddAssigneeId,
    isCreating,
    createSubtask,
    tasks = [],
    masterData = [],
    projectMembers = [],
    sprints = [],
    isUserReporter,
    canDeleteIssue,
    canEditIssue,
    canManageIssue,
    deleteTask,
    setSelectedTaskForDetail,
    setIsTaskDetailModalOpen,
    setCurrentView,
    updateTaskField,
    activeContextMenuTaskId,
    setActiveContextMenuTaskId,
    issueSearch,
    listFilterStatus,
    listFilterPriority,
    listFilterAssignee,
    listFilterCategory,
    listFilterSprint,
    listFilterEnvironment,
    listFilterProjectRisk,
    listFilterRelease,
    listFilterResolution,
    listFilterLabel,
    listFilterStartDate,
    listFilterEndDate,
    listFilterDateType,
  } = props;

  const mArr = masterData || [];
  const tArr = tasks || [];

  const isExpanded = expandedTasks.has(task.id);
  const rawSubtasks = tArr
    .filter((t) => t.parentId === task.id)
    .filter((s) => {
      if (issueSearch) {
        const query = issueSearch.toLowerCase().trim();
        const matchesQuery =
          (s.title || "").toLowerCase().includes(query) ||
          (s.key || "").toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }
      if (listFilterStatus && listFilterStatus !== "All" && s.status !== listFilterStatus)
        return false;
      if (listFilterPriority && listFilterPriority !== "All" && s.priority !== listFilterPriority)
        return false;
      if (listFilterAssignee && listFilterAssignee !== "All" && s.assigneeId !== listFilterAssignee)
        return false;
      if (listFilterCategory && listFilterCategory !== "All" && s.category !== listFilterCategory)
        return false;
      if (listFilterSprint && listFilterSprint !== "All") {
        if (listFilterSprint === "Backlog" && s.sprintId) return false;
        if (listFilterSprint !== "Backlog" && s.sprintId !== listFilterSprint) return false;
      }
      if (
        listFilterEnvironment &&
        listFilterEnvironment !== "All" &&
        s.environment !== listFilterEnvironment
      )
        return false;
      if (
        listFilterProjectRisk &&
        listFilterProjectRisk !== "All" &&
        s.projectRisk !== listFilterProjectRisk
      )
        return false;
      if (listFilterRelease && listFilterRelease !== "All" && s.release !== listFilterRelease)
        return false;
      if (
        listFilterResolution &&
        listFilterResolution !== "All" &&
        s.resolution !== listFilterResolution
      )
        return false;
      if (listFilterLabel && listFilterLabel !== "All") {
        if (!s.labels || !Array.isArray(s.labels) || !s.labels.includes(listFilterLabel))
          return false;
      }
      if (listFilterStartDate || listFilterEndDate) {
        const col = listFilterDateType || "dueDate";
        const checkSubDate = (key: string): boolean => {
          const rawVal = s[key as keyof Task];
          if (!rawVal) return false;
          try {
            const itemDate = new Date(rawVal);
            if (isNaN(itemDate.getTime())) return false;
            const time = itemDate.getTime();
            const startOk = listFilterStartDate
              ? time >= new Date(listFilterStartDate + "T00:00:00").getTime()
              : true;
            const endOk = listFilterEndDate
              ? time <= new Date(listFilterEndDate + "T23:59:59").getTime()
              : true;
            return startOk && endOk;
          } catch {
            return false;
          }
        };

        if (col === "any") {
          const hasAnyMatch = ["startDate", "endDate", "dueDate", "createdAt"].some((c) =>
            checkSubDate(c)
          );
          if (!hasAnyMatch) return false;
        } else {
          if (!checkSubDate(col)) return false;
        }
      }
      return true;
    });

  const subtasks = Array.from(
    new Map(rawSubtasks.filter((s) => s && s.id).map((s) => [s.id, s])).values()
  );
  const hasSubtasks = subtasks.length > 0;
  // Item #200 — sebelumnya `isEditable`/`canDelete` dihitung dari
  // `isDirectOwner` mentah, mengabaikan `canEditIssue`/`canDeleteIssue`
  // (prop yang sudah lewat `hasPermission` dan memberi akses penuh ke
  // Admin/Manager/Head) yang bahkan sudah diteruskan tapi tidak dipakai.
  // Akibatnya Admin terkunci mengedit/menghapus issue yang bukan mereka
  // laporkan — termasuk field Reporter.
  const isEditable = canEditIssue(task);
  const canDelete = canDeleteIssue(task);
  // Item #201 — Assignee (dan Reporter, di sidebar detail) cuma boleh diubah
  // Admin/Manager/Head atau Reporter task ini — bukan sekadar "isEditable"
  // umum, supaya assignee yang cuma diberi tugas TIDAK bisa melimpahkannya
  // ke orang lain.
  const canManage = canManageIssue(task);

  return (
    <React.Fragment key={task.id ? `tr-${task.id}-${depth}` : `tr-rnd-${Math.random()}`}>
      <motion.tr
        layout
        initial={{ opacity: 0, y: -8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{
          duration: 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={cn(
          styles.tableRow,
          "hover:bg-primary-surface/5 hover:border-primary/20 transition-all duration-200",
          isSelected && styles.selectedTableRow
        )}
      >
        {canReorder && (
          <td className="w-8 px-1 text-center border-r border-border-faint/50 bg-surface">
            {depth === 0 && dragHandleProps ? (
              <div
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing text-content-subtle hover:text-content-secondary flex justify-center py-1 outline-none"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
            ) : null}
          </td>
        )}
        <td
          className={cn(
            "w-12 px-4 border-r border-border-faint/50",
            isCompact ? "py-0.5" : "py-1.5"
          )}
        >
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleSelectOne(task.id)}
              className="w-4 h-4 rounded border-border-subtle text-blue-600 focus:ring-blue-500 shadow-soft transition-all cursor-pointer"
            />
          </div>
        </td>

        {issueTableColumns
          .filter((c) => c.visible)
          .map((col: any) => {
            let content: React.ReactNode = null;

            switch (col.id) {
              case "work":
                const typeData = mArr.find(
                  (m) =>
                    m.type === "issue_type" && m.label?.toLowerCase() === task.type?.toLowerCase()
                );
                content = (
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${depth * 24}px` }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskExpansion(task.id);
                      }}
                      className={cn(
                        "p-1 hover:bg-surface-strong rounded transition-colors text-content-subtle shrink-0 outline-none",
                        !hasSubtasks && "opacity-0 pointer-events-none"
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          "w-3.5 h-3.5 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>

                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {typeData?.icon ? (
                        <RenderIcon
                          iconName={typeData.icon}
                          className="w-3.5 h-3.5 saturate-150"
                          style={{ color: typeData.color }}
                        />
                      ) : task.type === "epic" ? (
                        <Zap className="w-3.5 h-3.5 text-purple-600" />
                      ) : task.type === "task" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <CircleDot className="w-3.5 h-3.5 text-content-subtle" />
                      )}
                    </div>

                    {task.type !== "epic" && (
                      <span
                        className="text-xs sm:text-[11px] font-mono font-medium text-content-subtle bg-surface-sunken px-1.5 py-0.5 rounded border border-border-subtle select-all shrink-0 uppercase tracking-tighter"
                        title={task.key}
                      >
                        {task.key}
                      </span>
                    )}

                    {!!task.isBlocked && (
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0 animate-pulse" />
                    )}

                    <span
                      onClick={() => {
                        setSelectedTaskForDetail(task);
                        setIsTaskDetailModalOpen(false);
                        setCurrentView("issueDetail" as any);
                      }}
                      className="text-[13px] font-medium text-content-body hover:text-blue-600 transition-colors cursor-pointer truncate max-w-[320px] block"
                      title={t("issueRow.openDetail")}
                    >
                      {task.title || (task as any).summary || (task as any).name || ""}
                    </span>

                    {!!task.parentId && (
                      <span className="text-xs sm:text-[10px] text-content-subtle font-medium bg-surface-muted px-1.5 py-0.5 rounded border border-border-subtle shrink-0">
                        {t("issueRow.subtask")}
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineTitleMap((prev) => ({ ...prev, [task.id]: "" }));
                        setInlineAddingTaskId(task.id);
                        if (!expandedTasks.has(task.id)) {
                          toggleTaskExpansion(task.id);
                        }
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-content-subtle hover:text-blue-600 hover:bg-blue-500/10 rounded-md transition-all shrink-0 border border-transparent hover:border-blue-500/30"
                      title={t("issueRow.addSubtask")}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
                break;

              case "assignee":
                const memberOptions = [
                  { id: "", label: t("newTask.unassigned") },
                  ...projectMembers.map((m) => ({
                    id: m?.uid || "",
                    label: m?.displayName || m?.email || "Unknown",
                  })),
                ];
                content = (
                  <StyledDropdown
                    value={task.assigneeId || ""}
                    onChange={(val) => updateTaskField(task.id, "assigneeId", val)}
                    options={memberOptions}
                    members={projectMembers}
                    type="member"
                    masterData={mArr}
                    disabled={!canManage}
                    className={cn("max-w-[150px]", !canManage && "pointer-events-none opacity-85")}
                  />
                );
                break;

              case "reporter": {
                const reporterObj =
                  (task as any).reporter ||
                  projectMembers.find(
                    (m) => m.uid === task.reporterId || (m as any).id === task.reporterId
                  );
                const reporterName =
                  reporterObj?.name ||
                  reporterObj?.displayName ||
                  reporterObj?.email ||
                  (task.reporterId ? t("common.unknown") : t("newTask.unassigned"));
                content = (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      uid={task.reporterId || ""}
                      user={reporterObj}
                      members={projectMembers}
                      className="w-5 h-5 border border-surface shadow-soft ring-1 ring-border-faint"
                    />
                    <span
                      className={cn(
                        "text-xs sm:text-[11px] font-medium truncate max-w-[120px]",
                        reporterObj ? "text-content-body" : "text-content-subtle"
                      )}
                    >
                      {reporterName}
                    </span>
                  </div>
                );
                break;
              }

              case "priority":
                const priorityOptions = mArr
                  .filter((m) => m.type === "priority")
                  .map((m) => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }));
                content = (
                  <StyledDropdown
                    value={task.priority}
                    onChange={(val) => updateTaskField(task.id, "priority", val)}
                    options={priorityOptions}
                    masterData={mArr}
                    type="priority"
                    disabled={!isEditable}
                    className="text-xs sm:text-[10px]"
                  />
                );
                break;

              case "status":
                const statusOptions = mArr
                  .filter((m) => m.type === "status")
                  .map((m) => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }));
                content = (
                  <StyledDropdown
                    value={task.status}
                    onChange={(val) => updateTaskField(task.id, "status", val)}
                    options={statusOptions}
                    masterData={mArr}
                    type="status"
                    disabled={!isEditable}
                    className="text-xs sm:text-[10px]"
                  />
                );
                break;

              case "progress":
                const getProgressValue = (statusStr: string): number => {
                  if (!statusStr) return 0;
                  const s = statusStr.toLowerCase().trim();
                  if (s === "done" || s === "selesai" || s === "completed" || s === "closed") {
                    return 100;
                  }
                  if (s === "code review" || s === "review" || s === "testing") {
                    return 75;
                  }
                  if (s === "in progress" || s === "dikerjakan" || s === "doing") {
                    return 50;
                  }
                  return 0;
                };
                const progressValue = getProgressValue(task.status);
                content = (
                  <div className="flex items-center gap-2 w-full max-w-[120px] select-none pr-1">
                    <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden border border-border-subtle/40 relative">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          progressValue === 100
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            : progressValue === 75
                              ? "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                              : progressValue === 50
                                ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                : "bg-surface-marker"
                        )}
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs sm:text-[10px] font-medium font-mono w-8 text-right shrink-0",
                        progressValue === 100
                          ? "text-emerald-600"
                          : progressValue === 75
                            ? "text-violet-600"
                            : progressValue === 50
                              ? "text-amber-600"
                              : "text-content-subtle"
                      )}
                    >
                      {progressValue}%
                    </span>
                  </div>
                );
                break;

              case "resolution":
                const resOptions = [
                  { id: "Unresolved", label: "Unresolved", color: "#94a3b8" },
                  ...mArr
                    .filter((m) => m.type === "resolution")
                    .map((m) => ({ id: m.label, label: m.label, color: m.color, icon: m.icon })),
                ];
                content = (
                  <StyledDropdown
                    value={task.resolution || "Unresolved"}
                    onChange={(val) => updateTaskField(task.id, "resolution", val)}
                    options={resOptions}
                    masterData={mArr}
                    disabled={!isEditable}
                    className="text-xs sm:text-[10px]"
                  />
                );
                break;

              case "category":
                const catOptions = [
                  { id: "", label: "No Category", color: "#94a3b8" },
                  ...mArr
                    .filter((m) => m.type === "category")
                    .map((m) => ({ id: m.label, label: m.label, color: m.color, icon: m.icon })),
                ];
                content = (
                  <StyledDropdown
                    value={task.category || ""}
                    onChange={(val) => updateTaskField(task.id, "category", val)}
                    options={catOptions}
                    masterData={mArr}
                    disabled={!isEditable}
                    className="text-xs sm:text-[10px]"
                  />
                );
                break;

              case "storyPoints":
                content = (
                  <UncontrolledInput
                    type="number"
                    disabled={!isEditable}
                    initialValue={task.storyPoints || ""}
                    onSave={(val: any) =>
                      updateTaskField(task.id, "storyPoints", val ? Number(val) : null)
                    }
                    className="bg-transparent border border-transparent hover:border-border-subtle focus:border-indigo-500 rounded px-2 py-1 text-xs sm:text-[11px] font-medium text-content-body w-full outline-none transition-colors"
                    placeholder="-"
                  />
                );
                break;

              case "sprint":
                content = (
                  <StyledDropdown
                    disabled={!isEditable}
                    value={task.sprintId || ""}
                    onChange={(val) => updateTaskField(task.id, "sprintId", val)}
                    options={[
                      { id: "", label: "Backlog", icon: "Box" },
                      ...(sprints?.map((s) => ({
                        id: s.id,
                        label: s.name,
                        icon: "IterationCcw",
                      })) || []),
                    ]}
                    type="sprint"
                    masterData={mArr}
                  />
                );
                break;

              case "labels":
                content = (
                  <div className="flex gap-1 overflow-hidden max-w-[150px]">
                    {task.labels?.length ? (
                      task.labels.map((L, lIdx) => (
                        <span
                          key={`${L}-${lIdx}`}
                          className="text-xs sm:text-[11px] sm:text-[9px] font-medium rounded bg-surface-muted text-content-secondary px-1.5 py-0.5 truncate max-w-[60px]"
                        >
                          {L}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs sm:text-[10px] text-content-subtle">-</span>
                    )}
                  </div>
                );
                break;

              case "startDate":
              case "endDate":
              case "dueDate":
                const dateVal = task[col.id as keyof Task];
                content = (
                  <UncontrolledInput
                    type="date"
                    disabled={!isEditable}
                    initialValue={dateVal ? format(ensureDate(dateVal), "yyyy-MM-dd") : ""}
                    onSave={(val: any) => updateTaskField(task.id, col.id, val)}
                    className="bg-transparent border-none text-xs sm:text-[10px] font-medium text-content-muted focus:ring-0 active:ring-0 outline-none w-full"
                  />
                );
                break;

              case "release":
                const relOptions = [
                  { id: "", label: t("planning.noRelease"), color: "#94a3b8" },
                  ...mArr
                    .filter((m) => m.type === "release")
                    .map((m) => ({ id: m.label, label: m.label, color: m.color, icon: m.icon })),
                ];
                content = (
                  <StyledDropdown
                    value={task.release || ""}
                    onChange={(val) => updateTaskField(task.id, "release", val)}
                    options={relOptions}
                    masterData={mArr}
                    disabled={!isEditable}
                    className="text-xs sm:text-[10px]"
                  />
                );
                break;

              case "updated":
                content = (
                  <span className="text-xs sm:text-[10px] font-medium text-content-subtle whitespace-nowrap">
                    {task.updatedAt
                      ? formatDistanceToNow(ensureDate(task.updatedAt), { addSuffix: true })
                      : "-"}
                  </span>
                );
                break;

              case "created":
                content = (
                  <span className="text-xs sm:text-[10px] font-medium text-content-subtle whitespace-nowrap">
                    {task.createdAt ? format(ensureDate(task.createdAt), "d MMM yyyy") : "-"}
                  </span>
                );
                break;
            }

            return (
              <td
                key={col.id}
                className={cn(
                  "px-4 border-r border-border-faint/50 whitespace-nowrap overflow-hidden text-ellipsis",
                  isCompact ? "py-0.5" : "py-1.5"
                )}
                style={{ width: col.width }}
              >
                {content}
              </td>
            );
          })}

        <td className={cn("px-2 relative", isCompact ? "py-0.5" : "py-1.5")}>
          <div className="flex items-center justify-center gap-1.5">
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask?.(task.id);
                }}
                className="p-1 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-content-inverse border border-rose-500/30 rounded-lg transition-all cursor-pointer shadow-xs font-medium"
                title={t("issueRow.deleteIssue")}
              >
                <Trash className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveContextMenuTaskId(activeContextMenuTaskId === task.id ? null : task.id);
                }}
                className="p-1 bg-surface-muted hover:bg-indigo-600 text-content-secondary hover:text-content-inverse border border-border-subtle rounded-lg transition-all cursor-pointer shadow-xs font-medium"
                title={t("issueRow.actionMenu")}
              >
                <MoreVertical className="w-3.5 h-3.5 shrink-0" />
              </button>
              {activeContextMenuTaskId === task.id && (
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveContextMenuTaskId(null);
                    }}
                  />
                  <div className="absolute right-0 mt-1 w-36 bg-surface border border-border-subtle rounded-lg shadow-xl z-[101] overflow-hidden py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskForDetail(task);
                        setCurrentView("issueDetail");
                        setActiveContextMenuTaskId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs sm:text-[11px] font-medium text-content-secondary hover:bg-surface-sunken flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-content-subtle" />
                      <span>{t("issueRow.viewDetails")}</span>
                    </button>
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask?.(task.id);
                          setActiveContextMenuTaskId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs sm:text-[11px] font-medium text-red-600 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer border-t border-border-faint"
                      >
                        <Trash className="w-3.5 h-3.5 text-red-400" />
                        <span>{t("issueRow.deleteIssue")}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </td>
      </motion.tr>

      {/* Inline Add Row */}
      {expandedTasks.has(task.id) && inlineAddingTaskId === task.id && (
        <IssueTableInlineAddRow
          taskId={task.id}
          depth={depth}
          canReorder={canReorder}
          isCompact={isCompact}
          issueTableColumns={issueTableColumns}
          inlineTitleMap={inlineTitleMap}
          setInlineTitleMap={setInlineTitleMap}
          setInlineAddingTaskId={setInlineAddingTaskId}
          inlineAddType={inlineAddType}
          setInlineAddType={setInlineAddType}
          isInlineTypeOpen={isInlineTypeOpen}
          setIsInlineTypeOpen={setIsInlineTypeOpen}
          inlineAddPriority={inlineAddPriority}
          setInlineAddPriority={setInlineAddPriority}
          inlineAddAssigneeId={inlineAddAssigneeId}
          setInlineAddAssigneeId={setInlineAddAssigneeId}
          isCreating={isCreating}
          createSubtask={createSubtask}
          masterData={mArr}
          projectMembers={projectMembers}
        />
      )}

      <AnimatePresence initial={false}>
        {isExpanded &&
          subtasks.map((s) => (
            <IssueTableRow
              {...props}
              key={s.id}
              task={s}
              depth={depth + 1}
              isSelected={props.isSelected}
              dragHandleProps={undefined}
            />
          ))}
      </AnimatePresence>
    </React.Fragment>
  );
};
