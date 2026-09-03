/**
 * Panel notifikasi yang muncul dari ikon lonceng di header.
 *
 * Diekstrak dari AppContainer. JSX dipindah apa adanya; yang berubah hanya cara
 * ia memperoleh data — dari closure atas state induk menjadi props eksplisit.
 * Tanpa state sendiri: daftar notifikasi dan status buka-tutupnya tetap tinggal
 * di AppContainer karena header dan penghitung lonceng juga membacanya.
 */
import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { Mail } from "lucide-react";
import { formatNotification } from "../utils/notificationFormatter";
import type { AppNotification, Task } from "../types";
import { fetchNotifPrefs, patchNotifPrefs } from "../features/users/services/users.service";
import { toast } from "sonner";

interface NotificationsDropdownProps {
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  notifications: AppNotification[];
  currentUser: any;
  user: any;
  /** Menandai satu notifikasi sudah dibaca di backend. */
  markNotificationRead: (userUid: string, notificationId: string) => Promise<any>;
  setCurrentView: (view: any) => void;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  setQaInitialStatusFilter: (filter: any) => void;
  /** Memuat ulang daftar notifikasi setelah salah satunya ditandai terbaca. */
  fetchNotifications: () => void;
  tasks: Task[];
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isNotificationsOpen,
  setIsNotificationsOpen,
  notifications,
  currentUser,
  user,
  markNotificationRead,
  setCurrentView,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  setQaInitialStatusFilter,
  fetchNotifications,
  tasks,
}) => {
  const { t } = useTranslation();
  const [dueReminder, setDueReminder] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    let cancelled = false;
    void fetchNotifPrefs()
      .then((res: any) => {
        if (!cancelled && typeof res?.data?.dueReminder === "boolean") {
          setDueReminder(res.data.dueReminder);
        }
      })
      .catch(() => {
        /* default true */
      });
    return () => {
      cancelled = true;
    };
  }, [isNotificationsOpen]);

  const toggleDueReminder = async () => {
    if (prefSaving) return;
    const next = !dueReminder;
    setPrefSaving(true);
    setDueReminder(next);
    try {
      await patchNotifPrefs({ dueReminder: next });
      toast.success(
        next
          ? t("notifications.dueReminderOn", "Pengingat jatuh tempo diaktifkan")
          : t("notifications.dueReminderOff", "Pengingat jatuh tempo dimatikan")
      );
    } catch (e: any) {
      setDueReminder(!next);
      toast.error(e?.message || t("notifications.prefFailed", "Gagal menyimpan preferensi"));
    } finally {
      setPrefSaving(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isNotificationsOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 sm:w-[380px] bg-surface rounded-xl shadow-soft-lg border border-border-subtle z-50 overflow-hidden origin-top-right max-md:fixed max-md:inset-x-0 max-md:right-0 max-md:left-0 max-md:mt-0 max-md:bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] max-md:w-full max-md:max-w-none max-md:rounded-t-2xl max-md:rounded-b-none max-md:origin-bottom max-md:h-[min(72vh,520px)] max-md:flex max-md:flex-col"
          >
            {/* Dropdown Header */}
            <div className="md:hidden flex justify-center pt-2 pb-0 shrink-0" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-surface-marker" />
            </div>
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface shrink-0">
              <h3 className="font-medium text-content text-[16px]">{t("notifications.title")}</h3>
              <div className="flex items-center gap-2.5">
                <span className="bg-violet-500/15 text-violet-700 text-xs font-medium px-2.5 py-1 rounded-md">
                  {t("rakit.newCount", { count: notifications.filter((n) => !n.read).length })}
                </span>
                <button
                  className="p-1 text-content-muted hover:text-content-secondary hover:bg-surface-muted rounded-full transition-all"
                  title={t("notifications.markAllRead")}
                  onClick={async () => {
                    try {
                      const unread = notifications.filter((n) => !n.read);
                      for (const n of unread) {
                        await markNotificationRead(user?.uid || currentUser?.uid, n.id);
                      }
                      fetchNotifications();
                    } catch (e) {}
                  }}
                >
                  <Mail className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification Items List */}
            <div className="max-h-[380px] max-md:flex-1 max-md:max-h-none overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-content-muted text-sm italic">
                  {t("notifications.empty")}
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((n, index) => {
                    const parsed = formatNotification(n.type, n.title, n.message);

                    const getRelativeTime = (createdAt: any): string => {
                      if (!createdAt) return "-";
                      try {
                        const date =
                          typeof createdAt.toMillis === "function"
                            ? new Date(createdAt.toMillis())
                            : new Date(createdAt);
                        const diffMs = Date.now() - date.getTime();
                        const diffSec = Math.floor(diffMs / 1000);
                        const diffMin = Math.floor(diffSec / 60);
                        const diffHr = Math.floor(diffMin / 60);
                        const diffDay = Math.floor(diffHr / 24);

                        if (diffSec < 60) return "Just now";
                        if (diffMin < 60) return `${diffMin}m ago`;
                        if (diffHr < 24) return `${diffHr}h ago`;
                        if (diffDay === 1) return "1 day ago";
                        if (diffDay < 7) return `${diffDay} days ago`;

                        return format(date, "dd MMM, HH:mm");
                      } catch (e) {
                        return "-";
                      }
                    };

                    const formattedTime = getRelativeTime(n.createdAt);

                    return (
                      <div
                        key={n.id ? `${n.id}-${index}` : `notif-${index}`}
                        onClick={async () => {
                          try {
                            if (!n.read) {
                              await markNotificationRead(user?.uid || currentUser?.uid, n.id);
                              fetchNotifications();
                            }
                          } catch (e) {
                            console.error(e);
                          }
                          if (
                            n.type === "bug_retest" ||
                            (n.title && n.title.toLowerCase().includes("retest")) ||
                            (n.message && n.message.toLowerCase().includes("retest"))
                          ) {
                            setCurrentView("qa");
                            setQaInitialStatusFilter("Retest");
                            setIsNotificationsOpen(false);
                            window.dispatchEvent(
                              new CustomEvent("lanpro_qa_retest_updated", {
                                detail: { taskId: n.relatedId },
                              })
                            );
                          } else if (n.relatedId) {
                            const t = tasks.find((x) => x.id === n.relatedId);
                            if (t) {
                              setSelectedTaskForDetail(t);
                              setIsTaskDetailModalOpen(true);
                              setIsNotificationsOpen(false);
                            }
                          }
                        }}
                        className="py-3.5 px-5 hover:bg-surface-muted transition-all cursor-pointer flex gap-3 items-start relative border-b border-border-subtle last:border-b-0"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${parsed.iconBgClass || "bg-violet-500/10 text-violet-600"}`}
                        >
                          {parsed.icon}
                        </div>

                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="text-sm font-medium text-content leading-snug break-words">
                            {parsed.formattedMessage}
                          </h4>
                          <span className="mt-1 block text-xs text-content-muted font-medium">
                            {formattedTime}
                          </span>
                        </div>

                        {!n.read && (
                          <div className="absolute right-5 top-5 flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-surface shadow-xs"></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown Footer — #345 preferensi minimal */}
            <div className="p-4 border-t border-border-subtle bg-surface space-y-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
              <label className="flex items-center justify-between gap-3 text-xs text-content-secondary cursor-pointer select-none">
                <span>{t("notifications.dueReminderPref", "Pengingat jatuh tempo (24 jam)")}</span>
                <input
                  type="checkbox"
                  checked={dueReminder}
                  disabled={prefSaving}
                  onChange={() => void toggleDueReminder()}
                  className="rounded border-border-subtle text-primary focus:ring-primary/30"
                />
              </label>
              <button
                onClick={() => {
                  setIsNotificationsOpen(false);
                }}
                className="w-full bg-primary-surface hover:bg-primary-surface-hover text-content-inverse py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150 text-center block shadow-xs"
              >
                {t("notifications.viewAll")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
