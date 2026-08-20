import { useEffect, useCallback } from "react";
import { useAppStore, AppView } from "../store/useAppStore";

const VALID_VIEWS = new Set<string>([
  "dashboard",
  "board",
  "list",
  "timeline",
  "master",
  "access",
  "team",
  "activity",
  "sprints",
  "planning",
  "users",
  "meetingNotes",
  "backup",
  "issueList",
  "connect",
  "dbExplorer",
  "wiki",
  "notebooklm",
  "flowchart",
  "auditLog",
  "enterprise-audit",
  "qa",
  "settingsIntegration",
  "issueDetail",
  "userDetail",
]);

/**
 * Normalisasi query view ke AppView canonical
 */
export const normalizeView = (viewStr: string | null | undefined): AppView | null => {
  if (!viewStr) return null;
  const lower = viewStr.trim();
  if (lower === "kanban") return "board";
  if (lower === "planning") return "sprints";
  if (lower === "issueList") return "list";
  if (lower === "team") return "access";
  if (lower === "enterprise-audit") return "auditLog";
  if (VALID_VIEWS.has(lower)) {
    return lower as AppView;
  }
  return null;
};

/**
 * useAppNavigation
 * Menyediakan sinkronisasi URL peramban (pushState / popstate) dengan currentView di store.
 * Mendukung tombol Back/Forward peramban, deep-linking via query `?view=...&projectId=...`,
 * dan refresh halaman tanpa kehilangan tampilan aktif.
 */
export const useAppNavigation = () => {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectedProject = useAppStore((s) => s.selectedProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const projects = useAppStore((s) => s.projects);

  // Baca URL saat inisialisasi / mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      const projParam = params.get("projectId") || params.get("project");

      const parsedView = normalizeView(viewParam);
      if (parsedView && parsedView !== currentView) {
        setCurrentView(parsedView);
      }

      if (projParam && projects.length > 0) {
        const found = projects.find((p) => p.id === projParam || p.key === projParam || (p as any).projectKey === projParam);
        if (found && (!selectedProject || selectedProject.id !== found.id)) {
          setSelectedProject(found);
        }
      }
    } catch (e) {
      // safe fallback
    }
  }, [projects]);

  // Tangani tombol Back / Forward peramban
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      try {
        const params = new URLSearchParams(window.location.search);
        const viewFromUrl = normalizeView(params.get("view"));
        const stateView = event.state?.view ? normalizeView(event.state.view) : null;
        const targetView = stateView || viewFromUrl || "dashboard";

        setCurrentView(targetView);

        const projId = event.state?.projectId || params.get("projectId") || params.get("project");
        if (projId && projects.length > 0) {
          const found = projects.find((p) => p.id === projId || p.key === projId || (p as any).projectKey === projId);
          if (found) {
            setSelectedProject(found);
          }
        }
      } catch (e) {
        // safe fallback
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [projects, setCurrentView, setSelectedProject]);

  // Fungsi navigasi yang menyinkronkan URL history
  const navigate = useCallback(
    (view: AppView, projectId?: string) => {
      setCurrentView(view);

      if (typeof window === "undefined") return;
      try {
        const activeProjId = projectId || selectedProject?.id;
        const params = new URLSearchParams(window.location.search);
        params.set("view", view);
        if (activeProjId) {
          params.set("projectId", activeProjId);
        } else {
          params.delete("projectId");
          params.delete("project");
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        const currentFull = `${window.location.pathname}${window.location.search}`;

        if (newUrl !== currentFull) {
          window.history.pushState(
            { view, projectId: activeProjId },
            "",
            newUrl
          );
        }
      } catch (e) {
        // safe fallback
      }
    },
    [selectedProject, setCurrentView]
  );

  return {
    currentView,
    setCurrentView,
    navigate,
  };
};
