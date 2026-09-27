import { useTranslation } from "react-i18next";
import React from "react";
import { QATestCase } from "../../features/qa/types";
import { StyledDropdown } from "../ui/CommonComponents";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/CoreUI";

interface EditCaseModalProps {
  testCase: QATestCase | null;
  onClose: () => void;
  editTitle: string;
  onTitleChange: (title: string) => void;
  editSteps: string;
  onStepsChange: (steps: string) => void;
  editExpected: string;
  onExpectedChange: (expected: string) => void;
  editPriority: "High" | "Medium" | "Low" | "Critical";
  onPriorityChange: (priority: "High" | "Medium" | "Low" | "Critical") => void;
  editAssignedTo: string;
  onAssignedToChange: (assignedTo: string) => void;
  onSubmit: () => void;
}

export const EditCaseModal: React.FC<EditCaseModalProps> = ({
  testCase,
  onClose,
  editTitle,
  onTitleChange,
  editSteps,
  onStepsChange,
  editExpected,
  onExpectedChange,
  editPriority,
  onPriorityChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={!!testCase}
      onClose={onClose}
      title={t("editCase.title")}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("editCase.cancel")}
          </Button>
          <Button type="button" onClick={onSubmit}>
            {t("editCase.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-normal text-content-body block">
            {t("editCase.caseTitle")}
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md font-normal text-content-body"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-normal text-content-body block">
            {t("editCase.priority")}
          </label>
          <StyledDropdown
            value={editPriority}
            onChange={(val) => onPriorityChange(val as any)}
            options={[
              {
                id: "Critical",
                label: t("components.criticalPriority"),
                icon: "Flame",
                color: "#EF4444",
              },
              {
                id: "High",
                label: t("components.highPriority"),
                icon: "ChevronUp",
                color: "#F97316",
              },
              {
                id: "Medium",
                label: t("components.mediumPriority"),
                icon: "Circle",
                color: "#F59E0B",
              },
              {
                id: "Low",
                label: t("components.lowPriority"),
                icon: "ChevronDown",
                color: "#10B981",
              },
            ]}
            masterData={[]}
            className="w-full"
            buttonClassName="h-9 bg-surface-sunken rounded-md border border-border-subtle hover:border-border-subtle px-3 text-xs font-normal text-content-body"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-normal text-content-body block">
            {t("editCase.steps")}
          </label>
          <textarea
            rows={3}
            value={editSteps}
            onChange={(e) => onStepsChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md font-normal text-content-body"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-normal text-content-body block">
            {t("editCase.expected")}
          </label>
          <textarea
            rows={2}
            value={editExpected}
            onChange={(e) => onExpectedChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md font-normal text-content-body"
          />
        </div>
      </div>
    </Modal>
  );
};
