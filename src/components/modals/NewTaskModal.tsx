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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Issue"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Group 1: Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              Issue Title
            </label>
            <Input
              value={newTaskTitle}
              onChange={(e: any) => setNewTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">Type</label>
              <select
                value={newTaskType}
                onChange={(e: any) => setNewTaskType(e.target.value)}
                className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              >
                {masterData.filter((m) => m.type === "issue_type").length > 0 ? (
                  masterData
                    .filter((m) => m.type === "issue_type")
                    .map((t, idx) => (
                      <option
                        key={t.id ? `it-${t.id}-${idx}` : `it-${idx}`}
                        value={t.label.toLowerCase()}
                      >
                        {t.label}
                      </option>
                    ))
                ) : (
                  <>
                    <option value="epic">Epic</option>
                    <option value="task">Task</option>
                    <option value="subtask">Subtask</option>
                    <option value="bug">Bug</option>
                    <option value="meeting">Meeting</option>
                    <option value="document">Document</option>
                    <option value="approval">Approval</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">
                Sprint
              </label>
              <select
                value={newTaskSprintId}
                onChange={(e: any) => setNewTaskSprintId(e.target.value)}
                className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Backlog</option>
                {sprints.map((s, idx) => (
                  <option key={s.id ? `sp-${s.id}-${idx}` : `sp-${idx}`} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Initial Status
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
              Parent Task / Epic
            </label>
            <select
              value={newTaskParentId}
              onChange={(e: any) => setNewTaskParentId(e.target.value)}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Select Parent...</option>
              {tasks
                .filter((t) => t.type !== "subtask")
                .map((t, idx) => (
                  <option key={t.id ? `pt-${t.id}-${idx}` : `pt-${idx}`} value={t.id}>
                    {t.key}: {t.title}
                  </option>
                ))}
            </select>
          </div>
        )}
        {/* Group 2: Assignment & Categorization */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-faint">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              Priority
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
              Category
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
          <label className="block text-sm font-medium text-content-body mb-1">Assignee</label>
          <select
            value={newTaskAssigneeId}
            onChange={(e: any) => setNewTaskAssigneeId(e.target.value)}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Unassigned</option>
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
          <label className="block text-sm font-medium text-content-body mb-1">Release</label>
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
              Story Points
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
              Labels (comma separated)
            </label>
            <Input
              value={newTaskLabels}
              onChange={(e: any) => setNewTaskLabels(e.target.value)}
              placeholder="e.g. frontend, bug"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              Business Value
            </label>
            <select
              value={newTaskBusinessValue}
              onChange={(e: any) => setNewTaskBusinessValue(e.target.value)}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            >
              <option value="">Not Set</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              System Risk
            </label>
            <select
              value={newTaskProjectRisk}
              onChange={(e: any) => setNewTaskProjectRisk(e.target.value)}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            >
              <option value="">Not Set</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Environment
          </label>
          <StyledDropdown
            value={newTaskEnvironment}
            onChange={(val) => setNewTaskEnvironment(val)}
            options={[
              { id: "none", label: "None" },
              ...masterData.filter((d) => d.type === "environment"),
            ]}
            type="environment"
            masterData={masterData}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Figma URL
          </label>
          <Input
            type="url"
            value={newTaskFigmaUrl}
            onChange={(e: any) => setNewTaskFigmaUrl(e.target.value)}
            placeholder="https://figma.com/..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Acceptance Criteria
          </label>
          <textarea
            value={newTaskAcceptanceCriteria}
            onChange={(e: any) => setNewTaskAcceptanceCriteria(e.target.value)}
            placeholder="What are the conditions for completion?"
            className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Description
          </label>
          <textarea
            value={newTaskDescription}
            onChange={(e: any) => setNewTaskDescription(e.target.value)}
            placeholder="Add description..."
            className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Attachments
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
              Start Date
            </label>
            <Input
              type="date"
              value={newTaskStartDate}
              onChange={(e: any) => setNewTaskStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={newTaskEndDate}
              onChange={(e: any) => setNewTaskEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              Due Date
            </label>
            <Input
              type="date"
              value={newTaskDueDate}
              onChange={(e: any) => setNewTaskDueDate(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full justify-center"
        >
          Create Issue
        </Button>
      </div>
    </Modal>
  );
};
