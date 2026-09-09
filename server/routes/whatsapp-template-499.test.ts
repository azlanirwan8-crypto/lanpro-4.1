jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn(),
  })),
}));

import { formatMessage, formatTaskList, formatTanggal } from "../services/whatsapp.service";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../services/broadcastConfig.service";

describe("Item #499 - WhatsApp Gateway Template & Configuration Tests", () => {
  describe("formatTaskList & formatMessage", () => {
    it("memformat tiket tunggal dengan penomoran, status, prioritas, dan tanggal", () => {
      const tasks = [
        {
          title: "Fix Authentication Flow",
          status: "IN_PROGRESS",
          priority: "high",
          dueDate: "2026-09-10",
        },
      ];

      const listText = formatTaskList(tasks);
      expect(listText).toBe(
        "1. Tugas: ( Fix Authentication Flow )\n" +
          "    Status: ( IN_PROGRESS )\n" +
          "    Prioritas: ( high )\n" +
          "    Tanggal Terakhir : ( 10/09/2026 )"
      );

      const message = formatMessage("Azlan Irwan", tasks, null, "http://localhost:3000");
      expect(message).toContain("[LanPro] Task Assignment");
      expect(message).toContain("Halo Azlan Irwan,");
      expect(message).toContain("Kamu telah ditugaskan untuk tiket berikut:");
      expect(message).toContain("1. Tugas: ( Fix Authentication Flow )");
      expect(message).toContain("    Status: ( IN_PROGRESS )");
      expect(message).toContain("    Prioritas: ( high )");
      expect(message).toContain("    Tanggal Terakhir : ( 10/09/2026 )");
      expect(message).toContain(
        "Silakan cek detail tugas melalui tautan berikut:\nhttp://localhost:3000"
      );
      expect(message).toContain("Terima kasih.");
    });

    it("memformat banyak tiket secara berurutan", () => {
      const tasks = [
        {
          title: "Fix Authentication Flow",
          status: "IN_PROGRESS",
          priority: "high",
          dueDate: "2026-09-10",
        },
        {
          title: "Refactor Notification Worker",
          status: "To Do",
          priority: "medium",
          dueDate: null,
        },
      ];

      const message = formatMessage("Azlan Irwan", tasks, null, "http://localhost:3000");
      expect(message).toContain("1. Tugas: ( Fix Authentication Flow )");
      expect(message).toContain("2. Tugas: ( Refactor Notification Worker )");
      expect(message).toContain("    Status: ( To Do )");
      expect(message).toContain("    Prioritas: ( medium )");
      expect(message).toContain("    Tanggal Terakhir : ( - )");
    });

    it("mengganti placeholder {{task_list}} dan {{app_url}} saat custom template digunakan", () => {
      const tasks = [
        {
          title: "Bug Hotfix",
          status: "Testing",
          priority: "urgent",
          dueDate: "2026-09-15",
        },
      ];

      const customTemplate =
        "Halo {{user_name}},\nAda tugas mendesak:\n{{task_list}}\nBuka segera di {{app_url}}!";
      const message = formatMessage("Budi", tasks, customTemplate, "https://lanpro.app");
      expect(message).toBe(
        "Halo Budi,\nAda tugas mendesak:\n1. Tugas: ( Bug Hotfix )\n    Status: ( Testing )\n    Prioritas: ( urgent )\n    Tanggal Terakhir : ( 15/09/2026 )\nBuka segera di https://lanpro.app!"
      );
    });

    it("mengembalikan default template untuk channel whatsapp di broadcastConfig", () => {
      expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("[LanPro] Task Assignment");
      expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("Halo {{user_name}},");
      expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{task_list}}");
      expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{app_url}}");
    });
  });

  describe("formatTanggal", () => {
    it("menghasilkan '-' untuk nilai tanggal kosong", () => {
      expect(formatTanggal(null)).toBe("-");
      expect(formatTanggal(undefined)).toBe("-");
      expect(formatTanggal("")).toBe("-");
    });
  });
});
