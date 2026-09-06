import {
  DEFAULT_ISSUE_FILTER_SNAPSHOT,
  deleteNamedFilter,
  isIssueOverdue,
  isStatusTerminal,
  loadNamedFilters,
  loadSessionFilters,
  namedKey,
  saveSessionFilters,
  sessionKey,
  upsertNamedFilter,
} from "./issueFilterSnapshot";
import type { MasterData, Task } from "../../../types";

function buatLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

describe("issueFilterSnapshot (#468)", () => {
  const projectId = "proj-468";

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: buatLocalStorageMock(),
      configurable: true,
    });
  });

  it("isStatusTerminal memakai MasterData.isTerminal lalu fallback label", () => {
    const md: MasterData[] = [
      {
        id: "1",
        type: "status",
        label: "Selesai Custom",
        code: "selesai_custom",
        order: 1,
        isTerminal: true,
      },
      {
        id: "2",
        type: "status",
        label: "To Do",
        code: "todo",
        order: 2,
        isTerminal: false,
      },
    ];
    expect(isStatusTerminal("Selesai Custom", md)).toBe(true);
    expect(isStatusTerminal("To Do", md)).toBe(false);
    expect(isStatusTerminal("Done", [])).toBe(true);
    expect(isStatusTerminal("In Progress", [])).toBe(false);
  });

  it("isIssueOverdue: due sebelum hari ini + bukan terminal", () => {
    const now = new Date("2026-09-06T12:00:00");
    const overdueTask = {
      id: "a",
      dueDate: "2026-09-05",
      status: "To Do",
    } as Task;
    const todayTask = {
      id: "b",
      dueDate: "2026-09-06",
      status: "To Do",
    } as Task;
    const doneTask = {
      id: "c",
      dueDate: "2026-09-01",
      status: "Done",
    } as Task;
    expect(isIssueOverdue(overdueTask, [], now)).toBe(true);
    expect(isIssueOverdue(todayTask, [], now)).toBe(false);
    expect(isIssueOverdue(doneTask, [], now)).toBe(false);
  });

  it("session filters round-trip", () => {
    const snap = { ...DEFAULT_ISSUE_FILTER_SNAPSHOT, status: "To Do", overdue: true };
    saveSessionFilters(projectId, snap);
    expect(localStorage.getItem(sessionKey(projectId))).toBeTruthy();
    expect(loadSessionFilters(projectId)).toEqual(snap);
  });

  it("named filters upsert + delete", () => {
    const snap = { ...DEFAULT_ISSUE_FILTER_SNAPSHOT, priority: "High" };
    upsertNamedFilter(projectId, "Mine", snap);
    expect(loadNamedFilters(projectId)).toHaveLength(1);
    expect(localStorage.getItem(namedKey(projectId))).toBeTruthy();
    upsertNamedFilter(projectId, "mine", { ...snap, overdue: true });
    const list = loadNamedFilters(projectId);
    expect(list).toHaveLength(1);
    expect(list[0].snapshot.overdue).toBe(true);
    deleteNamedFilter(projectId, list[0].id);
    expect(loadNamedFilters(projectId)).toHaveLength(0);
  });
});
