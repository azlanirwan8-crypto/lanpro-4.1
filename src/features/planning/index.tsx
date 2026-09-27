import { useTranslation } from "react-i18next";
import React, { useRef } from "react";
import {
  DragDropContext,
  Droppable as _Droppable,
  Draggable as _Draggable,
} from "@hello-pangea/dnd";
import { Clock } from "lucide-react";
import { format } from "date-fns";

const Droppable = _Droppable as any;
const Draggable = _Draggable as any;

import { cn, ensureDate } from "../../lib/utils";
import { Task } from "../../types";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { PageHeader } from "../../components/ui/PageHeader";
import { PlanningViewProps } from "./types";
import { usePlanning } from "./hooks";
import { useAppStore } from "../../store/useAppStore";
import { BacklogSection } from "./BacklogSection";
import { SprintSection } from "./SprintSection";
import { useMobileAction } from "../../contexts/MobileActionContext";

export const PlanningView: React.FC<PlanningViewProps> = (props) => {
  const { t } = useTranslation();
  const {
    tasks,
    sprints,
    masterData,
    projectMembers,
    expandedSprintId,
    setExpandedSprintId,
    setSelectedTaskForDetail,
    setIsTaskDetailModalOpen,
    setIsNewSprintModalOpen,
    setIsEditSprintModalOpen,
    setEditingSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    handleDragEndPlanning,
    userRole,
    currentUserProfile,
  } = props;

  const { canEditPlanning, priorityColorMap } = usePlanning(props);

  const { registerAction, unregisterAction } = useMobileAction();

  React.useEffect(() => {
    if (canEditPlanning && setIsNewSprintModalOpen) {
      registerAction({
        id: "sprint-add-new",
        label: t("planning.createSprint") || "Buat Sprint Baru",
        onClick: () => setIsNewSprintModalOpen(true),
        canCreate: canEditPlanning,
      });
    } else {
      unregisterAction("sprint-add-new");
    }
    return () => unregisterAction("sprint-add-new");
  }, [canEditPlanning, setIsNewSprintModalOpen, registerAction, unregisterAction, t]);

  const isUserMatch = (fieldVal: string | null | undefined) => {
    if (!fieldVal) return false;
    const f = fieldVal.toLowerCase().trim();
    const options = [currentUserProfile?.uid, currentUserProfile?.id, currentUserProfile?.username]
      .filter((s): s is string => Boolean(s))
      .map((s) => s.toLowerCase().trim());
    return options.includes(f);
  };

  const canDragTask = (task: Task) => {
    // 3. User is Admin or Manager
    if (["admin", "manager"].includes(userRole)) {
      return true;
    }
    // 1. User is the direct creator (Reporter) of the task/sub-task
    if (isUserMatch(task.reporterId)) {
      return true;
    }
    // 2. User is the Reporter of the PARENT ISSUE (Epic)
    if (task.parentId) {
      const parentEpic = tasks.find((t) => t.id === task.parentId);
      if (parentEpic && isUserMatch(parentEpic.reporterId)) {
        return true;
      }
    }
    return false;
  };

  const renderDraggableTask = (task: Task, index: number, variant: "card" | "row" = "card") => {
    const isDragDisabled = !canDragTask(task);
    return (
      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
        {(provided: any, snapshot: any) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style }}
            className="outline-none"
          >
            <div
              onClick={() => {
                setSelectedTaskForDetail(task);
                setIsTaskDetailModalOpen(false);
                useAppStore.getState().setCurrentView("issueDetail" as any);
              }}
              className={cn(
                "transition-all duration-200 ease-out select-none",
                variant === "card"
                  ? cn(
                      "group p-3 rounded-lg shadow-2xs cursor-pointer hover:shadow-xs",
                      (() => {
                        if (task.isBlocked)
                          return "border-l-4 border-l-danger bg-danger/5 border border-danger/30 hover:border-danger";
                        const p = (task.priority || "").toLowerCase();
                        if (p === "highest" || p === "high")
                          return "border-l-4 border-l-danger bg-danger/5 border border-border-subtle/80 hover:border-danger/60";
                        if (p === "medium")
                          return "border-l-4 border-l-warning bg-warning/5 border border-border-subtle/80 hover:border-warning/60";
                        return "border-l-4 border-l-primary bg-primary/5 border border-border-subtle/80 hover:border-primary/60";
                      })()
                    )
                  : cn(
                      "group flex items-center justify-between p-2.5 px-3 rounded-lg shadow-2xs cursor-pointer hover:bg-surface-sunken/70",
                      (() => {
                        if (task.isBlocked)
                          return "border-l-4 border-l-danger bg-danger/5 border border-danger/30";
                        const s = (task.status || "").toLowerCase();
                        if (s === "done" || s === "completed" || s === "selesai")
                          return "border-l-4 border-l-success bg-success/5 border border-border-subtle/80";
                        if (s === "in progress" || s === "in_progress" || s === "sedang dikerjakan")
                          return "border-l-4 border-l-primary bg-primary/5 border border-border-subtle/80";
                        if (s === "in review" || s === "testing" || s === "qa")
                          return "border-l-4 border-l-info bg-info/5 border border-border-subtle/80";
                        const p = (task.priority || "").toLowerCase();
                        if (p === "highest" || p === "high")
                          return "border-l-4 border-l-danger bg-danger/5 border border-border-subtle/80";
                        if (p === "medium")
                          return "border-l-4 border-l-warning bg-warning/5 border border-border-subtle/80";
                        return "border-l-4 border-l-border-subtle bg-surface border border-border-subtle/80";
                      })()
                    ),
                task.isBlocked && "ring-1 ring-danger/50",
                snapshot.isDragging &&
                  "shadow-xl ring-2 ring-primary/20 scale-[1.02] z-50 bg-surface border-primary"
              )}
            >
              {variant === "card" ? (
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-xs font-normal text-content-body leading-snug line-clamp-2">
                    {task.title}
                  </h4>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-border-faint">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
                        {task.assigneeId ? (
                          <UserAvatar
                            uid={task.assigneeId}
                            members={projectMembers}
                            className="w-5 h-5"
                          />
                        ) : (
                          <span className="text-xs sm:text-[10px] font-medium text-content-subtle">
                            ?
                          </span>
                        )}
                      </div>
                      {task.dueDate && (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-xs sm:text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                            ensureDate(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
                              ? "bg-danger/10 text-danger-text border border-danger/30"
                              : "bg-surface-sunken text-content-muted border border-border-subtle/60"
                          )}
                        >
                          <Clock className="w-3 h-3" />
                          {format(ensureDate(task.dueDate), "MMM d")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.priority && (
                        <span
                          className={cn(
                            "text-[10px] leading-none font-medium px-1.5 py-[3px] rounded border",
                            (() => {
                              const p = (task.priority || "").toLowerCase();
                              if (p === "highest" || p === "high")
                                return "text-danger-text bg-danger/10 border-danger/30";
                              if (p === "medium")
                                return "text-warning-text bg-warning/10 border-warning/30";
                              return "text-primary bg-primary/10 border-primary/30";
                            })()
                          )}
                        >
                          {task.priority}
                        </span>
                      )}
                      <span className="text-[10px] leading-none font-medium text-content-body bg-surface-sunken px-1.5 py-[3px] rounded border border-border-subtle">
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-content-strong truncate">
                      {task.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.dueDate && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs sm:text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                          ensureDate(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
                            ? "bg-danger/10 text-danger-text border-danger/30"
                            : "bg-surface-sunken text-content-muted border-border-subtle/60"
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        {format(ensureDate(task.dueDate), "MMM d")}
                      </div>
                    )}
                    {task.priority && (
                      <span
                        className={cn(
                          "text-[10px] leading-none font-medium px-1.5 py-[3px] rounded border",
                          (() => {
                            const p = (task.priority || "").toLowerCase();
                            if (p === "highest" || p === "high")
                              return "text-danger-text bg-danger/10 border-danger/30";
                            if (p === "medium")
                              return "text-warning-text bg-warning/10 border-warning/30";
                            return "text-primary bg-primary/10 border-primary/30";
                          })()
                        )}
                      >
                        {task.priority}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-surface-sunken border border-border-subtle/70 rounded-md text-xs sm:text-[10px] font-medium text-content-body">
                      {task.status}
                    </span>
                    <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center">
                      {task.assigneeId ? (
                        <UserAvatar
                          uid={task.assigneeId}
                          members={projectMembers}
                          className="w-5 h-5"
                        />
                      ) : (
                        <span className="text-xs sm:text-[10px] font-medium text-content-subtle">
                          ?
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto md:overflow-hidden bg-surface-muted flex flex-col h-[calc(100dvh-64px)] text-left">
      <PageHeader title={t("planning.sprintPlanning")} />
      <DragDropContext onDragEnd={handleDragEndPlanning}>
        <div className="flex flex-col md:flex-row flex-1 gap-5 w-full h-full min-h-0 px-2 sm:px-4 md:px-5 pt-3 md:pt-4 pb-20 sm:pb-4 md:pb-5">
          <div className="w-full md:w-[320px] lg:w-[360px] xl:w-[380px] h-[220px] sm:h-[280px] md:h-full shrink-0 flex flex-col bg-surface border border-border-subtle/80 rounded-lg overflow-hidden shadow-2xs">
            <Droppable droppableId="backlog">
              {(provided: any) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="h-full flex flex-col"
                >
                  <BacklogSection
                    tasks={tasks}
                    masterData={masterData}
                    renderDraggableTask={renderDraggableTask}
                    canEditPlanning={canEditPlanning}
                    onAddSprint={() => setIsNewSprintModalOpen(true)}
                  />
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            <SprintSection
              sprints={sprints}
              tasks={tasks}
              masterData={masterData}
              expandedSprintId={expandedSprintId}
              setExpandedSprintId={setExpandedSprintId}
              renderDraggableTask={renderDraggableTask}
              handleStartSprint={handleStartSprint}
              handleCompleteSprint={handleCompleteSprint}
              handleDeleteSprint={handleDeleteSprint}
              canEditPlanning={canEditPlanning}
              setEditingSprint={setEditingSprint}
              setIsEditSprintModalOpen={setIsEditSprintModalOpen}
            />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};
