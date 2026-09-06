/**
 * #468 — snapshot filter Issues: session + named views di localStorage.
 * Bukan JQL / share / DB. SLA penuh tidak di sini.
 */
import type { MasterData, Task } from "../../../types";

export type IssueFilterSnapshot = {
  search: string;
  status: string;
  priority: string;
  assignee: string;
  category: string;
  sprint: string;
  label: string;
  environment: string;
  projectRisk: string;
  release: string;
  resolution: string;
  dateType: string;
  startDate: string;
  endDate: string;
  overdue: boolean;
};

export type SavedIssueFilter = {
  id: string;
  name: string;
  createdAt: string;
  snapshot: IssueFilterSnapshot;
};

export const DEFAULT_ISSUE_FILTER_SNAPSHOT: IssueFilterSnapshot = {
  search: "",
  status: "All",
  priority: "All",
  assignee: "All",
  category: "All",
  sprint: "All",
  label: "All",
  environment: "All",
  projectRisk: "All",
  release: "All",
  resolution: "All",
  dateType: "dueDate",
  startDate: "",
  endDate: "",
  overdue: false,
};

const STATUS_TERMINAL_FALLBACK = new Set([
  "done",
  "selesai",
  "completed",
  "closed",
  "canceled",
  "cancelled",
  "archive",
  "archived",
]);

export function sessionKey(projectId: string): string {
  return `lanpro.issueFilters.session.${projectId}`;
}

export function namedKey(projectId: string): string {
  return `lanpro.issueFilters.named.${projectId}`;
}

export function isStatusTerminal(status: string | undefined, masterData: MasterData[]): boolean {
  const raw = (status || "").trim();
  if (!raw) return false;
  const hit = (masterData || []).find(
    (m) =>
      m.type?.toLowerCase() === "status" &&
      (m.label === raw || m.code === raw || m.label?.toLowerCase() === raw.toLowerCase())
  );
  if (hit && (hit.isTerminal === true || (hit as { isTerminal?: number }).isTerminal === 1)) {
    return true;
  }
  return STATUS_TERMINAL_FALLBACK.has(raw.toLowerCase());
}

/** Overdue = dueDate sebelum hari ini (lokal) dan status belum terminal. */
export function isIssueOverdue(
  task: Task,
  masterData: MasterData[],
  now: Date = new Date()
): boolean {
  if (!task?.dueDate) return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due.getTime() >= todayStart.getTime()) return false;
  if (isStatusTerminal(task.status, masterData)) return false;
  return true;
}

function asSnapshot(raw: unknown): IssueFilterSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    ...DEFAULT_ISSUE_FILTER_SNAPSHOT,
    search: typeof o.search === "string" ? o.search : "",
    status: typeof o.status === "string" ? o.status : "All",
    priority: typeof o.priority === "string" ? o.priority : "All",
    assignee: typeof o.assignee === "string" ? o.assignee : "All",
    category: typeof o.category === "string" ? o.category : "All",
    sprint: typeof o.sprint === "string" ? o.sprint : "All",
    label: typeof o.label === "string" ? o.label : "All",
    environment: typeof o.environment === "string" ? o.environment : "All",
    projectRisk: typeof o.projectRisk === "string" ? o.projectRisk : "All",
    release: typeof o.release === "string" ? o.release : "All",
    resolution: typeof o.resolution === "string" ? o.resolution : "All",
    dateType: typeof o.dateType === "string" ? o.dateType : "dueDate",
    startDate: typeof o.startDate === "string" ? o.startDate : "",
    endDate: typeof o.endDate === "string" ? o.endDate : "",
    overdue: o.overdue === true,
  };
}

export function loadSessionFilters(projectId: string): IssueFilterSnapshot | null {
  if (typeof localStorage === "undefined" || !projectId) return null;
  try {
    const raw = localStorage.getItem(sessionKey(projectId));
    if (!raw) return null;
    return asSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSessionFilters(projectId: string, snapshot: IssueFilterSnapshot): void {
  if (typeof localStorage === "undefined" || !projectId) return;
  try {
    localStorage.setItem(sessionKey(projectId), JSON.stringify(snapshot));
  } catch {
    /* quota / private mode — abaikan */
  }
}

export function loadNamedFilters(projectId: string): SavedIssueFilter[] {
  if (typeof localStorage === "undefined" || !projectId) return [];
  try {
    const raw = localStorage.getItem(namedKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row: unknown) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const snap = asSnapshot(r.snapshot);
        if (!snap || typeof r.id !== "string" || typeof r.name !== "string") return null;
        return {
          id: r.id,
          name: r.name,
          createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
          snapshot: snap,
        } satisfies SavedIssueFilter;
      })
      .filter((x): x is SavedIssueFilter => Boolean(x));
  } catch {
    return [];
  }
}

function saveNamedFilters(projectId: string, list: SavedIssueFilter[]): void {
  if (typeof localStorage === "undefined" || !projectId) return;
  try {
    localStorage.setItem(namedKey(projectId), JSON.stringify(list));
  } catch {
    /* abaikan */
  }
}

export function upsertNamedFilter(
  projectId: string,
  name: string,
  snapshot: IssueFilterSnapshot
): SavedIssueFilter[] {
  const trimmed = name.trim();
  if (!trimmed) return loadNamedFilters(projectId);
  const list = loadNamedFilters(projectId);
  const existing = list.find((f) => f.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    existing.snapshot = snapshot;
    existing.createdAt = new Date().toISOString();
  } else {
    list.push({
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: new Date().toISOString(),
      snapshot,
    });
  }
  saveNamedFilters(projectId, list);
  return list;
}

export function deleteNamedFilter(projectId: string, id: string): SavedIssueFilter[] {
  const next = loadNamedFilters(projectId).filter((f) => f.id !== id);
  saveNamedFilters(projectId, next);
  return next;
}
