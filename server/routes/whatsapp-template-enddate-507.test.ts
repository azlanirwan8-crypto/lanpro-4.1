jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: async () => [[]],
      release: () => {},
    }),
  },
}));

jest.mock("node-cron", () => ({
  __esModule: true,
  default: {
    schedule: () => ({ stop: () => {} }),
  },
}));

import { formatTaskList, formatMessage } from "../services/whatsapp.service";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../services/broadcastConfig.service";

describe("Item #507: Penyelarasan Tanggal Terakhir (endDate) & Template Monospace Presisi", () => {
  it("formatTaskList mengambil t.endDate sebagai prioritas Tanggal Terakhir", () => {
    const tasks = [
      {
        title: "Perbaikan Endpoint",
        status: "In Progress",
        priority: "High",
        endDate: "2026-09-15",
        dueDate: "2026-09-10",
      },
    ];

    const result = formatTaskList(tasks);
    expect(result).toContain("Tanggal Terakhir : 15/09/2026");
    expect(result).not.toContain("Tenggat");
  });

  it("formatTaskList fallback ke t.dueDate bila t.endDate tidak ada", () => {
    const tasks = [
      {
        title: "Refactor Database",
        status: "To Do",
        priority: "Medium",
        dueDate: "2026-09-20",
      },
    ];

    const result = formatTaskList(tasks);
    expect(result).toContain("Tanggal Terakhir : 20/09/2026");
  });

  it("formatTaskList menghasilkan tanda '-' bila kedua tanggal kosong", () => {
    const tasks = [
      {
        title: "Task Tanpa Tanggal",
        status: "To Do",
        priority: "Low",
      },
    ];

    const result = formatTaskList(tasks);
    expect(result).toContain("Tanggal Terakhir : -");
  });

  it("memastikan titik dua (:) sejajar vertikal lurus presisi pada kolom ke-22", () => {
    const tasks = [
      {
        title: "Pemeriksaan Kolom",
        status: "In Progress",
        priority: "Medium",
        endDate: "2026-09-15",
      },
    ];

    const result = formatTaskList(tasks);
    const lines = result.split("\n");

    const statusLine = lines.find((l) => l.includes("Status"));
    const priorityLine = lines.find((l) => l.includes("Prioritas"));
    const dateLine = lines.find((l) => l.includes("Tanggal Terakhir"));

    expect(statusLine).toBeDefined();
    expect(priorityLine).toBeDefined();
    expect(dateLine).toBeDefined();

    const colonStatus = statusLine!.indexOf(":");
    const colonPriority = priorityLine!.indexOf(":");
    const colonDate = dateLine!.indexOf(":");

    // Harus berposisi indeks karakter yang sama (kolom 21 / 0-indexed)
    expect(colonStatus).toBe(21);
    expect(colonPriority).toBe(21);
    expect(colonDate).toBe(21);
  });

  it("memastikan DEFAULT_WHATSAPP_TEMPLATE memuat struktur resmi yang konsisten", () => {
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("*[LanPro] Task Assignment*");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("Halo *{{user_name}}*,");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{task_list}}");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("🔗 *Akses Detail Tugas:*");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{app_url}}");
  });
});
