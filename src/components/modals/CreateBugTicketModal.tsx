import { useTranslation } from "react-i18next";
import React from "react";
import { Bug } from "lucide-react";
import { QATestCase } from "../../features/qa/types";
import { StyledDropdown } from "../ui/CommonComponents";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/CoreUI";
import { enterUntukSimpan } from "../../lib/enterSimpan";
import { labelIndukTugas } from "../../lib/labelIndukTugas";

interface CreateBugTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: QATestCase | null;

  // Form state
  titleInput: string;
  onTitleChange: (title: string) => void;
  selectedParentId: string;
  onParentSelect: (parentId: string) => void;
  priorityInput: string;
  onPriorityChange: (priority: string) => void;
  assigneeInput: string;
  onAssigneeChange: (assignee: string) => void;
  descriptionInput: string;
  onDescriptionChange: (desc: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;

  // Context data
  tasks: any[];
  projectMembers: any[];
  selectedProject: any;
}

export const CreateBugTicketModal: React.FC<CreateBugTicketModalProps> = ({
  isOpen,
  onClose,
  testCase,
  titleInput,
  onTitleChange,
  selectedParentId,
  onParentSelect,
  priorityInput,
  onPriorityChange,
  assigneeInput,
  onAssigneeChange,
  descriptionInput,
  onDescriptionChange,
  isSubmitting,
  onSubmit,
  tasks,
  projectMembers,
  selectedProject,
}) => {
  const { t } = useTranslation();

  const parentCandidates = (tasks || []).filter(
    (t: any) => (t.projectId === selectedProject?.id || !t.projectId) && t.type !== "subtask"
  );

  if (!isOpen || !testCase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("bugTicket.title")}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 justify-center"
          >
            {t("bugTicket.cancel")}
          </Button>
          <Button
            type="submit"
            form="create-bug-ticket-form"
            disabled={isSubmitting || !selectedParentId}
            className="flex-1 justify-center gap-2 bg-danger-surface hover:bg-danger-hover text-content-inverse"
          >
            <Bug className="w-4 h-4" />
            <span>{isSubmitting ? t("bugTicket.savingTicket") : t("bugTicket.saveLinkBug")}</span>
          </Button>
        </>
      }
    >
      <p className="text-xs text-content-muted font-medium -mt-1 mb-4">
        {t("bugTicket.createdFromTestCase")}
        {testCase.rowNum}
      </p>

      <form id="create-bug-ticket-form" onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-normal block">
            {t("bugTicket.ticketTitle")}
          </label>
          <input
            type="text"
            required
            value={titleInput}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-xs p-3 bg-surface-sunken border border-border-subtle rounded-md font-medium text-content-strong focus:border-primary focus:outline-none"
          />
        </div>

        {/* #727 — pemilih induk ini DULU combobox bercari yang ditulis inline
            sendirian: gaya sendiri, warna keras palet rose, dan `truncate`
            pada judul tugas. Pencarian kini hidup di `StyledDropdown` (menyala
            sendiri di atas 8 opsi), jadi blok 80 baris itu jadi 12 baris dan
            perilaku #593 terjaga secara struktural: panel dropdown di-portal
            ke `document.body`, DI LUAR `<form>`, sehingga Enter saat menyaring
            tidak mungkin lagi mengirim form. */}
        <div className="space-y-1.5">
          <label className="text-xs sm:text-[10px] font-normal text-danger-text uppercase tracking-normal block">
            {t("bugTicket.targetEpicParentTaskRequired")}
          </label>
          <StyledDropdown
            value={selectedParentId}
            onChange={(val) => onParentSelect(val)}
            options={[
              { id: "", label: t("bugTicket.selectTargetParent") },
              ...parentCandidates.map((pt: any) => ({
                id: pt.id,
                label: labelIndukTugas(pt),
              })),
            ]}
            masterData={[]}
            className="w-full"
            buttonClassName="w-full text-xs p-3 bg-surface-sunken border border-border-subtle rounded-md font-medium text-content-strong text-left"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-normal block">
              {t("bugTicket.severity")}
            </label>
            <StyledDropdown
              value={priorityInput}
              onChange={(val) => onPriorityChange(val)}
              options={[
                { id: "Critical", label: "Critical", icon: "Flame", color: "#EF4444" },
                { id: "High", label: "High", icon: "ChevronUp", color: "#F97316" },
                { id: "Medium", label: "Medium", icon: "Circle", color: "#F59E0B" },
                { id: "Low", label: "Low", icon: "ChevronDown", color: "#10B981" },
              ]}
              masterData={[]}
              className="w-full"
              buttonClassName="h-10 bg-surface-sunken rounded-md border border-border-subtle hover:border-border-subtle px-3 text-xs font-medium text-content-strong"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-normal block">
              {t("bugTicket.assigneeDev")}
            </label>
            <StyledDropdown
              value={assigneeInput}
              onChange={(val) => onAssigneeChange(val)}
              options={[
                {
                  id: "",
                  label: `-- ${t("newTask.unassigned")} --`,
                  icon: "User",
                  color: "#64748B",
                },
                ...(projectMembers || []).map((m: any) => ({
                  id: m.id || m.uid,
                  label: m.displayName || m.name || m.email || "Member",
                  icon: "User",
                  color: "#3B82F6",
                })),
              ]}
              masterData={[]}
              className="w-full"
              buttonClassName="h-10 bg-surface-sunken rounded-md border border-border-subtle hover:border-border-subtle px-3 text-xs font-medium text-content-strong"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-normal block">
            {t("bugTicket.description")}
          </label>
          <textarea
            rows={5}
            value={descriptionInput}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full text-xs p-3 bg-surface-sunken border border-border-subtle rounded-md font-mono text-content-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </form>
    </Modal>
  );
};
