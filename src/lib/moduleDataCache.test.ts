import {
  loadProjectMeetings,
  peekProjectMeetings,
  writeProjectMeetings,
  invalidateProjectMeetings,
} from "./moduleDataCache";
import { apiRequest } from "./api";

jest.mock("./api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("./cache", () => ({
  CacheManager: {
    saveDebounced: jest.fn(),
    getWithMeta: jest.fn(() => null),
    clear: jest.fn(),
  },
}));

const mockedApi = apiRequest as jest.Mock;

describe("moduleDataCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateProjectMeetings("p1", "u1");
  });

  it("dedupes concurrent fetches for the same project", async () => {
    mockedApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                status: "success",
                data: [{ id: "m1" }],
              }),
            20
          );
        })
    );

    const [a, b] = await Promise.all([
      loadProjectMeetings("p1", "u1"),
      loadProjectMeetings("p1", "u1"),
    ]);

    expect(a.data).toEqual([{ id: "m1" }]);
    expect(b.data).toEqual([{ id: "m1" }]);
    expect(mockedApi).toHaveBeenCalledTimes(1);
  });

  it("returns memory cache via peek after write", () => {
    writeProjectMeetings("p1", "u1", [{ id: "cached" }]);
    expect(peekProjectMeetings("p1", "u1")).toEqual([{ id: "cached" }]);
  });
});
