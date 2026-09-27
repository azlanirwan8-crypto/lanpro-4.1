import { useTranslation } from "react-i18next";
import React from "react";
import { Grid, Check } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "../../lib/utils";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/CoreUI";

interface ConfigureColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueTableColumns: any[];
  setIssueTableColumns: React.Dispatch<React.SetStateAction<any[]>>;
  handleReorderColumns: (result: any) => void;
}

/** #419 — Configure columns → Modal + footer Velzon. */
export const ConfigureColumnsModal: React.FC<ConfigureColumnsModalProps> = ({
  isOpen,
  onClose,
  issueTableColumns,
  setIssueTableColumns,
  handleReorderColumns,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("filters.configureColumns")}
      maxWidth="max-w-lg"
      footer={
        <Button type="button" onClick={onClose}>
          {t("issueColumns.close")}
        </Button>
      }
    >
      <div className="space-y-3 text-xs">
        <p className="text-xs text-content-muted font-medium">
          {t("issueColumns.dragToReorderColumnsAnd")}
        </p>
        <DragDropContext onDragEnd={handleReorderColumns}>
          <Droppable droppableId="columns">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-1.5 max-h-[380px] overflow-y-auto px-1"
              >
                {issueTableColumns.map((col, index) => (
                  <Draggable key={col.id} draggableId={col.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={cn(
                          "flex items-center justify-between p-2.5 bg-surface-sunken/80 rounded-md hover:bg-surface-muted/80 transition-colors group border border-border-subtle/60",
                          snapshot.isDragging ? "shadow-md bg-surface border-primary/40 z-[70]" : ""
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            {...dragProvided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-content-subtle hover:text-content-secondary"
                          >
                            <Grid className="w-4 h-4" />
                          </div>
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <div
                              onClick={() => {
                                setIssueTableColumns((prev) =>
                                  prev.map((c) =>
                                    c.id === col.id ? { ...c, visible: !c.visible } : c
                                  )
                                );
                              }}
                              className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer",
                                col.visible
                                  ? "bg-primary-surface border-primary"
                                  : "bg-surface border-border-subtle"
                              )}
                            >
                              {col.visible && <Check className="w-3 h-3 text-content-inverse" />}
                            </div>
                            <span className="text-xs font-medium text-content-strong">
                              {t(col.label)}
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </Modal>
  );
};
