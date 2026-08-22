import { useTranslation } from "react-i18next";
import React from "react";
import { motion } from "motion/react";
import { ChevronDown, Zap, CheckCircle2, X } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { RenderIcon } from "../../../../components/RenderIcon";
import { StyledDropdown } from "../../../../components/ui/CommonComponents";
import { MasterData, UserProfile } from "../../../../types";
import { styles } from "../../styles";

interface IssueTableInlineAddRowProps {
  taskId: string;
  depth: number;
  canReorder: boolean;
  isCompact: boolean;
  issueTableColumns: any[];
  inlineTitleMap: Record<string, string>;
  setInlineTitleMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setInlineAddingTaskId: (id: string | null) => void;
  inlineAddType: string;
  setInlineAddType: (type: string) => void;
  isInlineTypeOpen: string | null;
  setIsInlineTypeOpen: (open: string | null) => void;
  inlineAddPriority: string;
  setInlineAddPriority: (val: string) => void;
  inlineAddAssigneeId: string;
  setInlineAddAssigneeId: (val: string) => void;
  isCreating: boolean;
  createSubtask: (parentId: string) => Promise<void>;
  masterData: MasterData[];
  projectMembers: UserProfile[];
}

export const IssueTableInlineAddRow: React.FC<IssueTableInlineAddRowProps> = ({
  taskId,
  depth,
  canReorder,
  isCompact,
  issueTableColumns,
  inlineTitleMap,
  setInlineTitleMap,
  setInlineAddingTaskId,
  inlineAddType,
  setInlineAddType,
  isInlineTypeOpen,
  setIsInlineTypeOpen,
  inlineAddPriority,
  setInlineAddPriority,
  inlineAddAssigneeId,
  setInlineAddAssigneeId,
  isCreating,
  createSubtask,
  masterData,
  projectMembers,
}) => {
  const { t } = useTranslation();
  const mArr = masterData || [];

  return (
    <motion.tr
      layout
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={styles.inlineAddRow}
    >
      {canReorder && (
        <td className="w-8 border-y-2 border-blue-500 border-r border-border-faint/50 bg-surface" />
      )}
      <td
        className={cn(
          "px-4 border-r border-border-faint/50 border-y-2 border-blue-500",
          isCompact ? "py-0.5" : "py-1.5"
        )}
      />
      {issueTableColumns
        .filter((c) => c.visible)
        .map((col) => (
          <td
            key={col.id}
            className={cn(styles.inlineAddBorderedCell, col.id === "work" && "z-20")}
          >
            {col.id === "work" ? (
              <div
                className="flex items-center gap-2 p-2 bg-surface h-full"
                style={{ paddingLeft: `${(depth + 1) * 24}px` }}
              >
                <div className="relative">
                  <button
                    onClick={() =>
                      setIsInlineTypeOpen(isInlineTypeOpen === "inline" ? null : "inline")
                    }
                    className="flex items-center gap-1.5 p-1 bg-surface-sunken border border-border-subtle rounded text-content-secondary hover:border-blue-500/30 hover:bg-blue-500/10 transition-all font-medium text-[10px] leading-none"
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
                            className="w-3.5 h-3.5"
                            style={{ color: typeData.color }}
                          />
                        );
                      return <Zap className="w-3.5 h-3.5 text-blue-600" />;
                    })()}
                    <ChevronDown className="w-3 h-3 text-content-subtle ml-0.5" />
                  </button>
                  {isInlineTypeOpen === "inline" && (
                    <div className="absolute left-0 top-full mt-2 w-48 bg-surface border border-border-subtle rounded-lg shadow-xl z-[100] overflow-hidden">
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
                <div className="flex-1 relative">
                  <input
                    autoFocus
                    value={inlineTitleMap[taskId] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInlineTitleMap((prev) => ({ ...prev, [taskId]: val }));
                    }}
                    placeholder={t("subtasks.whatToDo")}
                    onKeyDown={(e) => e.key === "Enter" && createSubtask(taskId)}
                    className={styles.inlineAddInput}
                  />
                </div>
              </div>
            ) : col.id === "assignee" ? (
              <div className="p-2 bg-surface h-full min-w-[150px] flex items-center">
                <StyledDropdown
                  value={inlineAddAssigneeId}
                  onChange={(val) => setInlineAddAssigneeId(val)}
                  options={[
                    { id: "", label: "Unassigned" },
                    ...projectMembers.map((m) => ({
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
            ) : col.id === "priority" ? (
              <div className="flex items-center p-2 bg-surface h-full min-w-[120px]">
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
                  className="w-[100px]"
                />
              </div>
            ) : (
              <div className="bg-surface h-full border-r border-border-faint/50" />
            )}
          </td>
        ))}
      <td className="px-2 py-3 border-y-2 border-blue-500 bg-surface">
        <div className="flex items-center gap-1">
          <button
            onClick={() => createSubtask(taskId)}
            disabled={isCreating}
            className="p-1 px-2 bg-blue-600 text-content-inverse rounded text-xs sm:text-[10px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => {
              setInlineAddingTaskId(null);
              setInlineTitleMap((prev) => {
                const next = { ...prev };
                delete next[taskId];
                return next;
              });
            }}
            className="p-1 px-2 bg-surface-muted text-content-subtle rounded text-xs sm:text-[10px] font-medium hover:bg-surface-strong transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};
