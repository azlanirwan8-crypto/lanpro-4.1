import { useTranslation } from "react-i18next";
import React from "react";
import { toast } from "sonner";
import { Modal } from "../ui/Modal";
import { Input, Button } from "../ui/CoreUI";
import { StyledDropdown } from "../ui/CommonComponents";
import { validateFileClient } from "../../lib/fileSecurity";
import { MasterData, Sprint, Task, UserProfile, Project } from "../../types";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTaskTitle: string;
  setNewTaskTitle: (val: string) => void;
  newTaskType: string;
  setNewTaskType: (val: any) => void;
  newTaskSprintId: string;
  setNewTaskSprintId: (val: string) => void;
  newTaskStatus: string;
  setNewTaskStatus: (val: string) => void;
  newTaskParentId: string;
  setNewTaskParentId: (val: string) => void;
  newTaskPriority: string;
  setNewTaskPriority: (val: string) => void;
  newTaskCategory: string;
  setNewTaskCategory: (val: string) => void;
  newTaskAssigneeId: string;
  setNewTaskAssigneeId: (val: string) => void;
  newTaskRelease: string;
  setNewTaskRelease: (val: string) => void;
  newTaskStoryPoints: number;
  setNewTaskStoryPoints: (val: number) => void;
  newTaskLabels: string;
  setNewTaskLabels: (val: string) => void;
  newTaskBusinessValue: string;
  setNewTaskBusinessValue: (val: string) => void;
  newTaskProjectRisk: string;
  setNewTaskProjectRisk: (val: string) => void;
  newTaskEnvironment: string;
  setNewTaskEnvironment: (val: string) => void;
  newTaskFigmaUrl: string;
  setNewTaskFigmaUrl: (val: string) => void;
  newTaskAcceptanceCriteria: string;
  setNewTaskAcceptanceCriteria: (val: string) => void;
  newTaskDescription: string;
  setNewTaskDescription: (val: string) => void;
  setNewTaskAttachments: (files: File[]) => void;
  newTaskStartDate: string;
  setNewTaskStartDate: (val: string) => void;
  newTaskEndDate: string;
  setNewTaskEndDate: (val: string) => void;
  newTaskDueDate: string;
  setNewTaskDueDate: (val: string) => void;
  masterData: MasterData[];
  sprints: Sprint[];
  tasks: Task[];
  projectMembers: UserProfile[];
  selectedProject: Project | null;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  newTaskTitle,
  setNewTaskTitle,
  newTaskType,
  setNewTaskType,
  newTaskSprintId,
  setNewTaskSprintId,
  newTaskStatus,
  setNewTaskStatus,
  newTaskParentId,
  setNewTaskParentId,
  newTaskPriority,
  setNewTaskPriority,
  newTaskCategory,
  setNewTaskCategory,
  newTaskAssigneeId,
  setNewTaskAssigneeId,
  newTaskRelease,
  setNewTaskRelease,
  newTaskStoryPoints,
  setNewTaskStoryPoints,
  newTaskLabels,
  setNewTaskLabels,
  newTaskBusinessValue,
  setNewTaskBusinessValue,
  newTaskProjectRisk,
  setNewTaskProjectRisk,
  newTaskEnvironment,
  setNewTaskEnvironment,
  newTaskFigmaUrl,
  setNewTaskFigmaUrl,
  newTaskAcceptanceCriteria,
  setNewTaskAcceptanceCriteria,
  newTaskDescription,
  setNewTaskDescription,
  setNewTaskAttachments,
  newTaskStartDate,
  setNewTaskStartDate,
  newTaskEndDate,
  setNewTaskEndDate,
  newTaskDueDate,
  setNewTaskDueDate,
  masterData,
  sprints,
  tasks,
  projectMembers,
  selectedProject,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const issueTypeOptions = React.useMemo(() => {
    const masterTypes = masterData.filter((m) => m.type === "issue_type");
    if (masterTypes.length > 0) {
      return masterTypes.map((t) => ({
        id: t.label.toLowerCase(),
        label: t.label,
        icon: t.icon,
        color: t.color,
      }));
    }
    return [
      { id: "epic", label: "Epic", icon: "Layers", color: "#8B5CF6" },
      { id: "task", label: "Task", icon: "CheckSquare", color: "#3B82F6" },
      { id: "subtask", label: "Subtask", icon: "GitCommit", color: "#06B6D4" },
      { id: "bug", label: "Bug", icon: "AlertCircle", color: "#EF4444" },
      { id: "meeting", label: t("newTask.linkMeeting"), icon: "Calendar", color: "#F59E0B" },
      { id: "document", label: t("newTask.linkDocument"), icon: "FileText", color: "#10B981" },
      { id: "approval", label: t("newTask.linkApproval"), icon: "ShieldCheck", color: "#EC4899" },
    ];
  }, [masterData]);

  const sprintOptions = React.useMemo(() => {
    const backlogOpt = { id: "", label: "Backlog", icon: "Layers", color: "#64748B" };
    const sprintList = sprints.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.status})`,
      icon:
        s.status === "active" ? "Flame" : s.status === "completed" ? "CheckCircle2" : "Calendar",
      color: s.status === "active" ? "#F97316" : s.status === "completed" ? "#10B981" : "#3B82F6",
    }));
    return [backlogOpt, ...sprintList];
  }, [sprints]);

  const parentTaskOptions = React.useMemo(() => {
    const emptyOpt = { id: "", label: t("newTask.selectParent"), icon: "Layers", color: "#64748B" };
    const parentList = tasks
      .filter((t) => t.type !== "subtask")
      .map((t) => ({
        id: t.id,
        label: `${t.key || t.id}: ${t.title}`,
        icon: t.type === "epic" ? "Layers" : "CheckSquare",
        color: t.type === "epic" ? "#8B5CF6" : "#3B82F6",
      }));
    return [emptyOpt, ...parentList];
  }, [tasks]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("newTask.title")} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Group 1: Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.issueTitle")}
            </label>
            <Input
              value={newTaskTitle}
              onChange={(e: any) => setNewTaskTitle(e.target.value)}
              placeholder={t("newTask.titlePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">
                {t("newTask.type")}
              </label>
              <StyledDropdown
                value={newTaskType}
                onChange={(val) => setNewTaskType(val)}
                options={issueTypeOptions}
                masterData={masterData}
                className="w-full"
                buttonClassName="h-10 bg-surface rounded-lg border border-border-subtle hover:border-border-subtle px-3 text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">
                {t("newTask.sprint")}
              </label>
              <StyledDropdown
                value={newTaskSprintId}
                onChange={(val) => setNewTaskSprintId(val)}
                options={sprintOptions}
                masterData={masterData}
                className="w-full"
                buttonClassName="h-10 bg-surface rounded-lg border border-border-subtle hover:border-border-subtle px-3 text-sm font-medium"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.initialStatus")}
          </label>
          <StyledDropdown
            value={newTaskStatus}
            onChange={(val) => setNewTaskStatus(val)}
            options={masterData
              .filter((d) => d.type === "status")
              .map((d) => ({
                id: d.label,
                label: d.label,
                icon: d.icon,
                color: d.color,
              }))}
            type="status"
            masterData={masterData}
          />
        </div>
        {newTaskType === "subtask" && (
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.parentTask")}
            </label>
            <StyledDropdown
              value={newTaskParentId}
              onChange={(val) => setNewTaskParentId(val)}
              options={parentTaskOptions}
              masterData={masterData}
              className="w-full"
              buttonClassName="h-10 bg-surface rounded-lg border border-border-subtle hover:border-border-subtle px-3 text-sm font-medium"
            />
          </div>
        )}
        {/* Group 2: Assignment & Categorization */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-faint">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.priority")}
            </label>
            <StyledDropdown
              value={newTaskPriority}
              onChange={(val) => setNewTaskPriority(val)}
              options={masterData
                .filter((d) => d.type === "priority")
                .map((d) => ({
                  id: d.label,
                  label: d.label,
                  icon: d.icon,
                  color: d.color,
                }))}
              type="priority"
              masterData={masterData}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.category")}
            </label>
            <StyledDropdown
              value={newTaskCategory}
              onChange={(val) => setNewTaskCategory(val)}
              options={[
                { id: "none", label: "" },
                ...masterData.filter((d) => d.type === "category"),
              ]}
              type="category"
              masterData={masterData}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.assignee")}
          </label>
          <select
            value={newTaskAssigneeId}
            onChange={(e: any) => setNewTaskAssigneeId(e.target.value)}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">{t("newTask.unassigned")}</option>
            {projectMembers.map((m, idx) => (
              <option key={m?.uid ? `pm-${m.uid}-${idx}` : `pm-${idx}`} value={m?.uid}>
                {m?.displayName || m?.email || "Anggota Tim"}
              </option>
            ))}
            {selectedProject?.pendingInvites?.map((email, idx) => (
              <option key={email ? `pi-${email}-${idx}` : `pi-${idx}`} value={email}>
                {email} (Pending)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.release")}
          </label>
          <StyledDropdown
            value={newTaskRelease}
            onChange={(val) => setNewTaskRelease(val)}
            options={[
              { id: "none", label: "" },
              ...masterData
                .filter((d) => d.type === "release")
                .sort((a, b) => (a.order || 0) - (b.order || 0)),
            ]}
            type="release"
            masterData={masterData}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.storyPoints")}
            </label>
            <Input
              type="number"
              value={newTaskStoryPoints || ""}
              onChange={(e: any) => setNewTaskStoryPoints(parseInt(e.target.value) || 0)}
              placeholder="e.g. 5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.labelsCommaSeparated")}
            </label>
            <Input
              value={newTaskLabels}
              onChange={(e: any) => setNewTaskLabels(e.target.value)}
              placeholder={t("newTask.tagsPlaceholder")}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.businessValue")}
            </label>
            <select
              value={newTaskBusinessValue}
              onChange={(e: any) => setNewTaskBusinessValue(e.target.value)}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            >
              <option value="">{t("newTask.notSet")}</option>
              <option value="critical">{t("newTask.critical")}</option>
              <option value="high">{t("newTask.high")}</option>
              <option value="medium">{t("newTask.medium")}</option>
              <option value="low">{t("newTask.low")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.systemRisk")}
            </label>
            <select
              value={newTaskProjectRisk}
              onChange={(e: any) => setNewTaskProjectRisk(e.target.value)}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            >
              <option value="">{t("newTask.notSet")}</option>
              <option value="high">{t("newTask.highRisk")}</option>
              <option value="medium">{t("newTask.mediumRisk")}</option>
              <option value="low">{t("newTask.lowRisk")}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.environment")}
          </label>
          <StyledDropdown
            value={newTaskEnvironment}
            onChange={(val) => setNewTaskEnvironment(val)}
            options={[
              { id: "none", label: t("common.linkNone") },
              ...masterData.filter((d) => d.type === "environment"),
            ]}
            type="environment"
            masterData={masterData}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.figmaUrl")}
          </label>
          <Input
            type="url"
            value={newTaskFigmaUrl}
            onChange={(e: any) => setNewTaskFigmaUrl(e.target.value)}
            placeholder={t("newTask.figmaUrlPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.acceptanceCriteria")}
          </label>
          <textarea
            value={newTaskAcceptanceCriteria}
            onChange={(e: any) => setNewTaskAcceptanceCriteria(e.target.value)}
            placeholder={t("newTask.acceptancePlaceholder")}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.description")}
          </label>
          <textarea
            value={newTaskDescription}
            onChange={(e: any) => setNewTaskDescription(e.target.value)}
            placeholder={t("newTask.descriptionPlaceholder")}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            {t("newTask.attachments")}
          </label>
          <input
            type="file"
            multiple
            onChange={(e: any) => {
              const files = Array.from(e.target.files || []) as File[];
              const validFiles: File[] = [];
              for (const f of files) {
                const check = validateFileClient(f);
                if (!check.valid) {
                  toast.error(
                    check.error ||
                      "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB)."
                  );
                } else {
                  validFiles.push(f);
                }
              }
              setNewTaskAttachments(validFiles);
            }}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.startDate")}
            </label>
            <Input
              type="date"
              value={newTaskStartDate}
              onChange={(e: any) => setNewTaskStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.endDate")}
            </label>
            <Input
              type="date"
              value={newTaskEndDate}
              onChange={(e: any) => setNewTaskEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("newTask.dueDate")}
            </label>
            <Input
              type="date"
              value={newTaskDueDate}
              onChange={(e: any) => setNewTaskDueDate(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={onSubmit} disabled={isSubmitting} className="w-full justify-center">
          {t("newTask.createIssue")}
        </Button>
      </div>
    </Modal>
  );
};
