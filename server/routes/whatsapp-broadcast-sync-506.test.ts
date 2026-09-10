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

jest.mock("node-cron", () => ({
  __esModule: true,
  default: {
    schedule: () => ({ stop: () => {} }),
  },
}));

import { sendDailyTaskDigest } from "../services/whatsapp.service";
import { getBroadcastMonitorStatus } from "../services/broadcastLog.service";

describe("Item #506: Sinkronisasi Multi-Recipient, Pelaporan Status, & Zona Waktu WIB", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    process.env.WHATSAPP_API_TOKEN = "test-token";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true }),
    } as any);
  });

  afterEach(() => {
    delete process.env.WHATSAPP_API_TOKEN;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("sendDailyTaskDigest menangani multi-recipient termasuk user tanpa nomor HP secara transparan", async () => {
    // 1. Query Users: mengembalikan 2 user (1 dengan HP, 1 tanpa HP)
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: "u-1",
          uid: "u-1",
          username: "azlan",
          displayName: "Azlan Irwan",
          phone: "081244379293",
        },
        {
          id: "u-2",
          uid: "u-2",
          username: "admin",
          displayName: "Administrator",
          phone: null, // nomor HP kosong
        },
      ],
    ]);

    // 2. Query Tasks untuk user u-1 (memiliki 1 tugas)
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: "task-101",
          title: "Selesaikan Laporan",
          dueDate: "2026-09-12",
          status: "In Progress",
          priority: "High",
          projectName: "LanPro",
        },
      ],
    ]);

    // 3. Insert BroadcastLogs untuk u-1 (success)
    mockQuery.mockResolvedValueOnce([[]]);

    // 4. Insert BroadcastLogs untuk u-2 (failed - tanpa HP)
    mockQuery.mockResolvedValueOnce([[]]);

    const hasil = await sendDailyTaskDigest(undefined, ["u-1", "u-2"]);

    expect(hasil.totalPenerima).toBe(2);
    expect(hasil.totalDikirim).toBe(1);
    expect(hasil.totalGagal).toBe(1);
    expect(hasil.kegagalan).toHaveLength(1);
    expect(hasil.kegagalan[0].userId).toBe("u-2");
    expect(hasil.kegagalan[0].reason).toContain("Nomor WhatsApp belum terdaftar");
  });

  it("getBroadcastMonitorStatus menampilkan seluruh recipient yang dipilih dan memformat jam ke WIB", async () => {
    // 1. Mock query BroadcastConfig (2 recipientIds: u-1 dan u-2)
    mockQuery.mockResolvedValueOnce([[{ scheduleTime: "08:00", recipientIds: "u-1, u-2" }]]);

    // 2. Mock query Users (u-1 punya HP, u-2 tanpa HP)
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: "u-1",
          uid: "u-1",
          username: "azlan",
          displayName: "Azlan Irwan",
          phone: "081244379293",
        },
        {
          id: "u-2",
          uid: "u-2",
          username: "admin",
          displayName: "Administrator",
          phone: "",
        },
      ],
    ]);

    // 3. Mock query BroadcastLogs hari ini (u-1 tercatat sukses pada 01:30 UTC = 08:30 WIB)
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: 1,
          channel: "whatsapp",
          userId: "u-1",
          recipientName: "Azlan Irwan",
          recipientTarget: "081244379293",
          status: "success",
          taskCount: 1,
          details: "Berhasil dikirim (1 tugas aktif)",
          createdAt: new Date("2026-09-10T01:30:00.000Z"), // 01:30 UTC -> 08:30 WIB
        },
      ],
    ]);

    const res = await getBroadcastMonitorStatus("whatsapp");

    expect(res.totalTarget).toBe(2);
    expect(res.items).toHaveLength(2);

    // User 1: u-1 (sukses, jam WIB terformat 08:30 WIB)
    const item1 = res.items.find((i) => i.userId === "u-1");
    expect(item1).toBeDefined();
    expect(item1?.status).toBe("success");
    expect(item1?.time).toBe("08:30 WIB");

    // User 2: u-2 (tanpa nomor HP, status failed dengan detail jelas)
    const item2 = res.items.find((i) => i.userId === "u-2");
    expect(item2).toBeDefined();
    expect(item2?.status).toBe("failed");
    expect(item2?.details).toContain("Nomor WhatsApp belum terdaftar");
  });
});
