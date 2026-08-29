import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Link2 as Link2Icon,
  ListTodo,
  Figma,
  ExternalLink,
  AlertTriangle,
  Clock,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { cn, ensureDate } from "../../lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { DescriptionEditor } from "../../components/DescriptionEditor";
import { TaskDetailModalProps } from "./types";
import { Task } from "../../types";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import {
  Button,
  UncontrolledInput,
  UncontrolledTextarea,
} from "./components/modal/TaskDetailPrimitives";
import { TaskAttachmentsSection } from "./components/modal/TaskAttachmentsSection";
import { TaskLinksSection } from "./components/modal/TaskLinksSection";
import { TaskSubtasksSection } from "./components/modal/TaskSubtasksSection";
import { TaskCommentsSection } from "./components/modal/TaskCommentsSection";
import { TaskDetailSidebar } from "./components/modal/TaskDetailSidebar";
import {
  isUserReporter as isUserReporterFn,
  canDeleteIssue as canDeleteIssueFn,
  canManageIssue as canManageIssueFn,
  canEditIssue as canEditIssueFn,
  IssuePermissionContext,
} from "./issuePermissions";

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isUpdatingTask,
  isOpen,
  onClose,
  task,
  tasks,
  projectMembers,
  masterData,
  userRole,
  user,
  currentUserProfile,
  sprints,
  updateTaskField,
  hasPermission,
  activityLogs,
  comments,
  newCommentText,
  setNewCommentText,
  handleAddComment,
  handleRemoveAttachment,
  isLoggedIn,
  handleQuickAddSubtask,
  mentionState,
  handleSelectMention,
  handleCommentChange,
  handleAddLinkedTask,
  handleRemoveLinkedTask,
  taskLinkTargetId,
  setTaskLinkTargetId,
  taskLinkRelation,
  setTaskLinkRelation,
  toggleBlockedStatus,
  handleSuggestStoryPoints,
  handleAddLink,
  newLinkTitle,
  setNewLinkTitle,
  newLinkUrl,
  setNewLinkUrl,
  deleteTask,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"comments" | "history" | "activity">("comments");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingAcceptanceCriteria, setIsEditingAcceptanceCriteria] = useState(false);

  useEffect(() => {
    setIsEditingDescription(false);
    setIsEditingAcceptanceCriteria(false);
  }, [task?.id]);

  const [isAddingLink, setIsAddingLinkLocal] = useState(false);
  const [isAddingTaskLinkLocal, setIsAddingTaskLinkLocal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const wrapSubmit = (key: string, fn: () => Promise<void> | void) => async () => {
    setIsSubmitting((prev) => ({ ...prev, [key]: true }));
    try {
      await fn();
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Item #200/#201 — aturan izin dipindah ke modul murni terkunci test
  // `issuePermissions.ts` (sama dengan `IssueListView.tsx`) — JANGAN tulis
  // ulang logikanya di sini. Riwayat lengkap ada di komentar modul itu.
  const permCtx: IssuePermissionContext = { userRole, currentUserProfile, user, hasPermission };
  const isUserReporter = (issue: Task) => isUserReporterFn(issue, permCtx);
  const isDirectOwner = task ? isUserReporter(task) : false;
  const isEditable = task ? canEditIssueFn(task, permCtx) : false;
  const canManage = task ? canManageIssueFn(task, permCtx) : false;
  const canDelete = task ? canDeleteIssueFn(task, permCtx) : false;
  const blockMember = !isEditable;
  const isProjectMember = false;
  const isReporter = isDirectOwner;

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: "danger" | "warning" | "info";
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "danger",
    onConfirm: () => {},
  });

  if (!isOpen || !task) return null;

  const safeFormat = (date: any, formatStr: string, fallback = "--") => {
    try {
      if (!date) return fallback;
      return format(ensureDate(date), formatStr);
    } catch {
      return fallback;
    }
  };

  const filteredLogs = activityLogs
    .filter(
      (log) =>
        log.action?.includes(task.key) ||
        log.action?.includes(task.id) ||
        log.details?.includes(task.id) ||
        (task.key && log.details?.includes(task.key))
    )
    .sort(
      (a, b) =>
        (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0)
    );

  return (
    <>
      <div className="w-full h-full flex flex-col relative z-10">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full">
            {/* Left Column (Main Info) */}
            <div className="lg:col-span-8 p-5 md:p-6 lg:p-7 space-y-6 border-r border-border-subtle/80 bg-surface">
              {(() => {
                const parentEpic = task?.parentId
                  ? (tasks || []).find((t) => t.id === task.parentId)
                  : null;
                const isEpicExceeded =
                  parentEpic &&
                  ((parentEpic.startDate &&
                    task.startDate &&
                    new Date(task.startDate).getTime() <
                      new Date(parentEpic.startDate).getTime()) ||
                    (parentEpic.endDate &&
                      task.startDate &&
                      new Date(task.startDate).getTime() >
                        new Date(parentEpic.endDate).getTime()) ||
                    (parentEpic.startDate &&
                      task.endDate &&
                      new Date(task.endDate).getTime() <
                        new Date(parentEpic.startDate).getTime()) ||
                    (parentEpic.endDate &&
                      task.endDate &&
                      new Date(task.endDate).getTime() > new Date(parentEpic.endDate).getTime()));
                if (!isEpicExceeded) return null;
                return (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 shadow-2xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 space-y-0.5">
                      <p className="font-normal uppercase tracking-wider text-amber-800 text-xs sm:text-[11px]">
                        {t("issueDetail.epicTimelineWarning")}
                      </p>
                      <p className="font-normal text-content-body">
                        {t("issueDetail.theTaskDateRangeFalls")}
                        {parentEpic?.title}" (
                        {parentEpic?.startDate
                          ? format(ensureDate(parentEpic.startDate), "yyyy-MM-dd")
                          : "∞"}{" "}
                        -{" "}
                        {parentEpic?.endDate
                          ? format(ensureDate(parentEpic.endDate), "yyyy-MM-dd")
                          : "∞"}
                        ). Penyimpanan akan ditolak oleh server jika melewati batas Epic.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Title & Key Header */}
              <div
                className={cn(
                  "space-y-3 transition-opacity",
                  isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none"
                )}
              >
                <UncontrolledInput
                  className="text-2xl font-medium text-content-strong bg-transparent hover:bg-surface-sunken focus:bg-surface border border-transparent hover:border-border-subtle/80 focus:border-indigo-400 rounded-lg px-3 py-1.5 w-full transition-all outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:text-content-subtle tracking-tight"
                  placeholder={t("issueDetail.issueTitle")}
                  initialValue={task.title || (task as any).summary || (task as any).name || ""}
                  onSave={(val: string) => updateTaskField(task.id, "title", val)}
                  onAutoSave={(val: string) => updateTaskField(task.id, "title", val)}
                  disabled={!isEditable}
                />

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1 border-b border-border-faint pb-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs font-medium px-3 py-1 rounded-md border-border-subtle/80 bg-surface hover:bg-surface-sunken text-content-body shadow-2xs"
                    onClick={wrapSubmit("addSubtask", () =>
                      handleQuickAddSubtask(task.id, task.type === "epic" ? "task" : "subtask")
                    )}
                    disabled={isSubmitting["addSubtask"]}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                    {t("issueDetail.addChild")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs font-medium px-3 py-1 rounded-md border-border-subtle/80 bg-surface hover:bg-surface-sunken text-content-body shadow-2xs"
                    onClick={() => setIsAddingTaskLinkLocal(!isAddingTaskLinkLocal)}
                  >
                    <Link2Icon className="w-3.5 h-3.5 mr-1 text-content-subtle" />
                    {t("issueDetail.linkIssue")}
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs sm:text-[11px] font-medium text-content-muted bg-surface-sunken/80 px-2.5 py-1 rounded-md border border-border-subtle/60">
                      <Clock className="w-3.5 h-3.5 text-content-subtle" />
                      {t("rakit.updatedPrefix")}{" "}
                      {task.updatedAt
                        ? formatDistanceToNow(ensureDate(task.updatedAt), { addSuffix: true })
                        : "Never"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="bg-surface border border-border-subtle/80 rounded-lg p-4 md:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-normal text-content-body uppercase tracking-wider flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-indigo-500" />
                    {t("issueDetail.description")}
                  </h3>
                </div>

                <div
                  className={cn(
                    "group relative transition-opacity",
                    isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none"
                  )}
                >
                  {isEditingDescription ? (
                    <DescriptionEditor
                      task={task}
                      onSave={(value) => {
                        updateTaskField(task.id, "description", value);
                        setIsEditingDescription(false);
                      }}
                      onAutoSave={(value) => updateTaskField(task.id, "description", value)}
                      onCancel={() => setIsEditingDescription(false)}
                    />
                  ) : (
                    <div
                      className="min-h-[110px] border border-border-subtle/70 hover:border-indigo-500/30 rounded-md p-4 bg-surface-sunken/30 hover:bg-surface transition-all cursor-text shadow-2xs"
                      onClick={() => isEditable && setIsEditingDescription(true)}
                    >
                      {task.description ? (
                        <div className="markdown-body prose-sm max-w-none text-content-body leading-relaxed font-normal">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {task.description}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-content-subtle text-xs italic font-normal">
                          {t("issueDetail.noDescription")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Acceptance Criteria Card */}
              <div className="bg-surface border border-border-subtle/80 rounded-lg p-4 md:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-normal text-content-body uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {t("issueDetail.acceptanceCriteria")}
                  </h3>
                </div>

                <div
                  className={cn(
                    "group relative",
                    isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none"
                  )}
                >
                  {task.acceptanceCriteria !== undefined && isEditingAcceptanceCriteria ? (
                    <div className="border border-emerald-500/80 rounded-md overflow-hidden bg-surface shadow-soft ring-2 ring-emerald-500/10 transition-all">
                      <UncontrolledTextarea
                        initialValue={task.acceptanceCriteria || ""}
                        onSave={(val: string) => {
                          updateTaskField(task.id, "acceptanceCriteria", val);
                          setIsEditingAcceptanceCriteria(false);
                        }}
                        onAutoSave={(val: string) =>
                          updateTaskField(task.id, "acceptanceCriteria", val)
                        }
                        onCancel={() => setIsEditingAcceptanceCriteria(false)}
                        placeholder={t("issueDetail.acceptancePlaceholder")}
                        rows={4}
                        className="w-full p-4 text-xs focus:outline-none resize-y leading-relaxed font-normal text-content-body"
                      />
                      <div className="bg-surface-sunken border-t border-border-faint px-3 py-2 flex justify-between items-center text-xs sm:text-[11px] font-medium text-content-subtle">
                        <span>{t("issueDetail.markdownHint")}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="min-h-[90px] border border-border-subtle/70 hover:border-emerald-500/30 rounded-md p-4 bg-surface-sunken/30 hover:bg-surface transition-all cursor-text shadow-2xs"
                      onClick={() => isEditable && setIsEditingAcceptanceCriteria(true)}
                    >
                      {task.acceptanceCriteria ? (
                        <div className="markdown-body prose-sm max-w-none text-content-body leading-relaxed font-normal text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {task.acceptanceCriteria}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-content-subtle text-xs italic font-normal">
                          {t("issueDetail.noAcceptance")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Figma Design Section */}
              {task.figmaUrl?.includes("figma.com") && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-normal text-content uppercase tracking-widest flex items-center gap-2">
                      <Figma className="w-4 h-4 text-purple-500" />
                      {t("issueDetail.designSpec")}
                    </h3>
                    <a
                      href={task.figmaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] leading-none font-medium text-purple-600 bg-purple-500/10 px-2 py-1 rounded-lg hover:bg-purple-500/15 transition-all flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t("issueDetail.openOriginal")}
                    </a>
                  </div>
                  <div className="rounded-lg border border-border-subtle overflow-hidden shadow-md h-[480px] bg-surface-muted relative group">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(task.figmaUrl)}`}
                      allowFullScreen
                      title={t("issueDetail.embedFigma")}
                      className="border-none"
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Section: Attachments */}
              <TaskAttachmentsSection
                task={task}
                isEditable={isEditable}
                isAddingLink={isAddingLink}
                setIsAddingLinkLocal={setIsAddingLinkLocal}
                newLinkTitle={newLinkTitle}
                setNewLinkTitle={setNewLinkTitle}
                newLinkUrl={newLinkUrl}
                setNewLinkUrl={setNewLinkUrl}
                handleAddLink={handleAddLink}
                handleRemoveAttachment={handleRemoveAttachment}
                safeFormat={safeFormat}
                wrapSubmit={wrapSubmit}
                isSubmitting={isSubmitting}
              />

              {/* Section: Linked Tasks */}
              <TaskLinksSection
                task={task}
                tasks={tasks || []}
                masterData={masterData || []}
                isEditable={isEditable}
                isAddingTaskLinkLocal={isAddingTaskLinkLocal}
                setIsAddingTaskLinkLocal={setIsAddingTaskLinkLocal}
                taskLinkRelation={taskLinkRelation}
                setTaskLinkRelation={setTaskLinkRelation}
                taskLinkTargetId={taskLinkTargetId}
                setTaskLinkTargetId={setTaskLinkTargetId}
                handleAddLinkedTask={handleAddLinkedTask}
                handleRemoveLinkedTask={handleRemoveLinkedTask}
                wrapSubmit={wrapSubmit}
                isSubmitting={isSubmitting}
              />

              {/* Subtasks Section */}
              <TaskSubtasksSection
                task={task}
                tasks={tasks || []}
                isEditable={isEditable}
                isUpdatingTask={isUpdatingTask}
                updateTaskField={updateTaskField}
                deleteTask={deleteTask}
                projectMembers={projectMembers || []}
                masterData={masterData || []}
              />

              {/* Tabs Section (Comments / History) */}
              <TaskCommentsSection
                comments={comments || []}
                filteredLogs={filteredLogs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                user={user}
                projectMembers={projectMembers || []}
                newCommentText={newCommentText}
                handleCommentChange={handleCommentChange}
                handleAddComment={handleAddComment}
                mentionState={mentionState}
                handleSelectMention={handleSelectMention}
                wrapSubmit={wrapSubmit}
                isSubmitting={isSubmitting}
                isLoggedIn={isLoggedIn}
                safeFormat={safeFormat}
              />
            </div>

            {/* Right Column (Metadata/Sidebar) */}
            <TaskDetailSidebar
              task={task}
              masterData={masterData || []}
              projectMembers={projectMembers || []}
              sprints={sprints || []}
              isEditable={isEditable}
              blockMember={blockMember}
              isProjectMember={isProjectMember}
              isReporter={isReporter}
              canManage={canManage}
              canDelete={canDelete}
              isUpdatingTask={isUpdatingTask}
              updateTaskField={updateTaskField}
              toggleBlockedStatus={toggleBlockedStatus}
              handleSuggestStoryPoints={handleSuggestStoryPoints}
              deleteTask={deleteTask}
              onClose={onClose}
              safeFormat={safeFormat}
            />
          </div>
        </div>
      </div>

      {/* Discard Unsaved Changes Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        title={t("issueDetail.discardChanges")}
        message={t("issueDetail.discardChangesMessage")}
        variant="warning"
        confirmText={t("issueDetail.yesDiscard")}
        cancelText={t("common.cancel")}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          setIsEditingDescription(false);
          setIsEditingAcceptanceCriteria(false);
          if (setNewCommentText) setNewCommentText("");
          onClose();
        }}
      />

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModalState.title}
        message={confirmModalState.message}
        variant={confirmModalState.variant || "danger"}
        confirmText={confirmModalState.confirmText || t("issueDetail.delete")}
        cancelText={t("common.cancel")}
        onConfirm={() => {
          confirmModalState.onConfirm();
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </>
  );
};
