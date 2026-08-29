import { useTranslation } from "react-i18next";
import React from "react";
import { Link as LinkIcon, Paperclip as AttachmentIcon, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { Button } from "./TaskDetailPrimitives";
import { Task } from "../../../../types";

interface TaskAttachmentsSectionProps {
  task: Task;
  isEditable: boolean;
  isAddingLink: boolean;
  setIsAddingLinkLocal: (open: boolean) => void;
  newLinkTitle: string;
  setNewLinkTitle: (val: string) => void;
  newLinkUrl: string;
  setNewLinkUrl: (val: string) => void;
  handleAddLink: () => void;
  handleRemoveAttachment?: (id: string) => void;
  safeFormat: (date: any, formatStr: string) => string;
  wrapSubmit: (key: string, fn: () => Promise<void> | void) => () => Promise<void>;
  isSubmitting: Record<string, boolean>;
}

export const TaskAttachmentsSection: React.FC<TaskAttachmentsSectionProps> = ({
  task,
  isEditable,
  isAddingLink,
  setIsAddingLinkLocal,
  newLinkTitle,
  setNewLinkTitle,
  newLinkUrl,
  setNewLinkUrl,
  handleAddLink,
  handleRemoveAttachment,
  safeFormat,
  wrapSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 pt-4 border-t border-border-faint">
      <div className="flex items-center justify-between">
        <h4 className="text-xs sm:text-[10px] font-normal uppercase tracking-widest text-content-subtle">
          {t("attachments.resources")}
        </h4>
        {isEditable && (
          <div className="flex gap-4">
            <button
              onClick={() => setIsAddingLinkLocal(!isAddingLink)}
              className="text-xs sm:text-[10px] font-medium text-indigo-600 hover:underline"
            >
              {t("issues.addLink")}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {task.attachments?.map((att, attIdx) => (
          <div
            key={att.id ? `${att.id}-${attIdx}` : `att-${attIdx}`}
            className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-sunken border border-border-faint rounded-xl group transition-all shadow-soft"
          >
            <a
              href={att.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center gap-3 min-w-0 pointer-events-auto"
            >
              <div
                className={cn(
                  "p-2 rounded-xl shrink-0",
                  att.type === "link"
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}
              >
                {att.type === "link" ? (
                  <LinkIcon className="w-3.5 h-3.5" />
                ) : (
                  <AttachmentIcon className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-content truncate tracking-tight hover:underline">
                  {att.name}
                </p>
                <p className="text-xs sm:text-[11px] sm:text-[9px] font-normal text-content-subtle uppercase tracking-widest">
                  {att.type} • {safeFormat(att.createdAt, "MMM d")}
                  {att.uploadedByName && ` • Uploaded by ${att.uploadedByName}`}
                </p>
              </div>
            </a>
            {isEditable && (
              <button
                onClick={() => handleRemoveAttachment?.(att.id)}
                className="p-1.5 text-content-subtle hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                title={t("attachments.delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {task.attachments?.length === 0 && !isAddingLink && (
          <div className="py-4 text-center opacity-20 italic text-xs sm:text-[10px] uppercase font-normal tracking-widest">
            {t("attachments.noResources")}
          </div>
        )}
      </div>

      {isAddingLink && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/30 space-y-3"
        >
          <input
            placeholder={t("attachments.resourceTitle")}
            className="w-full text-xs font-medium border-border-subtle rounded-xl bg-surface p-2 shadow-soft"
            value={newLinkTitle}
            onChange={(e) => setNewLinkTitle(e.target.value)}
          />
          <input
            placeholder={t("attachments.urlPlaceholder")}
            className="w-full text-xs font-medium border-border-subtle rounded-xl bg-surface p-2 shadow-soft"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setIsAddingLinkLocal(false)}>
              {t("attachments.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={wrapSubmit("addLink", () => {
                handleAddLink();
                setIsAddingLinkLocal(false);
              })}
              disabled={isSubmitting["addLink"] || !newLinkTitle || !newLinkUrl}
            >
              {t("attachments.saveLink")}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
