import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanColumn } from "./components/KanbanColumn";
import { useBoard } from "./hooks/useKanbanLogic";
import { KanbanBoardProps } from "./types";
import { RenderIcon } from "../../components/RenderIcon";
import { useAppStore } from "../../store/useAppStore";
import { cn } from "../../lib/utils";
import { statusColumnKey, tasksForStatusLane, taskMatchesStatus } from "../../lib/statusKolom";
import { Layers } from "lucide-react";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { StyledDropdown } from "../../components/ui/CommonComponents";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/CoreUI";

/** #417 — status chrome pakai token soft, bukan hex keras. */
const getStatusStyle = (label: string) => {
  const lower = label.toLowerCase();
  if (
    lower.includes("done") ||
    lower.includes("selesai") ||
    lower.includes("closed") ||
    lower.includes("resolved")
  ) {
    return {
      bg: "bg-success/10",
      border: "border-t-success",
      borderColor: "var(--color-success)",
      text: "text-success-text",
      indicatorBg: "bg-success/15",
      indicatorText: "text-success-text",
    };
  }
  if (lower.includes("uat") || lower.includes("review") || lower.includes("code review")) {
    return {
      bg: "bg-primary/10",
      border: "border-t-primary",
      borderColor: "var(--color-primary)",
      text: "text-primary",
      indicatorBg: "bg-primary/15",
      indicatorText: "text-primary",
    };
  }
  if (
    lower.includes("progress") ||
    lower.includes("doing") ||
    lower.includes("in progress") ||
    lower.includes("active")
  ) {
    return {
      bg: "bg-warning/10",
      border: "border-t-warning",
      borderColor: "var(--color-warning)",
      text: "text-warning-text",
      indicatorBg: "bg-warning/15",
      indicatorText: "text-warning-text",
    };
  }
  return {
    bg: "bg-info/10",
    border: "border-t-info",
    borderColor: "var(--color-info)",
    text: "text-info-text",
    indicatorBg: "bg-info/15",
    indicatorText: "text-info-text",
  };
};

export const BoardView: React.FC<KanbanBoardProps> = (props) => {
  const { t } = useTranslation();
  const { density } = useAppStore();
  const isCompact = density === "compact";
  const [groupBy, setGroupBy] = useState<"epic" | "assignee">("epic");
  const [showEmptySwimlanes, setShowEmptySwimlanes] = useState(false);

  const {
    boardStatuses,
    epics,
    standaloneTasks,
    tArr,
    mArr,
    pArr,
    groupedTasks,
    handleDragEndBoard,
    shakingTaskId,
  } = useBoard(props as any, groupBy);

  if (!boardStatuses || boardStatuses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-content-muted">
        {t("kanban.loadingBoard")}
      </div>
    );
  }

  const filteredEpics = showEmptySwimlanes
    ? epics
    : epics.filter((epic) => {
        const epicTasks = boardStatuses.reduce(
          (acc, status) => acc + tasksForStatusLane(groupedTasks, epic.id, status).length,
          0
        );
        return epicTasks > 0;
      });

  // Consolidate & Deduplicate Assignees for Swimlane 'By Assignee'
  const allMemberSwimlanes = React.useMemo(() => {
    const map = new Map<
      string,
      { id: string; displayName: string; email?: string; photoURL?: string }
    >();

    // Add unique members from projectMembers (pArr)
    pArr.forEach((m) => {
      const id = m?.uid || m?.id;
      if (id && id !== "unassigned") {
        if (!map.has(id)) {
          map.set(id, {
            id,
            displayName:
              m?.displayName || m?.name || m?.username || m?.user?.displayName || "Unknown",
            email: m?.email || m?.user?.email,
            photoURL: m?.photoURL || m?.user?.photoURL,
          });
        }
      }
    });

    // Check if any tasks have assignees not present in projectMembers
    tArr.forEach((t) => {
      const rawAid = t.assigneeId;
      const aid = typeof rawAid === "object" ? rawAid?.uid || rawAid?.id : rawAid;
      if (
        aid &&
        aid !== "unassigned" &&
        aid !== "null" &&
        aid !== "undefined" &&
        aid !== "none" &&
        !map.has(aid)
      ) {
        map.set(aid, {
          id: String(aid),
          displayName:
            t.assigneeName || t.assigneeDisplayName || `User (${String(aid).slice(0, 6)})`,
          email: undefined,
          photoURL: undefined,
        });
      }
    });

    return Array.from(map.values());
  }, [pArr, tArr]);

  const filteredAssigneeSwimlanes = React.useMemo(() => {
    // Filter member swimlanes based on empty state toggle
    const memberLanes = allMemberSwimlanes.filter((m) => {
      if (showEmptySwimlanes) return true;
      const taskCount = boardStatuses.reduce(
        (acc, status) => acc + tasksForStatusLane(groupedTasks, m.id, status).length,
        0
      );
      return taskCount > 0;
    });

    // Calculate unassigned tasks count
    const unassignedCount = boardStatuses.reduce(
      (acc, status) => acc + tasksForStatusLane(groupedTasks, "unassigned", status).length,
      0
    );

    // Render 'Unassigned' row at the bottom if it has tasks OR if showEmptySwimlanes is checked
    const showUnassigned = showEmptySwimlanes ? true : unassignedCount > 0;

    if (showUnassigned) {
      memberLanes.push({
        id: "unassigned",
        displayName: t("newTask.unassigned"),
        email: "No Assignee",
        photoURL: undefined,
      });
    }

    return memberLanes;
  }, [allMemberSwimlanes, showEmptySwimlanes, boardStatuses, groupedTasks, t]);

  const renderBoard = () => {
    return (
      <div className="relative w-fit min-w-full pb-16">
        {/* Header Bar - Static Sidebar and Scrollable Status Headers */}
        <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] md:grid-cols-[240px_1fr] sticky top-0 z-30 bg-surface border-b border-border-subtle/80">
          {/* Bagian A Header */}
          <div className="sticky left-0 z-50 bg-surface border-r border-border-subtle/80 h-11 flex items-center px-3 relative">
            <div className="text-[11px] font-medium text-content-body tracking-wide flex items-center justify-between w-full gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium text-[11px] text-content-strong shrink-0">
                  {t("kanban.swimlanes")}
                </span>
                <label className="flex items-center gap-1 cursor-pointer bg-surface-muted px-1.5 py-0.5 rounded text-[10px] font-normal text-content-secondary hover:bg-surface-sunken transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={showEmptySwimlanes}
                    onChange={(e) => setShowEmptySwimlanes(e.target.checked)}
                    className="accent-primary rounded-sm cursor-pointer w-3 h-3"
                  />
                  <span>{t("kanban.empty")}</span>
                </label>
              </div>
              <div className="relative shrink-0">
                <StyledDropdown
                  value={groupBy}
                  onChange={(val: string) => setGroupBy(val as "epic" | "assignee")}
                  options={[
                    { id: "epic", label: t("kanban.byEpic") },
                    { id: "assignee", label: t("kanban.byAssignee") },
                  ]}
                  className="w-auto"
                  buttonClassName="bg-primary-surface/10 text-primary border border-primary/20 rounded text-[10px] leading-none font-medium px-1.5 py-1 cursor-pointer outline-none hover:bg-primary-surface/20 transition-all"
                />
              </div>
            </div>
          </div>
          {/* Bagian B Header - Scrollable */}
          <div className="flex overflow-x-auto items-center px-3 py-2 gap-2.5 sm:gap-3 bg-surface custom-scrollbar snap-x snap-mandatory md:snap-none">
            {boardStatuses.map((status, index) => {
              const statusStyle = getStatusStyle(status.label || status.code || "");
              const taskCount = tArr.filter((t: any) => taskMatchesStatus(t.status, status)).length;
              return (
                <div
                  key={`header-${status.id || statusColumnKey(status)}-${index}`}
                  className={cn(
                    "shrink-0 snap-start",
                    isCompact ? "w-[200px] sm:w-[240px]" : "w-[220px] sm:w-[270px]"
                  )}
                >
                  <div className="flex items-center justify-between bg-surface-sunken/80 border border-border-subtle/80 px-2.5 py-1.5 rounded-md shadow-2xs transition-all">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {status.icon ? (
                        <RenderIcon
                          iconName={status.icon}
                          className="w-3 h-3 shrink-0"
                          style={{ color: statusStyle.borderColor }}
                        />
                      ) : (
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: statusStyle.borderColor }}
                        />
                      )}
                      <span className="text-[10px] font-medium uppercase tracking-wide text-content-strong truncate">
                        {status.label}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-normal bg-surface text-content-secondary border border-border-subtle/60 shadow-2xs shrink-0">
                      {taskCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows Rendering */}
        <div className="flex flex-col gap-4 mt-3">
          {groupBy === "epic" ? (
            <>
              {filteredEpics.map((epic, epicIndex) => (
                <div
                  key={epic.id}
                  className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] md:grid-cols-[280px_1fr] items-stretch border-b border-border-subtle/70 min-h-[110px]"
                >
                  {/* Bagian A Row Cell - Sticky Sidebar */}
                  <div className="sticky left-0 z-50 bg-surface border-r border-border-subtle/80 px-3.5 py-3 relative">
                    {/* Epic Card Content */}
                    <div
                      className={cn(
                        "bg-surface rounded-lg shadow-2xs border border-border-subtle/80 border-l-4 border-l-purple-600 transition-all duration-200 hover:border-purple-500/30 p-3",
                        isCompact ? "p-2.5" : "p-3"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded bg-primary-surface/10 flex items-center justify-center text-primary shrink-0">
                          <Layers className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] leading-none font-mono font-medium text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/30">
                          {epic.key || "EPIC"}
                        </span>
                        <span className="ml-auto bg-primary-surface/10 text-primary px-1.5 py-0.2 rounded text-[10px] leading-none font-medium border border-purple-500/30">
                          {boardStatuses.reduce(
                            (acc, status) =>
                              acc + tasksForStatusLane(groupedTasks, epic.id, status).length,
                            0
                          )}
                        </span>
                      </div>
                      <h3 className="font-normal text-content-strong text-xs leading-snug line-clamp-2">
                        {epic.title}
                      </h3>
                    </div>
                  </div>

                  {/* Bagian B Row Cells - Columns */}
                  <div className="flex gap-3 sm:gap-4 px-4 py-3 snap-x snap-mandatory md:snap-none overflow-x-visible">
                    {boardStatuses.map((status, index) => (
                      <div
                        key={`${epic.id}-${status.id || statusColumnKey(status)}-${index}`}
                        className={cn(
                          "shrink-0 snap-start",
                          isCompact ? "w-[200px] sm:w-[240px]" : "w-[220px] sm:w-[270px]"
                        )}
                      >
                        <KanbanColumn
                          status={status}
                          tasks={tasksForStatusLane(groupedTasks, epic.id, status)}
                          mArr={mArr}
                          pArr={pArr}
                          columnId={`${epic.id}:${statusColumnKey(status)}`}
                          showHeader={false}
                          shakingTaskId={shakingTaskId}
                          onTaskClick={(task) => {
                            props.setSelectedTaskForDetail(task);
                            props.setIsTaskDetailModalOpen(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Standalone Tasks when Epic grouped */}
              {standaloneTasks.length > 0 && (
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] md:grid-cols-[280px_1fr] items-stretch border-b border-border-subtle/70 min-h-[110px]">
                  {/* Bagian A Row Cell - Sticky Sidebar */}
                  <div className="sticky left-0 z-50 bg-surface border-r border-border-subtle/80 px-3.5 py-3 relative">
                    <div
                      className={cn(
                        "bg-surface-sunken/70 rounded-lg border border-dashed border-border-subtle h-fit p-3",
                        isCompact ? "p-2.5" : "p-3"
                      )}
                    >
                      <h3 className="font-normal text-content-body text-xs leading-snug">
                        {t("kanban.otherTasks")}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-[10px] font-normal text-content-subtle">
                        {t("kanban.otherTasksHint")}
                      </p>
                    </div>
                  </div>

                  {/* Bagian B Row Cells - Columns */}
                  <div className="flex gap-3 sm:gap-4 px-4 py-3">
                    {boardStatuses.map((status, index) => (
                      <div
                        key={`standalone-${status.id || statusColumnKey(status)}-${index}`}
                        className={cn(
                          "shrink-0 snap-start",
                          isCompact ? "w-[200px] sm:w-[240px]" : "w-[220px] sm:w-[270px]"
                        )}
                      >
                        <KanbanColumn
                          status={status}
                          tasks={tasksForStatusLane(groupedTasks, "standalone", status)}
                          mArr={mArr}
                          pArr={pArr}
                          columnId={`standalone:${statusColumnKey(status)}`}
                          showHeader={false}
                          shakingTaskId={shakingTaskId}
                          onTaskClick={(task) => {
                            props.setSelectedTaskForDetail(task);
                            props.setIsTaskDetailModalOpen(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {filteredAssigneeSwimlanes.map((member) => {
                const uId = member.id;
                const isUnassigned = uId === "unassigned";
                const totalIssueCount = boardStatuses.reduce(
                  (acc, status) => acc + tasksForStatusLane(groupedTasks, uId, status).length,
                  0
                );

                return (
                  <div
                    key={uId}
                    className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] md:grid-cols-[280px_1fr] items-stretch border-b border-border-subtle/70 min-h-[110px]"
                  >
                    {/* Bagian A Row Cell - Sticky Sidebar */}
                    <div className="sticky left-0 z-50 bg-surface border-r border-border-subtle/80 px-3.5 py-3 relative">
                      <div
                        className={cn(
                          "bg-surface rounded-lg shadow-2xs border border-border-subtle/80 border-l-4 p-3 transition-all",
                          isUnassigned
                            ? "border-l-slate-400 bg-surface-sunken/50"
                            : "border-l-primary",
                          isCompact ? "p-2.5" : "p-3"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {isUnassigned ? (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center font-normal text-xs sm:text-[10px] uppercase bg-surface-muted text-content-secondary shrink-0">
                              ?
                            </div>
                          ) : (
                            <UserAvatar user={member} className="w-5 h-5 text-xs sm:text-[10px]" />
                          )}
                          <span className="text-xs sm:text-[10px] font-normal text-content-muted truncate">
                            {isUnassigned ? t("newTask.unassigned") : t("issueColumns.assignee")}
                          </span>
                          <span className="ml-auto bg-surface-muted text-content-secondary px-1.5 py-0.2 rounded text-xs sm:text-[10px] font-normal shrink-0">
                            {totalIssueCount}
                          </span>
                        </div>
                        <h3 className="font-normal text-content-strong text-xs leading-snug truncate">
                          {member.displayName}
                        </h3>
                      </div>
                    </div>

                    {/* Bagian B Row Cells - Columns */}
                    <div className="flex gap-3 sm:gap-4 px-4 py-3">
                      {boardStatuses.map((status, index) => (
                        <div
                          key={`${uId}-${status.id || statusColumnKey(status)}-${index}`}
                          className={cn(
                            "shrink-0 snap-start",
                            isCompact ? "w-[200px] sm:w-[240px]" : "w-[220px] sm:w-[270px]"
                          )}
                        >
                          <KanbanColumn
                            status={status}
                            tasks={tasksForStatusLane(groupedTasks, uId, status)}
                            mArr={mArr}
                            pArr={pArr}
                            columnId={`${uId}:${statusColumnKey(status)}`}
                            showHeader={false}
                            shakingTaskId={shakingTaskId}
                            onTaskClick={(task) => {
                              props.setSelectedTaskForDetail(task);
                              props.setIsTaskDetailModalOpen(true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-0 font-sans relative bg-surface-muted">
      <PageHeader
        className="shrink-0"
        breadcrumbs={[
          { label: t("kanban.breadcrumbGroup", "PROJECT") },
          { label: t("sidebar.kanbanBoard"), current: true },
        ]}
        title={t("kanban.title", t("sidebar.kanbanBoard"))}
      />
      {/* #417/#421 — Card board shell */}
      <div className="flex-1 flex flex-col min-h-0 px-3 md:px-4 pt-3 pb-3">
        <Card className="flex-1 flex flex-col rounded-lg overflow-hidden min-h-0">
          <DragDropContext onDragEnd={handleDragEndBoard}>
            <div className="flex-1 overflow-auto bg-transparent relative z-10 custom-scrollbar">
              {renderBoard()}
            </div>
          </DragDropContext>
        </Card>
      </div>
    </div>
  );
};
