import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  Sparkles,
  Layout,
  Link as LinkIcon,
  Paperclip as AttachmentIcon,
  MessageSquare,
  History,
  Reply,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { UserAvatar } from "../../../../components/ui/UserAvatar";
import { Button, Textarea } from "./TaskDetailPrimitives";
import { UserProfile, ActivityLog } from "../../../../types";
import {
  formatActivityDetailsUntukTampilan,
  parseActivityUntukTampilan,
} from "../../lib/formatActivityHistory";

interface TaskCommentsSectionProps {
  comments: any[];
  filteredLogs: ActivityLog[];
  activeTab: "comments" | "history" | "activity";
  setActiveTab: (tab: "comments" | "history" | "activity") => void;
  user: any;
  projectMembers: UserProfile[];
  newCommentText: string;
  handleCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleAddComment: (customText?: string, parentId?: string) => Promise<void> | void;
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
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<Record<string, boolean>>({});

  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const handleOpenReply = (parentId: string, targetUsername?: string) => {
    setActiveReplyId(parentId);
    if (targetUsername) {
      setReplyTextMap((prev) => {
        const current = prev[parentId] || "";
        const tag = `@${targetUsername} `;
        return {
          ...prev,
          [parentId]: current.includes(tag.trim()) ? current : `${tag}${current}`,
        };
      });
    }
  };

  const handleSendReply = async (parentId: string) => {
    const text = (replyTextMap[parentId] || "").trim();
    if (!text) return;

    setIsSubmittingReply((prev) => ({ ...prev, [parentId]: true }));
    try {
      await handleAddComment(text, parentId);
      setReplyTextMap((prev) => ({ ...prev, [parentId]: "" }));
      setActiveReplyId(null);
    } finally {
      setIsSubmittingReply((prev) => ({ ...prev, [parentId]: false }));
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-border-faint">
      <div className="flex items-center gap-6 border-b border-border-faint">
        <button
          className={cn(
            "pb-4 text-xs font-normal uppercase tracking-normal transition-all relative",
            activeTab === "comments"
              ? "text-primary"
              : "text-content-subtle hover:text-content-secondary"
          )}
          onClick={() => setActiveTab("comments")}
        >
          {t("comments.tabComments")} {comments.length > 0 && `(${comments.length})`}
          {activeTab === "comments" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"
            />
          )}
        </button>
        <button
          className={cn(
            "pb-4 text-xs font-normal uppercase tracking-normal transition-all relative",
            activeTab === "history"
              ? "text-primary"
              : "text-content-subtle hover:text-content-secondary"
          )}
          onClick={() => setActiveTab("history")}
        >
          {t("comments.tabHistory")} {filteredLogs.length > 0 && `(${filteredLogs.length})`}
          {activeTab === "history" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"
            />
          )}
        </button>
      </div>

      {activeTab === "comments" && (
        <div className="space-y-6">
          {/* New Comment Box (Top Level) */}
          <div className="flex gap-3">
            <UserAvatar
              user={user}
              uid={user?.uid || user?.id}
              className="w-8 h-8 border border-surface shadow-2xs shrink-0"
            />
            <div className="flex-1 relative">
              <div className="border border-border-subtle rounded-xl bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs overflow-hidden">
                <div className="flex items-center gap-1 p-2 border-b border-border-faint bg-surface-sunken/40 overflow-x-auto">
                  <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-surface-strong rounded text-xs sm:text-[11px] font-normal text-content-secondary transition-colors shrink-0">
                    <Sparkles className="w-3 h-3 text-primary" />
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
                  className="border-none shadow-none focus:ring-0 !ring-0 !outline-none p-4 resize-none bg-surface text-[13px] font-normal leading-relaxed min-h-[90px] w-full"
                />
              </div>

              {mentionState.active && (
                <div className="absolute z-50 w-72 bg-surface rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-border-subtle overflow-hidden transform bottom-[110%] left-0 animate-dropdown">
                  <div className="p-3 bg-surface-sunken border-b border-border-faint text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-normal">
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
                          className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center gap-3 focus:outline-none focus:bg-primary/10 transition-all font-medium text-content-secondary"
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
                  onClick={wrapSubmit("addComment", () => handleAddComment())}
                  disabled={isSubmitting["addComment"] || !newCommentText.trim() || !isLoggedIn}
                  className="shadow-soft-lg shadow-primary/20 px-6 font-normal uppercase tracking-normal text-xs sm:text-[10px]"
                >
                  {t("comments.save")}
                </Button>
              </div>
            </div>
          </div>

          {/* Facebook-style Threaded Comment List */}
          <div className="space-y-5">
            {rootComments.map((root, i) => {
              const rootAuthor = (projectMembers || []).find(
                (m) => (m.uid && m.uid === root.authorId) || (m.id && m.id === root.authorId)
              );
              const rootDisplayName =
                rootAuthor?.displayName || rootAuthor?.name || root.authorName || "Pengguna";
              const rootAvatar =
                rootAuthor?.photoURL || (rootAuthor as any)?.avatar_url || root.authorAvatar;
              const rootUsername = rootAuthor?.username || root.authorUsername || "";
              const replies = getReplies(root.id);

              return (
                <div key={root.id ? `${root.id}-${i}` : `comm-${i}`} className="space-y-2">
                  {/* Root Comment Row */}
                  <div className="flex gap-3 group items-start">
                    <UserAvatar
                      name={rootDisplayName}
                      src={rootAvatar}
                      uid={root.authorId}
                      members={projectMembers}
                      className="w-8 h-8 border border-surface shadow-2xs shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      {/* Comment Bubble */}
                      <div className="inline-block max-w-full bg-surface-sunken/75 px-3.5 py-2.5 rounded-2xl border border-border-subtle/50">
                        <div className="font-semibold text-xs text-content-strong leading-tight">
                          {rootDisplayName}
                        </div>
                        <div className="text-xs text-content-body mt-1 leading-relaxed break-words whitespace-pre-wrap">
                          {(root.text || root.content || "")
                            .split(/(@\w+)/g)
                            .map((part: string, idx: number) =>
                              part.startsWith("@") ? (
                                <span
                                  key={idx}
                                  className="text-primary font-medium bg-primary/10 px-1 rounded shadow-2xs border border-primary/20"
                                >
                                  {part}
                                </span>
                              ) : (
                                part
                              )
                            )}
                        </div>
                      </div>

                      {/* Comment Action Footer (Facebook Style: Reply · Timestamp) */}
                      <div className="flex items-center gap-3 px-2 pt-1 text-[11px] text-content-subtle font-medium">
                        <button
                          type="button"
                          onClick={() => handleOpenReply(root.id, rootUsername)}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          Balas
                        </button>
                        <span>·</span>
                        <span className="text-content-subtle/80">
                          {safeFormat(root.createdAt, "MMM d, h:mm a", "Baru saja")}
                        </span>
                      </div>

                      {/* Nested Replies Thread (Indented with connector border) */}
                      {(replies.length > 0 || activeReplyId === root.id) && (
                        <div className="mt-2.5 ml-3 pl-3 border-l-2 border-border-subtle/60 space-y-3">
                          {/* List of Replies */}
                          {replies.map((reply, rIdx) => {
                            const replyAuthor = (projectMembers || []).find(
                              (m) =>
                                (m.uid && m.uid === reply.authorId) ||
                                (m.id && m.id === reply.authorId)
                            );
                            const replyDisplayName =
                              replyAuthor?.displayName ||
                              replyAuthor?.name ||
                              reply.authorName ||
                              "Pengguna";
                            const replyAvatar =
                              replyAuthor?.photoURL ||
                              (replyAuthor as any)?.avatar_url ||
                              reply.authorAvatar;
                            const replyUsername =
                              replyAuthor?.username || reply.authorUsername || "";

                            return (
                              <div
                                key={reply.id ? `${reply.id}-${rIdx}` : `reply-${rIdx}`}
                                className="flex gap-2.5 items-start group/reply"
                              >
                                <UserAvatar
                                  name={replyDisplayName}
                                  src={replyAvatar}
                                  uid={reply.authorId}
                                  members={projectMembers}
                                  className="w-6 h-6 border border-surface shadow-2xs shrink-0 mt-0.5 text-[10px]"
                                />
                                <div className="flex-1 min-w-0">
                                  {/* Reply Bubble */}
                                  <div className="inline-block max-w-full bg-surface-sunken/60 px-3 py-2 rounded-2xl border border-border-subtle/40">
                                    <div className="font-semibold text-xs text-content-strong leading-tight">
                                      {replyDisplayName}
                                    </div>
                                    <div className="text-xs text-content-body mt-1 leading-relaxed break-words whitespace-pre-wrap">
                                      {(reply.text || reply.content || "")
                                        .split(/(@\w+)/g)
                                        .map((part: string, pIdx: number) =>
                                          part.startsWith("@") ? (
                                            <span
                                              key={pIdx}
                                              className="text-primary font-medium bg-primary/10 px-1 rounded shadow-2xs border border-primary/20"
                                            >
                                              {part}
                                            </span>
                                          ) : (
                                            part
                                          )
                                        )}
                                    </div>
                                  </div>

                                  {/* Reply Actions */}
                                  <div className="flex items-center gap-3 px-2 pt-1 text-[11px] text-content-subtle font-medium">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReply(root.id, replyUsername)}
                                      className="hover:text-primary transition-colors cursor-pointer"
                                    >
                                      Balas
                                    </button>
                                    <span>·</span>
                                    <span className="text-content-subtle/80">
                                      {safeFormat(reply.createdAt, "MMM d, h:mm a", "Baru saja")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Facebook-style Inline Reply Input Box */}
                          {activeReplyId === root.id && (
                            <div className="flex gap-2.5 items-start pt-1">
                              <UserAvatar
                                user={user}
                                uid={user?.uid || user?.id}
                                className="w-6 h-6 border border-surface shadow-2xs shrink-0 mt-1 text-[10px]"
                              />
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="border border-border-subtle rounded-xl bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-2xs overflow-hidden">
                                  <Textarea
                                    value={replyTextMap[root.id] || ""}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                      setReplyTextMap((prev) => ({
                                        ...prev,
                                        [root.id]: e.target.value,
                                      }))
                                    }
                                    placeholder={`Tulis balasan untuk @${rootUsername || rootDisplayName}...`}
                                    className="border-none shadow-none focus:ring-0 !ring-0 !outline-none px-3 py-2 resize-none bg-surface text-xs leading-relaxed min-h-[60px] w-full"
                                    autoFocus
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveReplyId(null)}
                                    className="text-xs text-content-subtle hover:text-content-body px-2.5 py-1 rounded transition-colors"
                                  >
                                    Batal
                                  </button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendReply(root.id)}
                                    disabled={
                                      isSubmittingReply[root.id] ||
                                      !(replyTextMap[root.id] || "").trim() ||
                                      !isLoggedIn
                                    }
                                    className="text-xs px-3.5 py-1 h-7"
                                  >
                                    {isSubmittingReply[root.id] ? "Mengirim..." : "Balas"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {rootComments.length === 0 && (
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
                  <div className="text-xs text-content-secondary font-normal leading-relaxed group-hover:text-content transition-colors">
                    {(() => {
                      const tampilan = parseActivityUntukTampilan(
                        log.details || log.action,
                        projectMembers || []
                      );
                      if (tampilan.kind === "diff") {
                        return (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-normal uppercase tracking-normal text-content-subtle">
                              {tampilan.label}
                            </span>
                            <p className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-content-muted line-through decoration-content-subtle/60">
                                {tampilan.from}
                              </span>
                              <span className="text-content-subtle" aria-hidden>
                                →
                              </span>
                              <span className="font-medium text-content-strong">{tampilan.to}</span>
                            </p>
                          </div>
                        );
                      }
                      return (
                        <p>
                          {formatActivityDetailsUntukTampilan(
                            log.details || log.action,
                            projectMembers || []
                          )}
                        </p>
                      );
                    })()}
                  </div>
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
