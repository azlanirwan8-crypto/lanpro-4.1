/**
 * Akses API Milestone proyek (#312).
 */
import { apiRequest } from "../../lib/api";
import { extractListData } from "../../lib/pagination";

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
  progress?: number;
  totalStoryPoints?: number;
  doneStoryPoints?: number;
}

export async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const res = await apiRequest(`/api/projects/${projectId}/milestones`);
  return extractListData<Milestone>(res as any).data;
}

export async function createMilestone(
  projectId: string,
  input: { name: string; description?: string; dueDate?: string | null }
): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/milestones`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMilestone(
  projectId: string,
  id: string,
  input: {
    name?: string;
    description?: string | null;
    dueDate?: string | null;
    status?: string;
  }
): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/milestones/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteMilestone(projectId: string, id: string): Promise<void> {
  await apiRequest(`/api/projects/${projectId}/milestones/${id}`, {
    method: "DELETE",
  });
}
