/**
 * Klaim slot broadcast anti-dobel (#304).
 */

const mockQuery = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: mockQuery,
      release: () => undefined,
    }),
  },
}));

import { claimBroadcastFire, getBroadcastConfig } from "./broadcastConfig.service";

describe("claimBroadcastFire (#304)", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("mengembalikan true bila UPDATE mengembalikan baris", async () => {
    // getBroadcastConfig: SELECT existing
    mockQuery
      .mockResolvedValueOnce([
        [
          {
            channel: "email",
            scheduleDays: "1,2,3,4,5",
            scheduleTime: "07:00",
            recipientIds: "u1",
            messageTemplate: "Halo",
          },
        ],
      ])
      // claim UPDATE RETURNING
      .mockResolvedValueOnce([[{ channel: "email" }]]);

    await expect(claimBroadcastFire("email", "1-07:00")).resolves.toBe(true);
  });

  it("mengembalikan false bila slot sudah diklaim (RETURNING kosong)", async () => {
    mockQuery
      .mockResolvedValueOnce([
        [
          {
            channel: "email",
            scheduleDays: "1",
            scheduleTime: "07:00",
            recipientIds: "u1",
            messageTemplate: null,
          },
        ],
      ])
      .mockResolvedValueOnce([[]]);

    await expect(claimBroadcastFire("email", "1-07:00")).resolves.toBe(false);
  });
});

describe("getBroadcastConfig (#304 regresi)", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("membaca baris yang sudah ada", async () => {
    mockQuery.mockResolvedValueOnce([
      [
        {
          channel: "whatsapp",
          scheduleDays: "1,2",
          scheduleTime: "08:30",
          recipientIds: "a,b",
          messageTemplate: "Hai",
        },
      ],
    ]);
    const cfg = await getBroadcastConfig("whatsapp");
    expect(cfg.scheduleTime).toBe("08:30");
    expect(cfg.recipientIds).toEqual(["a", "b"]);
  });
});
