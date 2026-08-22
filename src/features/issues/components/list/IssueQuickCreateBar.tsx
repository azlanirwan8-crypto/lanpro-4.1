import { useTranslation } from "react-i18next";
import React from "react";
import { Zap, ChevronDown, CheckCircle2 } from "lucide-react";
import { RenderIcon } from "../../../../components/RenderIcon";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import { MasterData, UserProfile, Sprint } from "../../../../types";

interface IssueQuickCreateBarProps {
  quickCreateTitle: string;
  setQuickCreateTitle: (val: string) => void;
  createGlobalIssue: () => Promise<void>;
  isCreating: boolean;
  inlineAddType: string;
  setInlineAddType: (type: string) => void;
  isInlineTypeOpen: string | null;
  setIsInlineTypeOpen: (val: string | null) => void;
  inlineAddPriority: string;
  setInlineAddPriority: (val: string) => void;
  inlineAddAssigneeId: string;
  setInlineAddAssigneeId: (val: string) => void;
  inlineAddSprintId: string;
  setInlineAddSprintId: (val: string) => void;
  masterData: MasterData[];
  projectMembers: UserProfile[];
  sprints: Sprint[];
}

export const IssueQuickCreateBar: React.FC<IssueQuickCreateBarProps> = ({
  quickCreateTitle,
  setQuickCreateTitle,
  createGlobalIssue,
  isCreating,
  inlineAddType,
  setInlineAddType,
  isInlineTypeOpen,
  setIsInlineTypeOpen,
  inlineAddPriority,
  setInlineAddPriority,
  inlineAddAssigneeId,
  setInlineAddAssigneeId,
  inlineAddSprintId,
  setInlineAddSprintId,
  masterData,
  projectMembers,
  sprints,
}) => {
  const { t } = useTranslation();
  const mArr = masterData || [];

  return (
    <div className="p-2 bg-surface border-t border-border-subtle shrink-0 shadow-[0_-2px_4px_-1px_rgba(0,0,0,0.03)] z-20 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 border border-border-subtle rounded-xl bg-surface-sunken shadow-soft p-1.5 sm:p-1">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
          <div className="relative pl-1 shrink-0">
            <button
              onClick={() => setIsInlineTypeOpen(isInlineTypeOpen === "global" ? null : "global")}
              className="flex items-center justify-center p-1.5 hover:bg-surface-strong rounded transition-colors text-content-secondary outline-none"
            >
              {(() => {
                const typeData = mArr.find(
                  (m) =>
                    m.type === "issue_type" &&
                    m.label?.toLowerCase() === inlineAddType?.toLowerCase()
                );
                if (typeData?.icon)
                  return (
                    <RenderIcon
                      iconName={typeData.icon}
                      className="w-4 h-4"
                      style={{ color: typeData.color }}
                    />
                  );
                return <Zap className="w-4 h-4 text-blue-600" />;
              })()}
              <ChevronDown className="w-3 h-3 text-content-subtle ml-0.5" />
            </button>
            {isInlineTypeOpen === "global" && (
              <div className="absolute left-0 bottom-full mb-2 w-48 bg-surface border border-border-subtle rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                {mArr
                  .filter((m) => m.type === "issue_type")
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setInlineAddType(t.label);
                        setIsInlineTypeOpen(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs sm:text-[11px] font-medium text-content-secondary hover:bg-surface-sunken flex items-center gap-2"
                    >
                      {t.icon ? (
                        <RenderIcon
                          iconName={t.icon}
                          className="w-3.5 h-3.5"
                          style={{ color: t.color }}
                        />
                      ) : (
                        <Zap className="w-3.5 h-3.5" style={{ color: t.color }} />
                      )}
                      <span>{t.label}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <input
            type="text"
            value={quickCreateTitle}
            onChange={(e) => setQuickCreateTitle(e.target.value)}
            placeholder={t("issueQuick.placeholder")}
            onKeyDown={(e) => e.key === "Enter" && createGlobalIssue()}
            className="flex-1 min-w-0 bg-transparent border-none text-[12px] font-medium text-content-body placeholder:text-content-subtle focus:ring-0 outline-none px-2"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
          <div className="w-[120px] sm:w-[130px] shrink-0">
            <StyledDropdown
              value={inlineAddSprintId || ""}
              onChange={(val) => setInlineAddSprintId(val)}
              options={[
                { id: "", label: "Backlog", icon: "Box" },
                ...(sprints?.map((s) => ({
                  id: s.id,
                  label: s.name,
                  icon: "IterationCcw",
                })) || []),
              ]}
              type="sprint"
              masterData={mArr}
              className="w-full"
            />
          </div>

          <div className="w-[120px] sm:w-[130px] shrink-0">
            <StyledDropdown
              value={inlineAddAssigneeId || ""}
              onChange={(val) => setInlineAddAssigneeId(val)}
              options={[
                { id: "", label: "Unassigned" },
                ...(projectMembers || []).map((m) => ({
                  id: m?.uid || "",
                  label: m?.displayName || m?.email || "Unknown",
                })),
              ]}
              members={projectMembers}
              type="member"
              masterData={mArr}
              className="w-full"
            />
          </div>

          <div className="w-[90px] sm:w-[100px] shrink-0">
            <StyledDropdown
              value={inlineAddPriority || "Medium"}
              onChange={(val) => setInlineAddPriority(val)}
              options={mArr
                .filter((m) => m.type === "priority")
                .map((p) => ({
                  id: p.label,
                  label: p.label,
                }))}
              type="priority"
              masterData={mArr}
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={createGlobalIssue}
            disabled={isCreating || !quickCreateTitle.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-surface text-content-inverse hover:bg-primary-surface-hover active:bg-primary-active rounded-lg text-xs sm:text-[11px] font-semibold transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isCreating ? (
              <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
