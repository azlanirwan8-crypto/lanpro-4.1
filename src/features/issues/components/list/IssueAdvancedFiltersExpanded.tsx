import { useTranslation } from "react-i18next";
import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { MasterData, Sprint, UserProfile } from "../../../../types";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import { LanproDatePicker } from "../../../../components/ui/LanproDatePicker";
import { JUDUL_SECTION, LABEL } from "../../../../components/ui/gayaForm";

interface IssueAdvancedFiltersExpandedProps {
  listFilterStatus: string;
  setListFilterStatus: (val: string) => void;
  listFilterPriority: string;
  setListFilterPriority: (val: string) => void;
  listFilterAssignee: string;
  setListFilterAssignee: (val: string) => void;
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
  listFilterType: string;
  setListFilterType: (val: string) => void;
  listFilterDateType: string;
  setListFilterDateType: (val: string) => void;
  listFilterStartDate: string;
  setListFilterStartDate: (val: string) => void;
  listFilterEndDate: string;
  setListFilterEndDate: (val: string) => void;
  listFilterOverdue: boolean;
  setListFilterOverdue: (val: boolean) => void;
  projectMembers: UserProfile[];
  sprints: Sprint[];
  masterData: MasterData[];
  allLabels: string[];
  allEnvironments: { id: string; label: string; icon?: string; color?: string }[];
  allProjectRisks: { id: string; label: string; icon?: string; color?: string }[];
  allReleases: { id: string; label: string; icon?: string; color?: string }[];
  allResolutions: { id: string; label: string; icon?: string; color?: string }[];
  allTypes: { id: string; label: string; icon?: string; color?: string }[];
}

/**
 * #728 O1 — SATU tinggi kontrol di panel ini: `h-9`, baseline Velzon yang sama
 * dengan `index.css:607-615` dan kit #721. Tinggi keempat arbitrer (32 piksel)
 * yang dulu dipakai enam belas kali di sini adalah sebab pertama panel terbaca
 * sesak: tidak ada kotak lain di aplikasi yang setinggi itu.
 */
const PEMICU_PANEL =
  "w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-md h-9 px-2.5 hover:border-border-subtle";

export const IssueAdvancedFiltersExpanded: React.FC<IssueAdvancedFiltersExpandedProps> = ({
  listFilterStatus,
  setListFilterStatus,
  listFilterPriority,
  setListFilterPriority,
  listFilterAssignee,
  setListFilterAssignee,
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
  listFilterType,
  setListFilterType,
  listFilterDateType,
  setListFilterDateType,
  listFilterStartDate,
  setListFilterStartDate,
  listFilterEndDate,
  setListFilterEndDate,
  listFilterOverdue,
  setListFilterOverdue,
  projectMembers,
  sprints,
  masterData,
  allLabels,
  allEnvironments,
  allProjectRisks,
  allReleases,
  allResolutions,
  allTypes,
}) => {
  const { t } = useTranslation();
  const mArr = masterData || [];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="mx-6 mb-4 bg-surface rounded-xl border border-border-subtle shadow-soft overflow-hidden relative"
    >
      <div className="p-5 space-y-5">
        {/* Kelompok 1 — Status & kepemilikan (4 kolom, tanpa baris yatim) */}
        <div className="space-y-2.5">
          <h4 className={JUDUL_SECTION}>{t("filters.groupStatus")}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.status")}</label>
              <StyledDropdown
                value={listFilterStatus}
                onChange={(val) => setListFilterStatus(val)}
                options={[
                  { id: "All", label: t("filters.allStatuses"), icon: "Layers" },
                  ...mArr
                    .filter((m) => m.type === "status")
                    .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color })),
                ]}
                type="filter_status"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.priority")}</label>
              <StyledDropdown
                value={listFilterPriority}
                onChange={(val) => setListFilterPriority(val)}
                options={[
                  { id: "All", label: t("issueColumns.allPriorities"), icon: "Layers" },
                  ...mArr
                    .filter((m) => m.type === "priority")
                    .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color })),
                ]}
                type="filter_priority"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            {/* Assignee Filter — #468 */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.assigneeField")}</label>
              <StyledDropdown
                value={listFilterAssignee}
                onChange={(val) => setListFilterAssignee(val)}
                options={[
                  { id: "All", label: t("filters.allAssignees"), icon: "Users" },
                  { id: "unassigned", label: t("bulkActions.unassignedClear"), icon: "UserX" },
                  ...(projectMembers || []).map((m) => ({
                    id: m.uid,
                    label: m.displayName || m.email || m.uid,
                    icon: "User",
                  })),
                ]}
                type="filter_assignee"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.sprint")}</label>
              <StyledDropdown
                value={listFilterSprint}
                onChange={(val) => setListFilterSprint(val)}
                options={[
                  { id: "All", label: t("filters.allSprints"), icon: "IterationCcw" },
                  { id: "Backlog", label: "Backlog", icon: "Box" },
                  ...(sprints || []).map((s) => ({
                    id: s.id,
                    label: s.name,
                    icon: "IterationCcw",
                  })),
                ]}
                type="filter_sprint"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>
          </div>
        </div>

        {/* Kelompok 2 — Klasifikasi (4 kolom) */}
        <div className="space-y-2.5">
          <h4 className={JUDUL_SECTION}>{t("filters.groupClassification")}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.label")}</label>
              <StyledDropdown
                value={listFilterLabel}
                onChange={(val) => setListFilterLabel(val)}
                options={[
                  { id: "All", label: t("filters.allLabels"), icon: "Tag" },
                  ...(allLabels || []).map((l) => ({ id: l, label: l, icon: "Tag" })),
                ]}
                type="filter_label"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            {/* #705 — Nilainya kunci MasterData, bukan label mentah: `src/lib/jenisIsu.ts`. */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.issueType")}</label>
              <StyledDropdown
                value={listFilterType}
                onChange={(val: string) => setListFilterType(val)}
                options={[{ id: "All", label: t("filters.allTypes"), icon: "Layers" }, ...allTypes]}
                type="issue_type"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.categoryCustom")}</label>
              <StyledDropdown
                value={listFilterCategory}
                onChange={(val) => setListFilterCategory(val)}
                options={[
                  { id: "All", label: t("filters.allCategories"), icon: "Layers" },
                  ...mArr
                    .filter((m) => m.type === "category")
                    .map((m) => ({ id: m.label, label: m.label, icon: m.icon, color: m.color })),
                ]}
                type="category"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.environmentCustom")}</label>
              <StyledDropdown
                value={listFilterEnvironment}
                onChange={(val: string) => setListFilterEnvironment(val)}
                options={[
                  { id: "All", label: t("filters.allEnvironments"), icon: "Layers" },
                  ...allEnvironments,
                ]}
                type="environment"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>
          </div>
        </div>

        {/* Kelompok 3 — Kolom Master Data (3 kolom) */}
        <div className="space-y-2.5">
          <h4 className={JUDUL_SECTION}>{t("filters.groupMasterColumns")}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.projectRisk")}</label>
              <StyledDropdown
                value={listFilterProjectRisk}
                onChange={(val: string) => setListFilterProjectRisk(val)}
                options={[
                  { id: "All", label: t("filters.allRisks"), icon: "Layers" },
                  ...allProjectRisks,
                ]}
                type="project_risk"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.releaseCustom")}</label>
              <StyledDropdown
                value={listFilterRelease}
                onChange={(val: string) => setListFilterRelease(val)}
                options={[
                  { id: "All", label: t("filters.allReleases"), icon: "Layers" },
                  ...allReleases,
                ]}
                type="release"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.resolutionCustom")}</label>
              <StyledDropdown
                value={listFilterResolution}
                onChange={(val: string) => setListFilterResolution(val)}
                options={[
                  { id: "All", label: t("filters.allResolutions"), icon: "Layers" },
                  ...allResolutions,
                ]}
                type="resolution"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>
          </div>
        </div>

        {/* Kelompok 4 — Rentang tanggal (3 kolom; Reset tidak lagi menyelip di sini) */}
        <div className="space-y-2.5">
          <h4 className={JUDUL_SECTION}>{t("filters.groupDateRange")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.dateRangeType")}</label>
              <StyledDropdown
                value={listFilterDateType}
                onChange={(val) => setListFilterDateType(val)}
                options={[
                  { id: "dueDate", label: t("filters.dueDate"), icon: "Calendar" },
                  { id: "startDate", label: t("filters.startDate"), icon: "Calendar" },
                  { id: "endDate", label: t("filters.endDate"), icon: "Calendar" },
                  { id: "createdAt", label: t("filters.createdDate"), icon: "Clock" },
                  { id: "any", label: t("filters.anyOfAbove"), icon: "Layers" },
                ]}
                type="filter_date"
                masterData={mArr}
                className="w-full"
                buttonClassName={PEMICU_PANEL}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.fromDate")}</label>
              <LanproDatePicker
                value={listFilterStartDate}
                onChange={setListFilterStartDate}
                buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-md px-2.5 h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("filters.toDate")}</label>
              <LanproDatePicker
                value={listFilterEndDate}
                onChange={setListFilterEndDate}
                minDate={listFilterStartDate || undefined}
                buttonClassName="w-full text-xs font-normal text-content-body bg-surface-sunken border border-border-subtle rounded-md px-2.5 h-9"
              />
            </div>
          </div>
        </div>

        {/* Kaki panel — #728 O1: toggle Overdue dan Reset duduk SATU baris di
            kaki, bukan baris yatim di tengah grid dan bukan penyelip di kolom
            tanggal. Kiri aksi penyaringan, kanan aksi pemulihan. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-faint pt-4">
          <button
            type="button"
            onClick={() => setListFilterOverdue(!listFilterOverdue)}
            className={`px-3 h-9 rounded-md text-xs font-medium border transition-all cursor-pointer select-none ${
              listFilterOverdue
                ? "bg-danger/10 border-danger/30 text-danger-text"
                : "bg-surface-sunken border-border-subtle text-content-secondary hover:border-border-subtle"
            }`}
            aria-pressed={listFilterOverdue}
          >
            {t("filters.overdueOnly")}
          </button>

          <button
            type="button"
            onClick={() => {
              setListFilterStatus("All");
              setListFilterPriority("All");
              setListFilterAssignee("All");
              setListFilterSprint("All");
              setListFilterLabel("All");
              setListFilterCategory("All");
              setListFilterEnvironment("All");
              setListFilterProjectRisk("All");
              setListFilterRelease("All");
              setListFilterResolution("All");
              setListFilterType("All");
              setListFilterStartDate("");
              setListFilterEndDate("");
              setListFilterOverdue(false);
            }}
            className="px-3.5 h-9 bg-surface-muted hover:bg-surface-strong text-content-secondary rounded-md text-xs font-normal transition-all shrink-0 flex items-center justify-center gap-1.5 select-none cursor-pointer border border-border-subtle"
            title={t("filters.clearAllFields")}
          >
            <X className="w-3.5 h-3.5" />
            {t("filters.reset")}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
