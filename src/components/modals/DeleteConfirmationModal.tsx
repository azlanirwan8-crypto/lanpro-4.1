import { useTranslation } from "react-i18next";
import React from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/CoreUI";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemName: string;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  itemName,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 justify-center"
          >
            {t("ui.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="flex-1 justify-center bg-danger-surface hover:bg-danger-hover text-content-inverse"
          >
            {t("ui.yesDelete")}
          </Button>
        </>
      }
    >
      <div className="text-center space-y-3">
        <Trash2 className="w-10 h-10 text-danger-text mx-auto" />
        <p className="text-xs text-content-muted">
          {t("common.areYouSureYouWant")} <strong>{itemName}</strong>?
        </p>
      </div>
    </Modal>
  );
};
