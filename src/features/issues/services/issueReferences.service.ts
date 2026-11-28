import { ApiError, apiRequest } from "../../../lib/api";
import type { IssueReference } from "../../../types/issueReference";

const channels = ["meeting-points", "flowcharts"] as const;

export async function listIssueReferences(projectId: string, taskId: string, signal: AbortSignal) {
  const scope = `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`;
  const replies = await Promise.all(
    channels.map(async (source) => {
      try {
        const result = await apiRequest(`${scope}/references/${source}`, { signal }, 0);
        return { data: result.data as IssueReference[], unavailable: false, allowed: true };
      } catch (error) {
        const forbidden = error instanceof ApiError && error.status === 403;
        return { data: [], unavailable: !forbidden, allowed: !forbidden };
      }
    })
  );
  return { replies, meeting: replies[0], flowchart: replies[1] };
}
