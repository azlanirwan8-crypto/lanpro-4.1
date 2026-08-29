import { useTranslation } from "react-i18next";
import { useMasterOptionItems } from "../../../hooks/useMasterOptions";
import React from "react";
import {
  Plus,
  Edit3,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  User,
  ChevronDown,
} from "lucide-react";
import { QATestSuite } from "../types";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { StyledDropdown } from "../../../components/ui/CommonComponents";

interface QASuiteSidebarProps {
  suitesForFilter: QATestSuite[];
  selectedSuiteId: string;
  setSelectedSuiteId: (id: string) => void;
  phaseFilter: "ALL" | "SIT" | "UAT" | "PTR";
  setPhaseFilter: (phase: "ALL" | "SIT" | "UAT" | "PTR") => void;
  setIsAddSuiteOpen: (open: boolean) => void;
  setSuiteToEdit: (suite: QATestSuite) => void;
  setSuiteEditName: (name: string) => void;
  setSuiteEditAssignedTo: (assignedTo: string) => void;
  handleDeleteSuite: (suite: QATestSuite) => void;
  activeSuitePicDropdownId: string | null;
  setActiveSuitePicDropdownId: (id: string | null) => void;
  handleUpdateSuitePic: (suiteId: string, assignedTo: string) => void;
  projectMembers: any[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/** Dipakai hanya bila MasterData belum memuat tipe qa_phase. */
const CADANGAN_FASE = [
  { id: "SIT", label: "SIT", icon: "Cpu", color: "#3B82F6" },
  { id: "UAT", label: "UAT", icon: "CheckCircle2", color: "#10B981" },
  { id: "PTR", label: "PTR", icon: "ShieldCheck", color: "#F59E0B" },
];

export const QASuiteSidebar: React.FC<QASuiteSidebarProps> = ({
  suitesForFilter,
  selectedSuiteId,
  setSelectedSuiteId,
  phaseFilter,
  setPhaseFilter,
  setIsAddSuiteOpen,
  setSuiteToEdit,
  setSuiteEditName,
  setSuiteEditAssignedTo,
  handleDeleteSuite,
  activeSuitePicDropdownId,
  setActiveSuitePicDropdownId,
  handleUpdateSuitePic,
  projectMembers,
  canCreate,
  canUpdate,
  canDelete,
}) => {
  const { t } = useTranslation();
  const opsiFase = useMasterOptionItems("qa_phase", CADANGAN_FASE);
  return (
    <div className="lg:col-span-3 space-y-3 lg:max-h-[calc(100vh-140px)] lg:sticky lg:top-4 pr-1 custom-scrollbar">
      {/* Velzon Ultra-Compact Card Box */}
      <div className="bg-surface border border-border-subtle/80 rounded-md p-3.5 shadow-xs space-y-3">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-border-faint pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary-surface/10 text-primary flex items-center justify-center font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-content-strong">
                {t("qaSuite.moduleList")}
              </h3>
              <p className="text-xs text-content-subtle font-normal">{t("qaSuite.docScenario")}</p>
            </div>
          </div>
          <span className="px-2 py-[3px] bg-primary-surface/10 text-primary text-[10px] leading-none font-medium rounded-md">
            {t("rakit.modulesCount", { count: suitesForFilter.length })}
          </span>
        </div>

        {/* Phase Filter Dropdown & Add Button (Hidden for non-creators) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <StyledDropdown
              value={phaseFilter}
              onChange={(val) => setPhaseFilter(val as any)}
              options={[
                { id: "ALL", label: t("qaSuite.allPhases"), icon: "Layers", color: "#6366F1" },
                ...opsiFase,
              ]}
              masterData={[]}
              className="w-full"
              buttonClassName="h-8 bg-surface-sunken/80 rounded-md border border-border-subtle hover:border-border-subtle px-2.5 text-xs font-normal text-content-body"
            />
          </div>

          {canCreate && (
            <button
              onClick={() => setIsAddSuiteOpen(true)}
              className="btn-animation waves-effect waves-light btn-primary h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
              title={t("qaSuite.addModule")}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("qaSuite.add")}</span>
            </button>
          )}
        </div>

        {/* Suite Cards List */}
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar pb-10">
          {suitesForFilter.length === 0 ? (
            <div className="text-center py-10 text-content-subtle text-xs font-normal">
              {t("qaSuite.emptyFilter")}
            </div>
          ) : (
            suitesForFilter.map((suite, sIdx) => {
              const isActive = suite.id === selectedSuiteId;
              const passed = suite.cases?.filter((c) => c.status === "Passed").length || 0;
              const total = suite.cases?.length || 0;
              const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

              const matchedMember = (projectMembers || []).find(
                (m: any) =>
                  m.uid === suite.assignedTo ||
                  m.id === suite.assignedTo ||
                  m.username === suite.assignedTo ||
                  m.email === suite.assignedTo
              );

              const isDropdownOpen = activeSuitePicDropdownId === suite.id;
              const cleanTitle = suite.name.replace(/\s*\((SIT|UAT|PTR)\)/gi, "");

              return (
                <div
                  key={suite.id ? `${suite.id}-${sIdx}` : `suite-${sIdx}`}
                  onClick={() => setSelectedSuiteId(suite.id)}
                  className={`group p-3 rounded-md border transition-all cursor-pointer relative ${
                    isActive
                      ? "bg-surface border-primary border-l-4 border-l-primary shadow-soft ring-1 ring-primary/20"
                      : "bg-surface border-border-subtle/80 hover:border-primary/40 hover:shadow-2xs"
                  }`}
                >
                  {/* Action Buttons Top Right (Visible only to users with edit/delete access) */}
                  {(canUpdate || canDelete) && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {canUpdate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSuiteToEdit(suite);
                            setSuiteEditName(cleanTitle);
                            setSuiteEditAssignedTo(suite.assignedTo || "");
                          }}
                          className="text-content-subtle hover:text-primary transition-all p-1 bg-surface-sunken hover:bg-indigo-500/10 rounded-md border border-border-faint"
                          title={t("qaSuite.editDoc")}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSuite(suite);
                          }}
                          className="text-content-subtle hover:text-rose-500 transition-all p-1 bg-surface-sunken hover:bg-rose-500/10 rounded-md border border-border-faint"
                          title={t("qaSuite.deleteDoc")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Phase Pill Badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.2 text-xs sm:text-[10px] sm:text-[8px] font-normal uppercase rounded-full tracking-wider ${
                        suite.phase === "SIT"
                          ? "bg-amber-500/10 text-amber-700 border border-amber-500/30"
                          : suite.phase === "UAT"
                            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30"
                            : "bg-purple-500/10 text-purple-700 border border-purple-500/30"
                      }`}
                    >
                      {suite.phase}
                    </span>
                    <span className="text-xs sm:text-[11px] sm:text-[9px] font-normal text-content-subtle">
                      {new Date(suite.uploadedAt).toLocaleDateString("id-ID")}
                    </span>
                  </div>

                  {/* Suite Title (Clean without duplicate phase suffix) */}
                  <h4 className="text-xs font-normal text-content-strong mt-1.5 line-clamp-1 group-hover:text-primary transition-colors pr-10">
                    {cleanTitle}
                  </h4>

                  {/* Velzon Front-Card PIC Assignment Badge */}
                  <div className="mt-2.5 flex items-center justify-between text-xs sm:text-[10px] font-normal text-content-muted pt-2 border-t border-border-faint">
                    <span className="flex items-center gap-1 text-content-subtle text-xs sm:text-[11px] sm:text-[9px]">
                      <FileSpreadsheet className="w-3 h-3 text-content-subtle" />
                      <span className="truncate max-w-[85px]">
                        {suite.fileName || "Custom Script"}
                      </span>
                    </span>

                    {/* Front Card PIC Avatar Button */}
                    <div className="relative">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canUpdate) {
                            setActiveSuitePicDropdownId(isDropdownOpen ? null : suite.id);
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 bg-surface-sunken rounded-md border border-border-subtle/80 transition-all ${
                          canUpdate
                            ? "cursor-pointer hover:bg-indigo-500/10 hover:border-primary/50"
                            : "cursor-default"
                        }`}
                        title={canUpdate ? t("qaSuite.assignPic") : t("qaSuite.picRegistered")}
                      >
                        {suite.assignedTo ? (
                          <>
                            <UserAvatar
                              uid={suite.assignedTo}
                              members={projectMembers}
                              className="w-3.5 h-3.5 rounded-full"
                            />
                            <span className="text-xs sm:text-[11px] sm:text-[9px] font-normal text-primary truncate max-w-[80px]">
                              {matchedMember?.displayName?.split(" ")[0] ||
                                matchedMember?.username ||
                                "PIC"}
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-primary">
                            <User className="w-2.5 h-2.5" />
                            <span className="text-xs sm:text-[10px] sm:text-[8px] font-normal uppercase">
                              {t("qaSuite.allPic")}
                            </span>
                          </div>
                        )}
                        {canUpdate && <ChevronDown className="w-2.5 h-2.5 text-content-subtle" />}
                      </div>

                      {/* Dropdown Menu - POP UPWARDS (bottom-full) SO IT NEVER GETS CLIPPED */}
                      {isDropdownOpen && canUpdate && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSuitePicDropdownId(null);
                            }}
                          />
                          <div className="absolute right-0 bottom-full mb-1.5 w-56 bg-surface rounded-md shadow-2xl border border-border-subtle py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3 py-1 text-xs sm:text-[11px] sm:text-[9px] font-normal uppercase tracking-wider text-primary border-b border-border-faint mb-1">
                              {t("qa.assignModulePicProjectTeam")}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateSuitePic(suite.id, "");
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs font-normal hover:bg-indigo-500/10 hover:text-primary transition-colors flex items-center justify-between ${
                                !suite.assignedTo
                                  ? "bg-indigo-500/10 text-primary"
                                  : "text-content-body"
                              }`}
                            >
                              <span>{t("qaSuite.allProjectPic")}</span>
                              {!suite.assignedTo && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                              )}
                            </button>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar">
                              {(projectMembers || []).map((m: any) => {
                                const mId = m.uid || m.id;
                                const isSelected = suite.assignedTo === mId;
                                return (
                                  <button
                                    key={mId}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateSuitePic(suite.id, mId);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-normal hover:bg-indigo-500/10 hover:text-primary transition-colors flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? "bg-indigo-500/10 text-primary"
                                        : "text-content-body"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <UserAvatar
                                        uid={mId}
                                        members={projectMembers}
                                        className="w-4 h-4 shrink-0"
                                      />
                                      <span className="truncate">
                                        {m.displayName || m.email || m.username}
                                      </span>
                                    </div>
                                    {isSelected && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full h-1 bg-surface-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary-surface transition-all duration-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
