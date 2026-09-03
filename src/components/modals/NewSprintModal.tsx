import { useTranslation } from "react-i18next";
import React from "react";
import { Modal } from "../ui/Modal";
import { Input, Textarea, Button } from "../ui/CoreUI";
import { LanproDatePicker } from "../ui/LanproDatePicker";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("newSprint.title")}
      footer={
        <Button onClick={onSubmit} disabled={isSubmitting} className="justify-center min-w-[8rem]">
          {t("newSprint.createAssign")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-normal text-content-body mb-1">
            {t("newSprint.name")}
          </label>
          <Input
            value={newSprintName}
            onChange={(e: any) => setNewSprintName(e.target.value)}
            placeholder={t("newSprint.namePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-xs font-normal text-content-body mb-1">
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
            <label className="block text-xs font-normal text-content-body mb-1">
              {t("newSprint.startDate")}
            </label>
            <LanproDatePicker
              value={newSprintStartDate}
              onChange={(val) => setNewSprintStartDate(val)}
            />
          </div>
          <div>
            <label className="block text-xs font-normal text-content-body mb-1">
              {t("newSprint.endDate")}
            </label>
            <LanproDatePicker
              value={newSprintEndDate}
              onChange={(val) => setNewSprintEndDate(val)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
