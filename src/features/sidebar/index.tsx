import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Kanban,
  Plus,
  LogOut,
  User,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { SidebarProps } from "./types";
import { useSidebar } from "./hooks";
import { styles } from "./styles";
import { sidebarSections } from "./config";
import { getUserPermissions, normalizeModuleKey } from "../../lib/permissions";
import { UserAvatar } from "../../components/ui/UserAvatar";

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const { t } = useTranslation();
  const {
    isMobileMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setIsNewProjectModalOpen,
    projects,
    selectedProject,
    setSelectedProject,
    userRole,
    currentView,
    setCurrentView,
    currentUserProfile,
    currentUser,
    user,
    setIsProfileModalOpen,
    onOpenProfile,
    handleLogout,
  } = props;

  const { canCreateProject } = useSidebar(props);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const toggleExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const renderBadge = (badge?: string, badgeColor?: string) => {
    if (!badge) return null;
    let colorClasses = "bg-danger-surface text-content-inverse"; // default Hot orange-red
    if (badgeColor === "emerald" || badge === "sidebar.badgeNew")
      colorClasses = "bg-success-surface text-content-inverse";
    if (badgeColor === "blue") colorClasses = "bg-info-surface text-content-inverse";
    if (badgeColor === "purple") colorClasses = "bg-content-inverse-muted/20 text-content-inverse";

    return (
      <span
        className={cn(
          "text-xs sm:text-[10px] font-medium px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider shrink-0",
          colorClasses
        )}
      >
        {t(badge)}
      </span>
    );
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        styles.aside,
        isMobileMenuOpen ? styles.asideMobileOpen : styles.asideMobileClosed,
        isSidebarCollapsed ? styles.asideCollapsed : styles.asideExpanded
      )}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={styles.collapseButton}
        title={isSidebarCollapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </motion.button>

      {/* Brand Header */}
      <div
        className={cn(
          styles.logoWrapper,
          isSidebarCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ rotate: 8, scale: 1.05 }} className={styles.logoIcon}>
            <Kanban className="text-content-inverse w-5 h-5" />
          </motion.div>
          <AnimatePresence mode="wait">
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col"
              >
                <span className={styles.logoText}>LANPRO</span>
                <span className="text-xs sm:text-[11px] sm:text-[9px] font-medium text-sidebar-title tracking-widest uppercase -mt-1">
                  {t("jsx.j154")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <nav className={styles.nav}>
        {/* Active Projects Section */}
        {!isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.sectionLabelWrapper}
          >
            <div className={styles.sectionLabel}>{t("sidebar.activeProjects")}</div>
            {canCreateProject && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsNewProjectModalOpen(true)}
                className={styles.newButton}
                title={t("sidebar.newProject")}
              >
                <Plus className="w-3.5 h-3.5 text-sidebar-text" />
                <span className="text-xs sm:text-[10px] font-medium uppercase text-sidebar-text">
                  {t("sidebar.new")}
                </span>
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Project List Buttons */}
        {projects.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.02 }}
            className="group relative my-0.5"
          >
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProject(p)}
              className={cn(
                styles.projectButton,
                isSidebarCollapsed
                  ? "justify-center px-0 py-2 min-h-11"
                  : "gap-2.5 px-3 py-2 min-h-11",
                selectedProject?.id === p.id
                  ? styles.projectButtonSelected
                  : styles.projectButtonDefault
              )}
              title={isSidebarCollapsed ? p.name : undefined}
            >
              <div
                className={cn(
                  styles.indicator,
                  selectedProject?.id === p.id
                    ? "bg-sidebar-text-active scale-125 shadow-xs"
                    : "bg-sidebar-title/40"
                )}
              />
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-left text-xs font-medium">{p.name}</span>
                  <span className="text-xs sm:text-[11px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded bg-sidebar-item-hover text-sidebar-text-active">
                    {p.key}
                  </span>
                </>
              )}
            </motion.button>
          </motion.div>
        ))}

        {/* Daftar proyek kosong — item #160. Tanpa baris ini blok "PROYEK
            AKTIF" hanya berupa judul melayang, sehingga pengguna baru membaca
            layar ini sebagai aplikasi yang gagal memuat. */}
        {projects.length === 0 && !isSidebarCollapsed && (
          <div className="px-3 py-2 text-xs text-sidebar-title italic">
            {t("sidebar.noProjectYet")}
          </div>
        )}

        {/* Sidebar Categories & Navigation Items */}
        {sidebarSections.map((section) => {
          const permittedItems = section.items.filter((item) => {
            const normRole = (userRole ? String(userRole).toLowerCase().trim() : "viewer") as any;
            const uName = String(
              currentUserProfile?.username || currentUser?.username || user?.username || ""
            )
              .toLowerCase()
              .trim();
            const uRole = String(currentUserProfile?.role || currentUser?.role || "")
              .toLowerCase()
              .trim();

            const isAdmin =
              normRole === "admin" ||
              normRole === "administrator" ||
              normRole === "superadmin" ||
              uRole === "admin" ||
              uRole === "administrator" ||
              uRole === "superadmin" ||
              uName === "admin";
            if (isAdmin) return true;

            const perms = getUserPermissions(normRole, currentUserProfile?.permissions);
            const normModule = normalizeModuleKey(item.module);
            const modulePerm = perms[normModule as keyof typeof perms];

            const hasRead = Boolean(modulePerm?.read);
            const hasCreate = Boolean(modulePerm?.create);
            const hasUpdate = Boolean(modulePerm?.update);
            const hasDelete = Boolean(modulePerm?.delete);

            const hasAnyPermission = hasRead || hasCreate || hasUpdate || hasDelete;
            return hasAnyPermission && hasRead;
          });

          if (permittedItems.length === 0) return null;

          return (
            <React.Fragment key={section.id}>
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between px-3 mt-5 mb-1.5">
                  <div className="text-xs sm:text-[11px] font-semibold text-sidebar-title uppercase tracking-wider">
                    {t(section.title)}
                  </div>
                </div>
              )}
              {permittedItems.map((item) => {
                /* Terkunci, bukan tersembunyi — item #160. Disembunyikan total
                   membuat pengguna baru tidak pernah tahu aplikasi ini bisa
                   apa; dibiarkan aktif membuatnya menekan tombol yang pasti
                   memulangkan layar kosong. */
                const terkunci = Boolean(item.butuhProyek) && projects.length === 0;
                const isActive = currentView === item.id;
                const hasChildren = Boolean(item.children && item.children.length > 0);
                const isExpanded = Boolean(expandedItems[item.id]);

                return (
                  <div key={item.id} className="my-0.5">
                    <motion.button
                      whileHover={terkunci ? undefined : { x: 2 }}
                      whileTap={terkunci ? undefined : { scale: 0.98 }}
                      onClick={() => {
                        if (terkunci) return;
                        setCurrentView(item.id as any);
                      }}
                      disabled={terkunci}
                      aria-disabled={terkunci}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-md transition-all text-xs relative overflow-hidden group",
                        terkunci
                          ? "text-sidebar-text opacity-50 cursor-not-allowed"
                          : isActive
                            ? "bg-sidebar-item-active text-sidebar-text-active font-medium shadow-xs"
                            : "text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active"
                      )}
                      title={
                        terkunci
                          ? t("sidebar.lockedNeedsProject")
                          : isSidebarCollapsed
                            ? t(item.label)
                            : undefined
                      }
                    >
                      <div className="shrink-0 text-sidebar-text group-hover:text-sidebar-text-active transition-colors">
                        {item.icon}
                      </div>
                      {!isSidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left font-medium truncate">
                            {t(item.label)}
                          </span>
                          {terkunci && <Lock className="w-3.5 h-3.5 shrink-0 text-sidebar-title" />}
                          {!terkunci && item.badge && renderBadge(item.badge, item.badgeColor)}
                          {hasChildren && (
                            <div
                              onClick={(e) => toggleExpand(item.id, e)}
                              className="p-2 min-w-9 min-h-9 flex items-center justify-center rounded hover:bg-sidebar-item-hover text-sidebar-text hover:text-sidebar-text-active transition-colors ml-1"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </motion.button>

                    {/* Render Sub-items in Velzon hyphen style */}
                    {hasChildren && isExpanded && !isSidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-7 pr-2 py-1 space-y-1"
                      >
                        {item.children?.map((subItem) => {
                          const isSubActive = currentView === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => setCurrentView(subItem.id as any)}
                              className={cn(
                                "w-full flex items-center gap-2 py-2 px-2 min-h-11 rounded text-xs transition-colors text-left",
                                isSubActive
                                  ? "text-sidebar-text-active font-medium bg-sidebar-item-active"
                                  : "text-sidebar-text hover:text-sidebar-text-active hover:bg-sidebar-item-hover"
                              )}
                            >
                              <span className="text-sidebar-title text-xs sm:text-[10px]">—</span>
                              <span className="truncate">{t(subItem.label)}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Velzon Bottom User Profile Footer */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-surface mt-auto relative">
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-sidebar-surface border border-sidebar-border rounded-xl shadow-2xl py-1.5 z-50 text-sidebar-text-active animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                if (onOpenProfile) onOpenProfile();
              }}
              className="w-full text-left px-4 py-3 min-h-11 text-xs font-medium hover:bg-sidebar-item-hover flex items-center gap-2.5 transition-colors text-sidebar-text hover:text-sidebar-text-active cursor-pointer"
            >
              <User className="w-4 h-4 text-sidebar-title" />
              <span>{t("sidebar.yourProfile")}</span>
            </button>
            <div className="h-px bg-sidebar-border my-1" />
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-3 min-h-11 text-xs font-medium hover:bg-danger-surface/20 flex items-center gap-2.5 transition-colors text-danger-hover hover:text-danger cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("sidebar.logout")}</span>
            </button>
          </div>
        )}

        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={cn(
            "flex items-center p-2 rounded-lg hover:bg-sidebar-item-hover transition-all cursor-pointer group",
            isSidebarCollapsed ? "justify-center" : "gap-3"
          )}
          title={t("sidebar.profileMenuHint")}
        >
          <UserAvatar
            user={user || currentUserProfile || currentUser}
            className="w-8 h-8 shrink-0 border border-sidebar-border"
          />
          {!isSidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-sidebar-text-active truncate">
                  {user?.displayName || currentUser?.displayName || currentUser?.username || "User"}
                </div>
                <div className="text-xs sm:text-[10px] text-sidebar-text truncate font-mono">
                  {currentUser?.username || "admin"}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-sidebar-text transition-transform duration-200",
                  isUserMenuOpen && "rotate-180"
                )}
              />
            </>
          )}
        </motion.div>
        {isSidebarCollapsed && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full mt-2 flex justify-center p-2 text-sidebar-text hover:text-sidebar-text-active transition-colors"
            title={t("sidebar.profileOptions")}
          >
            <User className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
