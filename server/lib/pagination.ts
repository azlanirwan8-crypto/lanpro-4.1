/**
 * Utilitas pagination server-side (#318).
 * Tanpa query page/limit → perilaku lama (daftar penuh dengan batas keamanan).
 * Dengan page atau limit → respons ber-meta { page, limit, total, totalPages }.
 */

/** Batas atas saat klien tidak meminta pagination (#284). */
export const BATAS_DAFTAR_TANPA_PAGINATION = 2000;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
}

export function parsePaginationQuery(query: Record<string, unknown>): PaginationParams | null {
  const hasPage = query.page !== undefined && query.page !== "";
  const hasLimit = query.limit !== undefined && query.limit !== "";
  if (!hasPage && !hasLimit) return null;

  const page = Math.max(1, Number(query.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildPaginationMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export function listSuccessPayload<T>(
  items: T[],
  pagination: PaginationParams | null,
  total?: number
): { status: "success"; data: T[]; meta?: PaginationMeta } {
  if (pagination && total !== undefined) {
    return {
      status: "success",
      data: items,
      meta: buildPaginationMeta(total, pagination),
    };
  }
  return { status: "success", data: items };
}
