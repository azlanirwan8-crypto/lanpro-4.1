import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { MasterData, Sprint } from "../../../../types";

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
  allEnvironments: string[];
  allProjectRisks: string[];
  allReleases: string[];
  allResolutions: string[];
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
              Status
            </label>
            <select
              value={listFilterStatus}
              onChange={(e) => setListFilterStatus(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Statuses</option>
              {mArr
                .filter((m) => m.type === "status")
                .map((m, idx) => (
                  <option
                    key={m.id ? `opt-st-${m.id}-${idx}` : `opt-st-${idx}`}
                    value={m.label}
                  >
                    {m.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Priority
            </label>
            <select
              value={listFilterPriority}
              onChange={(e) => setListFilterPriority(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Priorities</option>
              {mArr
                .filter((m) => m.type === "priority")
                .map((m, idx) => (
                  <option
                    key={m.id ? `flt-p-${m.id}-${idx}` : `flt-p-${idx}`}
                    value={m.label}
                  >
                    {m.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Sprint Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Sprint
            </label>
            <select
              value={listFilterSprint}
              onChange={(e) => setListFilterSprint(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Sprints</option>
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
              <option value="All">All Labels</option>
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
            <select
              value={listFilterCategory}
              onChange={(e) => setListFilterCategory(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Categories</option>
              {mArr
                .filter((m) => m.type === "category")
                .map((m) => (
                  <option key={m.id} value={m.label}>
                    {m.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Environment Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Environment (Custom)
            </label>
            <select
              value={listFilterEnvironment}
              onChange={(e) => setListFilterEnvironment(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Environments</option>
              {allEnvironments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>

          {/* Project Risk Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Project Risk (Custom)
            </label>
            <select
              value={listFilterProjectRisk}
              onChange={(e) => setListFilterProjectRisk(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Risks</option>
              {allProjectRisks.map((risk) => (
                <option key={risk} value={risk}>
                  {risk}
                </option>
              ))}
            </select>
          </div>

          {/* Release Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Release (Custom)
            </label>
            <select
              value={listFilterRelease}
              onChange={(e) => setListFilterRelease(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Releases</option>
              {allReleases.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Resolution (Custom)
            </label>
            <select
              value={listFilterResolution}
              onChange={(e) => setListFilterResolution(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
            >
              <option value="All">All Resolutions</option>
              {allResolutions.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: Date Ranges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-border-faint pt-4 items-end">
          {/* Date Column Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              Date Range Type
            </label>
            <select
              value={listFilterDateType}
              onChange={(e) => setListFilterDateType(e.target.value)}
              className="w-full text-xs font-medium text-content-body bg-surface-sunken border border-border-subtle rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none text-left"
            >
              <option value="dueDate">Due Date</option>
              <option value="startDate">Start Date</option>
              <option value="endDate">End Date</option>
              <option value="createdAt">Created Date</option>
              <option value="any">Any of the Above</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle tracking-wider">
              From Date
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
                To Date
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
              title="Clear all fields"
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
