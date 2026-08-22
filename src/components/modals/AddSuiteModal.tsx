import { useTranslation } from "react-i18next";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

interface AddSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteName: string;
  onNameChange: (name: string) => void;
  phase: "SIT" | "UAT" | "PTR";
  onPhaseChange: (phase: "SIT" | "UAT" | "PTR") => void;
  assignedTo: string;
  onAssignedToChange: (assignedTo: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddSuiteModal: React.FC<AddSuiteModalProps> = ({
  isOpen,
  onClose,
  suiteName,
  onNameChange,
  phase,
  onPhaseChange,
  onSubmit,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface border border-border-subtle/80 rounded-md p-6 max-w-md w-full shadow-2xl space-y-5"
        >
          <div className="flex items-center gap-3 border-b border-border-faint pb-3">
            <div className="w-10 h-10 rounded-md bg-primary-surface/10 text-primary flex items-center justify-center font-medium">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-content-strong uppercase tracking-wider">
                {t("addSuite.title")}
              </h3>
              <p className="text-xs sm:text-[11px] text-content-subtle font-medium">
                {t("addSuite.subtitle")}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-[11px] text-content-body font-medium block">
                {t("addSuite.docName")}
              </label>
              <input
                autoFocus
                type="text"
                required
                value={suiteName}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full text-xs p-3 bg-surface-sunken/80 border border-border-subtle rounded-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none font-medium text-content-strong"
                placeholder={t("addSuite.docNamePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-[11px] text-content-body font-medium block">
                {t("addSuite.testPhase")}
              </label>
              <select
                value={phase}
                onChange={(e) => onPhaseChange(e.target.value as any)}
                className="w-full text-xs p-3 bg-surface-sunken/80 border border-border-subtle rounded-md focus:border-primary focus:outline-none font-medium text-primary cursor-pointer"
              >
                <option value="SIT">Fase SIT (System Integration Test)</option>
                <option value="UAT">Fase UAT (User Acceptance Test)</option>
                <option value="PTR">Fase PTR (Production Readiness Test)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-surface-muted hover:bg-surface-strong text-content-body text-xs font-medium uppercase tracking-wider rounded-md transition-all cursor-pointer"
              >
                {t("addSuite.cancel")}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse text-xs font-medium uppercase tracking-wider rounded-md transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> Buat Dokumen
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
