import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Zap, Search, Target, LayoutGrid, Filter, Plus } from "lucide-react";
import { Task, MasterData } from "../../../types";
import { StyledDropdown } from "../../../components/ui/CommonComponents";
import { getAllDescendants, getTaskDepth } from "../../../lib/utils";

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

  // #689 butir (g) — satu kali jalan, bukan saringan berulang per baris.
  // Dulu: `backlogTasks` (n), `filteredBacklogTasks` (n), `epics` (n), lalu
  // `getTasksForParent` menyaring `filteredBacklogTasks` SEKALI LAGI untuk tiap
  // epik yang dirender (e × n). Pada 600 backlog dengan 40 epik itu ±24.000
  // iterasi per render, dan render terjadi setiap kali satu karakter diketik di
  // kotak pencarian atau satu kartu diseret.
  // UPDATE: Sekarang mengumpulkan SEMUA descendant secara rekursif (bukan hanya direct children)
  // untuk menampilkan hierarki sub-task bertingkat lengkap.
  const { filteredBacklogTasks, epics, kelompok } = React.useMemo(() => {
    const backlog = tasks.filter((t) => !t.sprintId && (t.type || "").toLowerCase() !== "epic");
    const kata = search.toLowerCase();

    const tersaring = backlog.filter((t) => {
      if (kata && !t.title.toLowerCase().includes(kata) && !t.key?.toLowerCase().includes(kata))
        return false;
      if (priorityFilter !== "All Priorities" && t.priority !== priorityFilter) return false;
      return true;
    });

    // Kumpulkan semua epic
    const epicsList = tasks.filter((t) => (t.type || "").toLowerCase() === "epic");

    // Untuk setiap epic, kumpulkan SEMUA descendant (bukan hanya direct children)
    const peta = new Map<string, { task: Task; depth: number }[]>();

    const dorong = (kunci: string, task: Task, depth: number) => {
      const wadah = peta.get(kunci);
      if (wadah) wadah.push({ task, depth });
      else peta.set(kunci, [{ task, depth }]);
    };

    // Proses setiap epic: kumpulkan semua descendant
    epicsList.forEach((epic) => {
      const allDescendants = getAllDescendants(epic.id, tasks);
      // Filter hanya yang ada di backlog (tidak di sprint)
      const backlogDescendants = allDescendants.filter((t) => !t.sprintId);

      backlogDescendants.forEach((descendant) => {
        const depth = getTaskDepth(descendant, tasks);
        dorong(epic.id, descendant, depth);
      });
    });

    // Standalone tasks (tanpa parent dan bukan epic)
    const standaloneTasks = tersaring.filter(
      (t) => !t.parentId && (t.type || "").toLowerCase() !== "epic"
    );
    standaloneTasks.forEach((t) => dorong("standalone", t, 0));

    return {
      filteredBacklogTasks: tersaring,
      epics: epicsList,
      kelompok: peta,
    };
  }, [tasks, search, priorityFilter]);

  const getTasksForParent = (parentId: string | null) =>
    kelompok.get(parentId ?? "") ?? [];

  // #689 butir (g) — "backlog kosong" dan "tidak ada yang cocok" adalah dua
  // kabar yang berbeda; yang pertama berarti tidak ada kerja, yang kedua berarti
  // saringannya terlalu sempit.
  const adaSaringan = Boolean(search.trim()) || priorityFilter !== "All Priorities";

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
            <div className="h-7 px-2 inline-flex items-center bg-primary/10 border border-primary/30 rounded-md text-[11px] font-medium text-primary">
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
            ...items.map(({ task, depth }) => {
              const dndIndex = _draggablesRenderedCount++;
              // Indentasi bertingkat: 8px per level depth
              const indentPx = depth * 8;
              const borderColor =
                depth === 1
                  ? "rgb(var(--color-primary) / 0.4)"
                  : depth === 2
                    ? "rgb(var(--color-primary) / 0.25)"
                    : "rgb(var(--color-primary) / 0.15)";

              return (
                <div
                  key={task.id}
                  className="mb-2 relative"
                  style={{
                    paddingLeft: `${indentPx + 8}px`,
                    borderLeft: depth > 0 ? `2px solid ${borderColor}` : undefined,
                  }}
                >
                  {renderDraggableTask(task, dndIndex, "card")}
                  {/* Dot indicator untuk sub-task level 2+ */}
                  {depth >= 2 && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/40" />
                  )}
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
            ...items.map(({ task, depth }) => {
              const dndIndex = _draggablesRenderedCount++;
              const indentPx = depth * 8;

              return (
                <div
                  key={task.id}
                  className="mb-2 relative"
                  style={{
                    paddingLeft: `${indentPx + 8}px`,
                    borderLeft:
                      depth > 0 ? "2px solid rgb(var(--color-primary) / 0.4)" : undefined,
                  }}
                >
                  {renderDraggableTask(task, dndIndex, "card")}
                </div>
              );
            }),
          ];
        })()}

        {filteredBacklogTasks.length === 0 && (
          <div className="py-12 text-center text-xs font-normal text-content-subtle italic">
            {/* Dua cabang, bukan `data-testid` ternary — lihat penjaga #602. */}
            {adaSaringan ? (
              <span data-testid="backlog-tidak-cocok">{t("planning.emptyBacklogFilter")}</span>
            ) : (
              <span data-testid="backlog-kosong">{t("planning.emptyBacklog")}</span>
            )}
          </div>
        )}
      </div>
    </>
  );
};
