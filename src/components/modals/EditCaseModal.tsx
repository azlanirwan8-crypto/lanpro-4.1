import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { QATestCase } from "../../features/qa/types";
import { StyledDropdown } from "../ui/CommonComponents";

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
  if (!testCase) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface border border-border-subtle/80 rounded-md p-6 max-w-lg w-full shadow-2xl space-y-4"
        >
          <h3 className="text-sm font-medium text-content-strong uppercase tracking-wider">
            Ubah Test Case Detail
          </h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider block">
                Judul Test Case
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md font-medium text-content-strong"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider block">
                Prioritas
              </label>
              <StyledDropdown
                value={editPriority}
                onChange={(val) => onPriorityChange(val as any)}
                options={[
                  { id: "Critical", label: "Critical Priority", icon: "Flame", color: "#EF4444" },
                  { id: "High", label: "High Priority", icon: "ChevronUp", color: "#F97316" },
                  { id: "Medium", label: "Medium Priority", icon: "Circle", color: "#F59E0B" },
                  { id: "Low", label: "Low Priority", icon: "ChevronDown", color: "#10B981" },
                ]}
                masterData={[]}
                className="w-full"
                buttonClassName="h-10 bg-surface-sunken rounded-md border border-border-subtle hover:border-border-subtle px-3 text-xs font-medium text-content-strong"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider block">
                Langkah Pengujian
              </label>
              <textarea
                rows={3}
                value={editSteps}
                onChange={(e) => onStepsChange(e.target.value)}
                className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md font-medium text-content-strong"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider block">
                Hasil yang Diharapkan
              </label>
              <textarea
                rows={2}
                value={editExpected}
                onChange={(e) => onExpectedChange(e.target.value)}
                className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md font-medium text-content-strong"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-muted text-content-secondary text-xs font-medium rounded-md cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-primary-surface text-content-inverse text-xs font-medium rounded-md cursor-pointer shadow-xs active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
