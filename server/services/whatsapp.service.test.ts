/**
 * Test penjadwal digest WhatsApp.
 *
 * Dua cacat yang dikunci di sini:
 *
 *   #22 `initWhatsAppScheduler` di-import di server.ts tetapi TIDAK PERNAH
 *       DIPANGGIL, sehingga digest 07:00 belum pernah menyala sekali pun.
 *
 *   #23 Token punya nilai fallback ter-hardcode `'TOKEN_ANDA_DISINI'`, yang
 *       membuat konfigurasi hilang terlihat seolah ada — permintaan tetap
 *       dikirim dengan token karangan lalu gagal dengan pesan pihak ketiga
 *       yang tidak menjelaskan apa pun.
 *
 * `node-cron` di-mock supaya test tidak benar-benar mendaftarkan penjadwal.
 */
const jadwalTerdaftar: string[] = [];

jest.mock("node-cron", () => ({
  __esModule: true,
  default: {
    schedule: (ekspresi: string) => {
      jadwalTerdaftar.push(ekspresi);
      return { stop: () => {} };
    },
  },
}));

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: async () => ({ query: async () => [[]], release: () => {} }) },
}));

describe("whatsapp.service", () => {
  beforeEach(() => {
    jadwalTerdaftar.length = 0;
    jest.resetModules();
  });

  describe("terkonfigurasi", () => {
    it("false bila token kosong — TIDAK memakai nilai contoh", async () => {
      delete process.env.WHATSAPP_API_TOKEN;
      const wa = await import("./whatsapp.service");
      expect(wa.terkonfigurasi()).toBe(false);
    });

    it("true bila token diisi", async () => {
      process.env.WHATSAPP_API_TOKEN = "token-uji";
      const wa = await import("./whatsapp.service");
      expect(wa.terkonfigurasi()).toBe(true);
      delete process.env.WHATSAPP_API_TOKEN;
    });
  });

  describe("initWhatsAppScheduler", () => {
    it("TIDAK mendaftarkan penjadwal bila token belum dikonfigurasi", async () => {
      delete process.env.WHATSAPP_API_TOKEN;
      const wa = await import("./whatsapp.service");
      wa.initWhatsAppScheduler();

      // Mendaftarkannya hanya akan menghasilkan kegagalan setiap pagi tanpa
      // ada yang bisa diperbuat.
      expect(jadwalTerdaftar).toHaveLength(0);
    });

    it("mendaftarkan penjadwal (dicek tiap menit terhadap BroadcastConfig) bila token dikonfigurasi", async () => {
      process.env.WHATSAPP_API_TOKEN = "token-uji";
      const wa = await import("./whatsapp.service");
      wa.initWhatsAppScheduler();

      expect(jadwalTerdaftar).toHaveLength(1);
      expect(jadwalTerdaftar[0]).toBe("* * * * *");
      delete process.env.WHATSAPP_API_TOKEN;
    });
  });

  /**
   * #194 — pesan digest sebelumnya membocorkan `{{task_key}}`/`{{task_title}}`
   * mentah (template ditulis untuk satu tugas, dipakai untuk banyak tugas),
   * dan menampilkan "Due: null" literal. Dikonfirmasi dari isi pesan
   * broadcast SUNGGUHAN yang dikirim ke WhatsApp pemilik proyek. Format
   * "Daily Stand-up" (dikelompokkan per status In Progress/Pending, bukan
   * per project) adalah spesifikasi eksplisit pemilik proyek 26 Agu 2026.
   */
  describe("formatMessage", () => {
    it("tidak membocorkan placeholder {{task_key}}/{{task_title}} mentah", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage("Budi", [
        { title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" },
      ]);
      expect(pesan).not.toContain("{{task_key}}");
      expect(pesan).not.toContain("{{task_title}}");
    });

    it("memformat pesan Task Assignment dengan format Monospace Ticket presisi (Item #505)", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage("Azlan Irwan", [
        {
          title: "Fix Authentication Flow",
          status: "IN_PROGRESS",
          priority: "high",
          dueDate: "2026-09-10",
          projectName: "LanPro",
        },
      ]);

      expect(pesan).toContain("*[LanPro] Task Assignment*");
      expect(pesan).toContain("Halo *Azlan Irwan*,");
      expect(pesan).toContain("Berikut tiket tugas aktif yang ditugaskan kepada Anda:");
      expect(pesan).toContain("```");
      expect(pesan).toContain("[1] FIX AUTHENTICATION FLOW");
      expect(pesan).toContain("    Status           : In Progress");
      expect(pesan).toContain("    Prioritas        : High");
      expect(pesan).toContain("    Tanggal Terakhir : 10/09/2026");
      expect(pesan).toContain("🔗 *Akses Detail Tugas:*");
      expect(pesan).toContain("_Pesan otomatis • LanPro Project Management_");
      expect(pesan).not.toContain("null");
    });

    it("mendukung template kustom dengan {{task_list}}, {{app_url}}, dan {{user_name}}", async () => {
      const wa = await import("./whatsapp.service");
      const kustom =
        "Pemberitahuan Tugas untuk {{user_name}}:\n{{task_list}}\nBuka di: {{app_url}}";
      const pesan = wa.formatMessage(
        "Azlan",
        [
          {
            title: "Task 1",
            status: "To Do",
            priority: "low",
            dueDate: null,
            projectName: "Proyek X",
          },
        ],
        kustom,
        "https://app.lanpro.id"
      );
      expect(pesan).toContain("Pemberitahuan Tugas untuk Azlan:");
      expect(pesan).toContain("[1] TASK 1");
      expect(pesan).toContain("    Status           : To Do");
      expect(pesan).toContain("Buka di: https://app.lanpro.id");
    });

    it("memakai template kustom untuk sapaan, mengganti {{user_name}}", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage(
        "Budi",
        [{ title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" }],
        "Selamat pagi {{user_name}}, ini pengingat tugasmu:"
      );
      expect(pesan).toContain("Selamat pagi Budi, ini pengingat tugasmu:");
    });

    it("mengganti {{project_name}} di template kustom dengan nama project sungguhan", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage(
        "Budi",
        [{ title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" }],
        "Halo {{user_name}}, ada update dari {{project_name}}."
      );
      expect(pesan).toContain("Halo Budi, ada update dari Proyek X.");
    });

    it("mengabaikan template LAMA yang tersimpan sebelum #193/#194 (bukan dianggap kustomisasi admin)", async () => {
      const wa = await import("./whatsapp.service");
      const templateLama =
        "*[LanPro] Task Assignment*\n\nHi {{user_name}},\n\nYou have been assigned to task *{{task_key}}*: {{task_title}}.\n_Status_: {{status}}\n_Project_: {{project_name}}\n\nPlease check the dashboard for details.";
      const pesan = wa.formatMessage(
        "Budi",
        [{ title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" }],
        templateLama
      );
      expect(pesan).toContain("Halo *Budi*,");
      expect(pesan).not.toContain("{{task_key}}");
      expect(pesan).not.toContain("{{task_title}}");
      expect(pesan).not.toContain("You have been assigned");
    });

    it("tidak pernah membiarkan placeholder {{...}} apa pun tersisa di template kustom", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage(
        "Budi",
        [{ title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" }],
        "Halo {{user_name}}, task {{task_key}} status {{status}} milikmu."
      );
      expect(pesan).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
    });
  });

  describe("formatTanggal", () => {
    it("mengembalikan '-' untuk tanggal kosong/tidak valid", async () => {
      const wa = await import("./whatsapp.service");
      expect(wa.formatTanggal(null)).toBe("-");
      expect(wa.formatTanggal(undefined)).toBe("-");
      expect(wa.formatTanggal("bukan-tanggal")).toBe("-");
    });

    it("memformat tanggal valid sebagai DD/MM/YYYY", async () => {
      const wa = await import("./whatsapp.service");
      expect(wa.formatTanggal("2026-01-05")).toBe("05/01/2026");
    });
  });
});
