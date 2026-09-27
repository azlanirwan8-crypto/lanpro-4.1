// Regression: ISSUE-279 — Konfigurasi operasional sistem (SSO Allowed Domains, CORS Origins, Slack Webhook, WhatsApp Token)
// Report: AUDIT.md §1.1 item #279

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn(), query: jest.fn(), end: jest.fn() },
}));

import {
  ambilSsoAllowedDomains,
  ambilAllowedOrigins,
  ambilSlackWebhookUrl,
  ambilWhatsappToken,
} from "./integrationSettings.service";

describe("Konfigurasi Sistem Operasional (Regresi #279)", () => {
  const envAsli = process.env;

  beforeEach(() => {
    process.env = { ...envAsli };
  });

  afterAll(() => {
    process.env = envAsli;
  });

  describe("ambilSsoAllowedDomains", () => {
    it("memakai nilai env SSO_ALLOWED_DOMAINS bila DB belum diisi", async () => {
      process.env.SSO_ALLOWED_DOMAINS = "perusahaan.com, cabang.co.id";
      const domains = await ambilSsoAllowedDomains();
      expect(domains).toEqual(["perusahaan.com", "cabang.co.id"]);
    });

    it("memotong spasi dan mengubah ke huruf kecil", async () => {
      process.env.SSO_ALLOWED_DOMAINS = " Perusahaan.COM ,  CABANG.co.id  ";
      const domains = await ambilSsoAllowedDomains();
      expect(domains).toEqual(["perusahaan.com", "cabang.co.id"]);
    });

    // #305 opsi A: `rajonet.com` dibuang (domainnya sudah di luar kendali
    // proyek, lihat #290) dan `hq.bni.co.id` ditambahkan — subdomain itulah
    // yang dipakai akun BNI sungguhan (`100783@hq.bni.co.id`), dan pencocokan
    // domain bersifat PERSIS sehingga `bni.co.id` tidak mencakupnya.
    it("memakai default bila env dan DB kosong", async () => {
      delete process.env.SSO_ALLOWED_DOMAINS;
      const domains = await ambilSsoAllowedDomains();
      expect(domains).toEqual(["bni.co.id", "hq.bni.co.id", "gmail.com", "outlook.com"]);
    });
  });

  describe("ambilAllowedOrigins", () => {
    it("memakai nilai ALLOWED_ORIGINS dari env", async () => {
      process.env.ALLOWED_ORIGINS = "https://app1.test, https://app2.test/";
      const origins = await ambilAllowedOrigins();
      expect(origins).toEqual(["https://app1.test", "https://app2.test"]);
    });

    it("jatuh ke APP_URL bila ALLOWED_ORIGINS kosong", async () => {
      delete process.env.ALLOWED_ORIGINS;
      process.env.APP_URL = "https://lanpro.test/";
      const origins = await ambilAllowedOrigins();
      expect(origins).toEqual(["https://lanpro.test"]);
    });

    it("mengembalikan array kosong bila keduanya kosong", async () => {
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.APP_URL;
      const origins = await ambilAllowedOrigins();
      expect(origins).toEqual([]);
    });
  });

  describe("ambilSlackWebhookUrl", () => {
    it("mengambil URL dari env bila DB kosong", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/XXX/YYY";
      const url = await ambilSlackWebhookUrl();
      expect(url).toBe("https://hooks.slack.com/services/XXX/YYY");
    });

    it("mengembalikan string kosong bila tidak disetel", async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      const url = await ambilSlackWebhookUrl();
      expect(url).toBe("");
    });
  });

  describe("ambilWhatsappToken", () => {
    it("mengambil token dari env bila DB kosong", async () => {
      process.env.WHATSAPP_API_TOKEN = "wa-secret-token";
      const token = await ambilWhatsappToken();
      expect(token).toBe("wa-secret-token");
    });

    it("mengembalikan string kosong bila token tidak disetel", async () => {
      delete process.env.WHATSAPP_API_TOKEN;
      const token = await ambilWhatsappToken();
      expect(token).toBe("");
    });
  });
});
