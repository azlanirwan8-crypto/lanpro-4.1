import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../ui/CommonComponents";
import { LanproDatePicker } from "../ui/LanproDatePicker";
import { useMasterOptionItems } from "../../hooks/useMasterOptions";
import React from "react";
import { format } from "date-fns";
import { ensureDate } from "../../lib/utils";
import { Modal } from "../ui/Modal";
import { Input, Textarea, Button } from "../ui/CoreUI";
import { Sprint } from "../../types";

interface EditSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSprint: Sprint | null;
  setEditingSprint: (sprint: Sprint | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

/**
 * Dipakai hanya bila MasterData belum memuat tipe sprint_status.
 *
 * HURUF KECIL disengaja: itulah yang tersimpan di kolom Sprints.status.
 */
const CADANGAN_STATUS_SPRINT = [
  { id: "planned", label: "planned", icon: "CalendarClock", color: "#8B5CF6" },
  { id: "active", label: "active", icon: "PlayCircle", color: "#10B981" },
  { id: "completed", label: "completed", icon: "CheckCircle2", color: "#3B82F6" },
];

export const EditSprintModal: React.FC<EditSprintModalProps> = ({
  isOpen,
  onClose,
  editingSprint,
  setEditingSprint,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const opsiStatus = useMasterOptionItems("sprint_status", CADANGAN_STATUS_SPRINT);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("editSprint.title")}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">
            {t("editSprint.cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 justify-center bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse shadow-xs rounded-md text-xs font-medium py-2 cursor-pointer"
          >
            {t("editSprint.saveChanges")}
          </Button>
        </>
      }
    >
      {editingSprint && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-normal text-content-subtle uppercase tracking-wider mb-1">
              {t("editSprint.name")}
            </label>
            <Input
              value={editingSprint.name}
              onChange={(e: any) => setEditingSprint({ ...editingSprint, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-normal text-content-subtle uppercase tracking-wider mb-1">
              {t("ui.goal")}
            </label>
            <Textarea
              value={editingSprint.goal}
              onChange={(e: any) => setEditingSprint({ ...editingSprint, goal: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-normal text-content-subtle uppercase tracking-wider mb-1">
              {t("editSprint.status")}
            </label>
            <StyledDropdown
              value={editingSprint.status || "planned"}
              onChange={(val) => setEditingSprint({ ...editingSprint, status: val as any })}
              options={opsiStatus}
              type="sprint_status"
              masterData={[]}
              className="w-full"
              buttonClassName="w-full px-4 py-2 border border-border-subtle rounded-lg text-sm bg-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-normal text-content-subtle uppercase tracking-wider mb-1">
                {t("editSprint.startDate")}
              </label>
              <LanproDatePicker
                value={
                  editingSprint.startDate
                    ? typeof editingSprint.startDate === "string"
                      ? editingSprint.startDate
                      : format(ensureDate(editingSprint.startDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(val) =>
                  setEditingSprint({
                    ...editingSprint,
                    startDate: val,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-content-subtle uppercase tracking-wider mb-1">
                {t("editSprint.endDate")}
              </label>
              <LanproDatePicker
                value={
                  editingSprint.endDate
                    ? typeof editingSprint.endDate === "string"
                      ? editingSprint.endDate
                      : format(ensureDate(editingSprint.endDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(val) =>
                  setEditingSprint({
                    ...editingSprint,
                    endDate: val,
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
