import { useTranslation } from "react-i18next";
import React from "react";
import { AnimatePresence } from "motion/react";
import { Search, Filter, X, Calendar, Settings2, MoreHorizontal } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { styles } from "../../styles";
import { MasterData, UserProfile, Sprint } from "../../../../types";
import { IssueAdvancedFiltersExpanded } from "./IssueAdvancedFiltersExpanded";

interface IssueAdvancedFiltersPanelProps {
  issueSearch: string;
  setIssueSearch: (val: string) => void;
  isFiltersPanelOpen: boolean;
  setIsFiltersPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  listFilterStatus: string;
  setListFilterStatus: (val: string) => void;
  listFilterPriority: string;
  setListFilterPriority: (val: string) => void;
  listFilterAssignee: string;
  setListFilterAssignee: (val: string) => void;
  listFilterCategory: string;
  setListFilterCategory: (val: string) => void;
  listFilterSprint: string;
  setListFilterSprint: (val: string) => void;
  listFilterLabel: string;
  setListFilterLabel: (val: string) => void;
  listFilterEnvironment: string;
  setListFilterEnvironment: (val: string) => void;
  listFilterProjectRisk: string;
  setListFilterProjectRisk: (val: string) => void;
  listFilterRelease: string;
  setListFilterRelease: (val: string) => void;
  listFilterResolution: string;
  setListFilterResolution: (val: string) => void;
  listFilterDateType: string;
  setListFilterDateType: (val: string) => void;
  listFilterStartDate: string;
  setListFilterStartDate: (val: string) => void;
  listFilterEndDate: string;
  setListFilterEndDate: (val: string) => void;
  projectMembers: UserProfile[];
  sprints: Sprint[];
  masterData: MasterData[];
  allLabels: string[];
  allEnvironments: { id: string; label: string; icon?: string; color?: string }[];
  allProjectRisks: { id: string; label: string; icon?: string; color?: string }[];
  allReleases: { id: string; label: string; icon?: string; color?: string }[];
  allResolutions: { id: string; label: string; icon?: string; color?: string }[];
  setIsConfigureColumnsOpen: (val: boolean) => void;
}

export const IssueAdvancedFiltersPanel: React.FC<IssueAdvancedFiltersPanelProps> = ({
  issueSearch,
  setIssueSearch,
  isFiltersPanelOpen,
  setIsFiltersPanelOpen,
  listFilterStatus,
  setListFilterStatus,
  listFilterPriority,
  setListFilterPriority,
  listFilterAssignee,
  setListFilterAssignee,
  listFilterCategory,
  setListFilterCategory,
  listFilterSprint,
  setListFilterSprint,
  listFilterLabel,
  setListFilterLabel,
  listFilterEnvironment,
  setListFilterEnvironment,
  listFilterProjectRisk,
  setListFilterProjectRisk,
  listFilterRelease,
  setListFilterRelease,
  listFilterResolution,
  setListFilterResolution,
  listFilterDateType,
  setListFilterDateType,
  listFilterStartDate,
  setListFilterStartDate,
  listFilterEndDate,
  setListFilterEndDate,
  projectMembers,
  sprints,
  masterData,
  allLabels,
  allEnvironments,
  allProjectRisks,
  allReleases,
  allResolutions,
  setIsConfigureColumnsOpen,
}) => {
  const { t } = useTranslation();
  let activeCount = 0;
  if (listFilterStatus !== "All") activeCount++;
  if (listFilterPriority !== "All") activeCount++;
  if (listFilterAssignee !== "All") activeCount++;
  if (listFilterCategory !== "All") activeCount++;
  if (listFilterSprint !== "All") activeCount++;
  if (listFilterLabel !== "All") activeCount++;
  if (listFilterEnvironment !== "All") activeCount++;
  if (listFilterProjectRisk !== "All") activeCount++;
  if (listFilterRelease !== "All") activeCount++;
  if (listFilterResolution !== "All") activeCount++;
  if (listFilterStartDate) activeCount++;
  if (listFilterEndDate) activeCount++;

  return (
    <>
      {/* Header Toolbar — #363: search + filter + config 1 baris; pill aktif baris bawah */}
      <div className={styles.toolbar}>
        <div className="flex flex-nowrap items-center gap-2 w-full min-w-0">
          <div className={styles.searchWrapper}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-subtle group-focus-within:text-indigo-500 transition-colors" />
            <input
              value={issueSearch}
              onChange={(e) => setIssueSearch(e.target.value)}
              placeholder={t("filters.searchIssues")}
              className={styles.searchInput}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsFiltersPanelOpen((prev) => !prev)}
            className={cn(
              "flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2 bg-surface border border-border-subtle/80 rounded-md text-content-body hover:text-primary hover:border-primary/40 transition-all text-xs font-medium shadow-xs select-none shrink-0 cursor-pointer",
              isFiltersPanelOpen &&
                "bg-primary-surface/10 border-primary/30 text-primary hover:bg-primary-surface/15"
            )}
            title={t("filters.toggleFilterPanel")}
            aria-label={t("filters.toggleFilterPanel")}
          >
            <Filter className="w-3.5 h-3.5 text-content-muted shrink-0" />
            <span className="hidden sm:inline">{t("filters.advancedFilters")}</span>
            {activeCount > 0 && (
              <span className="bg-primary-surface text-content-inverse rounded-full px-1.5 py-0.5 flex items-center justify-center text-[10px] sm:text-[9px] font-semibold leading-none">
                {activeCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setIsConfigureColumnsOpen(true)}
              className="p-2 bg-surface border border-border-subtle rounded-lg text-content-muted hover:text-indigo-600 hover:border-indigo-500/30 transition-all shadow-soft"
              title={t("filters.configureColumns")}
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-2 bg-surface border border-border-subtle rounded-lg text-content-muted hover:text-content-body transition-all shadow-soft"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap max-w-full">
            {listFilterStatus !== "All" && (
              <span
                className={cn(
                  styles.filterPill,
                  "flex items-center gap-1 py-1 px-2.5 rounded-full text-xs sm:text-[11px] font-medium"
                )}
              >
                {t("filters.status2")} {listFilterStatus}
                <button
                  type="button"
                  onClick={() => setListFilterStatus("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-1" />
                </button>
              </span>
            )}
            {listFilterPriority !== "All" && (
              <span
                className={cn(
                  styles.filterPillAmber,
                  "flex items-center gap-1 py-1 px-2.5 rounded-full text-xs sm:text-[11px] font-medium"
                )}
              >
                {t("filters.priority2")} {listFilterPriority}
                <button
                  type="button"
                  onClick={() => setListFilterPriority("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-1" />
                </button>
              </span>
            )}
            {listFilterAssignee !== "All" && (
              <span className="text-[10px] leading-none font-medium text-indigo-600 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1 shadow-soft">
                {t("filters.assignee")}{" "}
                {projectMembers.find((m) => m.uid === listFilterAssignee)?.displayName ||
                  t("newTask.unassigned")}
                <button
                  type="button"
                  onClick={() => setListFilterAssignee("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {listFilterSprint !== "All" && (
              <span className="text-xs sm:text-[11px] font-medium text-content-secondary bg-surface-muted px-2.5 py-1 rounded-full border border-border-subtle flex items-center gap-1 shadow-soft">
                {t("filters.sprint2")}{" "}
                {listFilterSprint === "Backlog"
                  ? "Backlog"
                  : sprints?.find((s) => s.id === listFilterSprint)?.name || listFilterSprint}
                <button
                  type="button"
                  onClick={() => setListFilterSprint("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {listFilterCategory !== "All" && (
              <span className="text-[10px] leading-none font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1 shadow-soft">
                {t("filters.category")} {listFilterCategory}
                <button
                  type="button"
                  onClick={() => setListFilterCategory("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {listFilterLabel !== "All" && (
              <span className="text-xs sm:text-[11px] font-medium text-sky-600 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30 flex items-center gap-1 shadow-soft">
                {t("filters.label2")} {listFilterLabel}
                <button
                  type="button"
                  onClick={() => setListFilterLabel("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {listFilterEnvironment !== "All" && (
              <span className="text-xs sm:text-[11px] font-medium text-orange-600 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/30 flex items-center gap-1 shadow-soft">
                {t("filters.environment")} {listFilterEnvironment}
                <button
                  type="button"
                  onClick={() => setListFilterEnvironment("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {listFilterProjectRisk !== "All" && (
              <span className="text-[10px] leading-none font-medium text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30 flex items-center gap-1 shadow-soft">
                {t("filters.risk")} {listFilterProjectRisk}
                <button
                  type="button"
                  onClick={() => setListFilterProjectRisk("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {listFilterRelease !== "All" && (
              <span className="text-xs sm:text-[11px] font-medium text-teal-600 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/30 flex items-center gap-1 shadow-soft">
                {t("filters.release")} {listFilterRelease}
                <button
                  type="button"
                  onClick={() => setListFilterRelease("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {listFilterResolution !== "All" && (
              <span className="text-[10px] leading-none font-medium text-violet-600 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/30 flex items-center gap-1 shadow-soft">
                {t("filters.resolution")} {listFilterResolution}
                <button
                  type="button"
                  onClick={() => setListFilterResolution("All")}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
            {(listFilterStartDate || listFilterEndDate) && (
              <span className="text-[10px] leading-none font-medium text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1 shadow-soft">
                <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                Date (
                {listFilterDateType === "dueDate"
                  ? "Due"
                  : listFilterDateType === "startDate"
                    ? "Start"
                    : listFilterDateType === "endDate"
                      ? "End"
                      : listFilterDateType === "createdAt"
                        ? "Created"
                        : "Any"}
                ): {listFilterStartDate || "∞"} {t("rakit.dateTo")} {listFilterEndDate || "∞"}
                <button
                  type="button"
                  onClick={() => {
                    setListFilterStartDate("");
                    setListFilterEndDate("");
                  }}
                  className="hover:text-red-500 font-medium transition-colors outline-none inline-flex items-center"
                >
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expandable Advanced Filters Panel content */}
      <AnimatePresence initial={false}>
        {isFiltersPanelOpen && (
          <IssueAdvancedFiltersExpanded
            listFilterStatus={listFilterStatus}
            setListFilterStatus={setListFilterStatus}
            listFilterPriority={listFilterPriority}
            setListFilterPriority={setListFilterPriority}
            listFilterSprint={listFilterSprint}
            setListFilterSprint={setListFilterSprint}
            listFilterLabel={listFilterLabel}
            setListFilterLabel={setListFilterLabel}
            listFilterCategory={listFilterCategory}
            setListFilterCategory={setListFilterCategory}
            listFilterEnvironment={listFilterEnvironment}
            setListFilterEnvironment={setListFilterEnvironment}
            listFilterProjectRisk={listFilterProjectRisk}
            setListFilterProjectRisk={setListFilterProjectRisk}
            listFilterRelease={listFilterRelease}
            setListFilterRelease={setListFilterRelease}
            listFilterResolution={listFilterResolution}
            setListFilterResolution={setListFilterResolution}
            listFilterDateType={listFilterDateType}
            setListFilterDateType={setListFilterDateType}
            listFilterStartDate={listFilterStartDate}
            setListFilterStartDate={setListFilterStartDate}
            listFilterEndDate={listFilterEndDate}
            setListFilterEndDate={setListFilterEndDate}
            sprints={sprints}
            masterData={masterData}
            allLabels={allLabels}
            allEnvironments={allEnvironments}
            allProjectRisks={allProjectRisks}
            allReleases={allReleases}
            allResolutions={allResolutions}
          />
        )}
      </AnimatePresence>
    </>
  );
};
