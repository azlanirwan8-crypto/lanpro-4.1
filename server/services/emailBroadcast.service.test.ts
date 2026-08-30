/**
 * Regresi ISSUE-297 — broadcast ringkasan task lewat email.
 * Diminta pemilik proyek 30 Agu 2026.
 *
 * Yang dijaga: penerima tanpa task aktif TIDAK dikirimi apa pun, penerima
 * dengan task dikirimi ringkasan berisi task miliknya sendiri, dan
 * pengiriman selalu lewat helper latar belakang (#277) — bukan kirimEmail()
 * langsung, yang kegagalannya lenyap tanpa jejak.
 */

const mockKueri = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: mockKueri,
      release: () => undefined,
    }),
  },
}));

jest.mock("./email.service", () => ({
  __esModule: true,
  kirimEmailTaskDigest: jest.fn().mockResolvedValue({ success: true }),
  kirimEmailLatarBelakang: jest.fn(),
}));

import { kirimBroadcastTaskEmail } from "./emailBroadcast.service";
import { kirimEmailTaskDigest, kirimEmailLatarBelakang } from "./email.service";

const budi = {
  id: "u-1",
  displayName: "Budi",
  nama_lengkap: "Budi Santoso",
  username: "budi",
  email: "budi@contoh.id",
};
const siti = {
  id: "u-2",
  displayName: "Siti",
  nama_lengkap: "Siti Aminah",
  username: "siti",
  email: "siti@contoh.id",
};

/** Query pertama = daftar user; berikutnya = task per user, berurutan. */
function siapkan(users: any[], taskPerUser: Record<string, any[]>) {
  mockKueri.mockReset();
  (kirimEmailTaskDigest as jest.Mock).mockClear();
  (kirimEmailLatarBelakang as jest.Mock).mockClear();

  mockKueri.mockImplementation(async (sql: string, params: any[]) => {
    if (/FROM "Users"/i.test(sql)) return [users];
    if (/FROM Tasks/i.test(sql)) return [taskPerUser[params[0]] || []];
    return [[]];
  });
}

describe("#297 broadcast task via email", () => {
  it("tidak mengirim apa pun kepada penerima tanpa task aktif", async () => {
    siapkan([budi], { "u-1": [] });

    const hasil = await kirimBroadcastTaskEmail(["u-1"]);

    expect(hasil.penerimaDiperiksa).toBe(1);
    expect(hasil.emailDikirim).toBe(0);
    expect(kirimEmailLatarBelakang).not.toHaveBeenCalled();
  });

  it("mengirim ringkasan berisi task milik penerima itu sendiri", async () => {
    siapkan([budi], {
      "u-1": [
        {
          title: "Perbaiki login",
          status: "In Progress",
          priority: "High",
          dueDate: "2026-09-01",
          projectName: "LanPro",
        },
      ],
    });

    const hasil = await kirimBroadcastTaskEmail(["u-1"]);

    expect(hasil.emailDikirim).toBe(1);
    const argumen = (kirimEmailTaskDigest as jest.Mock).mock.calls[0][0];
    expect(argumen.email).toBe("budi@contoh.id");
    expect(argumen.tasks).toHaveLength(1);
    expect(argumen.tasks[0].title).toBe("Perbaiki login");
    expect(argumen.tasks[0].projectName).toBe("LanPro");
  });

  it("selalu lewat helper latar belakang #277, bukan kirimEmail langsung", async () => {
    siapkan([budi], {
      "u-1": [{ title: "A", status: "To Do", priority: "Low", dueDate: null, projectName: null }],
    });

    await kirimBroadcastTaskEmail(["u-1"]);

    // Tanpa helper ini, kegagalan kirim mengembalikan {success:false} yang
    // resolved dan lenyap tanpa jejak -- itu persis #277.
    expect(kirimEmailLatarBelakang).toHaveBeenCalledTimes(1);
  });

  it("memisahkan penerima: masing-masing hanya menerima task miliknya", async () => {
    siapkan([budi, siti], {
      "u-1": [{ title: "Task Budi", status: "To Do", priority: "Low", dueDate: null }],
      "u-2": [{ title: "Task Siti", status: "Testing", priority: "High", dueDate: null }],
    });

    const hasil = await kirimBroadcastTaskEmail(["u-1", "u-2"]);

    expect(hasil.emailDikirim).toBe(2);
    const panggilan = (kirimEmailTaskDigest as jest.Mock).mock.calls.map((c) => c[0]);
    const milikBudi = panggilan.find((p) => p.email === "budi@contoh.id");
    const milikSiti = panggilan.find((p) => p.email === "siti@contoh.id");
    expect(milikBudi.tasks[0].title).toBe("Task Budi");
    expect(milikSiti.tasks[0].title).toBe("Task Siti");
  });

  it("menandai task yang lewat tenggat", async () => {
    siapkan([budi], {
      "u-1": [
        { title: "Telat", status: "To Do", priority: "High", dueDate: "2020-01-01" },
        { title: "Belum", status: "To Do", priority: "Low", dueDate: null },
      ],
    });

    await kirimBroadcastTaskEmail(["u-1"]);

    const tasks = (kirimEmailTaskDigest as jest.Mock).mock.calls[0][0].tasks;
    expect(tasks.find((t: any) => t.title === "Telat").isOverdue).toBe(true);
    expect(tasks.find((t: any) => t.title === "Belum").isOverdue).toBe(false);
  });
});
