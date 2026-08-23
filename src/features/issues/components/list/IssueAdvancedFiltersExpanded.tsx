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
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
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
              type="status"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
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
              type="priority"
              masterData={mArr}
              className="w-full"
              buttonClassName="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Sprint Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              {t("filters.sprint")}
            </label>
            <select
              value={listFilterSprint}
              onChange={(e) => setListFilterSprint(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">{t("filters.allSprints")}</option>
              <option value="Backlog">Backlog</option>
              {sprints?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Label Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Label
            </label>
            <select
              value={listFilterLabel}
              onChange={(e) => setListFilterLabel(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">{t("filters.allLabels")}</option>
              {allLabels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Custom fields & date ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 border-t border-border-faint pt-4">
          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Category (Custom)
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
              buttonClassName="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 hover:border-border-subtle"
            />
          </div>

          {/* Environment Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Environment (Custom)
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
              buttonClassName="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5"
            />
          </div>

          {/* Project Risk Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
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
              buttonClassName="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5"
            />
          </div>

          {/* Release Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Release (Custom)
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
              buttonClassName="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5"
            />
          </div>

          {/* Resolution Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Resolution (Custom)
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
              buttonClassName="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5"
            />
          </div>
        </div>

        {/* Section 3: Date Ranges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-border-faint pt-4 items-end">
          {/* Date Column Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              {t("filters.dateRangeType")}
            </label>
            <select
              value={listFilterDateType}
              onChange={(e) => setListFilterDateType(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none text-left"
            >
              <option value="dueDate">{t("filters.dueDate")}</option>
              <option value="startDate">{t("filters.startDate")}</option>
              <option value="endDate">{t("filters.endDate")}</option>
              <option value="createdAt">{t("filters.createdDate")}</option>
              <option value="any">{t("filters.anyOfAbove")}</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              {t("filters.fromDate")}
            </label>
            <input
              type="date"
              value={listFilterStartDate}
              onChange={(e) => setListFilterStartDate(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none h-[34px]"
            />
          </div>

          {/* End Date & Reset controls inside grid */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1.5 flex-1 font-sans">
              <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
                {t("filters.toDate")}
              </label>
              <input
                type="date"
                value={listFilterEndDate}
                onChange={(e) => setListFilterEndDate(e.target.value)}
                className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none h-[34px]"
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
              className="px-4 h-[34px] bg-surface-muted hover:bg-surface-strong text-content-secondary rounded-xl text-xs font-medium transition-all shrink-0 flex items-center justify-center gap-1.5 select-none"
              title={t("filters.clearAllFields")}
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
