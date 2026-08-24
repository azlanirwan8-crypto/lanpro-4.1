import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { safeLocalStorage, safeSessionStorage } from "./lib/safeStorage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useState, useEffect, useRef, useMemo } from "react";
import io from "socket.io-client";

import {
  Project,
  Task,
  Sprint,
  MasterData,
  Comment,
  Attachment,
  ActivityLog,
  LinkedTask,
  AppNotification,
  PeranEfektif,
} from "./types";
import { hasPermission, resolveProjectRole } from "./lib/permissions";
import { validateFileClient } from "./lib/fileSecurity";
import { confirmDeleteAlert, showSuccessAlert, showErrorAlert } from "./lib/sweetalert";
import { useAppStore } from "./store/useAppStore";
import { CacheManager } from "./lib/cache";
import { useMasterData } from "./hooks/useMasterData";
import { useAuth as useAuthHook } from "./hooks/useAuth";
import { useAppModals } from "./hooks/useAppModals";
import { useAppTheme } from "./hooks/useAppTheme";
import { useAppNotifications } from "./hooks/useAppNotifications";
import { useProjectStore, useNotificationStore } from "./store";
import { useAppUI } from "./hooks/useAppUI";
import { useAppPagination } from "./hooks/useAppPagination";
import { useNewTaskForm } from "./hooks/useNewTaskForm";
import { useNewSprintForm } from "./hooks/useNewSprintForm";
import { useNewProjectForm } from "./hooks/useNewProjectForm";
import { useTaskSelection } from "./hooks/useTaskSelection";
import { useAppSync } from "./hooks/useAppSync";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { TaskDetailModal } from "./features/issues";
import { UserDetailView } from "./features/users/UserDetailView";
import { Sidebar } from "./features/sidebar";
import { AdminUserPanel } from "./features/users";
import { MasterDataPanel } from "./features/master/MasterDataPanel";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { LiveChatWidget } from "./components/LiveChatWidget";
import { PresenceProvider } from "./contexts/PresenceContext";
import { HeaderAvatarGroup } from "./components/HeaderAvatarGroup";
import { SingleLoginCollisionModal } from "./components/SingleLoginCollisionModal";
import { apiRequest, getAuthToken, isNetworkOrAuthError } from "./lib/api";
import {
  verifyAuth,
  fetchUsers,
  sendHeartbeat,
  createNotification,
  markNotificationRead,
} from "./services/userService";
// Akhiran Api dipakai karena AppContainer sudah punya binding lokal bernama
// sama (fetchTasks, fetchSprints, deleteProject) yang membungkus panggilan ini
// beserta penanganan state-nya. Tanpa pembeda, import akan terbayangi binding
// lokal dan pemanggilan mengenai fungsi yang salah.
import {
  fetchSprints as fetchSprintsApi,
  createSprint,
  updateSprint,
  deleteSprint,
} from "./services/sprintService";
import {
  createProject,
  updateProject,
  deleteProject as deleteProjectApi,
  updateMemberRoles,
  addMember,
  removeMember,
  inviteMember,
  fetchActivity,
  logActivity as logActivityApi,
} from "./services/projectService";
import {
  fetchTasks as fetchTasksApi,
  createTask,
  updateTask,
  updateTaskAsUser,
  deleteTask as deleteTaskApi,
  bulkDeleteTasks as bulkDeleteTasksApi,
  fetchTaskComments,
  createTaskComment,
  createTaskLink,
  deleteTaskLink,
} from "./services/taskService";
import { fetchMasterDataAll, updateMasterDataOrder } from "./services/masterDataService";
import { SessionExpiryWarning } from "./components/SessionExpiryWarning";
import { GlobalSkeleton } from "./components/GlobalSkeleton";
import { NotificationsDropdown } from "./components/NotificationsDropdown";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { RateLimitIndicator } from "./components/RateLimitIndicator";
import { AppRoutes } from "./routes/AppRoutes";
import { StyledDropdown } from "./components/ui/CommonComponents";
import { NewSprintModal } from "./components/modals/NewSprintModal";
import { EditSprintModal } from "./components/modals/EditSprintModal";
import { NewProjectModal } from "./components/modals/NewProjectModal";
import { EditProjectModal } from "./components/modals/EditProjectModal";
import { NewTaskModal } from "./components/modals/NewTaskModal";

import {
  Trash2,
  FolderKanban,
  Bug,
  Sun,
  PieChart as PieIcon,
  Moon,
  Monitor,
  Menu,
  Maximize,
  Map as MapIcon,
  Link as LinkIcon,
  Database as DBIcon,
  Bell,
  Plus,
  Minimize2,
  ArrowLeft,
  Lock as LockIcon,
  Link2 as Link2Icon,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { useAuthNotification } from "./components/AuthToastContainer";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { Droppable as _Droppable, Draggable as _Draggable } from "@hello-pangea/dnd";
import { Modal } from "./components/ui/Modal";
import { ConfirmationModal } from "./components/ui/ConfirmationModal";
const Droppable = _Droppable as any;
const Draggable = _Draggable as any;

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  if (!arr) return chunks;
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// --- Recharts ---
import { ensureDate, safeFormat, Button, Input, Textarea } from "./components/ui/CoreUI";
import {
  AuthLayout,
  RegisterScreen,
  LoginScreen,
  CompleteRegistrationScreen,
} from "./features/auth";
import { bacaHasilSso, bersihkanQuerySso, type HasilSso } from "./features/auth/lib/ssoCallback";
import { ProfileEditModal } from "./features/users/ProfileEditModal";
const BROWSER_SESSION_ID = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

function AppContainer() {
  const { t } = useTranslation();
  // Store & Notification Hooks
  const {
    currentView,
    setCurrentView,
    projects,
    setProjects,
    selectedProject,
    setSelectedProject,
    tasks,
    setTasks,
    sprints,
    setSprints,
    activityLogs,
    setActivityLogs,
    masterData,
    setMasterData,
    allUsers,
    setAllUsers,
    density,
    setDensity,
  } = useAppStore();
  const { handleAuthApiResponse, triggerNotification } = useAuthNotification();
  useAppNavigation();

  // Dideklarasikan sebelum useAuthHook karena hook itu menerimanya sebagai argumen.
  // Bila dideklarasikan di bawah, pemanggilan useAuthHook mengaksesnya dalam
  // temporal dead zone dan AppContainer gagal render.
  const projectMembers = useProjectStore((s) => s.projectMembers);
  const setProjectMembers = useProjectStore((s) => s.setProjectMembers);

  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
    isAlert?: boolean;
    isLoading?: boolean;
    closeOnBackdropClick?: boolean;
    iconSrc?: string;
    iconColors?: string;
  } | null>(null);

  // useMasterData butuh isLoggedIn yang justru dihasilkan useAuthHook, sehingga
  // setternya tidak bisa dideklarasikan lebih dulu. useAuthHook hanya memakainya
  // di dalam callback (bukan saat render), jadi indirection lewat ref aman:
  // wrapper di bawah stabil, dan isinya diisi setelah useMasterData dipanggil.
  const masterDataSettersRef = useRef<{
    setNewTaskStatus?: (status: string) => void;
    setNewTaskPriority?: (priority: string) => void;
  }>({});

  // Auth Hook - handles all authentication logic
  const {
    isLoggedIn,
    currentUser,
    userRole,
    currentUserProfile,
    authView,
    setAuthView,
    socket,
    setSocket,
    showCollisionModal,
    activeSessionData,
    pendingLoginCredentials,
    isAuthLoading: hookIsAuthLoading,
    loginStatusText: hookLoginStatusText,
    setLoginStatusText: setHookLoginStatusText,
    effectiveRole,
    handleLogout,
    handleLogoutRequest,
    handleManualLogin,
    handleRegister,
    setIsLoggedIn,
    setCurrentUser,
    setUserRole,
    setCurrentUserProfile,
    setShowCollisionModal,
    setPendingLoginCredentials,
    fetchAllUsers,
  } = useAuthHook(
    setSelectedProject,
    setProjects,
    setTasks,
    setSprints,
    setProjectMembers,
    setActivityLogs,
    setCurrentView,
    setAllUsers,
    (status) => masterDataSettersRef.current.setNewTaskStatus?.(status),
    (priority) => masterDataSettersRef.current.setNewTaskPriority?.(priority),
    setMasterData,
    setConfirmAction
  );

  // Alias currentUser. Harus tepat setelah useAuthHook karena useAppNotifications
  // di bawah membacanya saat render.
  const user: any = currentUser;

  // Resolusi peran proyek anggota di dalam proyek aktif (§19.27 / #87)
  const effectiveProjectRole = useMemo(() => {
    if (!selectedProject || !currentUser) return null;
    return resolveProjectRole(currentUser, selectedProject);
  }, [selectedProject, currentUser]);

  const userRoleForProject = useMemo(() => {
    return (effectiveProjectRole || effectiveRole) as PeranEfektif;
  }, [effectiveProjectRole, effectiveRole]);

  // Kembalian SSO. Dibaca sekali saat mount; token sudah ditangani lebih awal di
  // main.tsx, jadi yang tersisa di sini hanya dua keadaan yang butuh tampilan:
  // pesan penolakan, dan layar pemilihan username.
  const [hasilSso, setHasilSso] = useState<HasilSso>(() =>
    bacaHasilSso(typeof window !== "undefined" ? window.location.search : "")
  );

  const bersihkanSso = () => {
    if (typeof window !== "undefined") {
      const sisa = bersihkanQuerySso(window.location.search);
      window.history.replaceState({}, "", window.location.pathname + sisa);
    }
    setHasilSso({ jenis: "tidak_ada" });
  };

  // Penolakan SSO ditampilkan sebagai notifikasi, bukan layar tersendiri:
  // pengguna tetap berada di layar masuk sehingga bisa langsung mencoba
  // username+password tanpa berpindah halaman.
  useEffect(() => {
    if (hasilSso.jenis !== "galat") return;
    showErrorAlert(t("alerts.cannotSignIn"), hasilSso.pesan);
    bersihkanSso();
  }, [hasilSso]);

  // Modal & Detail Panel Management
  const {
    isNewProjectModalOpen,
    setIsNewProjectModalOpen,
    isNewTaskModalOpen,
    setIsNewTaskModalOpen,
    isNewSprintModalOpen,
    setIsNewSprintModalOpen,
    isInviteModalOpen,
    setIsInviteModalOpen,
    isInviteSuccessModalOpen,
    setIsInviteSuccessModalOpen,
    isEditSprintModalOpen,
    setIsEditSprintModalOpen,
    isEditProjectModalOpen,
    setIsEditProjectModalOpen,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    editingSprint,
    setEditingSprint,
    editingProject,
    setEditingProject,
    selectedTaskForDetail,
    setSelectedTaskForDetail,
    selectedUserForDetail,
    setSelectedUserForDetail,
    lastInvitedEmail,
    setLastInvitedEmail,
    previousView,
    setPreviousView,
    openNewProjectModal,
    closeNewProjectModal,
    openNewTaskModal,
    closeNewTaskModal,
    openNewSprintModal,
    closeNewSprintModal,
    openInviteModal,
    closeInviteModal,
    openInviteSuccessModal,
    closeInviteSuccessModal,
    openEditSprintModal,
    closeEditSprintModal,
    openEditProjectModal,
    closeEditProjectModal,
    openTaskDetail,
    closeTaskDetail,
    openUserDetail,
    closeUserDetail,
    toggleProfileModal,
    openProfileModal,
    closeProfileModal,
    toggleShortcutsModal,
    openShortcutsModal,
    closeShortcutsModal,
    closeAllModals,
  } = useAppModals();

  // Theme & Appearance Management
  const {
    theme,
    setTheme,
    isThemeOpen,
    setIsThemeOpen,
    isFullscreen,
    setIsFullscreen,
    toggleTheme,
    getEffectiveTheme,
    isDarkMode,
    isLightMode,
    toggleThemeDropdown,
    openThemeDropdown,
    closeThemeDropdown,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  } = useAppTheme();

  // UI States & Controls
  const [swimlaneType, setSwimlaneType] = useState<"epics" | "assignees" | "none">("epics");
  const [loading, setLoading] = useState(true);
  // Auth-related state now managed by useAuth hook
  const loginStatusText = hookLoginStatusText;
  const setLoginStatusText = setHookLoginStatusText;
  const isAuthLoading = hookIsAuthLoading;
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);

  const {
    notifications,
    setNotifications,
    isNotificationsOpen,
    setIsNotificationsOpen,
    qaInitialStatusFilter,
    setQaInitialStatusFilter,
    notificationsRef,
    fetchNotifications,
  } = useAppNotifications({
    userId: user?.uid,
    currentUserId: currentUser?.uid,
  });

  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isQuickCreateOpen,
    setIsQuickCreateOpen,
  } = useAppUI();

  const {
    listPage,
    setListPage,
    masterPage,
    setMasterPage,
    backlogPage,
    setBacklogPage,
    auditLogSearch,
    setAuditLogSearch,
    backlogSearch,
    setBacklogSearch,
    backlogPriorityFilter,
    setBacklogPriorityFilter,
  } = useAppPagination();

  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (currentTheme: "light" | "dark" | "system") => {
      if (currentTheme === "dark") {
        root.classList.add("dark");
      } else if (currentTheme === "light") {
        root.classList.remove("dark");
      } else {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        if (mediaQuery.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    applyTheme(theme);
    try {
      safeLocalStorage.setItem("theme", theme);
    } catch {}

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme("system");
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [theme]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Initial Auth Restoration (LanPro v1.3)
    const token = getAuthToken();

    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    // Restoration logic from session user if exists
    let sessionPayload = null;
    try {
      sessionPayload =
        safeSessionStorage.getItem("sessionUser") || safeLocalStorage.getItem("sessionUser");
    } catch (e) {}

    let localUser = null;
    if (sessionPayload) {
      try {
        localUser = JSON.parse(sessionPayload);
        setCurrentUser(localUser);
        setCurrentUserProfile(localUser);
        setUserRole(localUser.role);
        setIsLoggedIn(true);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }

    // Verify token with backend to prevent expired/invalid session and parallel error toasts
    const verifySession = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);

        return;
      }
      try {
        const data = await verifyAuth();
        if (data && data.status === "success") {
          const verifiedUser = data.user || data.data || localUser;
          if (verifiedUser) {
            if (verifiedUser.permissions && typeof verifiedUser.permissions === "string") {
              try {
                verifiedUser.permissions = JSON.parse(verifiedUser.permissions);
              } catch (e) {
                console.error("Failed to parse verifiedUser permissions:", e);
              }
            }
            const rawAvatar =
              verifiedUser.avatar_url || verifiedUser.photoURL || verifiedUser.avatarUrl || null;
            const normalizedUser = {
              ...verifiedUser,
              avatar_url: rawAvatar,
              photoURL: rawAvatar,
              avatarUrl: rawAvatar,
            };
            setCurrentUser(normalizedUser);
            setCurrentUserProfile(normalizedUser);
            setUserRole(normalizedUser.role);
            setIsLoggedIn(true);
            try {
              const isRemember = safeLocalStorage.getItem("rememberUser") === "true";
              if (isRemember) {
                safeLocalStorage.setItem("sessionUser", JSON.stringify(normalizedUser));
              } else {
                safeSessionStorage.setItem("sessionUser", JSON.stringify(normalizedUser));
              }
            } catch (e) {}
          }
        } else {
          console.warn("Token verification returned non-success state");
          await handleLogout(true);
        }
      } catch (e: any) {
        console.warn("Token verification failed (session expired or invalid):", e?.message || e);
        // Silent logout - clear state and go back to login without throwing loud error toasts
        await handleLogout(true);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  // Auth functions now managed by useAuth hook - see hooks/useAuth.ts

  useEffect(() => {
    const handleAuthExpired = () => {
      handleLogout();
    };
    window.addEventListener("auth_expired", handleAuthExpired);
    return () => window.removeEventListener("auth_expired", handleAuthExpired);
  }, []);

  // 'user' dideklarasikan di atas, tepat setelah useAuthHook.

  // User fetching and profile updates now handled by useAuth hook
  // See src/hooks/useAuth.ts for fetchAllUsers and profile update listeners

  const [expandedSprintId, setExpandedSprintId] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState<Record<string, boolean>>({});

  const {
    newSprintName,
    setNewSprintName,
    newSprintGoal,
    setNewSprintGoal,
    newSprintStartDate,
    setNewSprintStartDate,
    newSprintEndDate,
    setNewSprintEndDate,
    resetForm: resetNewSprintForm,
  } = useNewSprintForm();

  const [selectedSprintBacklog, setSelectedSprintBacklog] = useState<Set<string>>(new Set());
  const [inviteEmail, setInviteEmail] = useState("");

  const {
    newProjectName,
    setNewProjectName,
    newProjectKey,
    setNewProjectKey,
    newProjectDescription,
    setNewProjectDescription,
    resetForm: resetNewProjectForm,
  } = useNewProjectForm();

  const {
    newTaskTitle,
    setNewTaskTitle,
    newTaskAssigneeId,
    setNewTaskAssigneeId,
    newTaskType,
    setNewTaskType,
    newTaskCategory,
    setNewTaskCategory,
    newTaskRelease,
    setNewTaskRelease,
    newTaskParentId,
    setNewTaskParentId,
    newTaskSprintId,
    setNewTaskSprintId,
    newTaskStartDate,
    setNewTaskStartDate,
    newTaskEndDate,
    setNewTaskEndDate,
    newTaskDueDate,
    setNewTaskDueDate,
    newTaskDescription,
    setNewTaskDescription,
    newTaskAttachments,
    setNewTaskAttachments,
    newTaskBusinessValue,
    setNewTaskBusinessValue,
    newTaskProjectRisk,
    setNewTaskProjectRisk,
    newTaskStoryPoints,
    setNewTaskStoryPoints,
    newTaskAcceptanceCriteria,
    setNewTaskAcceptanceCriteria,
    newTaskLabels,
    setNewTaskLabels,
    newTaskFigmaUrl,
    setNewTaskFigmaUrl,
    newTaskEnvironment,
    setNewTaskEnvironment,
    resetForm: resetNewTaskForm,
  } = useNewTaskForm();

  const { newTaskStatus, setNewTaskStatus, newTaskPriority, setNewTaskPriority } = useMasterData(
    isLoggedIn,
    currentUser?.uid
  );

  // Menghubungkan setter asli ke wrapper stabil yang sudah diberikan ke useAuthHook.
  masterDataSettersRef.current.setNewTaskStatus = setNewTaskStatus;
  masterDataSettersRef.current.setNewTaskPriority = setNewTaskPriority;

  const [allProjectTasksForStats, setAllProjectTasksForStats] = useState<Task[]>([]);

  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const wrapAppSubmit = (key: string, fn: () => Promise<void> | void) => async () => {
    setIsSubmitting((prev) => ({ ...prev, [key]: true }));
    try {
      await fn();
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [key]: false }));
    }
  };
  // We keep a history of the last view before opening issue detail so we can go back

  const setIsTaskDetailModalOpen = (open: boolean) => {
    if (open) {
      if (currentView !== "issueDetail") {
        setPreviousView(currentView);
      }
      setCurrentView("issueDetail" as any);
    } else {
      setCurrentView(previousView as any);
    }
  };

  const handleSetIsTaskDetailModalOpen = setIsTaskDetailModalOpen;

  /**
   * Membuka detail pengguna sambil MENGINGAT asalnya — item #161.
   *
   * `onBack` di `UserDetailView` dulu dikeraskan ke `"users"`, jadi tombol
   * Kembali selalu bermuara di panel admin Manajemen Pengguna, dari mana pun
   * layar itu dibuka. Untuk pengguna biasa yang membuka profilnya sendiri
   * lewat footer sidebar atau layar sambutan, satu klik Kembali melemparkannya
   * ke daftar SELURUH pengguna — layar yang menunya sendiri disembunyikan
   * untuknya. Dipakai pola yang sudah ada untuk `issueDetail`, bukan state
   * baru.
   */
  const bukaDetailPengguna = (target: any) => {
    if (currentView !== "userDetail") {
      setPreviousView(currentView);
    }
    setSelectedUserForDetail(target);
    setCurrentView("userDetail" as any);
  };

  const {
    socketConnected,
    setSocketConnected,
    apiLatency,
    setApiLatency,
    latencyStatus,
    setLatencyStatus,
    isSyncing,
    setIsSyncing,
    cacheStats,
    setCacheStats,
    lastSyncedTime,
    setLastSyncedTime,
    checkLatency,
  } = useAppSync();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl instanceof HTMLElement && activeEl.isContentEditable) ||
          activeEl.getAttribute("role") === "textbox");

      if (isInputActive) {
        return;
      }

      // 1. ? -> Keyboard Shortcuts Modal
      if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 2. n -> New Issue / Task modal
      if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsNewTaskModalOpen(true);
        return;
      }

      // 3. p -> Create Project modal
      if ((e.key === "p" || e.key === "P") && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsNewProjectModalOpen(true);
        return;
      }

      // 4. / -> Focus Search Input
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder*="Search" i], input[placeholder*="search" i], input[type="search"]'
        );
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
          (searchInput as HTMLInputElement).select();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync selectedTaskForDetail when tasks state changes (e.g. from real-time socket refresh)
  useEffect(() => {
    if (currentView === "issueDetail" && selectedTaskForDetail) {
      const updatedTask = tasks.find((t) => t.id === selectedTaskForDetail.id);
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(selectedTaskForDetail)) {
        setSelectedTaskForDetail(updatedTask);
      }
    }
  }, [tasks, currentView, selectedTaskForDetail]);

  // Attachments & Links states
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newExternalLinkTitle, setNewExternalLinkTitle] = useState("");
  const [newExternalLinkUrl, setNewExternalLinkUrl] = useState("");
  const [isAddingExternalLink, setIsAddingExternalLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);

  // Use store for upload progress
  const uploadProgress = useNotificationStore((s) => s.uploadProgress);
  const setUploadProgress = useNotificationStore((s) => s.setUploadProgress);
  const updateUploadProgress = useNotificationStore((s) => s.updateUploadProgress);

  // Linked Tasks states
  const [isAddingTaskLink, setIsAddingTaskLink] = useState(false);
  const [taskLinkRelation, setTaskLinkRelation] = useState<
    "blocks" | "is_blocked_by" | "relates_to" | "clones" | "is_cloned_by"
  >("blocks");
  const [taskLinkTargetId, setTaskLinkTargetId] = useState("");

  const { selectedTaskIds, setSelectedTaskIds } = useTaskSelection();

  // projectMembers dideklarasikan di atas, sebelum useAuthHook.
  const comments = useNotificationStore((s) => s.comments);
  const newCommentText = useNotificationStore((s) => s.newCommentText);
  const setComments = useNotificationStore((s) => s.setComments);
  const setNewCommentText = useNotificationStore((s) => s.setNewCommentText);
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    query: string;
    index: number;
  }>({ active: false, query: "", index: -1 });
  // confirmAction dideklarasikan di atas, sebelum useAuthHook.

  const exportTasksToCSV = () => {
    if (!selectedProject || tasks.length === 0) {
      toast.error(t("toast.noTasksToExport"));
      return;
    }
    const headers = [
      "Task ID",
      "Type",
      "Title",
      "Status",
      "Priority",
      "Category",
      "Assignee",
      "Reporter",
      "Sprint ID",
      "Created At",
      "End Date",
    ];
    const csvContent = [
      headers.join(","),
      ...tasks.map((t) => {
        // Ekspor CSV sengaja seluruhnya berbahasa Inggris, tidak mengikuti tombol
        // bahasa: seluruh headernya Inggris dan sel lain memakai "Unknown", jadi
        // satu sel berbahasa Indonesia membuat berkasnya campur. Menerjemahkan
        // headernya pun bukan pilihan — alat yang mem-parsing kolom akan pecah.
        const assigneeName =
          projectMembers.find((m) => m.uid === t.assigneeId)?.displayName || "Unassigned";
        const reporterName =
          (t as any).reporter?.name ||
          (t as any).reporter?.displayName ||
          projectMembers.find((m) => m.uid === t.reporterId || (m as any).id === t.reporterId)
            ?.displayName ||
          "Unknown";
        const createdDate = t.createdAt ? format(ensureDate(t.createdAt), "yyyy-MM-dd HH:mm") : "";
        const endDate = t.endDate ? format(ensureDate(t.endDate), "yyyy-MM-dd") : "";
        return [
          t.key,
          t.type || "Task",
          '"' + (t.title || "").replace(/"/g, '""') + '"',
          t.status,
          t.priority,
          t.category || "",
          '"' + assigneeName + '"',
          '"' + reporterName + '"',
          t.sprintId || "",
          createdDate,
          endDate,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Tasks_${selectedProject.key}_${format(new Date(), "yyyyMMdd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("toast.exportCsvOk"));
  };

  // Auth functions (handleManualLogin, handleRegister) are now managed by useAuth hook
  // See src/hooks/useAuth.ts for implementation

  /**
   * #74 — penjaga respons BASI.
   *
   * Efek pengambil data bergantung pada `[selectedProject?.id]` dan memakai
   * jeda 300 ms dengan `clearTimeout` di cleanup. Jeda itu menahan permintaan
   * yang BELUM berangkat — tetapi tidak membatalkan yang SUDAH berangkat, dan
   * hasilnya tetap ditulis ke state tanpa memeriksa apakah proyeknya masih
   * sama.
   *
   * Akibatnya berpindah dari proyek A ke B di dalam jendela permintaan membuat
   * data A menimpa data B, dan pengguna melihat isi proyek yang salah tanpa
   * satu pun galat.
   *
   * Ref ini menyimpan proyek yang SEDANG dilihat. Tiap pengambil menangkap id
   * saat permintaan berangkat, lalu membandingkannya sebelum menulis state —
   * pola yang sama dengan penjaga `isMounted` pada `fetchMembers`, tetapi
   * menjaga hal yang berbeda: bukan komponen yang sudah dilepas, melainkan
   * proyek yang sudah berganti.
   */
  const proyekAktifRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    proyekAktifRef.current = selectedProject?.id;
  }, [selectedProject?.id]);

  /** `true` bila proyeknya belum berganti sejak permintaan berangkat. */
  const masihProyekSama = (idSaatBerangkat: string | undefined) =>
    proyekAktifRef.current === idSaatBerangkat;

  const fetchProjects = async () => {
    if (!getAuthToken()) return;
    const effectiveUserId = currentUser?.uid || user?.uid;
    const canSeeAllProjects = userRole === "admin" || userRole === "head";
    if (!effectiveUserId && !canSeeAllProjects) return;

    try {
      const url = canSeeAllProjects ? "/api/projects" : `/api/projects?userId=${effectiveUserId}`;
      const data = await apiRequest(url);

      if (data.status === "success") {
        const projs = data.data as Project[];
        setProjects(projs);
        setSelectedProject((prev) => {
          if (projs.length === 0) return null;
          if (!prev) return projs[0];
          const updated = projs.find((p) => p.id === prev.id);
          return updated || projs[0];
        });
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("429") || msg.includes("Server error: 429")) {
        console.warn(
          "fetchProjects: Terlalu banyak permintaan (429). Mencoba lagi dalam 5 detik..."
        );
        setTimeout(fetchProjects, 5000);
        return;
      }
      if (isNetworkOrAuthError(e)) {
        console.warn("fetchProjects: Sesi pengguna berakhir atau jaringan tidak tersedia.");
      } else {
        console.error("fetchProjects error:", e);
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    if (projects.length === 0) {
      setIsInitialDataLoading(true);
    }
    const timer = setTimeout(async () => {
      try {
        await fetchProjects();
      } catch (e) {
        console.error("Error fetching projects during initial load:", e);
      } finally {
        setIsInitialDataLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.uid, userRole, isLoggedIn]);

  const fetchMasterData = async () => {
    if (!getAuthToken()) return;
    try {
      const data = await fetchMasterDataAll();
      if (data.status === "success") {
        const result = data.data as MasterData[];
        const uniqueData = Array.from(
          new Map(result.map((m) => [`${m.type}-${m.label}`, m])).values()
        );
        setMasterData(uniqueData);

        if (uniqueData.length > 0) {
          const statuses = uniqueData.filter((d) => d.type === "status");
          const priorities = uniqueData.filter((d) => d.type === "priority");
          if (statuses.length > 0 && !newTaskStatus) {
            setNewTaskStatus(statuses[0].label);
          }
          if (priorities.length > 0 && !newTaskPriority) {
            setNewTaskPriority(priorities[0].label);
          }
        }
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (isNetworkOrAuthError(error)) {
        console.warn("fetchMasterData: Sesi pengguna berakhir atau jaringan tidak tersedia.");
      } else {
        console.error("fetchMasterData error", error);
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setTimeout(() => {
      fetchMasterData();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser?.uid, isLoggedIn]);

  const fetchTasks = async () => {
    const proyekSaatBerangkat = selectedProject?.id;
    if (!getAuthToken()) return;
    if (!selectedProject) {
      setTasks([]);
      return;
    }
    const isAdmin = hasPermission(
      effectiveRole,
      "configuration",
      "update",
      false,
      currentUserProfile?.permissions
    );
    const effectiveUserId = currentUser?.uid || user?.uid;

    try {
      const data = await fetchTasksApi(selectedProject.id);
      if (data.status === "success") {
        const allTasks = data.data as Task[];
        const uniqueAllTasks = Array.from(
          new Map((allTasks || []).filter((t) => t && t.id).map((t) => [t.id, t])).values()
        );
        setAllProjectTasksForStats(uniqueAllTasks);

        const effectiveUsername = currentUser?.username || currentUserProfile?.username;
        const effectiveEmail = currentUser?.email || currentUserProfile?.email;
        const effectiveDisplayName = currentUser?.displayName || currentUserProfile?.displayName;
        const effectiveNamaLengkap =
          (currentUser as any)?.nama_lengkap || (currentUserProfile as any)?.nama_lengkap;

        const validIdentifiers = [
          effectiveUserId,
          currentUser?.uid,
          currentUser?.id,
          currentUserProfile?.uid,
          currentUserProfile?.id,
          effectiveUsername,
          effectiveEmail,
          effectiveDisplayName,
          effectiveNamaLengkap,
        ].filter(Boolean);

        if (!masihProyekSama(proyekSaatBerangkat)) return;
        setTasks(uniqueAllTasks);
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      if (isNetworkOrAuthError(e)) {
        console.warn("fetchTasks: Server is temporarily unavailable or connection is offline.");
      } else {
        console.error("fetchTasks error:", e);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id, userRole, currentUser?.uid]);

  const realTimeRefs = useRef<any>({});

  useEffect(() => {
    realTimeRefs.current = {
      fetchProjects,
      fetchAllUsers,
      fetchMasterData,
      fetchTasks,
      fetchSprints,
      fetchActivityLogs,
      fetchComments,
      fetchNotifications,
      selectedProject,
    };
  });

  useEffect(() => {
    // #50 — server kini mewajibkan token pada handshake Socket.IO.
    //
    // Efek ini DULU berdependensi `[]`, artinya socket dibuat sekali saat
    // aplikasi mount — yaitu di layar login, saat token belum ada — dan tidak
    // pernah dibuat ulang setelah login berhasil. Dengan gerbang autentikasi di
    // server, dependensi kosong itu akan mematikan seluruh realtime bagi
    // pengguna sah. Karena itu efek ini sekarang bergantung pada token dan
    // dijalankan ulang begitu token berubah (login, force-logout, keluar).
    const jwtToken = getAuthToken();

    // Tanpa token, jangan menyambung sama sekali. Menyambung lalu ditolak hanya
    // menghasilkan percobaan ulang dan kebisingan di console layar login.
    if (!jwtToken) {
      setSocketConnected(false);
      return;
    }

    // Vercel friendly socket config
    let socket: any;
    try {
      socket = io({
        auth: { token: jwtToken },
        reconnectionAttempts: 3,
        timeout: 5000,
        transports: ["polling", "websocket"],
      });

      // Safe handlers to prevent unhandled rejections
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe socket error caught internally:", err);
      });
      socket.on("connect_error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe socket connect_error caught internally:", err);
      });

      socket.onerror = (err: any) => {
        console.warn("[SOCKET ERROR] Native-like socket onerror caught internally:", err);
      };
      socket.onclose = () => {};

      if (socket.io) {
        socket.io.on("error", (err: any) => {
          console.warn("[SOCKET IO ERROR] Engine.io error suppressed:", err);
        });
      }
      if (socket.io && socket.io.engine) {
        socket.io.engine.on("error", (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Engine error suppressed:", err);
        });
        socket.io.engine.onerror = (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Engine onerror suppressed:", err);
        };
        socket.io.engine.onclose = () => {};
      }
    } catch (err) {
      console.error("[SOCKET FATAL] Failed to initialize socket safely:", err);
      return;
    }

    setSocket(socket);

    socket.on("FORCE_LOGOUT_EVENT", async (data: any) => {
      if (data.browserSessionId === BROWSER_SESSION_ID) {
        return;
      }
      const storedUser = safeLocalStorage.getItem("sessionUser");
      let activeUser = currentUser;
      if (!activeUser && storedUser) {
        try {
          activeUser = JSON.parse(storedUser);
        } catch (e) {
          activeUser = null;
        }
      }
      const currentUserId = activeUser?.id || activeUser?.uid;
      const currentToken = getAuthToken();

      if (!currentUserId || currentUserId.toString() !== data.userId || !currentToken) {
        return;
      }

      // #51 — server tidak lagi mengirim token sesi baru; ia mengirim SIDIK
      // JARI-nya. Yang perlu dijawab di sini cuma satu: apakah sesi baru itu
      // aku sendiri? Kalau ya, jangan keluarkan diri sendiri.
      //
      // Bila sidik jari tak bisa dihitung (crypto.subtle tidak tersedia, atau
      // server versi lama tidak mengirimkannya), pilihannya jatuh ke TIDAK
      // mengeluarkan pengguna. Gagal dengan membiarkan orang tetap bekerja jauh
      // lebih baik daripada gagal dengan melempar semua orang ke layar login.
      let sidikTokenSaya: string | null = null;
      try {
        if (globalThis.crypto?.subtle) {
          const bytes = new TextEncoder().encode(currentToken);
          const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
          sidikTokenSaya = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        }
      } catch {
        sidikTokenSaya = null;
      }

      if (!data.sidikTokenBaru || !sidikTokenSaya) {
        return;
      }

      if (sidikTokenSaya !== data.sidikTokenBaru) {
        toast.error(t("toast.sessionEndedElsewhere"));
        handleLogout(true);
      }
    });

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("connect_error", (err: any) => {
      // Suppress loud socket errors to avoid Vercel console spam
      setSocketConnected(false);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("project_updated", (event: any) => {
      const refs = realTimeRefs.current;
      if (event && event.projectId === refs.selectedProject?.id) {
        refs.fetchTasks();
      }
    });

    socket.on("data_changed", (event: any) => {
      const path = event.path || "";
      const refs = realTimeRefs.current;

      if (path.includes("/tasks") || path.includes("/sprint-tasks")) {
        if (refs.selectedProject) {
          refs.fetchTasks();
          refs.fetchSprints();
          refs.fetchActivityLogs();
        }
      }
      if (path.includes("/activity")) {
        if (refs.selectedProject) refs.fetchActivityLogs();
      }
      if (path.includes("/comments")) {
        if (refs.selectedProject) {
          refs.fetchComments();
          refs.fetchActivityLogs();
        }
      }
      if (path.includes("/projects") && !path.includes("/tasks") && !path.includes("/sprints")) {
        refs.fetchProjects();
      }
      if (path.includes("/users") || path.includes("/project-members")) {
        refs.fetchAllUsers();
      }
      if (path.includes("/sprints")) {
        if (refs.selectedProject) {
          refs.fetchSprints();
          refs.fetchActivityLogs();
        }
      }
      if (path.includes("/master-data")) {
        // Debounce master data fetch
        if (!refs.masterDataDebounceTimer) {
          refs.masterDataDebounceTimer = setTimeout(() => {
            refs.fetchMasterData();
            refs.masterDataDebounceTimer = null;
          }, 1000);
        }
      }
      if (path.includes("/notifications")) {
        // Debounce notifications fetch
        if (!refs.notificationsDebounceTimer) {
          refs.notificationsDebounceTimer = setTimeout(() => {
            refs.fetchNotifications();
            refs.notificationsDebounceTimer = null;
          }, 1000);
        }
      }
      if (path.includes("/db-query")) {
        // A raw query might have modified anything. Safest is to refresh all.
        refs.fetchProjects();
        refs.fetchAllUsers();

        // Debounce master data
        if (!refs.masterDataDebounceTimer) {
          refs.masterDataDebounceTimer = setTimeout(() => {
            refs.fetchMasterData();
            refs.masterDataDebounceTimer = null;
          }, 1000);
        }

        if (refs.selectedProject) {
          refs.fetchTasks();
          refs.fetchSprints();
          refs.fetchActivityLogs();
          refs.fetchComments();
        }

        // Debounce notifications
        if (!refs.notificationsDebounceTimer) {
          refs.notificationsDebounceTimer = setTimeout(() => {
            refs.fetchNotifications();
            refs.notificationsDebounceTimer = null;
          }, 1000);
        }
      }
    });

    socket.on("user_avatar_updated", (event: any) => {
      const refs = realTimeRefs.current;
      if (refs && typeof refs.fetchAllUsers === "function") {
        refs.fetchAllUsers();
      }
      if (event && event.userId) {
        if (
          refs &&
          refs.currentUser &&
          (refs.currentUser.id === event.userId || refs.currentUser.uid === event.userId)
        ) {
          const updated = {
            ...refs.currentUser,
            photoURL: event.avatar_url || event.photoURL,
            avatar_url: event.avatar_url || event.photoURL,
            avatarUrl: event.avatar_url || event.photoURL,
          };
          setCurrentUser(updated);
          setCurrentUserProfile(updated);
          safeLocalStorage.setItem("sessionUser", JSON.stringify(updated));
        }
      }
    });

    socket.on("PRESENCE_UPDATE", (users: any[]) => {
      // Deprecated in favor of global presence_sync
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
    // Bergantung pada identitas pengguna, bukan pada token mentah: nilai token
    // tidak disimpan di state React, jadi perubahannya tidak memicu render.
    // `currentUser?.id` berubah tepat pada dua peristiwa yang penting di sini —
    // login berhasil dan keluar — dan pada saat itulah socket perlu dibuat ulang
    // membawa token yang baru.
  }, [currentUser?.id]);

  // Serverless Heartbeat Fallback
  useEffect(() => {
    if (!currentUser) return;
    if (!socketConnected) {
      sendHeartbeat().catch(() => {});
    }
  }, [socketConnected, currentUser]);

  useEffect(() => {
    if (!socket || !selectedProject || !currentUser) return;

    // Join Project Room for real-time presence (v1.3)
    socket.emit("join_project", {
      projectId: selectedProject.id,
      user: currentUser,
    });

    return () => {
      socket.emit("leave_project", {
        projectId: selectedProject.id,
        userId: currentUser.uid || currentUser.id,
      });
    };
  }, [socket, selectedProject?.id, currentUser?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchMembers = async () => {
      if (!isLoggedIn || !getAuthToken()) return;
      try {
        const data = await fetchUsers();
        if (data.status === "success") {
          const allUsersList = data.data || [];
          if (
            selectedProject &&
            Array.isArray(selectedProject.members) &&
            selectedProject.members.length > 0
          ) {
            const m = allUsersList.filter(
              (u: any) =>
                selectedProject.members.includes(u.uid) || selectedProject.members.includes(u.id)
            );
            if (isMounted) setProjectMembers(m.length > 0 ? m : allUsersList);
          } else {
            if (isMounted) setProjectMembers(allUsersList);
          }
        }
      } catch (error: any) {
        const msg = error?.message || String(error);
        if (isNetworkOrAuthError(error)) {
          console.warn("fetchMembers: Sesi pengguna berakhir atau jaringan tidak tersedia.");
        } else {
          console.error("fetchMembers error:", error);
        }
      }
    };
    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [selectedProject?.members?.join(","), selectedProject?.id, isLoggedIn]);

  const fetchSprints = async () => {
    const proyekSaatBerangkat = selectedProject?.id;
    if (!getAuthToken()) return;
    if (!selectedProject) {
      setSprints([]);
      return;
    }

    try {
      const data = await fetchSprintsApi(selectedProject.id);
      if (data.status === "success") {
        if (!masihProyekSama(proyekSaatBerangkat)) return;
        setSprints(data.data as Sprint[]);
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("429") || msg.includes("Server error: 429")) {
        console.warn(
          "fetchSprints: Terlalu banyak permintaan (429). Mencoba lagi dalam 5 detik..."
        );
        setTimeout(fetchSprints, 5000);
        return;
      }
      if (isNetworkOrAuthError(e)) {
        console.warn("fetchSprints: Sesi pengguna berakhir atau jaringan tidak tersedia.");
      } else {
        console.error("fetchSprints error:", e);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSprints();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (newProjectName && !newProjectKey) {
      const suggestedKey = newProjectName
        .split(" ")
        .filter((word) => word.length > 0)
        .map((word) => word[0])
        .filter((char) => char && char.match(/[a-zA-Z]/))
        .join("")
        .toUpperCase()
        .slice(0, 5);
      if (suggestedKey) {
        setNewProjectKey(suggestedKey);
      }
    }
  }, [newProjectName]);

  const fetchComments = async () => {
    const proyekSaatBerangkat = selectedProject?.id;
    if (!getAuthToken()) return;
    if (!selectedProject || !selectedTaskForDetail) {
      setComments([]);
      return;
    }
    try {
      const data = await fetchTaskComments(selectedProject.id, selectedTaskForDetail.id);
      if (data.status === "success") {
        if (!masihProyekSama(proyekSaatBerangkat)) return;
        setComments(data.data as Comment[]);
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (isNetworkOrAuthError(error)) {
        console.warn("fetchComments: Sesi pengguna berakhir atau jaringan tidak tersedia.");
      } else {
        console.error("fetchComments error:", error);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComments();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id, selectedTaskForDetail?.id]);

  const fetchActivityLogs = async () => {
    const proyekSaatBerangkat = selectedProject?.id;
    if (!getAuthToken()) return;
    if (!selectedProject) {
      setActivityLogs([]);
      return;
    }
    try {
      const data = await fetchActivity(selectedProject.id);
      if (data.status === "success") {
        if (!masihProyekSama(proyekSaatBerangkat)) return;
        setActivityLogs(data.data as ActivityLog[]);
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("429") || msg.includes("Server error: 429")) {
        console.warn(
          "fetchActivityLogs: Terlalu banyak permintaan (429). Mencoba lagi dalam 5 detik..."
        );
        setTimeout(fetchActivityLogs, 5000);
        return;
      }
      if (isNetworkOrAuthError(error)) {
        console.warn("fetchActivityLogs: Sesi pengguna berakhir atau jaringan tidak tersedia.");
      } else {
        console.error("fetchActivityLogs error:", error);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivityLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedProject?.id]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    toast.info(t("toast.syncStarting"));
    try {
      await Promise.all([fetchProjects(), fetchMasterData(), fetchAllUsers()]);
      if (selectedProject) {
        await Promise.all([fetchTasks(), fetchSprints(), fetchActivityLogs()]);
      }
      setLastSyncedTime(new Date().toLocaleTimeString());
      setCacheStats(CacheManager.getStats());
      toast.success(t("toast.syncDone"));
    } catch (e: any) {
      toast.error(t("toast.syncFailed") + (e?.message || e));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Initialize modal states when modals open
    if (isNewSprintModalOpen && !newSprintName) {
      setNewSprintName(`Fase ${sprints.length + 1}`);
    }
  }, [isNewSprintModalOpen, sprints.length]);

  const handleCreateSprint = async () => {
    if (!selectedProject) return;
    const finalSprintName = newSprintName.trim() || `Fase ${sprints.length + 1}`;

    if (newSprintStartDate && newSprintEndDate) {
      if (new Date(newSprintStartDate) > new Date(newSprintEndDate)) {
        setConfirmAction({
          isOpen: true,
          title: t("ui2.dateValidation"),
          message:
            "Tanggal selesari target fase tidak boleh sebelum tanggal mulai target fase (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }
    }

    try {
      const data = await createSprint(selectedProject.id, {
        name: finalSprintName,
        goal: newSprintGoal,
        startDate: newSprintStartDate,
        endDate: newSprintEndDate,
        status: "planned",
      });

      const sprintId = data.data.id;

      // Assign selected backlog items

      // Sprint backlog assignment
      if (selectedSprintBacklog.size > 0) {
        const promises = Array.from(selectedSprintBacklog as Set<string>).map((taskId) =>
          updateTask(selectedProject.id, taskId, { sprintId })
            .then(() => {
              /* task updated */
            })
            .catch((err) => console.error("Failed to update task:", taskId, err))
        );
        await Promise.all(promises);

        setTasks((prevTasks) =>
          prevTasks.map((t) => (selectedSprintBacklog.has(t.id) ? { ...t, sprintId } : t))
        );
      }

      resetNewSprintForm();
      setSelectedSprintBacklog(new Set());
      setIsNewSprintModalOpen(false);
      fetchSprints();
      toast.success(t("toast.sprintCreated"));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create sprint");
    }
  };

  const handleUpdateSprint = async () => {
    if (!selectedProject || !editingSprint) return;

    if (editingSprint.startDate && editingSprint.endDate) {
      if (ensureDate(editingSprint.startDate) > ensureDate(editingSprint.endDate)) {
        setConfirmAction({
          isOpen: true,
          title: t("ui2.dateValidation"),
          message:
            "Tanggal selesai target fase tidak boleh sebelum tanggal mulai target fase (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }
    }

    try {
      const data = await updateSprint(selectedProject.id, editingSprint.id, {
        name: editingSprint.name,
        goal: editingSprint.goal,
        startDate: editingSprint.startDate,
        endDate: editingSprint.endDate,
        status: editingSprint.status,
      });
      if (data.status !== "success") throw new Error(data.message);

      fetchSprints();

      setIsEditSprintModalOpen(false);
      toast.success(t("toast.sprintUpdated"));
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.sprintUpdateFailed") + (e.message || e));
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    if (!selectedProject) return;
    if (
      !hasPermission(
        userRoleForProject,
        "planning",
        "update",
        false,
        currentUserProfile?.permissions
      )
    ) {
      toast.error(t("toast.noPermStartSprint"));
      return;
    }

    try {
      const data = await updateSprint(selectedProject.id, sprintId, { status: "active" });
      if (data.status === "success") {
        fetchSprints();
        toast.success(t("toast.sprintStarted"));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to start sprint");
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!selectedProject) return;
    if (
      !hasPermission(
        userRoleForProject,
        "planning",
        "update",
        false,
        currentUserProfile?.permissions
      )
    ) {
      toast.error(t("toast.noPermCompleteSprint"));
      return;
    }

    const sprintToComplete = sprints.find((s) => s.id === sprintId);
    if (!sprintToComplete) return;

    const isConfirmed = await confirmDeleteAlert(
      t("alerts.completeSprintTitle"),
      t("alerts.completeSprintText", { name: sprintToComplete.name })
    );

    if (!isConfirmed) return;

    const loadingToast = toast.loading(t("toast.completingSprint"));

    try {
      const sprintTasks = tasks.filter((t) => t.sprintId === sprintId);
      const undoneTasks = sprintTasks.filter(
        (t) =>
          !t.status.toLowerCase().includes("done") && !t.status.toLowerCase().includes("completed")
      );

      if (undoneTasks.length > 0) {
        const promises = undoneTasks.map((t) =>
          updateTask(selectedProject.id, t.id, { sprintId: null })
        );
        await Promise.all(promises);
        await fetchTasks();
      }

      const data = await updateSprint(selectedProject.id, sprintId, { status: "completed" });

      if (data.status === "success") {
        fetchSprints();

        await logActivity("sprint_completed", `Fase ${sprintToComplete.name} telah diselesaikan.`);
        showSuccessAlert(
          t("alerts.successTitle"),
          t("alerts.sprintCompleted", { name: sprintToComplete.name })
        );
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal menyelesaikan fase");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!selectedProject) return;

    // Check if there are tasks in this sprint
    const sprintTasks = tasks.filter((t) => t.sprintId === sprintId);

    const isConfirmed = await confirmDeleteAlert(
      t("alerts.deleteSprintTitle"),
      t("alerts.deleteSprintText", {
        extra:
          sprintTasks.length > 0
            ? t("alerts.deleteSprintExtra", { count: sprintTasks.length })
            : "",
      })
    );

    if (!isConfirmed) return;

    const loadingToast = toast.loading(t("toast.deletingSprint"));

    try {
      // 1. Move tasks back to backlog
      const promises = sprintTasks.map((t) =>
        updateTask(selectedProject.id, t.id, { sprintId: null })
      );
      await Promise.all(promises);

      // 2. Delete the sprint
      await deleteSprint(selectedProject.id, sprintId);

      await fetchTasks();
      fetchSprints();

      showSuccessAlert(t("alerts.successTitle"), t("alerts.sprintDeleted"));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal menghapus fase");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const moveTaskToSprint = async (taskId: string, sprintId: string | null) => {
    if (!selectedProject) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const isUserMatch = (fieldVal: string | null | undefined) => {
        if (!fieldVal) return false;
        const f = fieldVal.toLowerCase().trim();
        const options = [
          currentUser?.uid,
          currentUser?.id,
          currentUser?.username,
          currentUserProfile?.uid,
          currentUserProfile?.id,
          currentUserProfile?.username,
          user?.uid,
          user?.id,
          user?.username,
        ]
          .filter(Boolean)
          .map((s: string) => s.toLowerCase().trim());
        return options.includes(f);
      };

      const parentTask = task.parentId ? tasks.find((t) => t.id === task.parentId) : null;
      const isParentReporter = parentTask && isUserMatch(parentTask.reporterId);

      const isDirectReporter = isUserMatch(task.reporterId);
      const isAdmin = ["admin", "manager", "owner"].includes(userRoleForProject);

      const isAuthorizedSprint = isDirectReporter || isParentReporter || isAdmin;

      if (!isAuthorizedSprint) {
        toast.error(t("toast.noPermMoveTask"));
        return;
      }

      if (sprintId) {
        const targetSprint = sprints.find((s) => s.id === sprintId);
        if (targetSprint && targetSprint.startDate && targetSprint.endDate) {
          const sprintStart = ensureDate(targetSprint.startDate);
          const sprintEnd = ensureDate(targetSprint.endDate);

          if (task.startDate || task.endDate || task.dueDate) {
            const tStart = task.startDate ? ensureDate(task.startDate) : null;
            const tEnd = task.endDate
              ? ensureDate(task.endDate)
              : task.dueDate
                ? ensureDate(task.dueDate)
                : null;

            // Set boundaries for sprint times (start of day, end of day)
            sprintStart.setHours(0, 0, 0, 0);
            sprintEnd.setHours(23, 59, 59, 999);

            if (tStart && tEnd) {
              if (tStart < sprintStart || tEnd > sprintEnd) {
                setConfirmAction({
                  isOpen: true,
                  title: t("ui2.dateValidation"),
                  message: `Tanggal task (${format(tStart, "dd MMM")} - ${format(tEnd, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                  onConfirm: () => {},
                  isAlert: true,
                });
                return;
              }
            } else if (tStart) {
              if (tStart < sprintStart || tStart > sprintEnd) {
                setConfirmAction({
                  isOpen: true,
                  title: t("ui2.dateValidation"),
                  message: `Waktu mulai task (${format(tStart, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                  onConfirm: () => {},
                  isAlert: true,
                });
                return;
              }
            } else if (tEnd) {
              if (tEnd < sprintStart || tEnd > sprintEnd) {
                setConfirmAction({
                  isOpen: true,
                  title: t("ui2.dateValidation"),
                  message: `Eksekusi task melebih timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                  onConfirm: () => {},
                  isAlert: true,
                });
                return;
              }
            }
          }
        }
      }
    }

    try {
      const data = await updateTask(selectedProject.id, taskId, { sprintId });
      if (data.status !== "success") throw new Error(data.message);

      // Update local state immediately
      setTasks((prevTasks) => prevTasks.map((t) => (t.id === taskId ? { ...t, sprintId } : t)));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to move task");
    }
  };

  const bulkMoveTasksToSprint = async (taskIds: string[], sprintId: string | null) => {
    if (!selectedProject) return;

    if (
      !hasPermission(
        userRoleForProject,
        "planning",
        "update",
        false,
        currentUserProfile?.permissions
      )
    ) {
      toast.error(t("toast.noPermAction"));
      return;
    }

    if (sprintId) {
      const targetSprint = sprints.find((s) => s.id === sprintId);
      if (targetSprint && targetSprint.startDate && targetSprint.endDate) {
        const sprintStart = ensureDate(targetSprint.startDate);
        const sprintEnd = ensureDate(targetSprint.endDate);
        sprintStart.setHours(0, 0, 0, 0);
        sprintEnd.setHours(23, 59, 59, 999);

        for (const taskId of taskIds) {
          const task = tasks.find((t) => t.id === taskId);
          if (task && (task.startDate || task.endDate || task.dueDate)) {
            const tStart = task.startDate ? ensureDate(task.startDate) : null;
            const tEnd = task.endDate
              ? ensureDate(task.endDate)
              : task.dueDate
                ? ensureDate(task.dueDate)
                : null;

            if (tStart && tEnd && (tStart < sprintStart || tEnd > sprintEnd)) {
              setConfirmAction({
                isOpen: true,
                title: t("ui2.dateValidation"),
                message: `Ada task yang melewati timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                onConfirm: () => {},
                isAlert: true,
              });
              return;
            } else if (tStart && (tStart < sprintStart || tStart > sprintEnd)) {
              setConfirmAction({
                isOpen: true,
                title: t("ui2.dateValidation"),
                message: `Waktu mulai task di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                onConfirm: () => {},
                isAlert: true,
              });
              return;
            } else if (tEnd && (tEnd < sprintStart || tEnd > sprintEnd)) {
              setConfirmAction({
                isOpen: true,
                title: t("ui2.dateValidation"),
                message: `Eksekusi task melebih timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
                onConfirm: () => {},
                isAlert: true,
              });
              return;
            }
          }
        }
      }
    }

    try {
      const promises = taskIds.map((taskId) =>
        updateTask(selectedProject.id, taskId, { sprintId })
      );
      await Promise.all(promises);
      await fetchTasks();
      toast.success(t("toast.tasksMoved", { count: taskIds.length }));
      setSelectedTaskIds(new Set());
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to move tasks");
    }
  };

  const handleCreateProject = async () => {
    const effectiveUserId = currentUser?.uid || user?.uid;
    if (!effectiveUserId || !newProjectName.trim() || !newProjectKey.trim()) {
      if (!effectiveUserId) toast.error(t("toast.sessionNotFound"));
      return;
    }
    try {
      const data = await createProject({
        name: newProjectName,
        projectKey: newProjectKey.toUpperCase(),
        description: newProjectDescription,
        ownerId: effectiveUserId,
        status: "Active",
      });

      if (data.status === "success") {
        resetNewProjectForm();
        setIsNewProjectModalOpen(false);
        toast.success(t("toast.projectCreated"));
        fetchProjects();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create project");
    }
  };

  const handleCreateTask = async () => {
    const activeUid = currentUser?.uid || user?.uid;
    if (!selectedProject || !newTaskTitle.trim() || !activeUid) return;

    if (
      !hasPermission(
        userRoleForProject,
        "issueList",
        "create",
        false,
        currentUserProfile?.permissions
      )
    ) {
      toast.error(t("toast.noPermAddTask"));
      return;
    }

    if (newTaskParentId && (newTaskStartDate || newTaskEndDate)) {
      const parentEpic = tasks.find((t) => t.id === newTaskParentId);
      if (parentEpic && (parentEpic.startDate || parentEpic.endDate)) {
        const epicStart = parentEpic.startDate ? new Date(parentEpic.startDate).getTime() : null;
        const epicEnd = parentEpic.endDate ? new Date(parentEpic.endDate).getTime() : null;
        const taskStart = newTaskStartDate ? new Date(newTaskStartDate).getTime() : null;
        const taskEnd = newTaskEndDate ? new Date(newTaskEndDate).getTime() : null;

        if (epicStart && taskStart && taskStart < epicStart) {
          setConfirmAction({
            isOpen: true,
            title: t("ui2.epicTimelineLimit"),
            message:
              "Peringatan: Tanggal mulai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
        if (epicEnd && taskStart && taskStart > epicEnd) {
          setConfirmAction({
            isOpen: true,
            title: t("ui2.epicTimelineLimit"),
            message:
              "Peringatan: Tanggal mulai task tidak boleh melebihi rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
        if (epicStart && taskEnd && taskEnd < epicStart) {
          setConfirmAction({
            isOpen: true,
            title: t("ui2.epicTimelineLimit"),
            message:
              "Peringatan: Tanggal selesai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
        if (epicEnd && taskEnd && taskEnd > epicEnd) {
          setConfirmAction({
            isOpen: true,
            title: t("ui2.epicTimelineLimit"),
            message:
              "Peringatan: Tanggal selesai task tidak boleh melebihi rentang tanggal Epic induk.",
            onConfirm: () => {},
            isAlert: true,
          });
          return;
        }
      }
    }

    if (newTaskStartDate && newTaskEndDate) {
      if (new Date(newTaskStartDate) > new Date(newTaskEndDate)) {
        setConfirmAction({
          isOpen: true,
          title: t("ui2.dateValidation"),
          message:
            "Tanggal selesai tugas tidak boleh sebelum tanggal mulai tugas (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }
    }

    try {
      const assigneeIsEmail = newTaskAssigneeId.includes("@");

      const data = await createTask(selectedProject.id, {
        title: newTaskTitle,
        description: newTaskDescription,
        acceptanceCriteria: newTaskAcceptanceCriteria,
        storyPoints: newTaskStoryPoints,
        projectRisk: newTaskProjectRisk,
        status: newTaskStatus || "todo",
        type: newTaskType,
        parentId: newTaskParentId || null,
        sprintId: newTaskSprintId || null,
        assigneeId: assigneeIsEmail ? null : newTaskAssigneeId || null,
        reporterId: activeUid,
        priority: newTaskPriority || "medium",
        startDate: newTaskStartDate || null,
        endDate: newTaskEndDate || null,
      });

      const createdTaskKey = data.data.taskKey;

      if (data && data.data) {
        const createdTask = data.data;
        setTasks((prev) => [createdTask, ...prev.filter((t) => t.id !== createdTask.id)]);
        setAllProjectTasksForStats((prev) => [
          createdTask,
          ...prev.filter((t) => t.id !== createdTask.id),
        ]);
      }

      await logActivity("task_created", `Created task ${createdTaskKey}: ${newTaskTitle}`);

      await fetchTasks(); // Refresh list

      resetNewTaskForm();
      setIsNewTaskModalOpen(false);
      toast.success(t("toast.dataAdded"));
    } catch (e: any) {
      console.error(e, "error", `projects/${selectedProject.id}/tasks`);
      const errMessage = e?.message || "";
      const errCode = e?.data?.code || "";
      if (
        errCode.startsWith("EPIC_TIMELINE_EXCEEDED") ||
        errMessage.includes("Epic") ||
        errMessage.includes("melebihi")
      ) {
        setConfirmAction({
          isOpen: true,
          title: t("ui2.epicTimelineLimit"),
          message: "Peringatan: Tanggal task tidak boleh melewati rentang tanggal Epic induk!",
          onConfirm: () => {},
          isAlert: true,
        });
      } else {
        toast.error(errMessage || "Failed to create task");
      }
    }
  };

  const handleQuickCreate = async (title: string, type?: string) => {
    const activeUid = currentUser?.uid || user?.uid;
    if (!selectedProject || !title.trim() || !activeUid) return;
    try {
      const data = await createTask(selectedProject.id, {
        title: title,
        status: "To Do",
        type: (type as any) || "task",
        assigneeId: null,
        priority: "Medium",
        reporterId: activeUid,
      });

      if (data.status === "success" && data.data) {
        const newTask = data.data;
        setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
        setAllProjectTasksForStats((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
        await fetchTasks();
        toast.success(t("toast.taskCreated", { key: data.data.taskKey }));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create task");
    }
  };

  const handleSuggestStoryPoints = async (task: Task) => {
    if (!task.title || !task.description) {
      toast.warning(t("toast.aiNeedTitleDesc"));
      return;
    }

    const toastId = toast.loading(t("toast.aiCalculating"));
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `Analyze this task and suggest story points (Fibonacci: 1, 2, 3, 5, 8, 13).
Task Title: ${task.title}
Description: ${task.description}
Type: ${task.type}

Respond ONLY with a single JSON object: {"points": number, "reasoning": "string"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");
      if (result.points) {
        toast.success(
          t("toast.aiSuggestion", { points: result.points, reasoning: result.reasoning }),
          {
            duration: 5000,
          }
        );

        // Simpan hasil estimasi AI ke task.
        //
        // Sebelumnya ada cabang khusus "bila sedang dalam mode edit" yang
        // memperbarui state editingTask alih-alih memanggil API. Cabang itu
        // tidak pernah menyala karena modal edit task tak terjangkau, dan ikut
        // dihapus bersama modalnya.
        const effectiveUserId = currentUser?.uid || user?.uid || "guest";
        await updateTask(selectedProject!.id, task.id, { storyPoints: result.points });
        await fetchTasks();
      } else {
        throw new Error(t("ui2.aiInvalidResponse"));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("toast.aiEstimationFailed"));
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleAddExternalLink = async () => {
    if (!selectedTaskForDetail || !newExternalLinkTitle || !newExternalLinkUrl) return;

    const newLink = {
      id: crypto.randomUUID(),
      title: newExternalLinkTitle,
      url: newExternalLinkUrl,
      createdAt: new Date(),
    };

    const updatedLinks = [...(selectedTaskForDetail.externalLinks || []), newLink];
    await updateTaskField(selectedTaskForDetail.id, "externalLinks", updatedLinks);
    setNewExternalLinkTitle("");
    setNewExternalLinkUrl("");
    setIsAddingExternalLink(false);
  };

  const removeExternalLink = async (taskId: string, linkId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.externalLinks) return;
    const updatedLinks = task.externalLinks.filter((l) => l.id !== linkId);
    await updateTaskField(taskId, "externalLinks", updatedLinks);
  };

  const toggleBlockedStatus = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateTaskField(taskId, "isBlocked", !task.isBlocked);
  };

  const updateProjectRole = async (userId: string, role: string) => {
    if (!selectedProject) return;
    try {
      const roles = { ...(selectedProject.memberRoles || {}), [userId]: role };
      await updateMemberRoles(selectedProject.id, roles);
      fetchProjects();
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.memberRoleUpdateFailed") + (e.message || e));
    }
  };

  const removeProjectMember = async (userId: string) => {
    if (!selectedProject) return;
    try {
      const data = await removeMember(selectedProject.id, userId);
      if (data.status === "success") {
        toast.success(t("toast.memberRemoved"));
        fetchProjects();
      } else {
        toast.error(data.message || "Failed to remove member");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.memberRemoveFailed") + (e.message || e));
    }
  };

  const handleInviteMember = async () => {
    if (!selectedProject) {
      toast.error(t("toast.noProjectSelected"));
      return;
    }
    if (!inviteEmail.trim()) {
      toast.error(t("toast.enterEmail"));
      return;
    }

    const toastId = toast.loading(t("toast.sendingInvite"));
    try {
      const emailToInvite = inviteEmail.trim().toLowerCase();
      // allUsers is available locally from the /api/users fetch
      const userToInvite = allUsers.find((u) => u.email === emailToInvite);

      if (!userToInvite) {
        // User not found, add to pending invites
        const pending = selectedProject.pendingInvites || [];
        if (pending.includes(emailToInvite)) {
          toast.error(t("toast.inviteAlreadyPending"), {
            id: toastId,
          });
          return;
        }
        await inviteMember(selectedProject.id, emailToInvite);
        await logActivity(
          "user_invited",
          `Invited ${emailToInvite} to the project (pending registration)`
        );

        toast.success(t("toast.inviteSaved", { email: emailToInvite }), {
          id: toastId,
        });
        setLastInvitedEmail(emailToInvite);
        setIsInviteModalOpen(false);
        setIsInviteSuccessModalOpen(true);
        setInviteEmail("");
        fetchProjects(); // Refresh!
        return;
      }

      const uid = userToInvite.uid;

      if ((selectedProject.members || []).includes(uid)) {
        toast.error(t("toast.userAlreadyMember"), { id: toastId });
        return;
      }

      const effectiveUserId = currentUser?.uid || user?.uid || "guest";
      await addMember(selectedProject.id, effectiveUserId, uid);
      await logActivity("user_added", `Added ${emailToInvite} to the project`);

      toast.success(t("toast.memberAdded", { email: emailToInvite }), { id: toastId });
      setLastInvitedEmail(emailToInvite);
      setIsInviteModalOpen(false);
      setIsInviteSuccessModalOpen(true);
      setInviteEmail("");
      fetchProjects();
    } catch (e) {
      console.error("Invite error:", e);
      toast.error(t("toast.inviteFailed"), {
        id: toastId,
      });
    }
  };

  const sendInviteEmail = (email: string) => {
    if (!selectedProject) return;
    const inviteLink = window.location.origin;
    const subject = encodeURIComponent(`Invitation to join project: ${selectedProject.name}`);
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited to join the project "${selectedProject.name}".\n\nPlease click the link below to sign in and join the project:\n${inviteLink}\n\nBest regards,\nYour Team`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };

  const logActivity = async (action: string, details: string, taskId?: string) => {
    const activeUid = currentUser?.uid || user?.uid;
    if (!selectedProject || !activeUid) return;
    try {
      await logActivityApi(selectedProject.id, {
        userId: activeUid,
        action,
        details,
        taskId: taskId || null,
      });
      fetchActivityLogs();
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    try {
      const data = await updateProject(editingProject.id, {
        name: editingProject.name,
        description: editingProject.description || "",
        status: editingProject.status || "Active",
        // Item #138 — tanpa baris ini dropdown Metodologi tampil dan bisa
        // diubah, tapi nilainya tidak pernah sampai ke backend.
        category: editingProject.category || "Agile",
      });

      if (data.status === "success") {
        setIsEditProjectModalOpen(false);
        setEditingProject(null);
        toast.success(t("toast.projectUpdated"));
        fetchProjects();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update project");
    }
  };

  const handleAddLink = async () => {
    if (!selectedTaskForDetail || !newLinkTitle || !newLinkUrl) return;
    try {
      const activeUid = currentUserProfile?.uid || currentUser?.uid || user?.uid;
      const activeUserName =
        currentUserProfile?.displayName ||
        currentUserProfile?.username ||
        currentUser?.displayName ||
        user?.displayName ||
        "Unknown";
      const urlWithProtocol = newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`;
      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        name: newLinkTitle,
        url: urlWithProtocol,
        type: "link",
        createdAt: new Date().toISOString(),
        uploadedByUserId: activeUid,
        uploadedByName: activeUserName,
      };
      const updatedAttachments = [...(selectedTaskForDetail.attachments || []), newAttachment];
      await updateTaskField(selectedTaskForDetail.id, "attachments", updatedAttachments);
      setSelectedTaskForDetail({
        ...selectedTaskForDetail,
        attachments: updatedAttachments,
      });
      setNewLinkTitle("");
      setNewLinkUrl("");
      setIsAddingLink(false);
      toast.success(t("toast.linkAdded"));
    } catch (error) {
      console.error(error);
      toast.error(t("toast.linkAddFailed"));
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!selectedTaskForDetail) return;
    const attachment = (selectedTaskForDetail.attachments || []).find((a) => a.id === attachmentId);
    if (!attachment) return;

    const isConfirmed = await confirmDeleteAlert(
      t("alerts.deleteAttachmentTitle"),
      t("alerts.deleteAttachmentText", { name: attachment.name })
    );

    if (!isConfirmed) return;

    try {
      const updatedAttachments = (selectedTaskForDetail.attachments || []).filter(
        (a) => a.id !== attachmentId
      );
      await updateTaskField(selectedTaskForDetail.id, "attachments", updatedAttachments);
      setSelectedTaskForDetail({
        ...selectedTaskForDetail,
        attachments: updatedAttachments,
      });
      showSuccessAlert(t("alerts.successTitle"), t("alerts.attachmentDeleted"));
    } catch (error: any) {
      console.error(error);
      toast.error(t("toast.attachmentDeleteFailed") + (error.message || error));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    toast.error(t("toast.attachmentsDisabled"));
    e.target.value = "";
  };

  const handleTaskCompletionDependencies = async (completedTaskId: string) => {
    // Find tasks that are blocked by this task
    const blockedTasks = tasks.filter((t) =>
      t.linkedTasks?.some(
        (lt) => lt.targetTaskId === completedTaskId && lt.relationType === "is_blocked_by"
      )
    );

    for (const task of blockedTasks) {
      await logActivity(
        "task_dependency_updated",
        `Task ${task.key} is now unblocked by completion of ${completedTaskId}`
      );
      // Notify via toast
      toast.info(t("toast.taskUnblocked", { key: task.key, selesai: completedTaskId }));
    }
  };

  const triggerBugDoneFlow = async (taskToUpdate: Task, newStatusVal: string): Promise<string> => {
    if (!selectedProject) return newStatusVal;

    const taskAny = taskToUpdate as any;
    const isBug =
      (taskToUpdate.type && taskToUpdate.type.toLowerCase() === "bug") ||
      (taskAny.taskKey && String(taskAny.taskKey).toUpperCase().startsWith("BUG")) ||
      (taskToUpdate.key && String(taskToUpdate.key).toUpperCase().startsWith("BUG")) ||
      (taskToUpdate.title && taskToUpdate.title.toLowerCase().includes("bug"));

    const isDoneStatus =
      newStatusVal.toUpperCase() === "DONE" || newStatusVal.toLowerCase() === "selesai";
    const targetStatus = isBug && isDoneStatus ? "Ready for Retest" : newStatusVal;

    const devName =
      currentUserProfile?.displayName ||
      user?.displayName ||
      currentUser?.displayName ||
      "Developer";
    const bugKey = taskAny.taskKey || taskToUpdate.key || `BUG-${taskToUpdate.id.slice(0, 4)}`;
    const bugTitle = taskToUpdate.title || "Bug";

    // 1. Update QA Test Case status in localStorage / suites to "Retest"
    try {
      const cachedSuites = safeLocalStorage.getItem(`lanpro_qa_suites_${selectedProject.id}`);
      if (cachedSuites) {
        const parsedSuites = JSON.parse(cachedSuites);
        let updatedAny = false;
        const updatedSuites = parsedSuites.map((suite: any) => ({
          ...suite,
          cases: suite.cases.map((c: any) => {
            if (
              c.linkedBugKey === bugKey ||
              c.linkedBugKey === taskToUpdate.id ||
              c.linkedBugKey === taskToUpdate.key ||
              c.linkedBugKey === taskAny.taskKey
            ) {
              updatedAny = true;
              return { ...c, status: "Retest" };
            }
            return c;
          }),
        }));

        if (updatedAny) {
          safeLocalStorage.setItem(
            `lanpro_qa_suites_${selectedProject.id}`,
            JSON.stringify(updatedSuites)
          );
        }
      }
      window.dispatchEvent(
        new CustomEvent("lanpro_qa_retest_updated", { detail: { bugKey, taskId: taskToUpdate.id } })
      );
    } catch (err) {
      console.error("Error updating QA test cases to Retest:", err);
    }

    // Trigger toast & notification if bug or converted to Ready for Retest or status is Done
    if (isBug || isDoneStatus || targetStatus === "Ready for Retest") {
      const notifTitle = "🐛 Bug Ready for Retest";
      const notifMessage = `${devName} telah menyelesaikan Bug #${bugKey} [${bugTitle}]. Silakan lakukan Retest.`;

      const newNotif: AppNotification = {
        id: crypto.randomUUID(),
        recipientId: taskToUpdate.reporterId || user?.uid || currentUser?.uid || "qa-lead",
        title: notifTitle,
        message: notifMessage,
        type: "bug_retest",
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: taskToUpdate.id,
      };

      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);

      // Save notification to backend
      try {
        const targetUserId = taskToUpdate.reporterId || user?.uid || currentUser?.uid;
        if (targetUserId) {
          await createNotification(targetUserId, {
            title: notifTitle,
            message: notifMessage,
            type: "bug_retest",
            relatedId: taskToUpdate.id,
          });
        }
      } catch (err) {
        console.error("Failed to persist notification:", err);
      }

      // Real-time Floating Toast Alert
      toast.custom(
        (t: any) => (
          <div className="max-w-md w-full bg-surface-inverse-strong border border-emerald-500/60 shadow-2xl rounded-xl pointer-events-auto flex p-4 items-center justify-between gap-3 text-content-inverse ring-1 ring-emerald-500/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                <Bug className="w-5 h-5 animate-bounce text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-[10px] font-medium text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <span>🔔</span> {t("jsx.j1")}
                </p>
                <p className="text-xs font-medium text-content-inverse-strong mt-0.5 leading-snug">
                  Bug <span className="font-mono font-medium text-emerald-300">#{bugKey}</span>{" "}
                  telah diperbaiki oleh Developer. Klik untuk lakukan Retest.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t);
                setCurrentView("qa");
                setQaInitialStatusFilter("Retest");
                window.dispatchEvent(
                  new CustomEvent("lanpro_qa_retest_updated", { detail: { bugKey } })
                );
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 text-xs font-medium rounded-xl uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-md flex items-center gap-1"
            >
              <span>{t("appShell.viewBug")}</span>
            </button>
          </div>
        ),
        { duration: 6000, position: "top-right" }
      );
    }

    return targetStatus;
  };

  const updateTaskField = async (taskId: string, field: string, value: any) => {
    if (!selectedProject) return;
    const previousTasks = tasks;

    // Permission Check using RBAC
    const taskToUpdate = tasks.find((t) => t.id === taskId);
    if (!taskToUpdate) return;

    const isOwner = taskToUpdate.assigneeId === user?.uid || taskToUpdate.reporterId === user?.uid;
    if (
      !hasPermission(
        userRoleForProject,
        "issueList",
        "update",
        isOwner,
        currentUserProfile?.permissions
      )
    ) {
      toast.error(t("toast.noPermEditTask"));
      return;
    }

    // Check blockers
    if (field === "status") {
      if (!checkTaskBlockers(taskId, value)) return;
    }

    // Date validations
    if (
      field === "startDate" ||
      field === "endDate" ||
      field === "dueDate" ||
      field === "sprintId" ||
      field === "dates"
    ) {
      const getVal = (f: string) => {
        if (field === "dates") {
          return value[f] !== undefined ? value[f] : (taskToUpdate as any)[f];
        }
        return field === f ? value : (taskToUpdate as any)[f];
      };

      const tStartStr = getVal("startDate");
      const tEndStr = getVal("endDate");
      const targetSprintId = getVal("sprintId");

      const tStart = tStartStr ? ensureDate(tStartStr) : null;
      const tEnd = tEndStr ? ensureDate(tEndStr) : null;

      if (tStart && tEnd && tStart > tEnd) {
        setConfirmAction({
          isOpen: true,
          title: t("ui2.dateValidation"),
          message:
            "Tanggal selesai tugas tidak boleh sebelum tanggal mulai tugas (tidak bisa backdate).",
          onConfirm: () => {},
          isAlert: true,
        });
        return;
      }

      // Epic Timeline Boundary Check
      const effectiveParentId = taskToUpdate.parentId;
      if (effectiveParentId && (tStart || tEnd)) {
        const parentEpic = tasks.find((t) => t.id === effectiveParentId);
        if (parentEpic && (parentEpic.startDate || parentEpic.endDate)) {
          const epicStart = parentEpic.startDate ? new Date(parentEpic.startDate).getTime() : null;
          const epicEnd = parentEpic.endDate ? new Date(parentEpic.endDate).getTime() : null;
          const taskStart = tStart ? tStart.getTime() : null;
          const taskEnd = tEnd ? tEnd.getTime() : null;

          if (epicStart && taskStart && taskStart < epicStart) {
            setConfirmAction({
              isOpen: true,
              title: t("ui2.epicTimelineLimit"),
              message:
                "Peringatan: Tanggal mulai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
          if (epicEnd && taskStart && taskStart > epicEnd) {
            setConfirmAction({
              isOpen: true,
              title: t("ui2.epicTimelineLimit"),
              message:
                "Peringatan: Tanggal mulai task tidak boleh melebihi rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
          if (epicStart && taskEnd && taskEnd < epicStart) {
            setConfirmAction({
              isOpen: true,
              title: t("ui2.epicTimelineLimit"),
              message:
                "Peringatan: Tanggal selesai task tidak boleh lebih awal dari rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
          if (epicEnd && taskEnd && taskEnd > epicEnd) {
            setConfirmAction({
              isOpen: true,
              title: t("ui2.epicTimelineLimit"),
              message:
                "Peringatan: Tanggal selesai task tidak boleh melebihi rentang tanggal Epic induk.",
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
        }
      }

      if (targetSprintId) {
        const targetSprint = sprints.find((s) => s.id === targetSprintId);
        if (targetSprint && targetSprint.startDate && targetSprint.endDate) {
          const sprintStart = ensureDate(targetSprint.startDate);
          const sprintEnd = ensureDate(targetSprint.endDate);
          sprintStart.setHours(0, 0, 0, 0);
          sprintEnd.setHours(23, 59, 59, 999);

          if (tStart && tEnd && (tStart < sprintStart || tEnd > sprintEnd)) {
            setConfirmAction({
              isOpen: true,
              title: t("ui2.dateValidation"),
              message: `Range tanggal tugas (${format(tStart, "dd MMM")} - ${format(tEnd, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          } else if (tStart && (tStart < sprintStart || tStart > sprintEnd)) {
            setConfirmAction({
              isOpen: true,
              title: t("ui2.dateValidation"),
              message: `Waktu mulai tugas (${format(tStart, "dd MMM")}) di luar periode fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          } else if (tEnd && (tEnd < sprintStart || tEnd > sprintEnd)) {
            setConfirmAction({
              isOpen: true,
              title: t("ui2.dateValidation"),
              message: `Eksekusi tugas melebihi timeline fase ini (${format(sprintStart, "dd MMM")} - ${format(sprintEnd, "dd MMM")}).`,
              onConfirm: () => {},
              isAlert: true,
            });
            return;
          }
        }
      }
    }

    try {
      let updateData: any = {};
      if (field === "dates") {
        updateData = {
          startDate: value.startDate,
          endDate: value.endDate,
        };
      } else if (field === "assigneeId") {
        const isEmail = typeof value === "string" && value.includes("@");
        if (isEmail) {
          updateData = {
            assigneeId: null,
            assigneeEmail: value,
          };
        } else {
          updateData = {
            assigneeId: value || null,
            assigneeEmail: null,
          };
        }
      } else if (field === "status") {
        const finalVal = await triggerBugDoneFlow(taskToUpdate, value);
        updateData = { status: finalVal };
      } else {
        updateData = {
          [field]: value,
        };
      }

      const previousTasks = tasks;
      // Optimistic UI update
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updateData } : t)));

      setIsUpdatingTask((prev) => ({ ...prev, [taskId]: true }));
      let data;
      try {
        data = await updateTask(selectedProject.id, taskId, updateData);
        if (data.status !== "success") throw new Error(data.message);
      } finally {
        setIsUpdatingTask((prev) => ({ ...prev, [taskId]: false }));
      }

      // Explicit refresh removed to prevent UI freezing. Real-time updates handled by socket.

      if (field === "status") {
        await logActivity("task_status_updated", `Task ${taskId} status updated to ${value}`);
        // Notify blocked tasks if status is Done
        if (value === "Done") {
          await handleTaskCompletionDependencies(taskId);
        }
      } else if (field === "assigneeId") {
        await logActivity("task_assigned", `Task ${taskId} assigned to ${value}`);
      }

      if (selectedTaskForDetail?.id === taskId) {
        setSelectedTaskForDetail((prev) => (prev ? { ...prev, ...updateData } : null));
      }
    } catch (e: any) {
      console.error(e);
      setTasks(previousTasks || tasks); // Revert optimistic UI immediately
      const errMessage = e?.message || "";
      const errCode = e?.data?.code || "";
      if (
        errCode.startsWith("EPIC_TIMELINE_EXCEEDED") ||
        errMessage.includes("Epic") ||
        errMessage.includes("melebihi")
      ) {
        setConfirmAction({
          isOpen: true,
          title: t("ui2.epicTimelineLimit"),
          message: "Peringatan: Tanggal task tidak boleh melewati rentang tanggal Epic induk!",
          onConfirm: () => {},
          isAlert: true,
        });
      } else {
        toast.error(errMessage || "Failed to update task");
      }
    }
  };

  const addTaskLink = async (
    taskId: string,
    targetTaskId: string,
    relationType: LinkedTask["relationType"]
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newLink: LinkedTask = {
      id: Math.random().toString(36).substr(2, 9),
      targetTaskId,
      relationType,
      createdAt: new Date(),
    };

    const updatedLinkedTasks = [...(task.linkedTasks || []), newLink];
    await updateTaskField(taskId, "linkedTasks", updatedLinkedTasks);
  };

  const removeTaskLink = async (taskId: string, linkId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedLinkedTasks = (task.linkedTasks || []).filter((l) => l.id !== linkId);
    await updateTaskField(taskId, "linkedTasks", updatedLinkedTasks);
  };

  const handleAddLinkedTask = async () => {
    if (!selectedProject || !selectedTaskForDetail || !taskLinkTargetId) {
      toast.error(t("toast.relationNeedTask"));
      return;
    }

    // Validasi ngga boleh link ke diri sendiri
    if (taskLinkTargetId === selectedTaskForDetail.id) {
      toast.error(t("toast.relationSelf"));
      return;
    }

    try {
      const sourceId = selectedTaskForDetail.id;
      const targetId = taskLinkTargetId;

      const newLinkedTaskForSource: LinkedTask = {
        id: crypto.randomUUID(),
        targetTaskId: targetId,
        relationType: taskLinkRelation as any,
        createdAt: new Date().toISOString(),
      };

      const mapInverseRelation = (rel: string) => {
        if (rel === "blocks") return "is_blocked_by";
        if (rel === "is_blocked_by") return "blocks";
        if (rel === "relates_to") return "relates_to";
        if (rel === "clones") return "is_cloned_by";
        if (rel === "is_cloned_by") return "clones";
        return "relates_to";
      };

      const newLinkedTaskForTarget: LinkedTask = {
        id: crypto.randomUUID(),
        targetTaskId: sourceId,
        relationType: mapInverseRelation(taskLinkRelation) as any,
        createdAt: new Date().toISOString(),
      };

      const existingSourceRelation = selectedTaskForDetail.linkedTasks?.find(
        (t) => t.targetTaskId === targetId && t.relationType === taskLinkRelation
      );
      if (existingSourceRelation) {
        toast.error(t("toast.relationExists"));
        return;
      }

      const data1 = await createTaskLink(selectedProject.id, sourceId, {
        targetTaskId: targetId,
        relationType: taskLinkRelation,
      });

      const data2 = await createTaskLink(selectedProject.id, targetId, {
        targetTaskId: sourceId,
        relationType: mapInverseRelation(taskLinkRelation),
      });

      await fetchTasks();

      setSelectedTaskForDetail((prev) =>
        prev
          ? {
              ...prev,
              linkedTasks: [...(prev.linkedTasks || []), newLinkedTaskForSource],
            }
          : null
      );

      setIsAddingTaskLink(false);
      setTaskLinkTargetId("");
      setTaskLinkRelation("blocks");
      toast.success(t("toast.linkedTaskAdded"));

      await logActivity(
        "task_linked",
        `Task ${selectedTaskForDetail.key} linked to a task ${targetId}`
      );
    } catch (e) {
      console.error(e);
      toast.error(t("toast.linkAddFailed"));
    }
  };

  const handleRemoveLinkedTask = async (sourceId: string, linkIdToRemove: string) => {
    if (!selectedProject || !selectedTaskForDetail) return;
    const linkToRemove = selectedTaskForDetail.linkedTasks?.find((t) => t.id === linkIdToRemove);
    if (!linkToRemove) return;

    const isConfirmed = await confirmDeleteAlert(
      t("alerts.deleteTaskLinkTitle"),
      t("alerts.deleteTaskLinkText")
    );

    if (!isConfirmed) return;

    try {
      const data = await deleteTaskLink(selectedProject.id, sourceId, linkIdToRemove);
      if (data.status !== "success") throw new Error(data.message);

      await fetchTasks();

      const newSourceLinks = selectedTaskForDetail.linkedTasks!.filter(
        (t) => t.id !== linkIdToRemove
      );
      setSelectedTaskForDetail((prev) =>
        prev
          ? {
              ...prev,
              linkedTasks: newSourceLinks,
            }
          : null
      );

      showSuccessAlert(t("alerts.successTitle"), t("alerts.taskLinkDeleted"));
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.relationDeleteFailed") + (e.message || e));
    }
  };

  const handleQuickAddSubtask = async (parentId: string, type: "task" | "subtask") => {
    const activeUid = currentUser?.uid || user?.uid;
    const effectiveUserId = currentUser?.uid || user?.uid || "guest";
    if (!selectedProject || !activeUid) return;
    try {
      const data = await createTask(selectedProject.id, {
        parentId: parentId,
        title: `New ${type}`,
        type: type,
        status: masterData.find((d) => d.type === "status")?.label || "To Do",
        priority: masterData.find((d) => d.type === "priority")?.label || "Medium",
        reporterId: activeUid,
      });

      if (data.status === "success") {
        await await fetchTasks();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to add subtask");
    }
  };

  const checkTaskBlockers = (taskId: string, targetStatus: string) => {
    // Only block if moving to "Done" (or similar terminal status)
    const isTerminalStatus =
      targetStatus.toLowerCase().includes("done") ||
      targetStatus.toLowerCase().includes("completed");
    if (!isTerminalStatus) return true;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.linkedTasks) return true;

    // Find links where this task "is blocked by" someone
    const blockers = task.linkedTasks.filter((l) => l.relationType === "is_blocked_by");

    for (const blocker of blockers) {
      const blockingTask = tasks.find((t) => t.id === blocker.targetTaskId);
      if (
        blockingTask &&
        !blockingTask.status.toLowerCase().includes("done") &&
        !blockingTask.status.toLowerCase().includes("completed")
      ) {
        toast.error(
          `Tidak dapat menyelesaikan ${task.key}: tugas ini terblokir oleh ${blockingTask.key} (${blockingTask.status}).`
        );
        return false;
      }
    }
    return true;
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!selectedProject) return;
    if (!checkTaskBlockers(taskId, newStatus)) return;
    try {
      const taskToUpdate = tasks.find((t) => t.id === taskId);
      let statusToSave = newStatus;
      if (taskToUpdate) {
        statusToSave = await triggerBugDoneFlow(taskToUpdate, newStatus);
      }
      const effectiveUserId = currentUser?.uid || user?.uid || "guest";
      const data = await updateTaskAsUser(selectedProject.id, taskId, effectiveUserId, {
        status: statusToSave,
      });
      if (data.status !== "success") throw new Error(data.message);
      await fetchTasks();
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.statusUpdateFailed") + (e.message || e));
    }
  };

  const handleReorderMasterData = async (result: any) => {
    if (!result.destination || !selectedProject) return;

    const type = result.source.droppableId;
    const items = masterData
      .filter((d) => d.type === type)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    try {
      const batch = items.map((item, index) => {
        return updateMasterDataOrder(item.id, index);
      });
      await Promise.all(batch);
      fetchMasterData();
    } catch (e) {
      console.error(e);
      toast.error(t("toast.reorderFailed"));
    }
  };

  const handleDragEndPlanning = async (result: any) => {
    if (!result.destination || !selectedProject) return;

    const { draggableId, destination } = result;

    const isUserMatch = (fieldVal: string | null | undefined) => {
      if (!fieldVal) return false;
      const f = fieldVal.toLowerCase().trim();
      const options = [
        currentUser?.uid,
        currentUser?.id,
        currentUser?.username,
        currentUserProfile?.uid,
        currentUserProfile?.id,
        currentUserProfile?.username,
        user?.uid,
        user?.id,
        user?.username,
      ]
        .filter(Boolean)
        .map((s: string) => s.toLowerCase().trim());
      return options.includes(f);
    };

    // Permission Check: Admin, Owner & Manager always allowed, otherwise only Task Creator (Reporter) or Epic Creator (Parent Reporter)
    const taskToMove = tasks.find((t) => t.id === draggableId);
    if (taskToMove && !["admin", "manager", "owner"].includes(userRoleForProject)) {
      const parentTask = taskToMove.parentId
        ? tasks.find((t) => t.id === taskToMove.parentId)
        : null;
      const isParentReporter = parentTask && isUserMatch(parentTask.reporterId);

      if (!isUserMatch(taskToMove.reporterId) && !isParentReporter) {
        toast.error(
          "Akses Ditolak: Anda hanya dapat memindahkan tugas yang Anda buat, atau tugas di dalam Epic yang Anda buat."
        );
        return;
      }
    }

    const sprintId = destination.droppableId === "backlog" ? null : destination.droppableId;

    try {
      await moveTaskToSprint(draggableId, sprintId);
    } catch (e) {
      console.error("Failed to move task via drag and drop:", e);
    }
  };

  const deleteProject = async (project: Project) => {
    const effectiveUserId = currentUser?.uid || user?.uid;
    if (!effectiveUserId) {
      toast.error(t("toast.sessionNotFound"));
      return;
    }

    // Check permission
    const isOwner = project.ownerId === effectiveUserId;
    if (
      !hasPermission(
        effectiveRole,
        "configuration",
        "delete",
        isOwner,
        currentUserProfile?.permissions
      )
    ) {
      toast.error(t("toast.onlyOwnerDeleteProject"));
      return;
    }

    const isConfirmed = await confirmDeleteAlert(
      t("alerts.deleteProjectTitle"),
      t("alerts.deleteProjectText", { name: project.name })
    );

    if (!isConfirmed) return;

    const loadingToast = toast.loading(t("toast.deletingPermanently"));

    try {
      setIsEditProjectModalOpen(false);
      setSelectedProject(null);
      setCurrentView("dashboard");

      // Hard delete project from MySQL (Cascades to tasks, sprints, etc)
      const data = await deleteProjectApi(project.id, effectiveUserId);
      if (data.status !== "success") throw new Error(data.message);

      // Optimistic update
      setProjects((prev) => prev.filter((p) => p.id !== project.id));

      showSuccessAlert("Berhasil!", t("alerts.projectDeleted", { name: project.name }));
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.projectDeleteFailed") + (e.message || e));
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!selectedProject) return;
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    const effectiveUserId =
      currentUser?.uid || user?.uid || currentUserProfile?.uid || currentUserProfile?.id;
    const effectiveUsername =
      currentUser?.username || user?.username || currentUserProfile?.username;
    const isReporter =
      taskToDelete.reporterId === effectiveUserId || taskToDelete.reporterId === effectiveUsername;
    if (!isReporter) {
      toast.error(t("toast.onlyReporterDeleteTask"));
      return;
    }

    const isConfirmed = await confirmDeleteAlert(
      "Hapus Tugas?",
      `Apakah Anda yakin ingin menghapus tugas "${taskToDelete.title}"? Semua data turunan termasuk komentar juga akan terhapus.`
    );

    if (!isConfirmed) return;

    const loadingToast = toast.loading(t("toast.deletingTask"));

    try {
      const effectiveUserId = currentUser?.uid || user?.uid || "guest";
      const data = await deleteTaskApi(selectedProject.id, taskId, effectiveUserId);
      if (data.status !== "success") throw new Error(data.message);

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await fetchTasks(); // Refresh explicitly

      showSuccessAlert(
        t("alerts.successTitle"),
        t("alerts.taskDeleted", { title: taskToDelete.title })
      );
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.taskDeleteFailed") + (e.message || e));
    } finally {
      toast.dismiss(loadingToast);
      if (selectedTaskForDetail?.id === taskId) {
        setSelectedTaskForDetail(null);
        setIsTaskDetailModalOpen(false);
      }
    }
  };

  const bulkDeleteTasks = async (taskIds: string[]) => {
    if (!selectedProject || !Array.isArray(taskIds) || taskIds.length === 0) return;

    const isConfirmed = await confirmDeleteAlert(
      "Hapus Beberapa Tugas?",
      `Apakah Anda yakin ingin menghapus ${taskIds.length} tugas terpilih secara permanen? Semua data turunan seperti komentar juga akan terhapus.`
    );

    if (!isConfirmed) return;

    const loadingToast = toast.loading(t("toast.deletingTasks", { count: taskIds.length }));

    try {
      const effectiveUserId = currentUser?.uid || user?.uid || "guest";
      const data = await bulkDeleteTasksApi(selectedProject.id, effectiveUserId, taskIds);

      if (data.status !== "success") throw new Error(data.message);

      const deletedSet = new Set(data.deletedIds || taskIds);
      setTasks((prev) => prev.filter((t) => !deletedSet.has(t.id)));
      setAllProjectTasksForStats((prev) => prev.filter((t) => !deletedSet.has(t.id)));
      await fetchTasks();

      showSuccessAlert(
        t("alerts.successTitle"),
        `Berhasil menghapus ${deletedSet.size} tugas terpilih.`
      );
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.tasksDeleteFailed") + (e.message || e));
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleCommentChange = (e: any) => {
    const val = e.target.value;
    setNewCommentText(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbolIndex + 1);
      // Check if there are no spaces after the @
      if (!/\s/.test(textAfterAt)) {
        setMentionState({
          active: true,
          query: textAfterAt,
          index: lastAtSymbolIndex,
        });
        return;
      }
    }

    setMentionState({ active: false, query: "", index: -1 });
  };

  const handleSelectMention = (username: string) => {
    const beforeMention = newCommentText.slice(0, mentionState.index);
    const afterMention = newCommentText.slice(mentionState.index + mentionState.query.length + 1);
    setNewCommentText(`${beforeMention}@${username} ${afterMention}`);
    setMentionState({ active: false, query: "", index: -1 });
  };

  const handleAddComment = async () => {
    const activeUid = currentUser?.uid || user?.uid;
    const authorName = currentUser?.displayName || user?.displayName || "Seseorang";
    if (!selectedProject || !selectedTaskForDetail || !newCommentText.trim() || !activeUid) return;

    try {
      await createTaskComment(selectedProject.id, selectedTaskForDetail.id, {
        text: newCommentText.trim(),
        authorId: activeUid,
      });

      // Parse mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = Array.from(newCommentText.matchAll(mentionRegex)).map((m) =>
        m[1].toLowerCase()
      );
      if (mentions.length > 0) {
        const mentionedUsers = projectMembers.filter(
          (m) => m?.username && mentions.includes(m?.username.toLowerCase()) && m.uid !== activeUid
        );
        for (const u of mentionedUsers) {
          await createNotification(u.uid, {
            senderId: activeUid,
            title: t("ui2.youWereMentioned"),
            message: `${authorName} me-mention Anda di komentar tugas "${selectedTaskForDetail.title}"`,
            type: "mention",
            relatedId: selectedTaskForDetail.id,
            projectId: selectedProject.id,
          });
        }
      }

      setNewCommentText("");
      fetchComments();
    } catch (e) {
      console.error("Failed to add comment", e);
    }
  };

  if (loading) {
    return <GlobalSkeleton />;
  }

  if (isInitialDataLoading) {
    return <GlobalSkeleton />;
  }

  if (!isLoggedIn) {
    return (
      <AuthLayout
        variant="cover"
        overlays={
          <>
            <Toaster position="top-right" richColors />
            <RateLimitIndicator />
            {/* Modal tabrakan sesi tunggal. */}
            <SingleLoginCollisionModal
              isOpen={showCollisionModal}
              activeSession={activeSessionData}
              onClose={() => {
                setShowCollisionModal(false);
                setPendingLoginCredentials(null);
              }}
              onForceLogout={() => {
                if (pendingLoginCredentials) {
                  handleManualLogin(
                    pendingLoginCredentials.username,
                    pendingLoginCredentials.password,
                    pendingLoginCredentials.remember,
                    true
                  );
                }
              }}
              isLoading={loading}
            />
          </>
        }
      >
        <AnimatePresence mode="wait">
          {hasilSso.jenis === "lengkapi" ? (
            <CompleteRegistrationScreen
              key="sso-lengkapi-view"
              email={hasilSso.email}
              onSelesai={bersihkanSso}
              onBatal={bersihkanSso}
            />
          ) : authView === "login" ? (
            <LoginScreen
              key="login-screen-view"
              onLogin={handleManualLogin}
              onRegisterClick={() => setAuthView("register")}
              loading={isAuthLoading}
              loadingText={loginStatusText}
            />
          ) : (
            <RegisterScreen
              key="register-screen-view"
              onRegister={handleRegister}
              onBackToLogin={() => setAuthView("login")}
            />
          )}
        </AnimatePresence>
      </AuthLayout>
    );
  }

  return (
    <PresenceProvider currentUser={currentUser} socket={socket} allUsers={allUsers}>
      <Toaster position="top-right" richColors closeButton duration={5000} />
      <RateLimitIndicator />
      <div className="min-h-screen flex h-screen bg-surface-sunken text-content transition-colors duration-200">
        {/* Backdrop Overlay for Mobile Sidebar */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-black/50 fixed inset-0 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2.5 min-w-11 min-h-11 flex items-center justify-center text-content-muted z-50 absolute top-4 left-4"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Sidebar - MODULARIZED */}
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          userRole={effectiveRole}
          currentUserProfile={currentUserProfile}
          setIsNewProjectModalOpen={setIsNewProjectModalOpen}
          projects={projects}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          currentView={currentView}
          setCurrentView={setCurrentView}
          hasPermission={hasPermission}
          currentUser={currentUser}
          user={user}
          setIsProfileModalOpen={setIsProfileModalOpen}
          onOpenProfile={() => bukaDetailPengguna(currentUserProfile || currentUser || user)}
          handleLogout={handleLogoutRequest}
        />

        {/* Live Chat Widget */}
        <LiveChatWidget socket={socket} currentUser={currentUserProfile} allUsers={allUsers} />

        {/* Client-Side Session Expiry Warning System */}
        <SessionExpiryWarning
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSessionExtended={(newUser) => {
            setCurrentUser(newUser);
            setCurrentUserProfile(newUser);
            safeLocalStorage.setItem("sessionUser", JSON.stringify(newUser));
          }}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-surface-sunken/50 backdrop-blur-3xl z-[-1]" />

          {/* Global Top Header Bar */}
          <header className="flex items-center justify-between w-full px-6 py-3 border-b border-border-faint bg-surface shrink-0 pl-14 md:pl-6 text-content-strong transition-all z-20">
            <div className="flex items-center gap-4 min-w-0">
              {selectedProject &&
              ![
                "userDetail",
                "users",
                "master",
                "auditLog",
                "auditLogs",
                "dbExplorer",
                "explorer",
                "settings",
                "settingsIntegration",
                "configuration",
              ].includes(currentView as string) ? (
                <>
                  <h2 className="text-sm md:text-lg font-medium text-content truncate text-ellipsis whitespace-nowrap max-w-[150px] sm:max-w-[300px] md:max-w-none">
                    {selectedProject.name}
                  </h2>
                  <div className="h-4 w-px bg-border-subtle mx-2 shrink-0" />
                  <HeaderAvatarGroup
                    allUsers={allUsers}
                    currentUserUid={currentUser?.uid || currentUser?.id}
                  />
                </>
              ) : null}
            </div>

            {/* Area Ikon Navigasi Kanan */}
            <div className="flex items-center gap-2">
              {/* Tombol Pengaturan Proyek */}
              {selectedProject &&
                hasPermission(
                  userRoleForProject,
                  "configuration",
                  "read",
                  selectedProject?.ownerId === (currentUser?.uid || user?.uid),
                  currentUserProfile?.permissions
                ) && (
                  <button
                    onClick={() => {
                      setEditingProject(selectedProject);
                      setIsEditProjectModalOpen(true);
                    }}
                    className="p-2.5 min-w-11 min-h-11 flex items-center justify-center hover:bg-surface-sunken rounded-full text-content-subtle hover:text-content-secondary group transition-all"
                    title={t("common.projectSettings")}
                  >
                    <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  </button>
                )}

              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="hidden sm:flex p-2.5 min-w-11 min-h-11 items-center justify-center text-content-subtle hover:text-primary hover:bg-surface-sunken rounded-full transition-all"
                title={isFullscreen ? t("ui2.exitFullscreen") : t("ui2.fullscreen")}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>

              <LanguageSwitcher />

              {/* Velzon 1-Click Direct Theme Switcher Button */}
              <button
                onClick={toggleTheme}
                className="p-2.5 min-w-11 min-h-11 flex items-center justify-center text-content-subtle hover:text-content-strong hover:bg-surface-sunken rounded-full transition-all cursor-pointer relative"
                title={isDarkMode() ? t("ui2.toLightMode") : t("ui2.toDarkMode")}
                aria-label={isDarkMode() ? t("ui2.toLightMode") : t("ui2.toDarkMode")}
              >
                {isDarkMode() ? (
                  <Sun className="w-5 h-5 text-warning transition-transform hover:rotate-45 duration-200" />
                ) : (
                  <Moon className="w-5 h-5 text-content-body transition-transform hover:-rotate-12 duration-200" />
                )}
              </button>

              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2.5 min-w-11 min-h-11 flex items-center justify-center text-content-subtle hover:text-violet-600 hover:bg-violet-500/10 rounded-full transition-all relative"
                  title={t("appShell.notifications")}
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                  )}
                </button>

                <NotificationsDropdown
                  isNotificationsOpen={isNotificationsOpen}
                  setIsNotificationsOpen={setIsNotificationsOpen}
                  notifications={notifications}
                  currentUser={currentUser}
                  user={user}
                  markNotificationRead={markNotificationRead}
                  setCurrentView={setCurrentView}
                  setSelectedTaskForDetail={setSelectedTaskForDetail}
                  setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                  setQaInitialStatusFilter={setQaInitialStatusFilter}
                  fetchNotifications={fetchNotifications}
                  tasks={tasks}
                />
              </div>
            </div>
          </header>

          {currentView === "userDetail" ? (
            <UserDetailView
              user={selectedUserForDetail}
              onBack={() => setCurrentView(previousView as any)}
              projects={projects}
              tasks={tasks}
              departments={masterData.filter((m) => m.type === "department")}
              positions={masterData.filter((m) => m.type === "position" || m.type === "jabatan")}
              masterData={masterData}
              currentUser={currentUser || currentUserProfile}
              onUserUpdated={() => {
                fetchProjects();
              }}
            />
          ) : currentView === "users" ? (
            /* Penjaga izin — item #161. `AdminUserPanel` tidak memeriksa izin
               sama sekali di dalamnya, dan cabang ini berada DI ATAS penjaga
               `selectedProject`, jadi apa pun yang berhasil menyetel
               `currentView` ke "users" langsung mendapat daftar SELURUH
               pengguna. Menyembunyikan menunya di sidebar bukan penjaga:
               menu hanya salah satu jalan masuk. */
            !hasPermission(
              effectiveRole,
              "userManagement",
              "read",
              false,
              currentUserProfile?.permissions
            ) ? (
              <div className="flex flex-col items-center justify-center w-full flex-1 p-8 text-center bg-surface-sunken">
                <ShieldAlert className="w-16 h-16 text-danger mb-4" />
                <h2 className="text-2xl font-medium text-content-strong mb-2">
                  {t("appShell.forbidden")}
                </h2>
                <p className="text-content-muted max-w-md">{t("appShell.forbiddenUsers")}</p>
              </div>
            ) : (
              <AdminUserPanel
                projects={projects}
                tasks={tasks}
                masterData={masterData}
                userRole={effectiveRole}
                currentUserId={currentUser?.uid || user?.uid}
                onAddUser={() => {}}
                onRefreshProjects={fetchProjects}
                onSelectUserForDetail={(u) => bukaDetailPengguna(u)}
              />
            )
          ) : currentView === "master" ? (
            <MasterDataPanel
              projects={projects}
              tasks={tasks}
              masterData={masterData}
              userRole={effectiveRole}
              currentUserProfile={currentUserProfile!}
              hasPermission={hasPermission}
              onRefresh={fetchMasterData}
            />
          ) : selectedProject ? (
            <React.Fragment>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView + (selectedProject?.id || "")}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex-1 flex flex-col min-h-0 bg-surface-sunken transition-colors duration-200"
                >
                  {currentView === "issueDetail" && (
                    <div className="w-full flex-1 flex flex-col p-3 md:p-4 min-h-0 overflow-hidden bg-surface-muted text-left">
                      <div className="flex-1 flex flex-col min-h-0 bg-surface border border-border-subtle/80 rounded-lg shadow-soft overflow-hidden">
                        {/* Velzon-style Action / Title Bar */}
                        <div className="px-4 py-3 md:px-6 md:py-3.5 border-b border-border-subtle/80 bg-surface flex items-center justify-between gap-4 shrink-0 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setIsTaskDetailModalOpen(false)}
                              className="h-8 w-8 rounded-md bg-surface-sunken border border-border-subtle/80 text-content-secondary hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/30 flex items-center justify-center transition-all shadow-2xs"
                              title={t("appShell.back")}
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-sm font-medium text-content-strong tracking-tight">
                                {t("appShell.issueDetails")}
                              </h3>
                              <span className="text-xs font-medium text-indigo-700 bg-indigo-500/10 px-2.5 py-[3px] rounded-md border border-indigo-500/30">
                                {selectedTaskForDetail?.key || "TASK"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-surface custom-scrollbar w-full h-full relative">
                          <TaskDetailModal
                            projectRole={
                              selectedProject && currentUser?.uid
                                ? selectedProject.memberRoles?.[currentUser.uid]
                                : undefined
                            }
                            isUpdatingTask={isUpdatingTask}
                            isOpen={true}
                            onClose={() => setIsTaskDetailModalOpen(false)}
                            task={selectedTaskForDetail}
                            tasks={tasks || []}
                            projectMembers={projectMembers || []}
                            masterData={masterData || []}
                            userRole={effectiveRole}
                            user={currentUser}
                            currentUserProfile={currentUserProfile!}
                            sprints={sprints || []}
                            updateTaskField={updateTaskField}
                            hasPermission={hasPermission}
                            activityLogs={activityLogs || []}
                            comments={comments || []}
                            newCommentText={newCommentText}
                            setNewCommentText={setNewCommentText}
                            handleAddComment={handleAddComment}
                            handleFileUpload={handleFileUpload}
                            handleRemoveAttachment={handleRemoveAttachment}
                            uploadProgress={uploadProgress}
                            isLoggedIn={!!currentUser}
                            handleQuickAddSubtask={handleQuickAddSubtask}
                            mentionState={mentionState}
                            handleSelectMention={handleSelectMention}
                            handleCommentChange={handleCommentChange}
                            removeTaskLink={removeTaskLink}
                            handleAddLinkedTask={handleAddLinkedTask}
                            handleRemoveLinkedTask={handleRemoveLinkedTask}
                            taskLinkTargetId={taskLinkTargetId}
                            setTaskLinkTargetId={setTaskLinkTargetId}
                            taskLinkRelation={taskLinkRelation}
                            setTaskLinkRelation={setTaskLinkRelation}
                            isAddingTaskLink={isAddingTaskLink}
                            setIsAddingTaskLink={setIsAddingTaskLink}
                            isAddingExternalLink={isAddingExternalLink}
                            setIsAddingExternalLink={setIsAddingExternalLink}
                            newExternalLinkTitle={newExternalLinkTitle}
                            setNewExternalLinkTitle={setNewExternalLinkTitle}
                            newExternalLinkUrl={newExternalLinkUrl}
                            setNewExternalLinkUrl={setNewExternalLinkUrl}
                            handleAddExternalLink={handleAddExternalLink}
                            removeExternalLink={removeExternalLink}
                            toggleBlockedStatus={toggleBlockedStatus}
                            handleSuggestStoryPoints={handleSuggestStoryPoints}
                            handleAddLink={handleAddLink}
                            newLinkTitle={newLinkTitle}
                            setNewLinkTitle={setNewLinkTitle}
                            newLinkUrl={newLinkUrl}
                            setNewLinkUrl={setNewLinkUrl}
                            isAddingLink={isAddingLink}
                            setIsAddingLink={setIsAddingLink}
                            deleteTask={deleteTask}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <AppRoutes
                    effectiveRole={userRoleForProject}
                    currentUser={currentUser}
                    currentUserProfile={currentUserProfile}
                    selectedTaskForDetail={selectedTaskForDetail}
                    expandedSprintId={expandedSprintId}
                    hasPermission={hasPermission}
                    updateTaskField={updateTaskField}
                    updateTaskStatus={updateTaskStatus}
                    handleQuickCreate={handleQuickCreate}
                    setSelectedTaskForDetail={setSelectedTaskForDetail}
                    setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                    setIsNewTaskModalOpen={setIsNewTaskModalOpen}
                    deleteTask={deleteTask}
                    bulkDeleteTasks={bulkDeleteTasks}
                    fetchTasks={fetchTasks}
                    setExpandedSprintId={setExpandedSprintId}
                    setIsNewSprintModalOpen={setIsNewSprintModalOpen}
                    setIsEditSprintModalOpen={setIsEditSprintModalOpen}
                    setEditingSprint={setEditingSprint}
                    handleStartSprint={handleStartSprint}
                    handleCompleteSprint={handleCompleteSprint}
                    handleDeleteSprint={handleDeleteSprint}
                    handleDragEndPlanning={handleDragEndPlanning}
                    fetchMasterData={fetchMasterData}
                    fetchProjects={fetchProjects}
                    socket={socket}
                    qaInitialStatusFilter={qaInitialStatusFilter}
                    exportTasksToCSV={exportTasksToCSV}
                    safeFormat={safeFormat}
                    StyledDropdown={StyledDropdown}
                    updateProjectRole={updateProjectRole}
                    removeProjectMember={removeProjectMember}
                  />
                </motion.div>
              </AnimatePresence>
            </React.Fragment>
          ) : projects.length === 0 ? (
            /* Belum tergabung di proyek MANA PUN — item #160. Kartu di bawah
               menyuruh memilih proyek dari sidebar, dan pada kondisi ini
               sidebar-nya justru kosong, jadi perintahnya mustahil dijalankan. */
            <WelcomeScreen
              /* Urutan field SENGAJA disamakan dengan footer sidebar
                 (`user?.displayName || currentUser?.displayName ||
                 currentUser?.username`). Sebelumnya sapaan memulai dari
                 `name`, yang kosong pada akun ini, sehingga sapaan jatuh ke
                 "azlanirwan" sementara footer di layar yang SAMA menampilkan
                 "alan Ir" — dua identitas untuk satu orang dalam satu
                 tatapan. */
              namaPengguna={
                user?.displayName ||
                currentUserProfile?.displayName ||
                currentUser?.displayName ||
                currentUserProfile?.name ||
                currentUser?.name ||
                currentUserProfile?.username ||
                currentUser?.username ||
                ""
              }
              onOpenProfile={() => bukaDetailPengguna(currentUserProfile || currentUser || user)}
              bolehBuatProyek={hasPermission(
                effectiveRole,
                "configuration",
                "create",
                false,
                currentUserProfile?.permissions
              )}
              onCreateProject={() => setIsNewProjectModalOpen(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface-sunken/50 p-8 text-center">
              <div className="w-16 h-16 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 mb-4 shadow-soft">
                <FolderKanban className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-content-strong mb-2">
                {t("appShell.pickOrCreateProject")}
              </h3>
              <p className="text-sm text-content-muted max-w-md mb-6">
                {hasPermission(
                  effectiveRole,
                  "configuration",
                  "create",
                  false,
                  currentUserProfile?.permissions
                )
                  ? t("appShell.pickProjectHintAdmin")
                  : t("appShell.pickProjectHint")}
              </p>
              {/* Penjaga izin memakai pemeriksaan yang SAMA dengan tombol di
                  sidebar. Sebelumnya tombol ini tidak dijaga sama sekali,
                  sehingga pengguna biasa melihat ajakan membuat proyek yang
                  pasti ditolak backend. */}
              {hasPermission(
                effectiveRole,
                "configuration",
                "create",
                false,
                currentUserProfile?.permissions
              ) && (
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-content-inverse rounded-xl font-medium text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("appShell.createNewProject")}</span>
                </button>
              )}
            </div>
          )}

          {/* </main> */}

          {/* Modals */}
          <NewSprintModal
            isOpen={isNewSprintModalOpen}
            onClose={() => {
              setIsNewSprintModalOpen(false);
              setSelectedSprintBacklog(new Set());
            }}
            newSprintName={newSprintName}
            setNewSprintName={setNewSprintName}
            newSprintGoal={newSprintGoal}
            setNewSprintGoal={setNewSprintGoal}
            newSprintStartDate={newSprintStartDate}
            setNewSprintStartDate={setNewSprintStartDate}
            newSprintEndDate={newSprintEndDate}
            setNewSprintEndDate={setNewSprintEndDate}
            onSubmit={wrapAppSubmit("createSprint", handleCreateSprint)}
            isSubmitting={!!isSubmitting["createSprint"]}
          />

          <EditSprintModal
            isOpen={isEditSprintModalOpen}
            onClose={() => setIsEditSprintModalOpen(false)}
            editingSprint={editingSprint}
            setEditingSprint={setEditingSprint}
            onSubmit={wrapAppSubmit("updateSprint", handleUpdateSprint)}
            isSubmitting={!!isSubmitting["updateSprint"]}
          />

          <NewProjectModal
            isOpen={isNewProjectModalOpen}
            onClose={() => setIsNewProjectModalOpen(false)}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            newProjectKey={newProjectKey}
            setNewProjectKey={setNewProjectKey}
            newProjectDescription={newProjectDescription}
            setNewProjectDescription={setNewProjectDescription}
            onSubmit={wrapAppSubmit("createProject", handleCreateProject)}
            isSubmitting={!!isSubmitting["createProject"]}
          />

          {/* Keyboard Shortcuts Modal */}
          <KeyboardShortcutsModal
            isShortcutsModalOpen={isShortcutsModalOpen}
            setIsShortcutsModalOpen={setIsShortcutsModalOpen}
          />

          <NewTaskModal
            isOpen={isNewTaskModalOpen}
            onClose={() => setIsNewTaskModalOpen(false)}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            newTaskType={newTaskType}
            setNewTaskType={setNewTaskType}
            newTaskSprintId={newTaskSprintId}
            setNewTaskSprintId={setNewTaskSprintId}
            newTaskStatus={newTaskStatus}
            setNewTaskStatus={setNewTaskStatus}
            newTaskParentId={newTaskParentId}
            setNewTaskParentId={setNewTaskParentId}
            newTaskPriority={newTaskPriority}
            setNewTaskPriority={setNewTaskPriority}
            newTaskCategory={newTaskCategory}
            setNewTaskCategory={setNewTaskCategory}
            newTaskAssigneeId={newTaskAssigneeId}
            setNewTaskAssigneeId={setNewTaskAssigneeId}
            newTaskRelease={newTaskRelease}
            setNewTaskRelease={setNewTaskRelease}
            newTaskStoryPoints={newTaskStoryPoints}
            setNewTaskStoryPoints={setNewTaskStoryPoints}
            newTaskLabels={newTaskLabels}
            setNewTaskLabels={setNewTaskLabels}
            newTaskBusinessValue={newTaskBusinessValue}
            setNewTaskBusinessValue={setNewTaskBusinessValue}
            newTaskProjectRisk={newTaskProjectRisk}
            setNewTaskProjectRisk={setNewTaskProjectRisk}
            newTaskEnvironment={newTaskEnvironment}
            setNewTaskEnvironment={setNewTaskEnvironment}
            newTaskFigmaUrl={newTaskFigmaUrl}
            setNewTaskFigmaUrl={setNewTaskFigmaUrl}
            newTaskAcceptanceCriteria={newTaskAcceptanceCriteria}
            setNewTaskAcceptanceCriteria={setNewTaskAcceptanceCriteria}
            newTaskDescription={newTaskDescription}
            setNewTaskDescription={setNewTaskDescription}
            setNewTaskAttachments={setNewTaskAttachments}
            newTaskStartDate={newTaskStartDate}
            setNewTaskStartDate={setNewTaskStartDate}
            newTaskEndDate={newTaskEndDate}
            setNewTaskEndDate={setNewTaskEndDate}
            newTaskDueDate={newTaskDueDate}
            setNewTaskDueDate={setNewTaskDueDate}
            masterData={masterData}
            sprints={sprints}
            tasks={tasks}
            projectMembers={projectMembers}
            selectedProject={selectedProject}
            onSubmit={wrapAppSubmit("createTask", handleCreateTask)}
            isSubmitting={!!isSubmitting["createTask"]}
          />

          <EditProjectModal
            isOpen={isEditProjectModalOpen}
            onClose={() => setIsEditProjectModalOpen(false)}
            editingProject={editingProject}
            setEditingProject={setEditingProject}
            onSubmit={wrapAppSubmit("updateProject", handleUpdateProject)}
            isSubmitting={!!isSubmitting["updateProject"]}
            effectiveRole={effectiveRole}
            currentUser={currentUser}
            user={user}
            currentUserProfile={currentUserProfile}
            hasPermission={hasPermission}
            deleteProject={deleteProject}
            masterData={masterData}
          />

          {confirmAction?.isOpen && (
            <ConfirmationModal
              isOpen={confirmAction?.isOpen || false}
              onClose={() => setConfirmAction(null)}
              title={confirmAction?.title || "Konfirmasi Tindakan"}
              message={confirmAction?.message || ""}
              isLoading={confirmAction?.isLoading}
              onConfirm={async () => {
                if (confirmAction?.onConfirm) {
                  setConfirmAction((prev) => (prev ? { ...prev, isLoading: true } : prev));
                  try {
                    await confirmAction.onConfirm();
                  } catch (e) {
                    console.error("Action error:", e);
                  }
                }
                setConfirmAction(null);
              }}
              confirmText={
                confirmAction?.confirmText || (confirmAction?.isAlert ? "OK" : "Ya, Lanjutkan")
              }
              cancelText={confirmAction?.cancelText || "Batal"}
              isAlert={confirmAction?.isAlert || false}
              variant={
                confirmAction?.variant ||
                (confirmAction?.isAlert
                  ? "info"
                  : confirmAction?.title?.toLowerCase().includes("danger") ||
                      confirmAction?.title?.toLowerCase().includes("hapus") ||
                      confirmAction?.title?.toLowerCase().includes("delete") ||
                      confirmAction?.title?.toLowerCase().includes("terminate")
                    ? "danger"
                    : "warning")
              }
              closeOnBackdropClick={
                confirmAction?.closeOnBackdropClick ??
                !(
                  confirmAction?.variant === "danger" ||
                  confirmAction?.title?.toLowerCase().includes("danger") ||
                  confirmAction?.title?.toLowerCase().includes("hapus") ||
                  confirmAction?.title?.toLowerCase().includes("delete") ||
                  confirmAction?.title?.toLowerCase().includes("terminate")
                )
              }
              iconSrc={confirmAction?.iconSrc}
              iconColors={confirmAction?.iconColors}
            />
          )}

          <ProfileEditModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            userProfile={currentUser}
            onProfileUpdated={(updatedProfile: any) => {
              if (currentUser) {
                // Nilai avatar diseragamkan ke ketiga kunci sebelum digabung,
                // sehingga tidak ada kunci basi yang tertinggal apa pun bentuk
                // payload yang dikirim modal.
                const avatarBaru =
                  updatedProfile?.avatar_url ??
                  updatedProfile?.photoURL ??
                  updatedProfile?.avatarUrl;
                const profilSeragam = avatarBaru
                  ? {
                      ...updatedProfile,
                      avatar_url: avatarBaru,
                      photoURL: avatarBaru,
                      avatarUrl: avatarBaru,
                    }
                  : updatedProfile;
                const newUser = { ...currentUser, ...profilSeragam };
                setCurrentUser(newUser);
                setCurrentUserProfile(newUser);
                safeLocalStorage.setItem("sessionUser", JSON.stringify(newUser));
                setAllUsers((prevUsers) =>
                  prevUsers.map((u) =>
                    u.id === newUser.id || u.uid === newUser.uid ? { ...u, ...profilSeragam } : u
                  )
                );
              }
            }}
          />
        </div>
      </div>
    </PresenceProvider>
  );
}

export default AppContainer;
