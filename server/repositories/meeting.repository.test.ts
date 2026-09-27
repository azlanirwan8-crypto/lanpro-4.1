/**
 * #320 — setelah analisis COMPLETED, recording_url dikosongkan.
 * Adapter database di-mock — tidak ada koneksi Postgres sungguhan.
 */
const kueriPalsu = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: unknown[]) => kueriPalsu(...a),
    getConnection: async () => ({
      query: (...a: unknown[]) => kueriPalsu(...a),
      release: () => {},
    }),
  },
}));

import { MeetingRepository } from "./meeting.repository";

const repo = new MeetingRepository();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("clearRecordingFile (#320)", () => {
  it("mengosongkan recording_url dan file_size tanpa menimpa upload_status", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.clearRecordingFile("m-1");
    const [sql, params] = kueriPalsu.mock.calls[0];
    expect(String(sql)).toMatch(/recording_url\s*=\s*NULL/i);
    expect(String(sql)).toMatch(/file_size\s*=\s*NULL/i);
    expect(String(sql)).not.toMatch(/upload_status/i);
    expect(params).toEqual(["m-1"]);
  });
});
