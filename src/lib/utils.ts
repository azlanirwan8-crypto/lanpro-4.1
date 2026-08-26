import i18n from "../i18n";
import { format } from "date-fns";

export const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

export const ensureDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  if (dateValue && typeof dateValue.toDate === "function") {
    const d = dateValue.toDate();
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const safeFormat = (dateValue: any, formatStr: string, fallback: string = "-") => {
  try {
    const d = ensureDate(dateValue);
    if (!dateValue || isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

export const humanizeActivityAction = (action?: string, details?: any): string => {
  if (!action) return i18n.t("aktivitas.actSystem");
  const act = action.toLowerCase().trim();

  if (
    act.includes("sprint_completed") ||
    act.includes("completesprint") ||
    act.includes("sprint completed")
  )
    return i18n.t("aktivitas.actSprintCompleted");
  if (
    act.includes("sprint_started") ||
    act.includes("startsprint") ||
    act.includes("sprint started")
  )
    return i18n.t("aktivitas.actSprintStarted");
  if (
    act.includes("task_created") ||
    act.includes("create_task") ||
    act.includes("createtask") ||
    act.includes("task created")
  )
    return i18n.t("aktivitas.actTaskCreated");
  if (
    act.includes("status_changed") ||
    act.includes("update_status") ||
    act.includes("updatestatus") ||
    act.includes("status changed")
  )
    return i18n.t("aktivitas.actStatusChanged");
  if (
    act.includes("task_updated") ||
    act.includes("update_task") ||
    act.includes("updatetask") ||
    act.includes("task updated")
  )
    return i18n.t("aktivitas.actTaskUpdated");
  if (
    act.includes("comment_added") ||
    act.includes("add_comment") ||
    act.includes("addcomment") ||
    act.includes("comment added")
  )
    return i18n.t("aktivitas.actCommentAdded");
  if (
    act.includes("avatar_uploaded") ||
    act.includes("upload_avatar") ||
    act.includes("avatar uploaded")
  )
    return i18n.t("aktivitas.actAvatarUpdated");
  if (act.includes("member_added") || act.includes("add_member") || act.includes("member added"))
    return i18n.t("aktivitas.actMemberAdded");
  if (
    act.includes("project_created") ||
    act.includes("create_project") ||
    act.includes("project created")
  )
    return i18n.t("aktivitas.actProjectCreated");
  if (act.includes("file_uploaded") || act.includes("upload_file") || act.includes("file uploaded"))
    return i18n.t("aktivitas.actFileUploaded");
  if (act.includes("user_profile_updated") || act.includes("profile_updated"))
    return i18n.t("aktivitas.actUserProfileUpdated");
  if (act.includes("user_deleted")) return i18n.t("aktivitas.actUserDeleted");

  return act.replace(/_/g, " ");
};
