import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  RefreshCw,
  Clock,
  Edit3,
  Trash2,
  Bug,
  User,
} from "lucide-react";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import type { QATestCase } from "../types";

interface QATestCaseMobileCardViewProps {
  cases: QATestCase[];
  selectedCaseIds: string[];
  projectMembers: any[];
  canUpdate: boolean;
  canDelete: boolean;
  isAdminRole: boolean;
  onSelectCase: (tc: QATestCase) => void;
  onToggleCheckCase: (caseId: string) => void;
  onStatusChange: (
    caseId: string,
    status: "Passed" | "Failed" | "Blocked" | "Retest" | "Pending"
  ) => void;
  onEditCase: (tc: QATestCase) => void;
  onDeleteCase: (tc: QATestCase) => void;
  onCreateBug: (tc: QATestCase) => void;
}

export const QATestCaseMobileCardView: React.FC<QATestCaseMobileCardViewProps> = ({
  cases,
  selectedCaseIds,
  projectMembers = [],
  canUpdate,
  canDelete,
  isAdminRole,
  onSelectCase,
  onToggleCheckCase,
  onStatusChange,
  onEditCase,
  onDeleteCase,
  onCreateBug,
}) => {
  const { t } = useTranslation();

  const getPriorityStyle = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-rose-500/15 text-rose-700 border-rose-500/30";
      case "high":
        return "bg-amber-500/15 text-amber-700 border-amber-500/30";
      case "medium":
        return "bg-primary/15 text-primary border-primary/30";
      case "low":
      default:
        return "bg-surface-sunken text-content-subtle border-border-subtle";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Passed":
        return {
          bg: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
          icon: CheckCircle2,
          label: "Passed",
        };
      case "Failed":
        return {
          bg: "bg-rose-500/15 text-rose-700 border-rose-500/30",
          icon: XCircle,
          label: "Failed",
        };
      case "Blocked":
        return {
          bg: "bg-amber-500/15 text-amber-700 border-amber-500/30",
          icon: AlertOctagon,
          label: "Blocked",
        };
      case "Retest":
        return {
          bg: "bg-primary/15 text-primary border-primary/30",
          icon: RefreshCw,
          label: "Retest",
        };
      case "Pending":
      default:
        return {
          bg: "bg-surface-sunken text-content-subtle border-border-subtle",
          icon: Clock,
          label: "Pending",
        };
    }
  };

  if (cases.length === 0) {
    return (
      <div className="p-8 text-center bg-surface border border-border-subtle/80 rounded-lg shadow-2xs">
        <p className="text-xs text-content-subtle">{t("qaTable.emptyFilter")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {cases.map((tc, idx) => {
        const isChecked = selectedCaseIds.includes(tc.id);
        const statusInfo = getStatusBadge(tc.status);
        const StatusIcon = statusInfo.icon;
        const priorityClass = getPriorityStyle(tc.priority);

        const matchedMember = (projectMembers || []).find(
          (m: any) =>
            m.uid === tc.assignedTo ||
            m.id === tc.assignedTo ||
            m.username === tc.assignedTo ||
            m.email === tc.assignedTo
        );
        const picName =
          matchedMember?.displayName ||
          matchedMember?.username ||
          matchedMember?.email ||
          t("qa.unassigned");

        return (
          <div
            key={tc.id || idx}
            onClick={() => onSelectCase(tc)}
            className={`p-4 bg-surface rounded-lg border shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col gap-3 ${
              isChecked
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                : "border-border-subtle/80 hover:border-primary/40"
            }`}
          >
            {/* Header: Checkbox, Title & Action buttons */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                {(canUpdate || isAdminRole) && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCheckCase(tc.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 rounded border-border-subtle text-primary focus:ring-primary cursor-pointer shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-content-subtle">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <h4 className="text-sm font-semibold text-content-strong line-clamp-2 leading-snug">
                      {tc.title}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {tc.status === "Failed" && (
                  <button
                    type="button"
                    onClick={() => onCreateBug(tc)}
                    aria-label={t("qaTable.createBug") || "Create Bug"}
                    className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-600 transition-colors cursor-pointer"
                    title={t("qaTable.createBug")}
                  >
                    <Bug className="w-4 h-4" />
                  </button>
                )}

                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => onEditCase(tc)}
                    aria-label={t("qaTable.editCase") || "Edit"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-amber-600 transition-colors cursor-pointer"
                    title={t("qaTable.editCase")}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDeleteCase(tc)}
                    aria-label={t("qaTable.deleteCase") || "Delete"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-rose-600 transition-colors cursor-pointer"
                    title={t("qaTable.deleteCase")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Badges: Status & Priority */}
            <div
              className="flex flex-wrap items-center gap-2 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Quick Status Change Switcher for Mobile */}
              <div className="relative inline-block">
                <select
                  value={tc.status || "Pending"}
                  onChange={(e) => onStatusChange(tc.id, e.target.value as any)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md border appearance-none pr-6 cursor-pointer outline-none ${statusInfo.bg}`}
                >
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Retest">Retest</option>
                  <option value="Pending">Pending</option>
                </select>
                <StatusIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Priority badge */}
              <span
                className={`inline-flex items-center text-[10px] leading-none font-semibold px-2 py-1 rounded-md border uppercase tracking-wider ${priorityClass}`}
              >
                {tc.priority || "Medium"}
              </span>
            </div>

            {/* Footer: PIC Assignee */}
            <div className="pt-2 border-t border-border-faint flex items-center justify-between gap-2 text-xs text-content-subtle">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px]">PIC:</span>
                <div className="flex items-center gap-1.5 truncate">
                  <UserAvatar
                    uid={tc.assignedTo}
                    members={projectMembers}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="font-medium text-content truncate">{picName}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
