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
});
