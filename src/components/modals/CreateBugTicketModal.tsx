import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Search, CheckCircle2, Bug, ChevronDown } from "lucide-react";
import { QATestCase } from "../../features/qa/types";
import { StyledDropdown } from "../ui/CommonComponents";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/CoreUI";

interface CreateBugTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: QATestCase | null;

  // Form state
  titleInput: string;
  onTitleChange: (title: string) => void;
  selectedParentId: string;
  onParentSelect: (parentId: string) => void;
  parentSearchTerm: string;
  onSearchTermChange: (term: string) => void;
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
  parentSearchTerm,
  onSearchTermChange,
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const parentCandidates = (tasks || []).filter(
    (t: any) => (t.projectId === selectedProject?.id || !t.projectId) && t.type !== "subtask"
  );
  const filteredParents = parentCandidates.filter((p: any) => {
    if (!parentSearchTerm.trim()) return true;
    const term = parentSearchTerm.toLowerCase();
    const titleMatch = p.title?.toLowerCase().includes(term);
    const keyMatch = (p.key || p.taskKey || "").toLowerCase().includes(term);
    return titleMatch || keyMatch;
  });
  const selectedParentTask = parentCandidates.find((pt: any) => pt.id === selectedParentId);

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
          <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-wider block">
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

        {/* Parent Task Searchable Combobox */}
        <div className="space-y-1.5 relative">
          <label className="text-xs sm:text-[10px] font-normal text-danger-text uppercase tracking-wider block">
            {t("bugTicket.targetEpicParentTaskRequired")}
          </label>

          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full text-xs p-3 bg-surface-sunken border border-border-subtle rounded-md font-medium text-content-strong flex items-center justify-between cursor-pointer hover:border-primary"
          >
            <span className="truncate">
              {selectedParentTask
                ? `[${selectedParentTask.key || selectedParentTask.taskKey || "TASK"}] ${selectedParentTask.title}`
                : "-- Pilih Target Epic / Task Utama --"}
            </span>
            <ChevronDown className="w-4 h-4 text-content-subtle shrink-0" />
          </div>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border-subtle rounded-md shadow-2xl p-2 z-50 animate-dropdown">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-content-subtle" />
                  <input
                    autoFocus
                    type="text"
                    placeholder={t("bugTicket.searchTarget")}
                    value={parentSearchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-surface-sunken border border-border-subtle rounded-md focus:outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-border-faint rounded-md divide-y divide-border-faint bg-surface custom-scrollbar">
                  {filteredParents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-content-subtle">
                      {t("bugTicket.noTarget")}
                    </div>
                  ) : (
                    filteredParents.map((pt: any) => (
                      <div
                        key={pt.id}
                        onClick={() => {
                          onParentSelect(pt.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`p-2.5 text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                          selectedParentId === pt.id
                            ? "bg-rose-500/10 text-danger-text"
                            : "hover:bg-surface-sunken text-content-body"
                        }`}
                      >
                        <span className="truncate">
                          [{pt.key || pt.taskKey || (pt.type ? pt.type.toUpperCase() : "TASK")}]{" "}
                          {pt.title}
                        </span>
                        {selectedParentId === pt.id && (
                          <CheckCircle2 className="w-4 h-4 text-danger-text shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-wider block">
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
            <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-wider block">
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
          <label className="text-xs sm:text-[10px] font-normal text-content-muted uppercase tracking-wider block">
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
