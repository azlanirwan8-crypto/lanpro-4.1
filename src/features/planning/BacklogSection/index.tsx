import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Zap, Search, Target, LayoutGrid, Filter, Plus } from "lucide-react";
import { Task, MasterData } from "../../../types";
import { StyledDropdown } from "../../../components/ui/CommonComponents";

interface BacklogSectionProps {
  tasks: Task[];
  masterData: MasterData[];
  renderDraggableTask: (task: Task, index: number, variant: "card" | "row") => React.ReactNode;
  canEditPlanning?: boolean;
  onAddSprint?: () => void;
}

export const BacklogSection: React.FC<BacklogSectionProps> = ({
  tasks,
  masterData,
  renderDraggableTask,
  canEditPlanning = false,
  onAddSprint,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");

  const backlogTasks = tasks.filter((t) => !t.sprintId && (t.type || "").toLowerCase() !== "epic");

  const filteredBacklogTasks = backlogTasks.filter((t) => {
    if (
      search &&
      !t.title.toLowerCase().includes(search.toLowerCase()) &&
      !t.key?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (priorityFilter !== "All Priorities" && t.priority !== priorityFilter) return false;
    return true;
  });

  const epics = tasks.filter((t) => (t.type || "").toLowerCase() === "epic");

  const getTasksForParent = (parentId: string | null) => {
    if (parentId === "standalone")
      return filteredBacklogTasks.filter((t) => !t.parentId && t.type?.toLowerCase() !== "epic");
    return filteredBacklogTasks.filter((t) => t.parentId === parentId);
  };

  let _draggablesRenderedCount = 0;

  return (
    <>
      <div className="p-4 border-b border-border-subtle/80 flex flex-col gap-3 shrink-0 bg-surface shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutGrid className="w-4 h-4 text-content-muted shrink-0" />
            <h3 className="font-semibold text-content-strong text-xs tracking-tight truncate">
              {t("planning.backlogTasks")}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2 py-[3px] bg-primary/10 border border-primary/30 rounded-md text-[11px] font-medium text-primary">
              {t("planning.issueCount", { count: filteredBacklogTasks.length })}
            </div>
            {canEditPlanning && onAddSprint && (
              <button
                type="button"
                onClick={onAddSprint}
                title={t("planning.newSprint")}
                className="h-7 px-2 sm:px-2.5 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse rounded-md text-[11px] font-medium shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t("planning.newSprint")}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="relative min-w-0 flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none" />
            <input
              placeholder={t("planning.searchBacklog")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2 h-[32px] bg-surface-sunken/70 border border-border-subtle/80 rounded-md text-xs font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-surface transition-all shadow-2xs"
            />
          </div>
          <div className="w-[42%] max-w-[9.5rem] shrink-0 flex items-center gap-1.5 min-w-0">
            <Filter
              className="w-3.5 h-3.5 text-content-subtle shrink-0 hidden xs:block"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <StyledDropdown
                value={priorityFilter}
                onChange={(val) => setPriorityFilter(val)}
                options={[
                  { id: "All Priorities", label: t("planning.allPriorities") },
                  ...masterData
                    .filter((m) => m.type === "priority")
                    .map((p) => ({ id: p.label, label: p.label, icon: p.icon, color: p.color })),
                ]}
                type="priority"
                masterData={masterData}
                className="w-full"
                buttonClassName="h-[32px] w-full bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2 text-xs font-normal"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 bg-surface-sunken/40 min-h-0 custom-scrollbar">
        {epics.flatMap((epic) => {
          const items = getTasksForParent(epic.id);
          if (items.length === 0) return [];
          return [
            <div key={`header-${epic.id}`} className="flex items-center gap-2 px-1 mt-3 mb-2">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-normal text-purple-700 leading-none">{epic.title}</span>
              <div className="ml-auto text-[10px] leading-none font-normal text-purple-600 bg-purple-500/10 px-2 py-0.2 rounded-md border border-purple-500/30">
                {items.length}
              </div>
            </div>,
            ...items.map((task) => {
              const dndIndex = _draggablesRenderedCount++;
              return (
                <div key={task.id} className="mb-2 pl-2 relative border-l-2 border-primary/40">
                  {renderDraggableTask(task, dndIndex, "card")}
                </div>
              );
            }),
          ];
        })}

        {(() => {
          const items = getTasksForParent("standalone");
          if (items.length === 0) return [];
          return [
            <div key="header-standalone" className="flex items-center gap-2 px-1 mt-3 mb-2">
              <Target className="w-3.5 h-3.5 text-content-muted" />
              <span className="text-xs font-normal text-content-secondary leading-none">
                {t("planning.standaloneBacklog")}
              </span>
              <div className="ml-auto text-xs sm:text-[10px] font-normal text-content-secondary bg-surface-muted px-2 py-0.2 rounded-md border border-border-subtle/60">
                {items.length}
              </div>
            </div>,
            ...items.map((task) => {
              const dndIndex = _draggablesRenderedCount++;
              return (
                <div key={task.id} className="mb-2 pl-2 relative border-l-2 border-primary/40">
                  {renderDraggableTask(task, dndIndex, "card")}
                </div>
              );
            }),
          ];
        })()}

        {filteredBacklogTasks.length === 0 && (
          <div className="py-12 text-center text-xs font-normal text-content-subtle italic">
            {t("planning.emptyBacklog")}
          </div>
        )}
      </div>
    </>
  );
};
