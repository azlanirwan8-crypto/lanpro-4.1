jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn(),
  })),
}));

import { formatMessage, formatTaskList } from "../services/whatsapp.service";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../services/broadcastConfig.service";

describe("Item #502 - Format Kustom Template WhatsApp Task Assignment", () => {
  it("menghasilkan format persis sesuai spesifikasi pemilik", () => {
    const tasks = [
      {
        title: "Whatsapp",
        status: "TODO",
        priority: "medium",
        dueDate: null,
      },
      {
        title: "tes lagi",
        status: "TODO",
        priority: "medium",
        dueDate: null,
      },
    ];

    const message = formatMessage(
      "AZLAN IRWAN",
      tasks,
      DEFAULT_WHATSAPP_TEMPLATE,
      "https://lanpro.my.id"
    );

    const expected =
      "*[LanPro] Task Assignment*\n\n" +
      "Halo *AZLAN IRWAN*,\n" +
      "Berikut tiket tugas aktif yang ditugaskan kepada Anda:\n\n" +
      "```\n" +
      "[1] WHATSAPP\n" +
      "    Status    : To Do\n" +
      "    Prioritas : Medium\n" +
      "    Tenggat   : -\n\n" +
      "[2] TES LAGI\n" +
      "    Status    : To Do\n" +
      "    Prioritas : Medium\n" +
      "    Tenggat   : -\n" +
      "```\n\n" +
      "🔗 *Akses Detail Tugas:*\n" +
      "https://lanpro.my.id\n\n" +
      "─────────────────\n" +
      "_Pesan otomatis • LanPro Project Management_";

    expect(message).toBe(expected);
  });

  it("formatTaskList menghasilkan jeda 2 baris kosong antar butir tugas", () => {
    const tasks = [
      {
        title: "Tugas 1",
        status: "IN_PROGRESS",
        priority: "high",
        dueDate: "2026-09-12",
      },
      {
        title: "Tugas 2",
        status: "DONE",
        priority: "low",
        dueDate: null,
      },
    ];

    const list = formatTaskList(tasks);
    expect(list).toContain(
      "[1] TUGAS 1\n    Status    : In Progress\n    Prioritas : High\n    Tenggat   : 12/09/2026"
    );
    expect(list).toContain(
      "\n\n[2] TUGAS 2\n    Status    : Done\n    Prioritas : Low\n    Tenggat   : -"
    );
  });
});
