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
   * menampilkan "Due: null" literal, dan tidak mengelompokkan per project.
   * Dikonfirmasi dari isi pesan broadcast SUNGGUHAN yang dikirim ke WhatsApp
   * pemilik proyek.
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

    it("menomori tugas per project dengan status emoji, bukan menampilkan 'Due: null' literal", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage("Budi", [
        { title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" },
        { title: "Tugas B", status: "In Progress", dueDate: "2026-08-30", projectName: "Proyek X" },
      ]);

      expect(pesan).toContain("Hi Budi");
      expect(pesan).toContain("Project *Proyek X*");
      expect(pesan).toContain("1. *Tugas A*");
      expect(pesan).toContain("⚪ To Do · 📅 -");
      expect(pesan).toContain("2. *Tugas B*");
      expect(pesan).toContain("🟡 In Progress · 📅 30/08/2026");
      expect(pesan).not.toContain("Due: null");
      expect(pesan).toContain("Buka dashboard Anda:");
    });

    it("mengelompokkan tugas dari project berbeda ke bagian terpisah", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage("Budi", [
        { title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" },
        { title: "Tugas B", status: "To Do", dueDate: null, projectName: "Proyek Y" },
      ]);

      expect(pesan).toContain("Project *Proyek X*");
      expect(pesan).toContain("Project *Proyek Y*");
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
