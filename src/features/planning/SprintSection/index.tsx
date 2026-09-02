import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  ChevronDown,
  Edit2,
  Trash2,
  Zap,
  Target,
  CheckCircle2,
  Rocket,
  Star,
  PieChart,
  MoreVertical,
} from "lucide-react";
import { format } from "date-fns";
import { cn, ensureDate } from "../../../lib/utils";
import { Task, Sprint, MasterData } from "../../../types";
import { statusSelesai } from "../../../lib/statusSelesai";
import { Droppable as _Droppable } from "@hello-pangea/dnd";

const Droppable = _Droppable as any;

interface SprintSectionProps {
  sprints: Sprint[];
  tasks: Task[];
  masterData?: MasterData[];
  expandedSprintId: string | null;
  setExpandedSprintId: (id: string) => void;
  renderDraggableTask: (task: Task, index: number, variant: "card" | "row") => React.ReactNode;
  handleStartSprint: (id: string) => void;
  handleCompleteSprint: (id: string) => void;
  handleDeleteSprint: (id: string) => void;
  canEditPlanning: boolean;
  setEditingSprint: (sprint: Sprint) => void;
  setIsEditSprintModalOpen: (open: boolean) => void;
}

export const SprintSection: React.FC<SprintSectionProps> = ({
  sprints,
  tasks,
  masterData = [],
  expandedSprintId,
  setExpandedSprintId,
  renderDraggableTask,
  handleStartSprint,
  handleCompleteSprint,
  handleDeleteSprint,
  canEditPlanning,
  setEditingSprint,
  setIsEditSprintModalOpen,
}) => {
  const { t } = useTranslation();
  const [activeSprintMenuId, setActiveSprintMenuId] = useState<string | null>(null);

  return (
    <div className="flex-1 overflow-auto space-y-3.5 pb-16 pr-1 min-h-0 custom-scrollbar">
      {sprints
        .sort((a, b) => ensureDate(b.startDate).getTime() - ensureDate(a.startDate).getTime())
        .map((sprint) => {
          const sprintTasks = tasks.filter(
            (t) => t.sprintId === sprint.id && (t.type || "").toLowerCase() !== "epic"
          );
          const totalTasks = sprintTasks.length;
          const doneTaskList = sprintTasks.filter((t) => statusSelesai(t.status, masterData));
          const doneTasks = doneTaskList.length;
          const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
          const donePoints = doneTaskList.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
          // #313 — samakan metrik: pakai poin bila ada, else hitungan tugas
          const completionPercentage =
            totalPoints > 0
              ? Math.round((donePoints / totalPoints) * 100)
              : totalTasks > 0
                ? Math.round((doneTasks / totalTasks) * 100)
                : 0;

          const isExpanded =
            expandedSprintId === sprint.id ||
            (expandedSprintId === null && sprint.status === "active");

          const isOverdue =
            sprint.status === "active" &&
            sprint.endDate &&
            ensureDate(sprint.endDate) < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div
              key={sprint.id}
              className={cn(
                "bg-surface border rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs",
                sprint.status === "active"
                  ? isOverdue
                    ? "border-red-400 ring-2 ring-red-50"
                    : "border-indigo-500 ring-2 ring-indigo-500/10"
                  : sprint.status === "planned"
                    ? "border-border-subtle/90 hover:border-indigo-500/40"
                    : "border-border-subtle/60 bg-surface-sunken/40 opacity-95",
                isExpanded && sprint.status !== "active" ? "border-indigo-500/30" : ""
              )}
            >
              {/* Header Sprint (Presisi Gambar 1) */}
              <div
                className="p-4 sm:p-5 flex flex-col gap-4 cursor-pointer hover:bg-surface-sunken/40 transition border-b border-border-subtle"
                onClick={() => setExpandedSprintId(isExpanded ? "" : sprint.id)}
              >
                {/* #364 — judul + fase + aksi sejajar 1 baris; tanggal di bawah */}
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  {/* Sisi Kiri: Icon Roket + Name + Status + Date */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-content-inverse flex items-center justify-center shadow-xs shrink-0">
                      <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-content-inverse" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <h3 className="font-semibold text-content-strong text-sm truncate min-w-0">
                          {sprint.name?.trim() || t("planning.untitledSprint")}
                        </h3>
                        <span
                          className={cn(
                            "text-[10px] font-normal px-2 py-0.5 rounded-full border shrink-0",
                            sprint.status === "active"
                              ? isOverdue
                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : sprint.status === "planned"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-surface-sunken text-content-muted border-border-subtle"
                          )}
                        >
                          {sprint.status === "active"
                            ? isOverdue
                              ? "Overdue"
                              : "Active"
                            : sprint.status === "planned"
                              ? "Planned"
                              : "Completed"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-content-subtle font-normal mt-0.5 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-content-subtle shrink-0" />
                        <span className="truncate">
                          {sprint.startDate && sprint.endDate
                            ? `${format(ensureDate(sprint.startDate), "MMM d, yyyy")} - ${format(ensureDate(sprint.endDate), "MMM d, yyyy")} ${
                                Math.ceil(
                                  (ensureDate(sprint.endDate).getTime() -
                                    ensureDate(sprint.startDate).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                ) > 0
                                  ? `(${Math.ceil((ensureDate(sprint.endDate).getTime() - ensureDate(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24))} days)`
                                  : ""
                              }`
                            : t("planning.noDates", "Belum ada tanggal")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sisi Tengah: Sprint Goal (Pemisah Garis Vertikal - Tanpa Ikon Pensil) */}
                  <div className="hidden md:flex flex-col min-w-0 flex-1 border-l border-border-subtle/80 pl-5 my-0.5 max-w-md">
                    <div className="text-xs font-normal text-indigo-600">Sprint Goal</div>
                    <p className="text-xs text-content-body font-normal leading-relaxed line-clamp-2 mt-0.5">
                      {sprint.goal ||
                        t(
                          "planning.defaultGoal",
                          "Selesaikan alur pendaftaran dan siapkan modul dependensi transaksi."
                        )}
                    </p>
                  </div>

                  {/* Sisi Kanan: Action Buttons — sejajar judul/fase */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {canEditPlanning && (
                      <>
                        {sprint.status === "planned" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSprint(sprint.id);
                            }}
                            className="btn-animation waves-effect waves-light btn-primary h-8 px-3 text-xs font-normal rounded-lg flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />{" "}
                            <span>{t("planning.start")}</span>
                          </button>
                        )}
                        {sprint.status === "active" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteSprint(sprint.id);
                            }}
                            className="btn-animation waves-effect waves-light btn-success h-8 px-3 text-xs font-normal rounded-lg flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                            <span>{t("planning.complete")}</span>
                          </button>
                        )}

                        {/* Tombol Opsi Titik 3 Dropdown Popover */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSprintMenuId(
                                activeSprintMenuId === sprint.id ? null : sprint.id
                              );
                            }}
                            className="btn-animation waves-effect waves-light p-2 text-content-subtle hover:text-content-strong hover:bg-surface border border-border-subtle rounded-lg transition-colors cursor-pointer"
                            title={t("planning.sprintOptions", "Opsi Sprint")}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeSprintMenuId === sprint.id && (
                            <div
                              className="absolute right-0 mt-1.5 w-36 bg-surface border border-border-subtle rounded-xl shadow-lg z-50 overflow-hidden py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setActiveSprintMenuId(null);
                                  setEditingSprint(sprint);
                                  setIsEditSprintModalOpen(true);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-normal text-content-strong hover:bg-surface-sunken flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{t("planning.editSprint", "Edit Sprint")}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveSprintMenuId(null);
                                  handleDeleteSprint(sprint.id);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-normal text-red-600 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>{t("planning.deleteSprint", "Hapus Sprint")}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Baris Bawah: Grid 4-Kartu Ringkasan (Presisi Gambar 1) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2.5 bg-surface-sunken/50 rounded-xl border border-border-subtle/70 mt-1">
                  {/* 1. Issues Card */}
                  <div className="bg-surface border border-border-subtle/80 rounded-lg p-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-content-strong leading-none">
                        {totalTasks}
                      </div>
                      <div className="text-[11px] font-normal text-content-subtle mt-0.5">
                        {t("planning.issues", "Issues")}
                      </div>
                    </div>
                  </div>

                  {/* 2. Points Card */}
                  <div className="bg-surface border border-border-subtle/80 rounded-lg p-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-content-strong leading-none">
                        {sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)}
                      </div>
                      <div className="text-[11px] font-normal text-content-subtle mt-0.5">
                        {t("planning.points", "Points")}
                      </div>
                    </div>
                  </div>

                  {/* 3. Progress Card */}
                  <div className="bg-surface border border-border-subtle/80 rounded-lg p-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-content-strong leading-none">
                        {completionPercentage}%
                      </div>
                      <div className="text-[11px] font-normal text-content-subtle mt-0.5">
                        {t("planning.progress", "Progress")}
                        {totalPoints > 0
                          ? ` · ${donePoints}/${totalPoints} pts`
                          : ` · ${doneTasks}/${totalTasks}`}
                      </div>
                    </div>
                  </div>

                  {/* 4. Completed Card */}
                  <div className="bg-surface border border-border-subtle/80 rounded-lg p-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-content-strong leading-none">
                        {doneTasks}/{totalTasks}
                      </div>
                      <div className="text-[11px] font-normal text-content-subtle mt-0.5">
                        {t("planning.completed", "Completed")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      transition: {
                        height: { type: "spring", stiffness: 150, damping: 22 },
                        opacity: { duration: 0.2 },
                      },
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } },
                    }}
                    className="overflow-hidden bg-surface-sunken/30"
                  >
                    <div className="p-3.5 pt-2">
                      <Droppable droppableId={sprint.id}>
                        {(provided: any, snapshot: any) => {
                          const sprintEpics = tasks.filter(
                            (t) =>
                              (t.type || "").toLowerCase() === "epic" &&
                              sprintTasks.some((st) => st.parentId === t.id)
                          );

                          const getSprintTasksForParent = (parentId: string | null) => {
                            if (parentId === "standalone")
                              return sprintTasks.filter(
                                (t) => !t.parentId && t.type?.toLowerCase() !== "epic"
                              );
                            return sprintTasks.filter((t) => t.parentId === parentId);
                          };

                          let _draggablesRenderedCount = 0;

                          return (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={cn(
                                "min-h-[80px] transition-all duration-200 rounded-md p-2.5 border border-dashed",
                                snapshot.isDraggingOver
                                  ? "bg-primary-surface/10 border-primary shadow-2xs"
                                  : "border-border-subtle/80 bg-surface",
                                sprintTasks.length === 0 &&
                                  !snapshot.isDraggingOver &&
                                  "border-border-subtle"
                              )}
                            >
                              {sprintTasks.length === 0 && !snapshot.isDraggingOver ? (
                                <div className="flex items-center justify-center p-6 text-center">
                                  <p className="text-xs font-medium text-content-subtle">
                                    {t("planning.sprintEmptyDrag")}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {sprintEpics.flatMap((epic) => {
                                    const items = getSprintTasksForParent(epic.id);
                                    if (items.length === 0) return [];
                                    return [
                                      <div
                                        key={`sprint-header-${epic.id}`}
                                        className="flex items-center justify-between px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-md mb-2 mt-2 first:mt-0"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Zap className="w-3.5 h-3.5 text-purple-600" />
                                          <span className="text-xs font-normal text-purple-700 leading-none">
                                            {epic.title}
                                          </span>
                                        </div>
                                        <div className="text-[10px] font-normal text-purple-600 bg-surface border border-purple-500/30 px-2 py-0.2 rounded-md">
                                          {items.length}
                                        </div>
                                      </div>,
                                      ...items.map((task) => {
                                        const dndIndex = _draggablesRenderedCount++;
                                        return (
                                          <div
                                            key={task.id}
                                            className="mb-2 max-w-full overflow-hidden"
                                          >
                                            {renderDraggableTask(task, dndIndex, "row")}
                                          </div>
                                        );
                                      }),
                                    ];
                                  })}

                                  {(() => {
                                    const items = getSprintTasksForParent("standalone");
                                    if (items.length === 0) return [];
                                    return [
                                      <div
                                        key="sprint-header-standalone"
                                        className="flex items-center justify-between px-3 py-1.5 bg-surface-muted/70 border border-border-subtle/60 rounded-md mb-2 mt-2 first:mt-0"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Target className="w-3.5 h-3.5 text-content-muted" />
                                          <span className="text-xs font-normal text-content-secondary leading-none">
                                            {t("planning.standaloneTasks")}
                                          </span>
                                        </div>
                                        <div className="text-[10px] font-normal text-content-secondary bg-surface border border-border-subtle/60 px-2 py-0.2 rounded-md">
                                          {items.length}
                                        </div>
                                      </div>,
                                      ...items.map((task) => {
                                        const dndIndex = _draggablesRenderedCount++;
                                        return (
                                          <div
                                            key={task.id}
                                            className="mb-2 max-w-full overflow-hidden"
                                          >
                                            {renderDraggableTask(task, dndIndex, "row")}
                                          </div>
                                        );
                                      }),
                                    ];
                                  })()}
                                </>
                              )}
                              {provided.placeholder}
                            </div>
                          );
                        }}
                      </Droppable>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
    </div>
  );
};
