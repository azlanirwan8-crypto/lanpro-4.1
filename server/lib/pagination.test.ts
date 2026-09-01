import {
  buildPaginationMeta,
  parsePaginationQuery,
  listSuccessPayload,
  BATAS_DAFTAR_TANPA_PAGINATION,
} from "./pagination";

describe("pagination (#318)", () => {
  it("returns null when page and limit absent", () => {
    expect(parsePaginationQuery({})).toBeNull();
    expect(parsePaginationQuery({ search: "foo" })).toBeNull();
  });

  it("parses page/limit with caps", () => {
    const p = parsePaginationQuery({ page: "2", limit: "999" });
    expect(p).toEqual({ page: 2, limit: 200, offset: 200 });
  });

  it("builds meta with at least one page", () => {
    expect(buildPaginationMeta(0, { page: 1, limit: 50, offset: 0 }).totalPages).toBe(1);
    expect(buildPaginationMeta(101, { page: 1, limit: 50, offset: 0 }).totalPages).toBe(3);
  });

  it("includes meta only when paginated", () => {
    const full = listSuccessPayload([1, 2], null);
    expect(full.meta).toBeUndefined();
    const paged = listSuccessPayload([1], { page: 1, limit: 10, offset: 0 }, 25);
    expect(paged.meta?.total).toBe(25);
  });

  it("exports safety cap constant", () => {
    expect(BATAS_DAFTAR_TANPA_PAGINATION).toBeGreaterThan(0);
  });
});
