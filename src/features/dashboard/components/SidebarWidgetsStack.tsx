import { useTranslation } from "react-i18next";
import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Zap, AlertCircle, Clock, FileText, ArrowRight, Video, Globe } from "lucide-react";
import { ensureDate, humanizeActivityAction } from "../../../lib/utils";
import { cn } from "../../../lib/utils";

const isDueSoon24h = (endDate?: string | Date | null) => {
  if (!endDate) return false;
  try {
    const d = ensureDate(endDate);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
  } catch (e) {
    return false;
  }
};

const getRemainingHours = (endDate?: string | Date | null) => {
  if (!endDate) return "";
  try {
    const d = ensureDate(endDate);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const hours = Math.ceil(diffMs / (60 * 60 * 1000));
    return hours > 0 ? `${hours} jam lagi` : "segera jatuh tempo";
  } catch (e) {
    return "segera jatuh tempo";
  }
};

interface SidebarWidgetsStackProps {
  myActiveTasks: any[];
  blockedTasks: any[];
  overdueTasks: any[];
  dueSoonTasks: any[];
  meetings: any[];
  documents: any[];
  activityLogs: any[];
  projectMembers: any[];
  setSelectedTaskForDetail: (task: any) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  setCurrentView: (view: string) => void;
}

export const SidebarWidgetsStack: React.FC<SidebarWidgetsStackProps> = ({
  myActiveTasks,
  blockedTasks,
  overdueTasks,
  dueSoonTasks,
  meetings,
  documents,
  activityLogs,
  projectMembers,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  setCurrentView,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 h-auto p-1 select-none">
      {/* My Active Tasks */}
      <div className="bg-surface shadow-soft border border-border-subtle/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> {t("widgets.myActiveTasks")} (
            {myActiveTasks.length})
          </h3>
          {myActiveTasks.some((task) => isDueSoon24h(task.endDate)) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[10px] sm:text-[8px] font-medium uppercase tracking-wider bg-warning text-content-inverse animate-pulse shrink-0">
              {t("dashboard.urgent24h")}
            </span>
          )}
        </div>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {myActiveTasks.length === 0 ? (
            <div className="text-xs text-content-muted font-medium italic text-center p-3">
              {t("dashboard.noActiveTasksAssignedTo")}
            </div>
          ) : (
            myActiveTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all cursor-pointer bg-surface",
                  isDueSoon24h(task.endDate)
                    ? "border-warning bg-warning-surface/10 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-warning hover:bg-warning-surface/20"
                    : "border-border-subtle hover:border-primary-border/60 hover:shadow-2xs"
                )}
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[10px] leading-none font-medium text-primary bg-primary-surface/10 px-2 py-[3px] rounded-full">
                      {task.key}
                    </div>
                    {isDueSoon24h(task.endDate) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs sm:text-[10px] sm:text-[8px] font-medium uppercase tracking-wider bg-warning text-content-inverse animate-pulse">
                        ⏰ {getRemainingHours(task.endDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-[10px] font-medium text-content-muted uppercase tracking-wider">
                    {task.priority}
                  </div>
                </div>
                <div className="text-xs font-medium text-content-strong leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Blocked / Stoppers */}
      <div className="bg-surface shadow-soft border border-danger-border/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger animate-bounce" />{" "}
            {t("widgets.stoppersBlocked")} ({blockedTasks.length})
          </h3>
          {blockedTasks.some((task) => isDueSoon24h(task.endDate)) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[10px] sm:text-[8px] font-medium uppercase tracking-wider bg-warning text-content-inverse animate-pulse shrink-0">
              {t("dashboard.urgent24h")}
            </span>
          )}
        </div>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {blockedTasks.length === 0 ? (
            <div className="text-xs text-content-muted font-medium italic p-3 text-center">
              {t("widgets.noBlockedTasks")}
            </div>
          ) : (
            blockedTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all cursor-pointer bg-surface",
                  isDueSoon24h(task.endDate)
                    ? "border-warning bg-warning-surface/10 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-warning hover:bg-warning-surface/20"
                    : "border-danger-border/30 hover:border-danger-border/60 hover:shadow-2xs"
                )}
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[10px] leading-none font-medium text-danger bg-danger-surface/20 px-2 py-[3px] rounded-full">
                      {task.key}
                    </div>
                    {isDueSoon24h(task.endDate) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs sm:text-[10px] sm:text-[8px] font-medium uppercase tracking-wider bg-warning text-content-inverse animate-pulse">
                        ⏰ {getRemainingHours(task.endDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-[10px] font-medium text-danger uppercase tracking-wider">
                    Blocked
                  </div>
                </div>
                <div className="text-xs font-medium text-content-strong leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Needs Attention / Overdue */}
      <div className="bg-surface shadow-soft border border-danger-border/30 rounded-xl p-5">
        <h3 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-strong flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-danger animate-pulse" />{" "}
          {t("widgets.needsAttention")} ({overdueTasks.length})
        </h3>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {overdueTasks.length === 0 ? (
            <div className="text-xs text-content-muted font-medium italic p-3 text-center">
              {t("widgets.noOverdueTasks")}
            </div>
          ) : (
            overdueTasks.map((task) => (
              <div
                key={task.id}
                className="group p-3 rounded-xl border border-border-subtle hover:border-danger-border/60 hover:shadow-2xs transition-all cursor-pointer bg-surface"
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs sm:text-[10px] font-medium text-primary">{task.key}</div>
                  <div className="text-xs sm:text-[10px] font-medium text-danger uppercase tracking-wider">
                    {t("dashboard.overdue")}
                  </div>
                </div>
                <div className="text-xs font-medium text-content-strong leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Due Soon */}
      <div className="bg-surface shadow-soft border border-border-subtle/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-strong flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" /> {t("widgets.dueSoon")} ({dueSoonTasks.length})
          </h3>
          {dueSoonTasks.some((task) => isDueSoon24h(task.endDate)) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[10px] sm:text-[8px] font-medium uppercase tracking-wider bg-warning text-content-inverse animate-pulse shrink-0">
              {t("dashboard.urgent24h")}
            </span>
          )}
        </div>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
          {dueSoonTasks.length === 0 ? (
            <div className="text-xs text-content-muted font-medium italic p-3 text-center">
              {t("widgets.noUrgentDeadlines")}
            </div>
          ) : (
            dueSoonTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all cursor-pointer bg-surface",
                  isDueSoon24h(task.endDate)
                    ? "border-warning bg-warning-surface/10 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-warning hover:bg-warning-surface/20"
                    : "border-border-subtle hover:border-primary-border/60 hover:shadow-2xs"
                )}
                onClick={() => {
                  setSelectedTaskForDetail(task);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs sm:text-[10px] font-medium text-primary">
                      {task.key}
                    </div>
                    {isDueSoon24h(task.endDate) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs sm:text-[10px] sm:text-[8px] font-medium uppercase tracking-wider bg-warning text-content-inverse animate-pulse">
                        ⏰ {getRemainingHours(task.endDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-[10px] font-medium text-content-muted">
                    {formatDistanceToNow(ensureDate(task.endDate!), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <div className="text-xs font-medium text-content-strong leading-snug line-clamp-2">
                  {task.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Meeting Notes */}
      <div className="bg-surface shadow-soft border border-border-subtle/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-strong flex items-center gap-2">
            <Video className="w-4 h-4 text-info" /> {t("widgets.recentMeetings")} ({meetings.length}
            )
          </h3>
        </div>
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {meetings.length === 0 ? (
            <div className="text-xs text-content-muted font-medium italic p-3 text-center">
              {t("widgets.noMeetingNotes")}
            </div>
          ) : (
            meetings.map((meeting: any) => (
              <div
                key={meeting.id}
                className="group p-3 rounded-xl border border-border-subtle/70 hover:border-info-border/60 transition-all cursor-pointer bg-surface shadow-2xs"
                onClick={() => setCurrentView("meetingNotes")}
              >
                <div className="text-xs font-medium text-content-strong line-clamp-1 mb-1 leading-normal">
                  {meeting.title}
                </div>
                <div className="flex justify-between items-center text-xs sm:text-[10px] text-content-muted">
                  <span className="font-medium uppercase text-content-muted">
                    {format(ensureDate(meeting.createdAt), "MMM dd, yyyy")}
                  </span>
                  <span className="text-info flex items-center gap-1 font-medium">
                    {t("dashboard.open")} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Documentation */}
      <div className="bg-surface shadow-soft border border-border-subtle/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-strong flex items-center gap-2">
            <FileText className="w-4 h-4 text-success" /> {t("widgets.documentation")} (
            {documents.length})
          </h3>
        </div>
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {documents.length === 0 ? (
            <div className="text-xs text-content-muted font-medium italic p-3 text-center">
              {t("widgets.noDocuments")}
            </div>
          ) : (
            documents.map((doc: any) => (
              <div
                key={doc.id}
                className="group p-3 rounded-xl border border-border-subtle hover:border-success-border/60 hover:shadow-2xs transition-all cursor-pointer bg-surface"
                onClick={() => setCurrentView("wiki")}
              >
                <div className="text-xs font-medium text-content-strong leading-snug line-clamp-1 mb-1">
                  {doc.title}
                </div>
                <div className="text-xs sm:text-[10px] font-medium text-content-muted flex justify-between">
                  <span className="uppercase tracking-wider text-success bg-success-surface/10 px-1 py-0.5 rounded font-mono">
                    {doc.type || "DOC"}
                  </span>
                  <span className="text-success flex items-center gap-1 font-medium">
                    {t("dashboard.view")} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Activity (24h) */}
      <div className="bg-surface-inverse rounded-xl p-5 shadow-soft-lg text-content-inverse relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 opacity-10 pointer-events-none">
          <Globe className="w-32 h-32" />
        </div>
        <h3 className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-indigo-300 flex items-center gap-2 mb-3 relative z-10">
          <Clock className="w-4 h-4 text-indigo-400" /> {t("widgets.liveActivity")}
        </h3>
        <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
          {activityLogs.map((log) => {
            const author =
              projectMembers.find((m) => m?.uid === log.userId)?.displayName || "System";
            return (
              <div key={log.id} className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div>
                  <div className="text-xs sm:text-[11px] text-content-subtle font-medium leading-tight">
                    <span className="text-content-inverse font-medium">{author}</span>{" "}
                    {humanizeActivityAction(log.action)}
                  </div>
                  <div className="text-xs sm:text-[11px] sm:text-[9px] text-content-subtle mt-0.5">
                    {formatDistanceToNow(ensureDate(log.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setCurrentView("activity")}
          className="w-full mt-4 py-3 min-h-11 text-xs font-medium uppercase tracking-wider text-content-inverse bg-surface/10 hover:bg-surface/20 rounded-lg transition-colors border border-white/10 cursor-pointer"
        >
          {t("widgets.viewFullAuditLog")}
        </button>
      </div>
    </div>
  );
};
