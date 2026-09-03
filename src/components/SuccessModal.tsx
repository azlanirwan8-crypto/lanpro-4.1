import { useTranslation } from "react-i18next";
import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/CoreUI";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

/** #419 — Success dialog → Modal + footer. */
export function SuccessModal({ isOpen, onClose, title, message }: SuccessModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t("common.success")}
      maxWidth="max-w-sm"
      footer={
        <Button type="button" onClick={onClose} className="w-full justify-center">
          {t("ui.close")}
        </Button>
      }
    >
      <p className="text-sm text-content-muted text-center">{message}</p>
    </Modal>
  );
}
