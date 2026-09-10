jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: async () => ({ query: async () => [[]], release: () => {} }) },
}));

import { formatTaskList, formatMessage } from "../services/whatsapp.service";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../services/broadcastConfig.service";

describe("WhatsApp Template Monospace Ticket (Item #505)", () => {
  const sampleTasks = [
    {
      id: 1,
      title: "Fix Authentication Flow",
      status: "IN_PROGRESS",
      priority: "high",
      dueDate: "2026-09-10",
      projectName: "LanPro Core",
    },
    {
      id: 2,
      title: "Uji Coba Broadcast",
      status: "To Do",
      priority: "medium",
      dueDate: null,
      projectName: "LanPro Core",
    },
  ];

  it("formatTaskList membungkus daftar tiket dengan blok monospace (```)", () => {
    const list = formatTaskList(sampleTasks);
    expect(list.startsWith("```\n")).toBe(true);
    expect(list.endsWith("\n```")).toBe(true);
  });

  it("formatTaskList meratakan kolom titik dua (:) pada Status, Prioritas, dan Tanggal Terakhir", () => {
    const list = formatTaskList(sampleTasks);
    expect(list).toContain("[1] FIX AUTHENTICATION FLOW");
    expect(list).toContain("    Status           : In Progress");
    expect(list).toContain("    Prioritas        : High");
    expect(list).toContain("    Tanggal Terakhir : 10/09/2026");

    expect(list).toContain("[2] UJI COBA BROADCAST");
    expect(list).toContain("    Status           : To Do");
    expect(list).toContain("    Prioritas        : Medium");
    expect(list).toContain("    Tanggal Terakhir : -");
  });

  it("formatMessage menyusun pesan lengkap dengan header, list monospace, app url, dan footer resmi", () => {
    const msg = formatMessage("Azlan Irwan", sampleTasks, null, "https://lanpro.my.id");

    expect(msg).toContain("*[LanPro] Task Assignment*");
    expect(msg).toContain("Halo *Azlan Irwan*,");
    expect(msg).toContain("Berikut tiket tugas aktif yang ditugaskan kepada Anda:");
    expect(msg).toContain("```\n[1] FIX AUTHENTICATION FLOW");
    expect(msg).toContain("🔗 *Akses Detail Tugas:*\nhttps://lanpro.my.id");
    expect(msg).toContain("─────────────────\n_Pesan otomatis • LanPro Project Management_");
  });

  it("DEFAULT_WHATSAPP_TEMPLATE menggunakan variabel resmi", () => {
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{user_name}}");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{task_list}}");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{app_url}}");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("*[LanPro] Task Assignment*");
  });
});
