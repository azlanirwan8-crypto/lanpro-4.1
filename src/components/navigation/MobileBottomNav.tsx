import React from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, KanbanSquare, CheckSquare, Users, Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { useMobileAction } from "../../contexts/MobileActionContext";

export interface MobileBottomNavProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  onOpenNewTask?: () => void;
  unreadChatCount?: number;
  canCreateTask?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  setCurrentView,
  onOpenNewTask,
  unreadChatCount = 0,
  canCreateTask = true,
}) => {
  const { t } = useTranslation();
  const { activeAction } = useMobileAction();

  // FAB (+): aksi modul terdaftar, atau fallback buat tugas HANYA di list/board (#310).
  const taskViews = currentView === "list" || currentView === "board" || currentView === "table";
  const actionLabel = activeAction?.label || t("navigation.mobileAdd");
  const actionClick = activeAction?.onClick || (taskViews ? onOpenNewTask : undefined);
  const actionIcon = activeAction?.icon || Plus;
  const showActionButton = activeAction
    ? activeAction.canCreate
    : taskViews && canCreateTask && !!onOpenNewTask;

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    active?: boolean;
    onClick?: () => void;
    isAction?: boolean;
    badge?: number;
  }

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      label: t("navigation.mobileDashboard"),
      icon: LayoutDashboard,
      active: currentView === "dashboard",
      onClick: () => setCurrentView("dashboard"),
    },
    {
      id: "board",
      label: t("navigation.mobileBoard"),
      icon: KanbanSquare,
      active: currentView === "board",
      onClick: () => setCurrentView("board"),
    },
  ];

  if (showActionButton) {
    navItems.push({
      id: "create",
      label: actionLabel,
      icon: actionIcon,
      isAction: true,
      onClick: actionClick,
    });
  }

  navItems.push(
    {
      id: "list",
      label: t("navigation.mobileTasks"),
      icon: CheckSquare,
      active: currentView === "list" || currentView === "table",
      onClick: () => setCurrentView("list"),
    },
    {
      id: "team",
      label: t("navigation.mobileTeam"),
      icon: Users,
      active: currentView === "team" || currentView === "access",
      onClick: () => setCurrentView("team"),
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
    }
  );

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      data-testid="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-subtle shadow-soft transition-all duration-200"
    >
      <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                type="button"
                data-testid="mobile-nav-add"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center -mt-5 group focus:outline-none shrink-0"
                aria-label={item.label}
              >
                <div className="w-12 h-12 rounded-full bg-primary text-content-inverse flex items-center justify-center shadow-lg shadow-primary/30 group-active:scale-95 transition-transform">
                  {React.isValidElement(Icon) ? (
                    Icon
                  ) : Icon ? (
                    React.createElement(Icon as React.ComponentType<{ className?: string }>, {
                      className: "w-6 h-6 stroke-[2.5]",
                    })
                  ) : (
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  )}
                </div>
                <span className="text-[10px] font-medium text-content-muted mt-1 group-active:text-primary max-w-[64px] truncate">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              data-testid={`mobile-nav-${item.id}`}
              onClick={item.onClick}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1.5 px-1 relative transition-colors focus:outline-none",
                item.active
                  ? "text-primary font-medium"
                  : "text-content-muted hover:text-content-body"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    item.active && "scale-110 stroke-[2.2]"
                  )}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 bg-danger text-content-inverse text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-surface">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                data-testid={`mobile-label-${item.id}`}
                className={cn(
                  "text-[10px] mt-1 tracking-tight truncate max-w-[64px]",
                  item.active && "font-semibold text-primary"
                )}
              >
                {item.label}
              </span>
              {item.active && (
                <span className="absolute bottom-1 w-4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
