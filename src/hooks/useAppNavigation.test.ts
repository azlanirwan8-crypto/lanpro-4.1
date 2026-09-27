/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useAppNavigation, normalizeView } from "./useAppNavigation";
import { useAppStore } from "../store/useAppStore";

describe("useAppNavigation & normalizeView", () => {
  beforeEach(() => {
    useAppStore.setState({
      currentView: "dashboard",
      projects: [{ id: "proj-1", projectKey: "PROJ", name: "Proyek 1" } as any],
      selectedProject: null,
    });
    window.history.pushState({}, "", "/");
  });

  it("normalizeView correctly aliases alternative view names", () => {
    expect(normalizeView("kanban")).toBe("board");
    expect(normalizeView("planning")).toBe("sprints");
    expect(normalizeView("issueList")).toBe("list");
    expect(normalizeView("team")).toBe("access");
    expect(normalizeView("enterprise-audit")).toBe("auditLog");
    expect(normalizeView("dashboard")).toBe("dashboard");
    expect(normalizeView("unknown-view-xyz")).toBeNull();
    expect(normalizeView(null)).toBeNull();
    expect(normalizeView(undefined)).toBeNull();
  });

  it("navigate updates currentView in store and updates window.history", () => {
    const { result } = renderHook(() => useAppNavigation());

    act(() => {
      result.current.navigate("board", "proj-1");
    });

    expect(useAppStore.getState().currentView).toBe("board");
    expect(window.location.search).toContain("view=board");
    expect(window.location.search).toContain("projectId=proj-1");
  });

  it("handles popstate event when user clicks back button", () => {
    const { result } = renderHook(() => useAppNavigation());

    act(() => {
      result.current.navigate("wiki", "proj-1");
    });
    expect(useAppStore.getState().currentView).toBe("wiki");

    act(() => {
      // Simulate popstate event to dashboard
      window.history.pushState({ view: "dashboard" }, "", "/?view=dashboard");
      window.dispatchEvent(new PopStateEvent("popstate", { state: { view: "dashboard" } }));
    });

    expect(useAppStore.getState().currentView).toBe("dashboard");
  });
});
