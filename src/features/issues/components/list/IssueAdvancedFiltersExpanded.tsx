import { useTranslation } from "react-i18next";
import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { MasterData, Sprint } from "../../../../types";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";

interface IssueAdvancedFiltersExpandedProps {
  listFilterStatus: string;
  setListFilterStatus: (val: string) => void;
  listFilterPriority: string;
  setListFilterPriority: (val: string) => void;
  listFilterSprint: string;
  setListFilterSprint: (val: string) => void;
  listFilterLabel: string;
  setListFilterLabel: (val: string) => void;
  listFilterCategory: string;
  setListFilterCategory: (val: string) => void;
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
  sprints: Sprint[];
  masterData: MasterData[];
  allLabels: string[];
  allEnvironments: { id: string; label: string; icon?: string; color?: string }[];
  allProjectRisks: { id: string; label: string; icon?: string; color?: string }[];
  allReleases: { id: string; label: string; icon?: string; color?: string }[];
  allResolutions: { id: string; label: string; icon?: string; color?: string }[];
}

export const IssueAdvancedFiltersExpanded: React.FC<IssueAdvancedFiltersExpandedProps> = ({
  listFilterStatus,
  setListFilterStatus,
  listFilterPriority,
  setListFilterPriority,
  listFilterSprint,
  setListFilterSprint,
  listFilterLabel,
  setListFilterLabel,
  listFilterCategory,
  setListFilterCategory,
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
  sprints,
  masterData,
  allLabels,
  allEnvironments,
  allProjectRisks,
  allReleases,
  allResolutions,
}) => {
  const { t } = useTranslation();
  const mArr = masterData || [];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="mx-6 mb-4 bg-surface rounded-xl border border-border-subtle/80 shadow-md overflow-hidden relative"
    >
      <div className="p-5">
        {/* Section 1: Standard Issue Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.status")}
            </label>
            <StyledDropdown
              value={listFilterStatus}
              onChange={(val) => setListFilterStatus(val)}
              options={[
                { id: "All", label: t("filters.allStatuses"), icon: "Layers", color: "#6366F1" },
                ...mArr
                  .filter((m) => m.type === "status")
                  .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color })),
              ]}
              type="filter_status"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.priority")}
            </label>
            <StyledDropdown
              value={listFilterPriority}
              onChange={(val) => setListFilterPriority(val)}
              options={[
                {
                  id: "All",
                  label: t("issueColumns.allPriorities"),
                  icon: "Layers",
                  color: "#6366F1",
                },
                ...mArr
                  .filter((m) => m.type === "priority")
                  .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color })),
              ]}
              type="filter_priority"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Sprint Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.sprint")}
            </label>
            <StyledDropdown
              value={listFilterSprint}
              onChange={(val) => setListFilterSprint(val)}
              options={[
                {
                  id: "All",
                  label: t("filters.allSprints"),
                  icon: "IterationCcw",
                  color: "#6366F1",
                },
                { id: "Backlog", label: "Backlog", icon: "Box", color: "#94a3b8" },
                ...(sprints || []).map((s) => ({
                  id: s.id,
                  label: s.name,
                  icon: "IterationCcw",
                  color: "#6366F1",
                })),
              ]}
              type="filter_sprint"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Label Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.label")}
            </label>
            <StyledDropdown
              value={listFilterLabel}
              onChange={(val) => setListFilterLabel(val)}
              options={[
                { id: "All", label: t("filters.allLabels"), icon: "Tag", color: "#6366F1" },
                ...(allLabels || []).map((l) => ({
                  id: l,
                  label: l,
                  icon: "Tag",
                  color: "#6366F1",
                })),
              ]}
              type="filter_label"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>
        </div>

        {/* Section 2: Custom fields & date ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 border-t border-border-faint pt-4">
          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.categoryCustom")}
            </label>
            <StyledDropdown
              value={listFilterCategory}
              onChange={(val) => setListFilterCategory(val)}
              options={[
                { id: "All", label: t("filters.allCategories"), icon: "Layers", color: "#6366F1" },
                ...mArr
                  .filter((m) => m.type === "category")
                  .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color })),
              ]}
              type="category"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Environment Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.environmentCustom")}
            </label>
            <StyledDropdown
              value={listFilterEnvironment}
              onChange={(val: string) => setListFilterEnvironment(val)}
              options={[
                {
                  id: "All",
                  label: t("filters.allEnvironments"),
                  icon: "Layers",
                  color: "#6366F1",
                },
                ...allEnvironments,
              ]}
              type="environment"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Project Risk Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.projectRisk")}
            </label>
            <StyledDropdown
              value={listFilterProjectRisk}
              onChange={(val: string) => setListFilterProjectRisk(val)}
              options={[
                { id: "All", label: t("filters.allRisks"), icon: "Layers", color: "#6366F1" },
                ...allProjectRisks,
              ]}
              type="project_risk"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Release Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.releaseCustom")}
            </label>
            <StyledDropdown
              value={listFilterRelease}
              onChange={(val: string) => setListFilterRelease(val)}
              options={[
                { id: "All", label: t("filters.allReleases"), icon: "Layers", color: "#6366F1" },
                ...allReleases,
              ]}
              type="release"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Resolution Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.resolutionCustom")}
            </label>
            <StyledDropdown
              value={listFilterResolution}
              onChange={(val: string) => setListFilterResolution(val)}
              options={[
                { id: "All", label: t("filters.allResolutions"), icon: "Layers", color: "#6366F1" },
                ...allResolutions,
              ]}
              type="resolution"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>
        </div>

        {/* Section 3: Date Ranges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-border-faint pt-4 items-end">
          {/* Date Column Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.dateRangeType")}
            </label>
            <StyledDropdown
              value={listFilterDateType}
              onChange={(val) => setListFilterDateType(val)}
              options={[
                { id: "dueDate", label: t("filters.dueDate"), icon: "Calendar", color: "#6366F1" },
                {
                  id: "startDate",
                  label: t("filters.startDate"),
                  icon: "Calendar",
                  color: "#6366F1",
                },
                { id: "endDate", label: t("filters.endDate"), icon: "Calendar", color: "#6366F1" },
                {
                  id: "createdAt",
                  label: t("filters.createdDate"),
                  icon: "Clock",
                  color: "#6366F1",
                },
                { id: "any", label: t("filters.anyOfAbove"), icon: "Layers", color: "#6366F1" },
              ]}
              type="filter_date"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
              {t("filters.fromDate")}
            </label>
            <input
              type="date"
              value={listFilterStartDate}
              onChange={(e) => setListFilterStartDate(e.target.value)}
              className="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-none h-[34px]"
            />
          </div>

          {/* End Date & Reset controls inside grid */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1.5 flex-1 font-sans">
              <label className="text-xs sm:text-[10px] uppercase font-normal text-content-subtle tracking-wider">
                {t("filters.toDate")}
              </label>
              <input
                type="date"
                value={listFilterEndDate}
                onChange={(e) => setListFilterEndDate(e.target.value)}
                className="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-none h-[34px]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setListFilterStatus("All");
                setListFilterPriority("All");
                setListFilterSprint("All");
                setListFilterLabel("All");
                setListFilterCategory("All");
                setListFilterEnvironment("All");
                setListFilterProjectRisk("All");
                setListFilterRelease("All");
                setListFilterResolution("All");
                setListFilterStartDate("");
                setListFilterEndDate("");
              }}
              className="px-4 h-[34px] bg-surface-muted hover:bg-surface-strong text-content-secondary rounded-lg text-xs font-normal transition-all shrink-0 flex items-center justify-center gap-1.5 select-none cursor-pointer border border-border-subtle"
              title={t("filters.clearAllFields")}
            >
              <X className="w-3.5 h-3.5" />
              {t("filters.reset")}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
