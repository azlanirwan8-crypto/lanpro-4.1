import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  History,
  Search,
  DownloadCloud,
  Activity,
  Zap,
  Users,
  Clock,
  PlusSquare,
  Trash2,
  Edit3,
  ChevronRight,
} from "lucide-react";
import { ActivityLog, UserProfile } from "../../types";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";

export const ActivityLogPanel = ({
  activityLogs: propLogs,
  exportTasksToCSV,
  projectMembers: propMembers,
  safeFormat,
}: {
  activityLogs: ActivityLog[];
  exportTasksToCSV: () => void;
  projectMembers: UserProfile[];
  safeFormat: (date: any, formatStr: string) => string;
}) => {
  const { t } = useTranslation();
  const [auditLogSearch, setAuditLogSearch] = useState("");
  const [inspectedLog, setInspectedLog] = useState<ActivityLog | null>(null);
  const activityLogs = Array.isArray(propLogs) ? propLogs : [];
  const projectMembers = Array.isArray(propMembers) ? propMembers : [];

  const getActor = (log: ActivityLog) => {
    if (!log) return { displayName: "System", email: "system@lanpro" };
    return (
      projectMembers.find((m) => m.uid === log.userId) || {
        displayName: "System",
        email: "system@lanpro",
      }
    );
  };

  const activeActorsCount = new Set(
    activityLogs
      .filter((t) => {
        const d = new Date(
          t.createdAt?.toDate
            ? t.createdAt.toDate()
            : t.createdAt?.seconds
              ? new Date(t.createdAt.seconds * 1000)
              : new Date(t.createdAt)
        );
        return d.getTime() > Date.now() - 24 * 60 * 60 * 1000;
      })
      .map((x) => x.userId)
  ).size;

  const filteredLogs = activityLogs.filter((log) => {
    if (!auditLogSearch.trim()) return true;
    const s = auditLogSearch.toLowerCase();
    const actor = getActor(log);
    return (
      log.action?.toLowerCase().includes(s) ||
      log.details?.toLowerCase().includes(s) ||
      actor?.displayName?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-6 md:p-8 bg-surface-sunken custom-scrollbar">
      <div className="space-y-4 sm:space-y-6 w-full">
        <div className="border-b border-border-subtle pb-4 sm:pb-6 mb-1 sm:mb-2">
          <PageHeader
            breadcrumbs={[
              { label: t("nav.activity", "Activity") },
              { label: t("activityLog.title"), current: true },
            ]}
            title={
              <span className="inline-flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-inner shrink-0">
                  <History className="w-5 h-5 sm:w-6 sm:h-6" />
                </span>
                <span className="truncate">{t("activityLog.title")}</span>
              </span>
            }
            subtitle={<span className="hidden sm:inline">{t("activityLog.subtitle")}</span>}
            actions={
              <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto min-w-0">
                <div className="flex min-w-0 flex-1 md:flex-none bg-surface border border-border-subtle rounded-xl px-3 py-2 items-center gap-2 shadow-soft">
                  <Search className="w-4 h-4 text-content-subtle shrink-0" />
                  <input
                    value={auditLogSearch}
                    onChange={(e) => setAuditLogSearch(e.target.value)}
                    placeholder={t("activityLog.searchLogs")}
                    className="bg-transparent border-none outline-none text-xs w-full md:w-48 placeholder:text-content-subtle text-content-body min-w-0"
                  />
                </div>
                <button
                  onClick={exportTasksToCSV}
                  title={t("activityLog.exportCsv")}
                  className="shrink-0 px-2.5 sm:px-4 py-2.5 bg-primary-surface border border-primary text-content-inverse rounded-xl text-xs font-normal shadow-soft-lg transition-all flex items-center gap-2 tracking-widest hover:bg-primary-surface-hover active:scale-95 uppercase"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("activityLog.exportCsv")}</span>
                </button>
              </div>
            }
          />
        </div>

        {/* Summary Metric Cards — #361: 2 kolom di HP */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6 mb-4 sm:mb-8">
          <div className="bg-surface p-3.5 sm:p-6 rounded-xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow h-24 sm:h-32 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-[0.03] scale-150 -translate-y-4 translate-x-4">
              <Activity className="w-32 h-32" />
            </div>
            <div className="text-[10px] sm:text-[10px] font-medium tracking-[0.15em] uppercase text-content-subtle z-10 flex items-center gap-1.5 sm:gap-2">
              <Zap className="w-3.5 h-3.5" /> {t("activityLog.totalEvents")}
            </div>
            <div className="text-2xl sm:text-4xl font-medium text-content-strong z-10">
              {activityLogs.length}
            </div>
          </div>
          <div className="bg-surface p-3.5 sm:p-6 rounded-xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow h-24 sm:h-32 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-[0.03] scale-150 -translate-y-4 translate-x-4">
              <Users className="w-32 h-32" />
            </div>
            <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-content-subtle z-10 flex items-center gap-1.5 sm:gap-2">
              <Users className="w-3.5 h-3.5" /> {t("activityLog.activeActors24h")}
            </div>
            <div className="text-2xl sm:text-4xl font-medium text-content-strong z-10">
              {activeActorsCount}
            </div>
          </div>
          <div className="bg-surface p-3.5 sm:p-6 rounded-xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow h-24 sm:h-32 relative overflow-hidden col-span-2 md:col-span-1">
            <div className="absolute right-0 top-0 opacity-[0.03] scale-150 -translate-y-4 translate-x-4">
              <Clock className="w-32 h-32" />
            </div>
            <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-content-subtle z-10 flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5" /> {t("activityLog.lastEvent")}
            </div>
            <div className="text-base sm:text-xl font-medium text-content-strong tracking-tight z-10 flex flex-col">
              {activityLogs.length > 0 ? (
                <>
                  <span>{safeFormat(activityLogs[0].createdAt, "MMM dd, yyyy")}</span>
                  <span className="text-xs sm:text-sm font-medium text-content-muted">
                    {safeFormat(activityLogs[0].createdAt, "HH:mm:ss")}
                  </span>
                </>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {/* #370 — search hanya di header; baris duplikat di kartu dihapus */}
          {activityLogs.length === 0 ? (
            <div className="p-8 sm:p-20 text-center text-content-subtle font-medium">
              {t("activityLog.empty")}
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto min-h-[500px]">
                <ResponsiveTable className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-primary-surface/5 border-b border-primary/15 text-xs font-normal text-content-subtle whitespace-nowrap">
                      <th className="px-8 py-5">{t("activityLog.timestamp")}</th>
                      <th className="px-8 py-5">{t("activityLog.eventSignature")}</th>
                      <th className="px-8 py-5">{t("activityLog.subjectActor")}</th>
                      <th className="px-8 py-5 text-right">{t("activityLog.auditTrailId")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-faint">
                    {filteredLogs.map((log) => {
                      const actor = getActor(log);
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-surface-sunken border-b border-border-faint transition-colors group cursor-default"
                        >
                          <td className="px-8 py-5 whitespace-nowrap align-top">
                            <div className="text-sm font-medium text-content-strong tabular-nums tracking-tight">
                              {safeFormat(log.createdAt, "MMM dd, yyyy")}
                            </div>
                            <div className="text-xs sm:text-[10px] font-normal text-content-subtle tabular-nums uppercase mt-1 tracking-widest">
                              {safeFormat(log.createdAt, "HH:mm:ss.SSS")}
                            </div>
                          </td>
                          <td className="px-8 py-5 w-[45%]">
                            <div className="flex items-start gap-4">
                              {(() => {
                                const a = (log.action || "").toLowerCase();
                                let Icon = Activity;
                                let colorClass =
                                  "text-content-muted bg-surface-sunken border-border-subtle group-hover:bg-surface-muted group-hover:text-content-body group-hover:border-border-subtle";
                                let badgeClass =
                                  "bg-surface-muted text-content-secondary border border-border-subtle";
                                if (a.includes("create") || a.includes("add")) {
                                  Icon = PlusSquare;
                                  colorClass =
                                    "text-blue-600 bg-blue-500/10 border-blue-500/30 group-hover:bg-blue-500/15 group-hover:text-blue-700";
                                  badgeClass = "bg-blue-500/15 text-blue-700 border-blue-500/30";
                                } else if (a.includes("delete") || a.includes("remove")) {
                                  Icon = Trash2;
                                  colorClass =
                                    "text-rose-600 bg-rose-500/10 border-rose-500/30 group-hover:bg-rose-500/15 group-hover:text-rose-700";
                                  badgeClass = "bg-rose-500/15 text-rose-700 border-rose-500/30";
                                } else if (a.includes("update") || a.includes("edit")) {
                                  Icon = Edit3;
                                  colorClass =
                                    "text-amber-600 bg-amber-500/10 border-amber-500/30 group-hover:bg-amber-500/15 group-hover:text-amber-700";
                                  badgeClass = "bg-amber-500/15 text-amber-700 border-amber-500/30";
                                } else if (
                                  a.includes("invite") ||
                                  a.includes("team") ||
                                  a.includes("user")
                                ) {
                                  Icon = Users;
                                  colorClass =
                                    "text-emerald-600 bg-emerald-500/10 border-emerald-500/30 group-hover:bg-emerald-500/15 group-hover:text-emerald-700";
                                  badgeClass =
                                    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
                                } else {
                                  Icon = Zap;
                                  colorClass =
                                    "text-primary bg-primary/10 border-primary/30 group-hover:bg-primary/15 group-hover:text-primary";
                                  badgeClass = "bg-primary/15 text-primary border-primary/30";
                                }

                                return (
                                  <>
                                    <div
                                      className={`mt-0.5 w-10 h-10 rounded-[12px] border flex items-center justify-center shrink-0 transition-all ${colorClass}`}
                                    >
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <span
                                          className={`text-xs sm:text-[11px] sm:text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5 rounded shadow-soft ${badgeClass}`}
                                        >
                                          {log.action?.replace(/_/g, " ") || "ACTION_EXECUTED"}
                                        </span>
                                        <span className="text-xs sm:text-[10px] font-medium text-content-subtle capitalize px-1 ring-1 ring-border-subtle rounded-sm bg-surface-sunken">
                                          {t("activityLog.sourceUi")}
                                        </span>
                                      </div>
                                      <div className="font-mono text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle p-2.5 rounded-lg shadow-inner whitespace-pre-wrap word-break">
                                        <span className="text-content-subtle select-none mr-2">
                                          {">"}
                                        </span>
                                        {log.details || "No payload details provided."}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-8 py-5 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 shrink-0 shadow-inner border-2 border-surface rounded-full bg-surface-muted flex items-center justify-center relative ring-1 ring-border-subtle">
                                <UserAvatar
                                  uid={log.userId}
                                  members={projectMembers}
                                  className="w-full h-full text-xs font-medium"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-surface rounded-full"></div>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-medium text-content-strong truncate">
                                  {actor?.displayName}
                                </span>
                                <span className="text-xs sm:text-[10px] font-medium text-content-muted truncate tracking-wide">
                                  {actor?.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right w-48 align-middle">
                            <div className="flex flex-col items-end gap-1.5">
                              <div
                                className="font-mono text-xs sm:text-[11px] sm:text-[9px] bg-surface-muted text-content-muted px-2 py-1 rounded border border-border-subtle uppercase font-normal tracking-widest select-all opacity-70 group-hover:opacity-100 transition-opacity"
                                title={log.id}
                              >
                                ...{log.id?.substring((log.id?.length || 0) - 8)}
                              </div>
                              <button
                                type="button"
                                onClick={() => setInspectedLog(log)}
                                className="text-xs sm:text-[10px] font-normal text-primary hover:text-primary uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                              >
                                {t("activityLog.inspect")} <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ResponsiveTable>
              </div>

              {/* #309 — kartu log di bawah sm */}
              <div className="sm:hidden divide-y divide-border-subtle/60 min-h-[200px]">
                {filteredLogs.map((log) => {
                  const actor = getActor(log);
                  return (
                    <button
                      type="button"
                      key={log.id}
                      onClick={() => setInspectedLog(log)}
                      className="w-full text-left p-3.5 flex flex-col gap-2 bg-surface hover:bg-surface-sunken/60 active:bg-surface-sunken cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded bg-surface-muted text-content-secondary border border-border-subtle truncate max-w-[70%]">
                          {log.action?.replace(/_/g, " ") || "ACTION"}
                        </span>
                        <span className="text-[10px] text-content-subtle tabular-nums shrink-0">
                          {safeFormat(log.createdAt, "MMM dd HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-content-body line-clamp-2 font-mono">
                        {log.details || "—"}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 shrink-0 rounded-full bg-surface-muted overflow-hidden ring-1 ring-border-subtle">
                          <UserAvatar
                            uid={log.userId}
                            members={projectMembers}
                            className="w-full h-full text-[10px] font-medium"
                          />
                        </div>
                        <span className="text-xs font-medium text-content-strong truncate">
                          {actor?.displayName}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-content-subtle ml-auto shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(inspectedLog)}
        onClose={() => setInspectedLog(null)}
        title={t("activityLog.detailTitle")}
      >
        {inspectedLog && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 border-2 border-surface rounded-full bg-surface-muted flex items-center justify-center ring-1 ring-border-subtle">
                <UserAvatar
                  uid={inspectedLog.userId}
                  members={projectMembers}
                  className="w-full h-full text-xs font-medium"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-content-strong truncate">
                  {getActor(inspectedLog).displayName}
                </span>
                <span className="text-xs text-content-muted truncate">
                  {getActor(inspectedLog).email}
                </span>
              </div>
            </div>

            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <dt className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-widest">
                  {t("activityLog.detailAction")}
                </dt>
                <dd className="text-[13px] font-medium text-content-body">
                  {inspectedLog.action?.replace(/_/g, " ") || "ACTION_EXECUTED"}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-widest">
                  {t("activityLog.timestamp")}
                </dt>
                <dd className="text-[13px] font-medium text-content-body tabular-nums">
                  {safeFormat(inspectedLog.createdAt, "MMM dd, yyyy")}{" "}
                  {safeFormat(inspectedLog.createdAt, "HH:mm:ss.SSS")}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-widest">
                  {t("activityLog.detailProject")}
                </dt>
                <dd className="text-[13px] font-medium text-content-body">
                  {inspectedLog.projectId || t("activityLog.detailNoProject")}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-widest">
                  {t("activityLog.auditTrailId")}
                </dt>
                <dd className="font-mono text-xs text-content-body select-all break-all">
                  {inspectedLog.id}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-widest">
                  {t("activityLog.detailDetails")}
                </dt>
                <dd className="font-mono text-xs text-content-body bg-surface-sunken border border-border-subtle p-2.5 rounded-lg whitespace-pre-wrap break-words">
                  {inspectedLog.details || "No payload details provided."}
                </dd>
              </div>
            </dl>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="text-[13px] font-medium px-3 py-1.5 rounded-md border border-border-subtle text-content-secondary hover:bg-surface-muted transition-colors"
              >
                {t("activityLog.detailClose")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
