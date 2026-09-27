/**
 * Cache in-memory + localStorage untuk data modul per proyek (#317).
 * Stale-while-revalidate: tampilkan cache segera, dedupe request paralel.
 */

import { apiRequest } from "./api";
import { CacheManager } from "./cache";
import {
  buildListQuery,
  extractListData,
  type ListQueryOptions,
  type PaginationMeta,
} from "./pagination";

const TTL_MS = 120_000;

type Resource = "meetings" | "documents";

type CacheEntry = { data: unknown[]; at: number; meta?: PaginationMeta };

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<{ data: unknown[]; meta?: PaginationMeta }>>();

function cacheKey(
  resource: Resource,
  projectId: string,
  userId: string,
  options?: ListQueryOptions
) {
  const page = options?.page ?? "all";
  const limit = options?.limit ?? "all";
  const search = options?.search?.trim() || "";
  return `${resource}:${projectId}:${userId}:${page}:${limit}:${search}`;
}

function storageKey(resource: Resource, projectId: string, userId: string) {
  return `module_${resource}_${projectId}_${userId}`;
}

function readMemory<T>(key: string): T[] | null {
  const entry = memory.get(key);
  if (!entry) return null;
  return entry.data as T[];
}

function readStorage<T>(resource: Resource, projectId: string, userId: string): T[] | null {
  const stored = CacheManager.getWithMeta(storageKey(resource, projectId, userId));
  if (!stored?.data || !Array.isArray(stored.data)) return null;
  const at = typeof stored.timestamp === "number" ? stored.timestamp : 0;
  memory.set(cacheKey(resource, projectId, userId), { data: stored.data, at });
  return stored.data as T[];
}

function writeCache(
  resource: Resource,
  projectId: string,
  userId: string,
  data: unknown[],
  options?: ListQueryOptions,
  meta?: PaginationMeta
) {
  const key = cacheKey(resource, projectId, userId, options);
  memory.set(key, { data, at: Date.now(), meta });
  if (!options?.page && !options?.limit && !options?.search) {
    CacheManager.saveDebounced(storageKey(resource, projectId, userId), data);
  }
}

export function peekProjectMeetings<T = unknown>(projectId: string, userId: string): T[] | null {
  if (!projectId) return null;
  const key = cacheKey("meetings", projectId, userId);
  return readMemory<T>(key) ?? readStorage<T>("meetings", projectId, userId);
}

export function peekProjectDocuments<T = unknown>(projectId: string, userId: string): T[] | null {
  if (!projectId) return null;
  const key = cacheKey("documents", projectId, userId);
  return readMemory<T>(key) ?? readStorage<T>("documents", projectId, userId);
}

export function writeProjectMeetings(projectId: string, userId: string, data: unknown[]) {
  if (!projectId) return;
  writeCache("meetings", projectId, userId, data);
}

export function invalidateProjectMeetings(projectId: string, userId?: string) {
  clearResource("meetings", projectId, userId);
}

function clearResource(resource: Resource, projectId: string, userId?: string) {
  const prefix = userId ? `${resource}:${projectId}:${userId}:` : `${resource}:${projectId}:`;
  for (const key of [...memory.keys()]) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
  if (userId) {
    CacheManager.clear(storageKey(resource, projectId, userId));
  }
}

async function fetchCached(
  resource: Resource,
  projectId: string,
  userId: string,
  fetcher: () => Promise<{ data: unknown[]; meta?: PaginationMeta }>,
  options?: ListQueryOptions & { force?: boolean }
): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
  const key = cacheKey(resource, projectId, userId, options);

  if (!options?.force) {
    const entry = memory.get(key);
    if (entry && Date.now() - entry.at < TTL_MS) {
      return { data: entry.data, meta: entry.meta };
    }
    const pending = inflight.get(key);
    if (pending) return pending;
  } else {
    inflight.delete(key);
  }

  const promise = fetcher()
    .then((result) => {
      writeCache(resource, projectId, userId, result.data, options, result.meta);
      inflight.delete(key);
      return result;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

export async function loadProjectMeetings(
  projectId: string,
  userId: string,
  options?: ListQueryOptions & { force?: boolean }
): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
  return fetchCached(
    "meetings",
    projectId,
    userId,
    async () => {
      const res = await apiRequest(
        `/api/projects/${projectId}/meetings${buildListQuery(options)}`,
        {
          headers: { "x-user-id": userId },
        }
      );
      const { data, meta } = extractListData(res);
      return { data, meta };
    },
    options
  );
}

export async function loadProjectDocuments(
  projectId: string,
  userId: string,
  options?: ListQueryOptions & { force?: boolean }
): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
  return fetchCached(
    "documents",
    projectId,
    userId,
    async () => {
      const res = await apiRequest(
        `/api/projects/${projectId}/documents${buildListQuery(options)}`,
        {
          headers: { "x-user-id": userId },
        }
      );
      const { data, meta } = extractListData(res);
      return { data, meta };
    },
    options
  );
}

/** Prefetch data API saat hover sidebar — paralel dengan lazy chunk (#317). */
export function prefetchModuleDataForView(viewId: string, projectId: string, userId: string) {
  if (!projectId) return;
  const uid = userId || "guest";
  if (viewId === "dashboard" || viewId === "meetingNotes") {
    void loadProjectMeetings(
      projectId,
      uid,
      viewId === "dashboard" ? { limit: 3 } : { page: 1, limit: 8 }
    ).catch(() => {});
  }
  if (viewId === "dashboard" || viewId === "wiki") {
    void loadProjectDocuments(
      projectId,
      uid,
      viewId === "dashboard" ? { limit: 3 } : { page: 1, limit: 8 }
    ).catch(() => {});
  }
}
