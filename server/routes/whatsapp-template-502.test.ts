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
      "[LanPro] Task Assignment\n\n" +
      "Halo AZLAN IRWAN,\n" +
      "Kamu telah ditugaskan untuk tiket berikut:\n" +
      "1. Tugas: Whatsapp\n" +
      "    Status: To Do\n" +
      "    Prioritas: Medium\n" +
      "    Tanggal Terakhir : -\n\n" +
      "2. Tugas: tes lagi\n" +
      "    Status: To Do\n" +
      "    Prioritas: Medium\n" +
      "    Tanggal Terakhir : -\n\n" +
      "Silakan cek detail tugas anda melalui tautan berikut:\n" +
      "https://lanpro.my.id\n\n" +
      "Terima kasih.";

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
      "1. Tugas: Tugas 1\n    Status: In Progress\n    Prioritas: High\n    Tanggal Terakhir : 12/09/2026"
    );
    expect(list).toContain(
      "\n\n2. Tugas: Tugas 2\n    Status: Done\n    Prioritas: Low\n    Tanggal Terakhir : -"
    );
  });
});
