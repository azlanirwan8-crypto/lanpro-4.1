import { useTranslation } from "react-i18next";
import React from "react";
import { QATestSuite } from "../../features/qa/types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/CoreUI";

interface EditSuiteModalProps {
  suite: QATestSuite | null;
  onClose: () => void;
  editName: string;
  onNameChange: (name: string) => void;
  editAssignedTo: string;
  onAssignedToChange: (assignedTo: string) => void;
  onSubmit: () => void;
}

export const EditSuiteModal: React.FC<EditSuiteModalProps> = ({
  suite,
  onClose,
  editName,
  onNameChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={!!suite}
      onClose={onClose}
      title={t("editSuite.title")}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("editSuite.cancel")}
          </Button>
          <Button type="button" onClick={onSubmit}>
            {t("editSuite.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-normal text-content-body block">
            {t("editSuite.docName")}
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md font-normal text-content-body"
          />
        </div>
      </div>
    </Modal>
  );
};
