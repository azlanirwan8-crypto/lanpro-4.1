import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Video, Download, Eye, Edit2, Trash2 } from "lucide-react";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import type { Meeting, UserProfile } from "../../../types";

interface MeetingMobileCardViewProps {
  meetings: Meeting[];
  users: UserProfile[];
  projectMembers?: UserProfile[];
  onSelectMeeting: (meetingId: string) => void;
  onEditMeeting: (meeting: Meeting, e: React.MouseEvent) => void;
  onDeleteMeeting: (meeting: Meeting, e: React.MouseEvent) => void;
  onDownloadAttachment: (meetingId: string, fileName: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  isMeetingAuthor: (meeting: Meeting) => boolean;
  isAdmin: boolean;
}

export const MeetingMobileCardView: React.FC<MeetingMobileCardViewProps> = ({
  meetings,
  users,
  projectMembers = [],
  onSelectMeeting,
  onEditMeeting,
  onDeleteMeeting,
  onDownloadAttachment,
  canEdit,
  canDelete,
  isMeetingAuthor,
  isAdmin,
}) => {
  const { t } = useTranslation();

  const getUserName = (idOrUid?: string) => {
    if (!idOrUid) return t("meetings.unassigned");
    const allKnown = [...users, ...projectMembers];
    const u = allKnown.find(
      (user) =>
        user.id === idOrUid ||
        user.uid === idOrUid ||
        user.username === idOrUid ||
        user.email === idOrUid
    );
    return u?.displayName || u?.name || u?.username || idOrUid;
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      if (typeof date === "object" && typeof date.toDate === "function") {
        return date.toDate().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
      return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (meetings.length === 0) {
    return (
      <div className="p-8 text-center bg-surface border border-border-subtle/80 rounded-lg shadow-2xs">
        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-primary shadow-2xs">
          <Calendar className="w-6 h-6" />
        </div>
        <p className="font-medium text-content-strong text-sm">{t("meetings.emptyStateTitle")}</p>
        <p className="text-xs text-content-subtle mt-1">{t("meetings.emptyStateSubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {meetings.map((meeting, index) => {
        const canModify = isMeetingAuthor(meeting) || isAdmin;
        const authorName = getUserName(meeting.authorId);
        const meetingId = meeting.id || String(index);

        return (
          <div
            key={meetingId}
            onClick={() => onSelectMeeting(meetingId)}
            className="p-4 bg-surface rounded-lg border border-border-subtle/80 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-3"
          >
            {/* Top row: Title & Action buttons */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-content-strong line-clamp-2 leading-snug">
                  {meeting.title}
                </h4>
                {meeting.description && (
                  <p className="text-xs text-content-muted line-clamp-2 mt-1 leading-relaxed">
                    {meeting.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onSelectMeeting(meetingId)}
                  aria-label={t("meetings.viewDetail") || "View Detail"}
                  className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-primary transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {canEdit && canModify && (
                  <button
                    type="button"
                    onClick={(e) => onEditMeeting(meeting, e)}
                    aria-label={t("meetings.editMeeting") || "Edit Meeting"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {canDelete && canModify && (
                  <button
                    type="button"
                    onClick={(e) => onDeleteMeeting(meeting, e)}
                    aria-label={t("meetings.deleteMeeting") || "Delete Meeting"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Date, Time & Meeting Link */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-content-subtle">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-sunken border border-border-subtle font-medium">
                <Calendar className="w-3 h-3 text-primary" />
                {formatDate(meeting.createdAt)}
              </span>

              {meeting.meetingLink && (
                <a
                  href={
                    meeting.meetingLink.startsWith("http")
                      ? meeting.meetingLink
                      : `https://${meeting.meetingLink}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-primary font-medium hover:underline"
                >
                  <Video className="w-3 h-3" />
                  {t("meetings.joinMeeting")}
                </a>
              )}

              {meeting.fileName && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (meeting.id) {
                      onDownloadAttachment(meeting.id, meeting.fileName || "attachment");
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 font-medium hover:underline cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  {meeting.fileName || t("meetings.attachment")}
                </button>
              )}
            </div>

            {/* Bottom row: Author info */}
            <div className="pt-2 border-t border-border-faint flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-content-subtle min-w-0">
                <UserAvatar
                  uid={meeting.authorId}
                  members={[...users, ...projectMembers]}
                  name={authorName}
                  className="w-5 h-5 text-[10px]"
                />
                <span className="font-medium text-content truncate">{authorName}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
