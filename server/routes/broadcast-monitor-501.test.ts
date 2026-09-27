const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: mockQuery,
      release: mockRelease,
    }),
  },
}));

import { recordBroadcastLog, getBroadcastMonitorStatus } from "../services/broadcastLog.service";

describe("#501: BroadcastLogs & Realtime Broadcast Monitor", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("recordBroadcastLog menyimpan baris log dengan parameter yang benar", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    await recordBroadcastLog({
      channel: "whatsapp",
      userId: "user-123",
      recipientName: "Azlan Irwan",
      recipientTarget: "081244379293",
      status: "success",
      taskCount: 3,
      details: "Terkirim (3 tugas)",
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO "BroadcastLogs"');
    expect(params).toEqual([
      "whatsapp",
      "user-123",
      "Azlan Irwan",
      "081244379293",
      "success",
      3,
      "Terkirim (3 tugas)",
    ]);
  });

  it("getBroadcastMonitorStatus mengembalikan status not_sent bila belum ada log hari ini", async () => {
    // 1. Mock query BroadcastConfig
    mockQuery.mockResolvedValueOnce([[{ scheduleTime: "07:00", recipientIds: "user-1" }]]);
    // 2. Mock query Users
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: "user-1",
          uid: "user-1",
          username: "azlanirwan",
          displayName: "AZLAN IRWAN",
          phone: "081244379293",
        },
      ],
    ]);
    // 3. Mock query BroadcastLogs today (kosong)
    mockQuery.mockResolvedValueOnce([[]]);

    const result = await getBroadcastMonitorStatus("whatsapp");

    expect(result.totalTarget).toBe(1);
    expect(result.totalSentToday).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].status).toBe("not_sent");
    expect(result.items[0].name).toBe("AZLAN IRWAN");
    expect(result.items[0].time).toContain("07:00 WIB");
  });

  it("getBroadcastMonitorStatus memetakan status success dari log hari ini", async () => {
    mockQuery.mockResolvedValueOnce([[{ scheduleTime: "07:00", recipientIds: "" }]]);
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: "user-1",
          uid: "user-1",
          username: "azlanirwan",
          displayName: "AZLAN IRWAN",
          phone: "081244379293",
        },
      ],
    ]);
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: 1,
          channel: "whatsapp",
          userId: "user-1",
          recipientName: "AZLAN IRWAN",
          recipientTarget: "081244379293",
          status: "success",
          taskCount: 2,
          details: "Berhasil dikirim (2 tugas aktif)",
          createdAt: new Date("2026-09-09T07:30:00Z"),
        },
      ],
    ]);

    const result = await getBroadcastMonitorStatus("whatsapp");

    expect(result.totalTarget).toBe(1);
    expect(result.totalSentToday).toBe(1);
    expect(result.items[0].status).toBe("success");
    expect(result.items[0].taskCount).toBe(2);
  });
});
