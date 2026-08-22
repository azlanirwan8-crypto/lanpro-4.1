import { useTranslation } from "react-i18next";
import React from "react";
import { Modal } from "../ui/Modal";
import { Input, Textarea, Button } from "../ui/CoreUI";

interface NewSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  newSprintName: string;
  setNewSprintName: (val: string) => void;
  newSprintGoal: string;
  setNewSprintGoal: (val: string) => void;
  newSprintStartDate: string;
  setNewSprintStartDate: (val: string) => void;
  newSprintEndDate: string;
  setNewSprintEndDate: (val: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const NewSprintModal: React.FC<NewSprintModalProps> = ({
  isOpen,
  onClose,
  newSprintName,
  setNewSprintName,
  newSprintGoal,
  setNewSprintGoal,
  newSprintStartDate,
  setNewSprintStartDate,
  newSprintEndDate,
  setNewSprintEndDate,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("newSprint.title")}>
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newSprint.name")}
          </label>
          <Input
            value={newSprintName}
            onChange={(e: any) => setNewSprintName(e.target.value)}
            placeholder={t("newSprint.namePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newSprint.goal")}
          </label>
          <Textarea
            value={newSprintGoal}
            onChange={(e: any) => setNewSprintGoal(e.target.value)}
            placeholder={t("newSprint.goalPlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-content-body mb-1">
              {t("newSprint.startDate")}
            </label>
            <input
              type="date"
              value={newSprintStartDate}
              onChange={(e: any) => setNewSprintStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-border-subtle rounded-md text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-body mb-1">
              {t("newSprint.endDate")}
            </label>
            <input
              type="date"
              value={newSprintEndDate}
              onChange={(e: any) => setNewSprintEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-border-subtle rounded-md text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full justify-center bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse shadow-xs py-2.5 rounded-md font-medium text-xs cursor-pointer"
        >
          {t("newSprint.createAssign")}
        </Button>
      </div>
    </Modal>
  );
};
