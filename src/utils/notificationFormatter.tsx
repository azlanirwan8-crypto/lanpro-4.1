import i18n from "../i18n";
import React from "react";
import {
  UserPlus,
  ArrowRightLeft,
  MessageSquare,
  Clock,
  ShieldAlert,
  PlusCircle,
  Edit3,
  HelpCircle,
  FileText,
  Bug,
} from "lucide-react";

export interface ParsedNotification {
  icon: React.ReactNode;
  iconBgClass: string;
  badgeText: string;
  badgeClass: string;
  formattedTitle: React.ReactNode;
  formattedMessage: React.ReactNode;
  activityType:
    | "create"
    | "status"
    | "assignee"
    | "comment"
    | "update"
    | "deadline"
    | "blocked"
    | "general"
    | "bug_retest";
}

/**
 * Translates technical backend field names to clear, Indonesian human-readable terms.
 */
const translateFieldName = (field: string): string => {
  const mapping: { [key: string]: string } = {
    status: i18n.t("notif.nTaskStatus"),
    assigneeId: i18n.t("notif.nAssignee"),
    reporterId: i18n.t("notif.nReporter"),
    description: i18n.t("notif.nDescription"),
    deskripsi: i18n.t("notif.nDescription"),
    title: i18n.t("notif.nTaskTitle"),
    acceptanceCriteria: i18n.t("notif.nAcceptance"),
    dueDate: i18n.t("notif.nDueDate"),
    startDate: i18n.t("notif.nStartDate"),
    endDate: i18n.t("notif.nEndDate"),
    storyPoints: i18n.t("notif.nStoryPoints"),
    priority: i18n.t("notif.nPriority"),
    estimatedHours: i18n.t("notif.nEstHours"),
    loggedHours: i18n.t("notif.nLoggedHours"),
    release: i18n.t("notif.nRelease"),
    sprintId: "Sprint",
    projectRisk: i18n.t("notif.nProjectRisk"),
    labels: i18n.t("notif.nLabelTag"),
  };
  return mapping[field] || field;
};

/**
 * Renders status value with standard Jira/Linear color badges (Ultra Compact)
 */
const renderStatusBadge = (status: string) => {
  const s = status ? status.trim().toLowerCase() : "";
  let colorClass = "bg-surface-muted text-content-body border-border-subtle";

  if (s === "to do" || s === "backlog" || s === "none" || s === "unassigned") {
    colorClass = "bg-surface-muted text-content-secondary border-border-subtle/80";
  } else if (s === "in progress" || s === "dev" || s === "development" || s === "ready for dev") {
    colorClass = "bg-blue-500/10 text-blue-700 border-blue-500/30";
  } else if (s === "review" || s === "qa" || s === "testing" || s === "ready for qa") {
    colorClass = "bg-amber-500/10 text-amber-700 border-amber-500/30";
  } else if (s === "done" || s === "closed" || s === "resolved") {
    colorClass = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  } else if (s === "blocked") {
    colorClass = "bg-rose-500/10 text-rose-700 border-rose-500/30";
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0 rounded-full text-xs sm:text-[10px] font-medium border ${colorClass} mx-0.5`}
    >
      {status}
    </span>
  );
};

/**
 * Helper to strip UUID strings from text
 */
const stripUUIDs = (text: string): string => {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  return text.replace(uuidPattern, "").replace(/\s+/g, " ").trim();
};

/**
 * Main formatter function that parses raw backend payload and maps it into standard UI structure.
 */
export const formatNotification = (
  type: string | undefined,
  title: string | undefined,
  message: string | undefined
): ParsedNotification => {
  // Clean raw inputs
  const rawTitle = title || i18n.t("notif.nNewNotif");
  let rawMessage = message || "";

  // Clean up any UUIDs
  rawMessage = stripUUIDs(rawMessage);

  // Initialize output fields
  let icon = <HelpCircle className="w-4 h-4" />;
  let iconBgClass = "bg-surface-muted text-content-muted";
  let badgeText = i18n.t("notif.nNotifCap");
  let badgeClass = "bg-surface-sunken text-content-secondary border-border-subtle";
  let formattedTitleStr = rawTitle;
  let activityType: ParsedNotification["activityType"] = "general";

  // Determine Activity Type based on title, message, or type
  const lowerTitle = rawTitle.toLowerCase();
  const lowerMsg = rawMessage.toLowerCase();
  const lowerType = (type || "").toLowerCase();

  if (
    lowerType === "bug_retest" ||
    lowerType === "qa_retest" ||
    lowerTitle.includes("retest") ||
    lowerMsg.includes("retest")
  ) {
    activityType = "bug_retest";
  } else if (
    lowerType === "blocked" ||
    lowerTitle.includes("block") ||
    lowerMsg.includes("terblokir")
  ) {
    activityType = "blocked";
  } else if (
    lowerType === "deadline" ||
    lowerTitle.includes("deadline") ||
    lowerTitle.includes("tenggat") ||
    lowerMsg.includes("tempo")
  ) {
    activityType = "deadline";
  } else if (
    lowerTitle.includes("tugas baru") ||
    lowerTitle.includes("create_task") ||
    lowerMsg.includes("membuat tugas baru") ||
    lowerTitle.includes("ditambahkan")
  ) {
    activityType = "create";
  } else if (lowerTitle.includes("komentar") || lowerMsg.includes("mengomentari")) {
    activityType = "comment";
  } else if (lowerTitle.includes("status") || lowerMsg.includes("mengubah status")) {
    activityType = "status";
  } else if (lowerMsg.includes("menugaskan") || lowerMsg.includes("assigned")) {
    activityType = "assignee";
  } else if (
    lowerTitle.includes("update") ||
    lowerMsg.includes("memperbarui") ||
    lowerMsg.includes("update")
  ) {
    activityType = "update";
  }

  // Set visual properties depending on activity types
  switch (activityType) {
    case "bug_retest":
      icon = <Bug className="w-4 h-4 text-emerald-600" />;
      iconBgClass = "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600";
      badgeText = i18n.t("notif.nBugRetest");
      badgeClass = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
      formattedTitleStr = i18n.t("notif.nBugReady");
      break;
    case "create":
      icon = <PlusCircle className="w-4 h-4 text-emerald-600" />;
      iconBgClass = "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600";
      badgeText = i18n.t("notif.nNewTaskCap");
      badgeClass = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
      formattedTitleStr = i18n.t("notif.nTaskAdded");
      break;

    case "status":
      icon = <ArrowRightLeft className="w-4 h-4 text-indigo-600" />;
      iconBgClass = "bg-indigo-500/10 border border-indigo-500/30 text-indigo-600";
      badgeText = i18n.t("notif.nStatusCap");
      badgeClass = "bg-indigo-500/10 text-indigo-700 border-indigo-500/30";
      formattedTitleStr = i18n.t("notif.nTaskStatusUpdate");
      break;

    case "assignee":
      icon = <UserPlus className="w-4 h-4 text-sky-600" />;
      iconBgClass = "bg-sky-500/10 border border-sky-500/30 text-sky-600";
      badgeText = i18n.t("notif.nAssignCap");
      badgeClass = "bg-sky-500/10 text-sky-700 border-sky-500/30";
      formattedTitleStr = i18n.t("notif.nTaskAssign");
      break;

    case "comment":
      icon = <MessageSquare className="w-4 h-4 text-violet-600" />;
      iconBgClass = "bg-violet-500/10 border border-violet-500/30 text-violet-600";
      badgeText = i18n.t("notif.nCommentCap");
      badgeClass = "bg-violet-500/10 text-violet-700 border-violet-500/30";
      formattedTitleStr = i18n.t("notif.nNewComment");
      break;

    case "update":
      icon = <Edit3 className="w-4 h-4 text-content-secondary" />;
      iconBgClass = "bg-surface-muted border border-border-subtle text-content-secondary";
      badgeText = i18n.t("notif.nUpdateCap");
      badgeClass = "bg-surface-muted text-content-body border-border-subtle";
      formattedTitleStr = i18n.t("notif.nTaskUpdated");
      break;

    case "deadline":
      icon = <Clock className="w-4 h-4 text-amber-600" />;
      iconBgClass = "bg-amber-500/10 border border-amber-500/30 text-amber-600 animate-pulse";
      badgeText = i18n.t("notif.nDeadline");
      badgeClass = "bg-amber-500/10 text-amber-800 border-amber-500/30";
      formattedTitleStr = i18n.t("notif.nDueSoon");
      break;

    case "blocked":
      icon = <ShieldAlert className="w-4 h-4 text-rose-600" />;
      iconBgClass = "bg-rose-500/10 border border-rose-500/30 text-rose-600";
      badgeText = i18n.t("notif.nBlockedCap");
      badgeClass = "bg-rose-500/10 text-rose-700 border-rose-500/30";
      formattedTitleStr = i18n.t("notif.nTaskBlocked");
      break;

    default:
      icon = <FileText className="w-4 h-4 text-content-muted" />;
      iconBgClass = "bg-surface-sunken border border-border-faint text-content-muted";
      badgeText = i18n.t("notif.nProjectCap");
      badgeClass = "bg-surface-sunken text-content-secondary border-border-subtle";
      break;
  }

  // Formatting Title element with styling (Compact: text-xs)
  const formattedTitle = (
    <div className="flex items-center gap-1 font-medium text-content-strong text-xs">
      <span>{formattedTitleStr}</span>
    </div>
  );

  // Formatting message body
  // Goal: Find `[TASK_KEY: TITLE]` and format it as bold block, parse comments into quote, map technical keys.
  const taskRegex = /\[([A-Za-z0-9-]+):\s*([^\]]+)\]/g;

  // Check if there is a task identity match
  let taskCode = "";
  let taskTitle = "";

  const matches = [...rawMessage.matchAll(taskRegex)];
  if (matches.length > 0) {
    taskCode = matches[0][1];
    taskTitle = matches[0][2];
  }

  // Parse technical field terms and details
  // Example: "...memperbarui field "acceptanceCriteria" menjadi..."
  // Match quoted fields and replace with Indonesian terms
  let processedMsg = rawMessage;
  const fieldQuoteRegex = /field\s+"([^"]+)"/g;
  processedMsg = processedMsg.replace(fieldQuoteRegex, (match, fieldName) => {
    return `kolom "${translateFieldName(fieldName)}"`;
  });

  // Terapkan UX Copywriting yang Konsisten untuk Assignee: "[Nama Pengubah] menugaskan tugas ke Ribka"
  if (activityType === "assignee") {
    let actor = i18n.t("notif.nSomeMember");
    let assignee = "penerima";

    // Extract actor: everything before "menugaskan" or "assigned"
    const actorMatch = rawMessage.match(/^(.+?)\s+(?:menugaskan|assigned)/i);
    if (actorMatch) {
      actor = actorMatch[1].trim();
    }

    // Extract assignee: search for ke i18n.t("notif.nName") or ke Nama or to i18n.t("notif.nName") or to Nama
    const assigneeMatch = rawMessage.match(/(?:ke|to)\s+"?([^"\.\s]+(?:\s+[^"\.\s]+)?)"?/i);
    if (assigneeMatch) {
      assignee = assigneeMatch[1].trim();
    }

    if (actor.toLowerCase() === "task") {
      if (taskCode && taskTitle) {
        processedMsg = `Tugas [${taskCode}: ${taskTitle}] ditugaskan ke ${assignee}`;
      } else {
        processedMsg = `Tugas ditugaskan ke ${assignee}`;
      }
    } else {
      if (taskCode && taskTitle) {
        processedMsg = `${actor} menugaskan tugas ke ${assignee} [${taskCode}: ${taskTitle}]`;
      } else {
        processedMsg = `${actor} menugaskan tugas ke ${assignee}`;
      }
    }
  }

  // Extract comment blocks (anything in double quotes after "mengomentari tugas ... :")
  let commentBlock: string | null = null;
  const commentRegex = /mengomentari\s+tugas\s+.*:\s*"([^"]+)"/i;
  const commentMatch = processedMsg.match(commentRegex);
  if (commentMatch) {
    commentBlock = commentMatch[1];
  }

  // Split message to isolate the [TASK_KEY: TITLE] for custom React styling
  const parts = [];
  let lastIndex = 0;

  // Reset regex
  taskRegex.lastIndex = 0;
  let match;
  while ((match = taskRegex.exec(processedMsg)) !== null) {
    const startIndex = match.index;
    const endIndex = taskRegex.lastIndex;

    // Push the text before the match
    if (startIndex > lastIndex) {
      parts.push(processedMsg.substring(lastIndex, startIndex));
    }

    // Push the beautiful bold task identity - Ultra Compact (text-xs sm:text-[10px])
    const code = match[1];
    const name = match[2];
    parts.push(
      <span
        key={`task-${code}-${startIndex}`}
        className="inline-flex items-center gap-0.5 px-1 py-0 rounded bg-surface-muted hover:bg-surface-strong border border-border-subtle/60 text-xs sm:text-[10px] font-medium text-content-strong font-mono transition-colors my-0.5 select-all"
      >
        <span className="text-violet-600 font-medium">{code}</span>
        <span className="text-content-subtle">|</span>
        <span className="truncate max-w-[120px]">{name}</span>
      </span>
    );

    lastIndex = endIndex;
  }

  if (lastIndex < processedMsg.length) {
    parts.push(processedMsg.substring(lastIndex));
  }

  // Render finalized beautiful message Node (Compact: text-xs sm:text-[11px])
  const formattedMessage = (
    <div className="text-xs sm:text-[11px] text-content-muted leading-tight mt-0.5">
      <div className="flex flex-wrap items-center gap-x-0.5">
        {parts.length > 0 ? (
          parts.map((p, i) => <React.Fragment key={i}>{p}</React.Fragment>)
        ) : (
          <span>{processedMsg}</span>
        )}
      </div>

      {/* Special Block: If there's an update with a transition of status, parse and render beautifully (Compact: mt-1 p-1 px-1.5) */}
      {activityType === "status" &&
        (() => {
          const statusMatch = rawMessage.match(/dari\s+"([^"]+)"\s+menjadi\s+"([^"]+)"/i);
          const toMatch = rawMessage.match(/menjadi\s+"([^"]+)"/i);
          if (statusMatch && statusMatch[1] && statusMatch[2]) {
            return (
              <div className="mt-1 flex items-center gap-1 text-content-muted bg-surface-sunken border border-border-faint rounded-md p-1 px-1.5 max-w-fit">
                <span className="text-xs sm:text-[11px] sm:text-[9px] font-medium text-content-subtle">
                  Transisi:
                </span>
                <div className="flex items-center gap-0.5">
                  {renderStatusBadge(statusMatch[1])}
                  <span className="text-content-subtle text-xs sm:text-[11px] sm:text-[9px]">
                    ➔
                  </span>
                  {renderStatusBadge(statusMatch[2])}
                </div>
              </div>
            );
          } else if (toMatch && toMatch[1]) {
            return (
              <div className="mt-1 flex items-center gap-1 text-content-muted bg-surface-sunken border border-border-faint rounded-md p-1 px-1.5 max-w-fit">
                <span className="text-xs sm:text-[11px] sm:text-[9px] font-medium text-content-subtle">
                  Transisi:
                </span>
                <div className="flex items-center gap-0.5">
                  <span className="text-content-subtle text-xs sm:text-[11px] sm:text-[9px] font-medium">
                    Ke
                  </span>
                  {renderStatusBadge(toMatch[1])}
                </div>
              </div>
            );
          }
          return null;
        })()}

      {/* Special Block: Render comments inside stylized blockquotes (Compact: mt-1 pl-2 py-0.5 px-1.5) */}
      {commentBlock && (
        <div className="mt-1 pl-2 border-l-2 border-violet-500 bg-surface-sunken/60 py-0.5 px-1.5 rounded-r text-content-secondary italic font-medium text-xs sm:text-[11px] max-w-prose">
          "{commentBlock}"
        </div>
      )}
    </div>
  );

  return {
    icon,
    iconBgClass,
    badgeText,
    badgeClass,
    formattedTitle,
    formattedMessage,
    activityType,
  };
};
