jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  },
}));

import {
  validasiFormatEmail,
  ambilEmailPengirim,
  statusEmailService,
  kirimEmail,
  kirimEmailSelamatDatang,
  kirimEmailAktivasiAkun,
} from "./email.service";

describe("email.service - F6.2 Fondasi Layanan Email", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "test";
    // Reset global fetch mock
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validasiFormatEmail", () => {
    it("menerima alamat email yang valid", () => {
      expect(validasiFormatEmail("user@rajonet.com")).toBe(true);
      expect(validasiFormatEmail("test.user+tag@domain.co.id")).toBe(true);
      expect(validasiFormatEmail("admin@lanpro.id")).toBe(true);
    });

    it("menolak format email yang tidak valid atau kosong", () => {
      expect(validasiFormatEmail("")).toBe(false);
      expect(validasiFormatEmail("tanpa-at")).toBe(false);
      expect(validasiFormatEmail("user@")).toBe(false);
      expect(validasiFormatEmail("@domain.com")).toBe(false);
      expect(validasiFormatEmail("user@domain")).toBe(false);
      expect(validasiFormatEmail(null as any)).toBe(false);
    });
  });

  describe("ambilEmailPengirim & statusEmailService", () => {
    // #157 — Dulu test ini menegaskan adanya alamat cadangan yang dikeraskan.
    // Cadangan itulah yang membuat domain mati tetap terlihat sehat, jadi yang
    // dijaga sekarang justru kebalikannya: kosong harus tetap kosong.
    it("mengembalikan string kosong bila EMAIL_FROM tidak disetel", () => {
      delete process.env.EMAIL_FROM;
      expect(ambilEmailPengirim()).toBe("");
    });

    it("tidak memuat domain apa pun yang dikeraskan di dalam kode", () => {
      delete process.env.EMAIL_FROM;
      expect(ambilEmailPengirim()).not.toMatch(/@/);
    });

    it("mengembalikan EMAIL_FROM dari environment bila ada", () => {
      process.env.EMAIL_FROM = "Custom Sender <custom@rajonet.com>";
      expect(ambilEmailPengirim()).toBe("Custom Sender <custom@rajonet.com>");
    });

    it("melaporkan status aktif false bila RESEND_API_KEY kosong", () => {
      delete process.env.RESEND_API_KEY;
      const status = statusEmailService();
      expect(status.aktif).toBe(false);
      expect(status.provider).toBe("Resend");
    });

    it("melaporkan status aktif true bila RESEND_API_KEY terisi", () => {
      process.env.RESEND_API_KEY = "re_test_123456";
      const status = statusEmailService();
      expect(status.aktif).toBe(true);
    });
  });

  describe("kirimEmail - Validasi Input", () => {
    it("menolak bila to kosong", async () => {
      const res = await kirimEmail({
        to: [],
        subject: "Test",
        html: "<p>Halo</p>",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("tidak boleh kosong");
    });

    it("menolak bila format email penerima tidak valid", async () => {
      const res = await kirimEmail({
        to: "email-salah",
        subject: "Test",
        html: "<p>Halo</p>",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Format alamat email tidak valid");
    });

    it("menolak bila subject kosong", async () => {
      const res = await kirimEmail({
        to: "user@rajonet.com",
        subject: "   ",
        html: "<p>Halo</p>",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Subjek email tidak boleh kosong");
    });

    it("menolak bila html kosong", async () => {
      const res = await kirimEmail({
        to: "user@rajonet.com",
        subject: "Test",
        html: "   ",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Konten HTML email tidak boleh kosong");
    });
  });

  describe("kirimEmail - Mode Dev (Mock)", () => {
    it("mengembalikan success true dengan mock ID saat RESEND_API_KEY kosong di dev", async () => {
      delete process.env.RESEND_API_KEY;
      process.env.NODE_ENV = "development";

      const res = await kirimEmail({
        to: "user@rajonet.com",
        subject: "Selamat Datang",
        html: "<p>Selamat datang di LanPro</p>",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toMatch(/^mock-/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("mengembalikan success false saat RESEND_API_KEY kosong di production", async () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        delete process.env.RESEND_API_KEY;
        process.env.NODE_ENV = "production";

        const res = await kirimEmail({
          to: "user@rajonet.com",
          subject: "Selamat Datang",
          html: "<p>Selamat datang di LanPro</p>",
        });

        expect(res.success).toBe(false);
        expect(res.error).toContain("RESEND_API_KEY belum dikonfigurasi");
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });

  describe("kirimEmail - Resend API Integration", () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = "re_live_api_key_sample";
      process.env.EMAIL_FROM = "LanPro <lanpro@rajonet.com>";
    });

    it("berhasil mengirim email saat Resend API mengembalikan 200 OK", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg_abc123" }),
      });

      const res = await kirimEmail({
        to: "recipient@rajonet.com",
        subject: "Aktivasi Akun",
        html: "<h1>Halo</h1>",
        text: "Halo",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe("msg_abc123");
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer re_live_api_key_sample",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    // #157 — Sebelum ini, EMAIL_FROM kosong tidak pernah sampai ke sini: nilai
    // cadangan menutupinya, lalu Resend menolak dengan galat domain yang tidak
    // menyebut sebab sebenarnya. Sekarang berhenti sebelum jaringan tersentuh.
    it("menolak sebelum memanggil Resend bila EMAIL_FROM kosong", async () => {
      delete process.env.EMAIL_FROM;

      const res = await kirimEmail({
        to: "recipient@contoh.com",
        subject: "Aktivasi Akun",
        html: "<h1>Halo</h1>",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("EMAIL_FROM belum dikonfigurasi");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("menangani response error dari Resend API (misal 403 / unverified domain)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ message: "Domain not verified" }),
      });

      const res = await kirimEmail({
        to: "recipient@rajonet.com",
        subject: "Aktivasi Akun",
        html: "<h1>Halo</h1>",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Domain not verified");
    });

    it("menangani kegagalan koneksi / network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Connection refused to api.resend.com")
      );

      const res = await kirimEmail({
        to: "recipient@rajonet.com",
        subject: "Aktivasi Akun",
        html: "<h1>Halo</h1>",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Connection refused to api.resend.com");
    });
  });

  describe("kirimEmailSelamatDatang (F6.3)", () => {
    it("mengirim email selamat datang dengan data akun yang lengkap", async () => {
      delete process.env.RESEND_API_KEY; // mock mode

      const res = await kirimEmailSelamatDatang({
        email: "budi@rajonet.com",
        nama: "Budi Santoso",
        username: "budis",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toMatch(/^mock-/);
    });

    it("menggunakan username bila nama tidak diisi", async () => {
      delete process.env.RESEND_API_KEY;

      const res = await kirimEmailSelamatDatang({
        email: "userbaru@rajonet.com",
        username: "userbaru",
      });

      expect(res.success).toBe(true);
    });

    it("menolak bila format email tidak valid", async () => {
      const res = await kirimEmailSelamatDatang({
        email: "bukan-email",
        username: "userbaru",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Format alamat email tidak valid");
    });
  });

  describe("kirimEmailAktivasiAkun (Item #261)", () => {
    it("mengirim email aktivasi akun dengan format yang benar", async () => {
      delete process.env.RESEND_API_KEY; // mock mode

      const res = await kirimEmailAktivasiAkun({
        email: "aktif@lanpro.my.id",
        nama: "Pengguna Aktif",
        username: "aktifuser",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toMatch(/^mock-/);
    });
  });
});
