import { useTranslation } from "react-i18next";
import React from "react";
import {
  Sparkles,
  Layout,
  Link as LinkIcon,
  Paperclip as AttachmentIcon,
  MessageSquare,
  History,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { UserAvatar } from "../../../../components/ui/UserAvatar";
import { Button, Textarea } from "./TaskDetailPrimitives";
import { UserProfile, ActivityLog } from "../../../../types";

interface TaskCommentsSectionProps {
  comments: any[];
  filteredLogs: ActivityLog[];
  activeTab: "comments" | "history" | "activity";
  setActiveTab: (tab: "comments" | "history" | "activity") => void;
  user: any;
  projectMembers: UserProfile[];
  newCommentText: string;
  handleCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleAddComment: () => void;
  mentionState: { active: boolean; query: string };
  handleSelectMention: (username: string) => void;
  wrapSubmit: (key: string, fn: () => Promise<void> | void) => () => Promise<void>;
  isSubmitting: Record<string, boolean>;
  isLoggedIn: boolean;
  safeFormat: (date: any, formatStr: string, fallback?: string) => string;
}

export const TaskCommentsSection: React.FC<TaskCommentsSectionProps> = ({
  comments,
  filteredLogs,
  activeTab,
  setActiveTab,
  user,
  projectMembers,
  newCommentText,
  handleCommentChange,
  handleAddComment,
  mentionState,
  handleSelectMention,
  wrapSubmit,
  isSubmitting,
  isLoggedIn,
  safeFormat,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 pt-6 border-t border-border-faint">
      <div className="flex items-center gap-6 border-b border-border-faint">
        <button
          className={cn(
            "pb-4 text-xs font-normal uppercase tracking-widest transition-all relative",
            activeTab === "comments"
              ? "text-indigo-600"
              : "text-content-subtle hover:text-content-secondary"
          )}
          onClick={() => setActiveTab("comments")}
        >
          {t("comments.tabComments")} {comments.length > 0 && `(${comments.length})`}
          {activeTab === "comments" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full"
            />
          )}
        </button>
        <button
          className={cn(
            "pb-4 text-xs font-normal uppercase tracking-widest transition-all relative",
            activeTab === "history"
              ? "text-indigo-600"
              : "text-content-subtle hover:text-content-secondary"
          )}
          onClick={() => setActiveTab("history")}
        >
          {t("comments.tabHistory")} {filteredLogs.length > 0 && `(${filteredLogs.length})`}
          {activeTab === "history" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full"
            />
          )}
        </button>
      </div>

      {activeTab === "comments" && (
        <div className="space-y-8">
          {/* Add Comment */}
          <div className="flex gap-4 p-2">
            <UserAvatar
              uid={user?.uid || ""}
              members={projectMembers}
              className="w-9 h-9 border-2 border-surface shadow-md shrink-0"
            />
            <div className="flex-1 relative group">
              <div className="border border-border-subtle rounded-xl bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/30 transition-all shadow-soft">
                <div className="flex items-center gap-1 p-1.5 border-b border-border-faint bg-surface-sunken/50 text-content-muted overflow-x-auto custom-scrollbar">
                  <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-surface-strong rounded text-xs sm:text-[11px] font-normal text-content-secondary transition-colors shrink-0">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    {t("comments.improveWriting")}
                  </button>
                  <div className="w-px h-4 bg-surface-strong mx-1 shrink-0" />
                  <button
                    className="p-1 hover:bg-surface-strong rounded text-content-secondary shrink-0"
                    title={t("comments.textFormat")}
                  >
                    <span className="text-xs font-normal leading-none px-0.5 border border-border-subtle rounded font-serif">
                      Tt
                    </span>
                  </button>
                  <button
                    className="p-1 hover:bg-surface-strong rounded font-medium text-content-secondary shrink-0 text-sm leading-none"
                    title={t("comments.bold")}
                  >
                    B
                  </button>
                  <button
                    className="p-1 hover:bg-surface-strong rounded italic text-content-secondary shrink-0 text-sm leading-none"
                    title={t("comments.italic")}
                  >
                    I
                  </button>
                  <button
                    className="p-1 hover:bg-surface-strong rounded text-content-secondary shrink-0"
                    title={t("comments.list")}
                  >
                    <Layout className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-surface-strong mx-1 shrink-0" />
                  <button className="p-1 hover:bg-surface-strong rounded shrink-0">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 hover:bg-surface-strong rounded shrink-0">
                    <AttachmentIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Textarea
                  value={newCommentText}
                  onChange={handleCommentChange}
                  placeholder={t("comments.editorPlaceholder")}
                  className="border-none shadow-none focus:ring-0 !ring-0 !outline-none p-4 resize-none bg-surface text-[13px] font-normal leading-relaxed min-h-[100px] w-full"
                />
              </div>

              {mentionState.active && (
                <div className="absolute z-50 w-72 bg-surface rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-border-subtle overflow-hidden transform bottom-[110%] left-0 animate-dropdown">
                  <div className="p-3 bg-surface-sunken border-b border-border-faint text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest">
                    {t("comments.suggestedPeople")}
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {projectMembers
                      .filter(
                        (m) =>
                          m?.username &&
                          m?.username.toLowerCase().includes(mentionState.query.toLowerCase())
                      )
                      .map((member) => (
                        <button
                          key={member.uid}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-500/10 flex items-center gap-3 focus:outline-none focus:bg-indigo-500/10 transition-all font-medium text-content-secondary"
                          onClick={() => handleSelectMention(member?.username ?? "")}
                        >
                          <UserAvatar
                            uid={member.uid}
                            members={projectMembers}
                            className="w-7 h-7"
                          />
                          <div>
                            <p className="text-[13px] font-medium text-content leading-none">
                              {member?.displayName}
                            </p>
                            <p className="text-xs sm:text-[11px] text-content-subtle mt-0.5">
                              @{member?.username}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-3">
                <Button
                  size="sm"
                  onClick={wrapSubmit("addComment", handleAddComment)}
                  disabled={isSubmitting["addComment"] || !newCommentText.trim() || !isLoggedIn}
                  className="shadow-soft-lg shadow-indigo-500/20 px-6 font-normal uppercase tracking-widest text-xs sm:text-[10px]"
                >
                  {t("comments.save")}
                </Button>
              </div>
            </div>
          </div>

          {/* Comment List */}
          <div className="space-y-4">
            {comments.map((comment, i) => {
              const author = (projectMembers || []).find((m) => m.uid === comment.authorId);
              return (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={comment.id ? `${comment.id}-${i}` : `comm-${i}`}
                  className="flex gap-3 group"
                >
                  <UserAvatar
                    uid={comment.authorId}
                    members={projectMembers}
                    className="w-8 h-8 border border-surface shadow-2xs shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-content-strong tracking-tight">
                        {author?.displayName || "Unknown User"}
                      </span>
                      <div className="w-1 h-1 bg-surface-marker rounded-full" />
                      <span className="text-xs sm:text-[10px] font-medium text-content-subtle">
                        {safeFormat(comment.createdAt, "MMM d, h:mm a", "Just now")}
                      </span>
                    </div>
                    <div className="text-xs text-content-body bg-surface-sunken/70 p-3 rounded-lg border border-border-subtle/60 leading-relaxed font-normal">
                      {comment.text?.split(/(@\w+)/g).map((part: string, idx: number) =>
                        part.startsWith("@") ? (
                          <span
                            key={idx}
                            className="text-indigo-600 font-medium bg-indigo-500/10 px-1 rounded shadow-2xs border border-indigo-500/30"
                          >
                            {part}
                          </span>
                        ) : (
                          part
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {comments.length === 0 && (
              <div className="py-6 px-4 text-center space-y-1.5 bg-surface-sunken/50 rounded-lg border border-dashed border-border-subtle/80">
                <MessageSquare className="w-6 h-6 mx-auto text-content-subtle" />
                <p className="text-xs font-medium text-content-subtle">
                  {t("comments.noComments")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {filteredLogs.map((log, i) => {
            const actor = (projectMembers || []).find((m) => m?.uid === log.userId) || {
              displayName: "System",
            };
            return (
              <div
                key={log.id ? `${log.id}-${i}` : `log-${i}`}
                className="flex gap-3 p-2.5 hover:bg-surface-sunken rounded-lg transition-all border border-transparent hover:border-border-subtle/60 group"
              >
                <div className="relative">
                  <UserAvatar
                    uid={log.userId}
                    members={projectMembers}
                    className="w-7 h-7 shrink-0 shadow-2xs border border-surface relative z-10"
                  />
                  {i < filteredLogs.length - 1 && (
                    <div className="absolute top-7 left-1/2 -content-x-1/2 w-0.5 h-full bg-surface-strong/60 z-0" />
                  )}
                </div>
                <div className="space-y-0.5 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-content-strong">
                      {actor?.displayName}
                    </span>
                    <span className="text-xs sm:text-[10px] font-normal text-content-subtle bg-surface border border-border-subtle/60 px-1.5 py-0.2 rounded uppercase tracking-tight">
                      {safeFormat(log.createdAt, "MMM d, HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs text-content-secondary font-normal leading-relaxed group-hover:text-content transition-colors">
                    {log.details || log.action}
                  </p>
                </div>
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="py-6 px-4 text-center space-y-1.5 bg-surface-sunken/50 rounded-lg border border-dashed border-border-subtle/80">
              <History className="w-6 h-6 mx-auto text-content-subtle" />
              <p className="text-xs font-medium text-content-subtle">{t("comments.noActivity")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
