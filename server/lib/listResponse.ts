import type { Response } from "express";
import { listSuccessPayload, parsePaginationQuery, type PaginationParams } from "./pagination";

/**
 * Membalas daftar dengan atau tanpa meta pagination (#318).
 */
export async function respondWithProjectList<T>(
  res: Response,
  query: Record<string, unknown>,
  fetchAll: () => Promise<T[]>,
  fetchPaged: (pagination: PaginationParams) => Promise<{ items: T[]; total: number }>
) {
  const pagination = parsePaginationQuery(query);
  if (pagination) {
    const { items, total } = await fetchPaged(pagination);
    return res.json(listSuccessPayload(items, pagination, total));
  }
  const items = await fetchAll();
  return res.json(listSuccessPayload(items, null));
}
