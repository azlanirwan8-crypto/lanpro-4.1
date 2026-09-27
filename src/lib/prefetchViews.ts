/**
 * Prefetch lazy view chunks on sidebar hover — kurangi jeda saat pindah menu (#317).
 */

const prefetched = new Set<string>();

const VIEW_IMPORTS: Record<string, () => Promise<unknown>> = {
  dashboard: () => import("../features/dashboard"),
  meetingNotes: () => import("../features/meeting-notes/MeetingNotes"),
  wiki: () => import("../features/wiki"),
  flowchart: () => import("../features/flowchart/FlowchartContainer"),
  list: () => import("../features/issues/IssueListView"),
  sprints: () => import("../features/planning"),
  board: () => import("../features/kanban/index"),
  qa: () => import("../features/qa/TestQAPanel"),
  timeline: () => import("../features/timeline/TimelinePanel"),
  team: () => import("../features/team/TeamManagementPanel"),
  access: () => import("../features/team/TeamManagementPanel"),
  master: () => import("../features/master/MasterDataPanel"),
  users: () => import("../features/users/AdminUserPanel"),
  userSessions: () => import("../features/users/UserSessionsPanel"),
  auditLog: () => import("../features/enterprise-audit/EnterpriseAuditDashboard"),
  "enterprise-audit": () => import("../features/enterprise-audit/EnterpriseAuditDashboard"),
  activity: () => import("../features/activity/ActivityLogPanel"),
  dbExplorer: () => import("../features/explorer/DbExplorerPanel"),
  settingsIntegration: () => import("../features/settings/SettingsPage"),
  connect: () => import("../features/connect/ConnectPanel"),
};

export function prefetchView(viewId: string) {
  const loader = VIEW_IMPORTS[viewId];
  if (!loader || prefetched.has(viewId)) return;
  prefetched.add(viewId);
  void loader().catch(() => {
    prefetched.delete(viewId);
  });
}
