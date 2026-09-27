import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../ui/CommonComponents";
import { useMasterOptionItems } from "../../hooks/useMasterOptions";
import React from "react";
import { Plus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/CoreUI";

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

/** Dipakai hanya bila MasterData belum memuat tipe qa_phase. */
const CADANGAN_FASE = [
  { id: "SIT", label: "SIT", icon: "Cpu", color: "#3B82F6" },
  { id: "UAT", label: "UAT", icon: "CheckCircle2", color: "#10B981" },
  { id: "PTR", label: "PTR", icon: "ShieldCheck", color: "#F59E0B" },
];

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
  const opsiFase = useMasterOptionItems("qa_phase", CADANGAN_FASE);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("addSuite.title")}
      maxWidth="max-w-md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("addSuite.cancel")}
          </Button>
          <Button type="submit" form="add-suite-form" className="gap-1.5">
            <Plus className="w-4 h-4" /> {t("addSuite.createDocument")}
          </Button>
        </>
      }
    >
      <p className="text-xs text-content-subtle font-normal -mt-1 mb-4">{t("addSuite.subtitle")}</p>
      <form id="add-suite-form" onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-content-body font-normal block">
            {t("addSuite.docName")}
          </label>
          <input
            autoFocus
            type="text"
            required
            value={suiteName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full text-xs p-2.5 bg-surface-sunken/80 border border-border-subtle rounded-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none font-normal text-content-body"
            placeholder={t("addSuite.docNamePlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-content-body font-normal block">
            {t("addSuite.testPhase")}
          </label>
          <StyledDropdown
            value={phase}
            onChange={(val) => onPhaseChange(val as any)}
            options={opsiFase}
            type="qa_phase"
            masterData={[]}
            className="w-full"
            buttonClassName="w-full text-xs p-2.5 bg-surface-sunken/80 border border-border-subtle rounded-md font-normal text-content-body"
          />
        </div>
      </form>
    </Modal>
  );
};
