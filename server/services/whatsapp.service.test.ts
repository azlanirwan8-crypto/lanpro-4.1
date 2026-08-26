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

    it("mengelompokkan per status (Sedang Berjalan / Menunggu Eksekusi), tanpa 'null' literal", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage("Budi", [
        { title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" },
        { title: "Tugas B", status: "In Progress", dueDate: "2026-08-30", projectName: "Proyek X" },
      ]);

      expect(pesan).toContain("[LanPro] 📊 Ringkasan Tugas - Proyek X");
      expect(pesan).toContain("Halo Budi,");
      expect(pesan).toContain("🚀 *SEDANG BERJALAN (In Progress)*");
      expect(pesan).toContain("• Tugas B — Tenggat: 30/08/2026");
      expect(pesan).toContain("📋 *MENUNGGU EKSEKUSI (Pending/To Do)*");
      expect(pesan).toContain("• Tugas A — (Tenggat: Belum diatur)");
      expect(pesan).not.toContain("null");
      expect(pesan).toContain("Cek detail selengkapnya di:");
    });

    it("menyebut nama project per baris hanya bila tugas berasal dari lebih dari satu project", async () => {
      const wa = await import("./whatsapp.service");
      const pesan = wa.formatMessage("Budi", [
        { title: "Tugas A", status: "To Do", dueDate: null, projectName: "Proyek X" },
        { title: "Tugas B", status: "To Do", dueDate: null, projectName: "Proyek Y" },
      ]);

      expect(pesan).not.toContain(" - Proyek X\n"); // header tidak menyebut satu project spesifik
      expect(pesan).toContain("• Tugas A (Proyek X)");
      expect(pesan).toContain("• Tugas B (Proyek Y)");
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
