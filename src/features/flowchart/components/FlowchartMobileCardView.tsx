import React from "react";
import { useTranslation } from "react-i18next";
import { Workflow, Calendar, Edit3, Trash2, ArrowRight, Layers } from "lucide-react";
import type { FlowchartData } from "../types";
import type { Task } from "../../../types";

interface FlowchartMobileCardViewProps {
  flowcharts: FlowchartData[];
  tasks: Task[];
  onSelectFlowchart: (id: string) => void;
  onEditFlowchart: (flow: FlowchartData, e: React.MouseEvent) => void;
  onDeleteFlowchart: (id: string, e: React.MouseEvent) => void;
  canModifyFlowchart: (flow: FlowchartData) => boolean;
  getResolvedAuthor: () => string;
  onOpenCreate: () => void;
}

export const FlowchartMobileCardView: React.FC<FlowchartMobileCardViewProps> = ({
  flowcharts,
  tasks,
  onSelectFlowchart,
  onEditFlowchart,
  onDeleteFlowchart,
  canModifyFlowchart,
  getResolvedAuthor,
  onOpenCreate,
}) => {
  const { t } = useTranslation();

  const getLinkedEpicName = (epicId?: string) => {
    if (!epicId) return null;
    const task = tasks.find((t) => t.id === epicId);
    return task?.title || epicId;
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (flowcharts.length === 0) {
    return (
      <div className="p-8 text-center bg-surface border border-border-subtle/80 rounded-lg shadow-2xs">
        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-primary shadow-2xs">
          <Workflow className="w-6 h-6" />
        </div>
        <p className="font-medium text-content-strong text-sm">{t("flowchart.emptyTitle")}</p>
        <p className="text-xs text-content-subtle mt-1 mb-3">{t("flowchart.emptyHint")}</p>
        <button
          type="button"
          onClick={onOpenCreate}
          className="btn-animation waves-effect waves-light btn-primary h-8 px-3 rounded-md text-xs font-medium cursor-pointer"
        >
          {t("flowchart.addFlowchart")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {flowcharts.map((flow, index) => {
        const canModify = canModifyFlowchart(flow);
        const epicName = getLinkedEpicName(flow.epicTaskId);
        const author = flow.createdByName || flow.createdBy || getResolvedAuthor();

        return (
          <div
            key={flow.id || index}
            onClick={() => onSelectFlowchart(flow.id)}
            className="p-4 bg-surface rounded-lg border border-border-subtle/80 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-3"
          >
            {/* Header: Title & Action buttons */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-content-strong line-clamp-2 leading-snug">
                  {flow.name || "Untitled Diagram"}
                </h4>
                {flow.description && (
                  <p className="text-xs text-content-muted line-clamp-2 mt-1 leading-relaxed">
                    {flow.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {canModify && (
                  <button
                    type="button"
                    onClick={(e) => onEditFlowchart(flow, e)}
                    aria-label={t("flowchart.editDiagram") || "Edit Diagram"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {canModify && (
                  <button
                    type="button"
                    onClick={(e) => onDeleteFlowchart(flow.id, e)}
                    aria-label={t("flowchart.deleteDiagram") || "Delete Diagram"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category badge & Linked Epic */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {flow.category && (
                <span className="inline-flex items-center gap-1 text-[10px] leading-none font-semibold px-2 py-1 rounded-md bg-indigo-500/10 text-primary border border-indigo-500/30 uppercase tracking-wider">
                  {flow.category}
                </span>
              )}

              {epicName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-sunken border border-border-subtle text-content-muted text-[11px] font-medium truncate max-w-[200px]">
                  <Layers className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{epicName}</span>
                </span>
              )}
            </div>

            {/* Footer: Author, Updated date & Open Canvas button */}
            <div className="pt-2 border-t border-border-faint flex items-center justify-between gap-2 text-xs text-content-subtle">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px]">{t("meetings.thAuthor")}:</span>
                <span className="font-medium text-content truncate">{author}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(flow.lastEditedAt || flow.createdAt)}</span>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <span>Buka</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
