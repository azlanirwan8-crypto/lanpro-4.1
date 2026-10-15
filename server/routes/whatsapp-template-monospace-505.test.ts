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

  it("judul tiket panjang dilipat dengan indentasi gantung, tidak menabrak nomor butir", () => {
    /* Putaran 3 #744: tangkapan layar pemilik proyek menunjukkan judul tiket
     * panjang dilipat WhatsApp di kolom nol sehingga baris lanjutannya
     * bertabrakan dengan nomor butir 14–18. Pelipatan kini dilakukan sendiri. */
    const list = formatTaskList([
      {
        id: 1,
        title: 'Status tidak konsisten: "sedang diproses" di app vs "inactive" di portal',
        status: "To Do",
        priority: "Medium",
        dueDate: null,
      },
    ]);
    const baris = list
      .split("\n")
      .slice(1, -1)
      .filter((b) => b.trim().length > 0);
    // Baris kepala `[n] …` memang mulai di kolom nol; yang dilarang jatuh di
    // kolom nol adalah baris LANJUTAN dan baris berlabel.
    baris.filter((b) => !b.startsWith("[")).forEach((b) => expect(b.startsWith(" ")).toBe(true));
    expect(Math.max(...baris.map((b) => b.length))).toBeLessThanOrEqual(46);

    const iKepala = baris.findIndex((b) => b.startsWith("[1]"));
    expect(iKepala).toBeGreaterThan(-1);
    expect(baris[iKepala + 1].startsWith("    ")).toBe(true);
    expect(baris[iKepala + 1].startsWith("    Status")).toBe(false);
  });

  it("nomor dua digit: lipatan judul sejajar di bawah judulnya, bukan di bawah nomor", () => {
    /* Tangkapan layar pemilik proyek menunjuk butir 14–18 khusus. Awalan
     * `[14] ` lima karakter, jadi indentasi tetap empat spasi pasti miring. */
    const banyak = Array.from({ length: 14 }, (_, i) => ({
      id: i + 1,
      title: "Judul tiket cukup panjang supaya pasti terlipat di layar ponsel",
      status: "To Do",
      priority: "Medium",
      dueDate: null,
    }));
    const baris = formatTaskList(banyak).split("\n");
    const i14 = baris.findIndex((b) => b.startsWith("[14] "));
    expect(i14).toBeGreaterThan(-1);
    expect(baris[i14 + 1].startsWith("     ")).toBe(true);
    expect(baris[i14 + 1].startsWith("      ")).toBe(false);
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
