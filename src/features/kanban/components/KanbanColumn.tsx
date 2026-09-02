import { useTranslation } from "react-i18next";
import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { cn } from "../../../lib/utils";
import { RenderIcon } from "../../../components/RenderIcon";
import { KanbanCard } from "./KanbanCard";
import { useAppStore } from "../../../store/useAppStore";
import { statusSelesai } from "../../../lib/statusSelesai";

interface KanbanColumnProps {
  status: any;
  tasks: any[];
  mArr: any[];
  pArr: any[];
  onTaskClick: (task: any) => void;
  columnId?: string;
  showHeader?: boolean;
  shakingTaskId?: string | null;
}

export const KanbanColumn = React.memo<KanbanColumnProps>(
  ({ status, tasks, mArr, pArr, onTaskClick, columnId, showHeader = true, shakingTaskId }) => {
    const { t } = useTranslation();
    const { density } = useAppStore();
    const isCompact = density === "compact";

    return (
      <div
        className={cn(
          "shrink-0 flex flex-col h-full rounded-md transition-all duration-200 group/col relative bg-surface-muted/50 border border-border-subtle/70",
          isCompact ? "w-[240px]" : "w-[270px]"
        )}
      >
        {showHeader && (
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border-subtle/70 bg-surface rounded-t-md shadow-2xs">
            <div className="flex items-center gap-2">
              {status.icon ? (
                <RenderIcon
                  iconName={status.icon}
                  className="w-3.5 h-3.5"
                  style={{ color: status.color }}
                />
              ) : (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
              )}
              <span className="text-xs font-normal text-content-strong">{status.label}</span>
            </div>
            <span className="bg-surface-muted text-content-secondary px-2 py-0.5 rounded-md text-[10px] font-normal border border-border-subtle/60">
              {tasks.length}
            </span>
          </div>
        )}

        <div
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar flex flex-col",
            isCompact ? "p-1.5" : "p-2"
          )}
        >
          <Droppable droppableId={columnId || status.label}>
            {(provided: any, snapshot: any) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={cn(
                  "flex flex-col rounded-md min-h-[100px] h-full transition-all duration-200 flex-1",
                  isCompact ? "gap-1.5" : "gap-2",
                  snapshot.isDraggingOver &&
                    (statusSelesai(status.label, mArr) || statusSelesai(status.code, mArr)
                      ? "bg-red-500/10 border-2 border-dashed border-red-400 cursor-not-allowed"
                      : "bg-primary-surface/10 border-2 border-dashed border-primary")
                )}
              >
                {tasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                    {(provided: any, snapshot: any) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={provided.draggableProps.style}
                        className="rounded-lg relative group/drag"
                      >
                        {/*
                          #357 — handle drag terpisah + touch-action:none agar
                          scroll kolom tidak merebut gesture di mobile browser.
                          Di desktop, seluruh kartu tetap bisa digeser lewat
                          area handle yang lebih lebar (hover).
                        */}
                        <button
                          type="button"
                          aria-label={t("kanban.dragHandle", "Geser kartu")}
                          {...provided.dragHandleProps}
                          style={{ touchAction: "none" }}
                          className={cn(
                            "absolute left-0.5 top-1/2 -translate-y-1/2 z-10",
                            "flex items-center justify-center w-7 h-9 rounded-md",
                            "text-content-subtle hover:text-content-strong hover:bg-surface-muted",
                            "border border-transparent hover:border-border-subtle/70",
                            "active:scale-95 cursor-grab active:cursor-grabbing touch-none"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <div className="pl-7">
                          <KanbanCard
                            task={task}
                            mArr={mArr}
                            pArr={pArr}
                            onClick={() => onTaskClick(task)}
                            isDragging={snapshot.isDragging}
                            shakingTaskId={shakingTaskId}
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {tasks.length === 0 && snapshot.isDraggingOver && (
                  <div className="flex items-center justify-center p-3 rounded-md border border-dashed border-primary bg-primary-surface/10 min-h-[50px] select-none">
                    <span className="text-xs sm:text-[10px] font-normal text-primary uppercase tracking-wider">
                      {t("kanban.dropHere")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.columnId !== nextProps.columnId) return false;
    if (prevProps.showHeader !== nextProps.showHeader) return false;
    if (prevProps.status?.label !== nextProps.status?.label) return false;
    if (prevProps.status?.color !== nextProps.status?.color) return false;
    if (prevProps.status?.icon !== nextProps.status?.icon) return false;
    if (prevProps.tasks.length !== nextProps.tasks.length) return false;
    if (prevProps.mArr !== nextProps.mArr) return false;
    if (prevProps.pArr !== nextProps.pArr) return false;

    // Verify deep equality of tasks
    for (let i = 0; i < prevProps.tasks.length; i++) {
      const pt = prevProps.tasks[i];
      const nt = nextProps.tasks[i];
      if (
        pt.id !== nt.id ||
        pt.status !== nt.status ||
        pt.version !== nt.version ||
        pt.title !== nt.title ||
        pt.assigneeId !== nt.assigneeId ||
        pt.isBlocked !== nt.isBlocked ||
        pt.priority !== nt.priority ||
        pt.updatedAt !== nt.updatedAt ||
        JSON.stringify(pt.subtasks) !== JSON.stringify(nt.subtasks) ||
        (pt.linkedTasks?.length || 0) !== (nt.linkedTasks?.length || 0)
      ) {
        return false;
      }
    }
    return true;
  }
);
