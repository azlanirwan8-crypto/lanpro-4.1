import { useTranslation } from "react-i18next";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { QATestSuite } from "../../features/qa/types";

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
  if (!suite) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface border border-border-subtle/80 rounded-md p-6 max-w-sm w-full shadow-2xl space-y-4"
        >
          <h3 className="text-sm font-semibold text-content-strong">{t("editSuite.title")}</h3>
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
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-muted text-content-secondary text-xs font-normal rounded-md cursor-pointer"
            >
              {t("editSuite.cancel")}
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-primary-surface text-content-inverse text-xs font-normal rounded-md cursor-pointer shadow-xs active:scale-95"
            >
              {t("editSuite.save")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
