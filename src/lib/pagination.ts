/**
 * Utilitas pagination klien (#318) — selaras dengan server/lib/pagination.ts.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T> {
  status: string;
  data: T[];
  meta?: PaginationMeta;
}

export interface ListQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  suiteId?: string;
  rootsOnly?: boolean;
  /**
   * #772 — pengurutan daftar yang di-page server. Nama kolom dibatasi di sisi
   * SERVER (`server/lib/sortirDaftar.ts`, allow-list), jadi tipe longgar di sini
   * bukan lubang: nilai asing hanya membuat server jatuh ke urutan bawaan.
   */
  sort?: string;
  dir?: "asc" | "desc";
}

export function buildListQuery(options?: ListQueryOptions): string {
  if (!options) return "";
  const params = new URLSearchParams();
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.search?.trim()) params.set("search", options.search.trim());
  if (options.type?.trim()) params.set("type", options.type.trim());
  if (options.suiteId?.trim()) params.set("suiteId", options.suiteId.trim());
  if (options.rootsOnly) params.set("rootsOnly", "1");
  if (options.sort?.trim()) params.set("sort", options.sort.trim());
  if (options.dir) params.set("dir", options.dir);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function extractListData<T>(res: PaginatedApiResponse<T>): {
  data: T[];
  meta?: PaginationMeta;
} {
  return {
    data: Array.isArray(res?.data) ? res.data : [],
    meta: res?.meta,
  };
}
