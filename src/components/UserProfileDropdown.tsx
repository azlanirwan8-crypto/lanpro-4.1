import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { User, MessageSquare, HelpCircle, LogOut, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { UserAvatar } from "./ui/UserAvatar";
import { UserProfile, PeranEfektif } from "../types";

export interface UserProfileDropdownProps {
  currentUser: any;
  currentUserProfile: UserProfile | null;
  user: any;
  userRole?: PeranEfektif | null;
  /** Item #199 — Master Data "jabatan"/"position", untuk menerjemahkan kode posisi ke nama manusiawi. */
  masterData?: any[];
  onOpenProfile: () => void;
  onOpenMessages?: () => void;
  onOpenHelp?: () => void;
  handleLogout: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  currentUser,
  currentUserProfile,
  user,
  userRole,
  masterData = [],
  onOpenProfile,
  onOpenMessages,
  onOpenHelp,
  handleLogout,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeUser = currentUserProfile || currentUser || user;
  const displayName = activeUser?.displayName || activeUser?.name || activeUser?.username || "User";
  const username = activeUser?.username || "";

  /**
   * Item #199 — `activeUser.position` menyimpan KODE Master Data (mis.
   * "Jab-4"), bukan nama yang siap ditampilkan. `UserDetailView.tsx`
   * (`getPosName`) sudah menerjemahkannya lewat lookup ke Master Data; komponen
   * ini sebelumnya menampilkan kode itu mentah-mentah, jadi header aplikasi
   * menampilkan "Jab-4" alih-alih nama jabatan sungguhan.
   */
  const posName = (posId?: string) => {
    if (!posId) return undefined;
    const allPos = masterData.filter((d) => d.type === "jabatan" || d.type === "position");
    const found = allPos.find((p: any) => (p.id || p.code) === posId || p.label === posId);
    // Sama seperti `getPosName` di UserDetailView.tsx: jatuh ke kode aslinya
    // (BUKAN disembunyikan) bila tidak cocok di Master Data — supaya tidak
    // ada informasi yang hilang, hanya tidak diterjemahkan.
    return found?.name || found?.label || posId;
  };

  const roleDisplay =
    posName(activeUser?.position) ||
    activeUser?.jobTitle ||
    userRole ||
    activeUser?.role ||
    "Member";

  // First name for friendly greeting
  const firstName = displayName.split(" ")[0] || "User";

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button ala Velzon Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2.5 sm:gap-3 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg min-h-11 transition-all cursor-pointer select-none",
          "hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus",
          isOpen ? "bg-surface-sunken" : "bg-transparent"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={displayName}
      >
        <UserAvatar
          user={activeUser}
          className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 ring-2 ring-border-subtle"
        />
        <div className="hidden md:flex flex-col text-left leading-tight">
          <span className="text-xs font-semibold text-content-strong truncate max-w-[130px]">
            {displayName}
          </span>
          <span className="text-[11px] text-content-muted capitalize truncate max-w-[130px]">
            {roleDisplay}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "hidden sm:block w-3.5 h-3.5 text-content-subtle transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Pop-up Dropdown Menu ala Velzon */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute right-0 mt-1.5 w-52 bg-surface rounded-md shadow-soft-lg border border-border-subtle z-50 py-1 overflow-hidden origin-top-right"
            role="menu"
          >
            {/* Header Greeting ala Velzon (hanya Welcome nama lengkap, tanpa background/border tebal) */}
            <div className="px-4 pt-2.5 pb-1.5">
              <p className="text-xs font-semibold text-content-subtle truncate">
                {t("userMenu.welcome", { name: displayName })}
              </p>
            </div>

            <div className="py-0.5">
              {/* Profile */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenProfile();
                }}
                className="w-full text-left px-4 py-2 min-h-9 text-xs font-medium hover:bg-surface-sunken flex items-center gap-3 transition-colors text-content-body hover:text-content-strong cursor-pointer"
                role="menuitem"
              >
                <User className="w-4 h-4 text-content-subtle shrink-0" />
                <span>{t("userMenu.profile")}</span>
              </button>

              {/* Messages */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenMessages) onOpenMessages();
                }}
                className="w-full text-left px-4 py-2 min-h-9 text-xs font-medium hover:bg-surface-sunken flex items-center gap-3 transition-colors text-content-body hover:text-content-strong cursor-pointer"
                role="menuitem"
              >
                <MessageSquare className="w-4 h-4 text-content-subtle shrink-0" />
                <span>{t("userMenu.messages")}</span>
              </button>

              {/* Help */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenHelp) onOpenHelp();
                }}
                className="w-full text-left px-4 py-2 min-h-9 text-xs font-medium hover:bg-surface-sunken flex items-center gap-3 transition-colors text-content-body hover:text-content-strong cursor-pointer"
                role="menuitem"
              >
                <HelpCircle className="w-4 h-4 text-content-subtle shrink-0" />
                <span>{t("userMenu.help")}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-border-subtle my-1" />

            {/* Logout */}
            <div className="py-0.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 min-h-9 text-xs font-medium hover:bg-danger-surface/20 flex items-center gap-3 transition-colors text-danger-hover hover:text-danger cursor-pointer"
                role="menuitem"
              >
                <LogOut className="w-4 h-4 text-danger-hover shrink-0" />
                <span>{t("userMenu.logout")}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
