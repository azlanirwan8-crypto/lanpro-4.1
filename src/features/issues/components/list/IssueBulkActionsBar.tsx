import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../../lib/utils";
import { Task, MasterData, UserProfile } from "../../../../types";

interface IssueBulkActionsBarProps {
  displayRoots: Task[];
  listPage: number;
  setListPage: (fn: ((prev: number) => number) | number) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  selectedTaskIds: Set<string>;
  setSelectedTaskIds: (ids: Set<string>) => void;
  tasks: Task[];
  masterData: MasterData[];
  projectMembers: UserProfile[];
  updateTaskField: (id: string, field: string, value: any) => void;
  deleteTask?: (id: string) => void;
  bulkDeleteTasks?: (taskIds: string[]) => void;
  canDeleteIssue: (task: Task) => boolean;
}

export const IssueBulkActionsBar: React.FC<IssueBulkActionsBarProps> = ({
  displayRoots,
  listPage,
  setListPage,
  itemsPerPage,
  setItemsPerPage,
  selectedTaskIds,
  setSelectedTaskIds,
  tasks,
  masterData,
  projectMembers,
  updateTaskField,
  deleteTask,
  bulkDeleteTasks,
  canDeleteIssue,
}) => {
  const { t } = useTranslation();
  const mArr = masterData || [];
  const tArr = tasks || [];
  const totalPages = Math.ceil(displayRoots.length / itemsPerPage);

  return (
    <>
      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-border-subtle bg-surface-sunken shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-[10px] font-normal text-content-muted">
            {t("common.showing")}{" "}
            {displayRoots.length === 0 ? 0 : (listPage - 1) * itemsPerPage + 1} {t("common.to")}{" "}
            {Math.min(listPage * itemsPerPage, displayRoots.length)} {t("common.of")}{" "}
            {displayRoots.length} {t("common.entries")}
          </span>
          <div className="flex items-center gap-1.5 pl-2 border-l border-border-subtle">
            <span className="text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-wider">
              {t("bulkActions.perPage")}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setListPage(1);
              }}
              className="text-xs sm:text-[10px] font-normal bg-surface border border-border-subtle rounded-lg px-2 py-0.5 text-content-body outline-none focus:border-indigo-500 cursor-pointer shadow-soft"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={9999}>{t("bulkActions.all")}</option>
            </select>
          </div>
        </div>

        <div className="flex gap-1 items-center">
          <button
            onClick={() => setListPage((p) => Math.max(1, p - 1))}
            disabled={listPage === 1}
            className="px-2.5 py-1 text-xs sm:text-[10px] font-normal text-content-secondary bg-surface border border-border-subtle rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-sunken transition-all active:scale-95 cursor-pointer shadow-soft"
          >
            {t("bulkActions.prev")}
          </button>
          <div className="flex gap-1 items-center px-1 max-w-[200px] overflow-x-auto">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setListPage(i + 1)}
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-xs sm:text-[11px] sm:text-[9px] font-normal transition-all cursor-pointer active:scale-95 shrink-0",
                  listPage === i + 1
                    ? "bg-primary-surface text-content-inverse shadow-xs"
                    : "text-content-muted hover:bg-surface-strong/80"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
            disabled={listPage >= totalPages}
            className="px-2.5 py-1 text-xs sm:text-[10px] font-normal text-content-secondary bg-surface border border-border-subtle rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-sunken transition-all active:scale-95 cursor-pointer shadow-soft"
          >
            {t("bulkActions.next")}
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 80, opacity: 0, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 bg-overlay/95 backdrop-blur-md border border-border-inverse/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] px-6 py-3.5 flex flex-wrap items-center gap-6 text-content-inverse text-xs font-medium select-none"
          >
            <div className="flex items-center gap-2 border-r border-border-inverse pr-4">
              <span className="bg-indigo-600 text-content-inverse text-xs sm:text-[10px] font-medium rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {selectedTaskIds.size}
              </span>
              <span className="text-content-subtle font-medium uppercase tracking-wider text-xs sm:text-[10px]">
                {t("bulkActions.selectedTasks")}
              </span>
            </div>

            {/* Change Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-content-subtle text-xs sm:text-[10px] uppercase tracking-wider">
                {t("bulkActions.status")}
              </span>
              <StyledDropdown
                value=""
                onChange={(val: string) => {
                  if (val) {
                    const ids = Array.from(selectedTaskIds);
                    ids.forEach((id) => updateTaskField(id, "status", val));
                    toast.success(t("toast.bulkStatusChanged", { count: ids.length, status: val }));
                    setSelectedTaskIds(new Set());
                  }
                }}
                options={[
                  {
                    id: "",
                    label: t("bulkActions.pickStatus"),
                    icon: "Layers",
                    color: "#6366F1",
                  },
                  ...mArr
                    .filter((m) => m.type === "status")
                    .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color })),
                ]}
                type="status"
                masterData={mArr}
                buttonClassName="bg-surface-inverse border border-border-inverse text-content-inverse rounded-xl px-2.5 py-1.5 text-xs font-medium"
              />
            </div>

            {/* Change Assignee Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-content-subtle text-xs sm:text-[10px] uppercase tracking-wider">
                {t("bulkActions.assignee")}
              </span>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  const effectiveAssignee = val === "unassigned" ? null : val;
                  const ids = Array.from(selectedTaskIds);
                  ids.forEach((id) => updateTaskField(id, "assigneeId", effectiveAssignee));
                  toast.success(t("toast.bulkAssigneeUpdated", { count: ids.length }));
                  setSelectedTaskIds(new Set());
                }}
                defaultValue=""
                className="bg-surface-inverse border border-border-inverse text-content-inverse rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 cursor-pointer font-medium"
              >
                <option value="" disabled>
                  {t("bulkActions.pickAssignee")}
                </option>
                <option value="unassigned">{t("bulkActions.unassignedClear")}</option>
                {projectMembers.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.displayName || m.email || "Unknown"}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Delete */}
            {(() => {
              const deletableIds = Array.from(selectedTaskIds).filter((id) => {
                const t = tArr.find((x) => x.id === id);
                return t ? canDeleteIssue(t) : false;
              });
              const canDeleteAnySelected = deletableIds.length > 0;

              return (
                (bulkDeleteTasks || deleteTask) &&
                canDeleteAnySelected && (
                  <button
                    onClick={() => {
                      if (bulkDeleteTasks) {
                        bulkDeleteTasks(deletableIds);
                        setSelectedTaskIds(new Set());
                      } else if (deleteTask) {
                        deletableIds.forEach((id) => deleteTask(id));
                        setSelectedTaskIds(new Set());
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-content-inverse font-medium rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shadow-soft cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Hapus ({deletableIds.length})</span>
                  </button>
                )
              );
            })()}

            {/* Deselect All / Close */}
            <button
              onClick={() => setSelectedTaskIds(new Set())}
              className="p-1.5 hover:bg-surface-inverse text-content-subtle hover:text-content-inverse rounded-xl transition-all cursor-pointer"
              title={t("bulkActions.clearSelection")}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
