/**
 * Regresi #305(c) — kapan alamat pada `id_token` boleh dianggap terverifikasi.
 *
 * Persoalannya menahan seluruh #305: Entra ID sering TIDAK mengirim klaim
 * `email_verified` sama sekali, sementara Google mengirimnya dengan andal.
 * Ketiadaan klaim diperlakukan sebagai "belum terverifikasi" (F5.4), sehingga
 * pendaftaran dan penautan lewat Microsoft selalu ditolak — bukan karena
 * akunnya bermasalah, melainkan karena kebijakan kita sendiri.
 *
 * Yang dikunci di sini adalah BATAS pelonggarannya, bukan pelonggarannya:
 *
 *   - Google TIDAK ikut longgar. Ia sudah punya jaminan; membuangnya berarti
 *     kehilangan sesuatu tanpa mendapat apa pun.
 *   - Microsoft di `common` / `organizations` / `consumers` TIDAK ikut longgar.
 *     Di endpoint kumpulan, penanda masuk boleh berupa akun Microsoft pribadi,
 *     dan alamat pada akun pribadi bisa alamat apa pun yang pernah pemiliknya
 *     verifikasikan ke Microsoft.
 *   - Microsoft pada tenant SPESIFIK boleh longgar, sebab alamatnya
 *     diterbitkan direktori yang kita tunjuk sendiri.
 *
 * Test kedua dari bawah adalah yang paling penting: ia yang menjaga
 * pelonggaran ini tidak diam-diam melebar ke `common`.
 */
import { emailBolehDipercaya, tenantMicrosoftSpesifik } from "./oidc.service";

const TENANT_UNSIA = "58aafd5d-f0a9-4577-9560-d4616f353659";

describe("#305(c) emailBolehDipercaya", () => {
  const tenantAsli = process.env.OIDC_MICROSOFT_TENANT;

  afterEach(() => {
    if (tenantAsli === undefined) delete process.env.OIDC_MICROSOFT_TENANT;
    else process.env.OIDC_MICROSOFT_TENANT = tenantAsli;
  });

  describe("klaim eksplisit selalu menang", () => {
    it("email_verified true diterima untuk Google", () => {
      expect(emailBolehDipercaya("google", { email_verified: true })).toBe(true);
    });

    it("email_verified true diterima untuk Microsoft, tenant apa pun", () => {
      process.env.OIDC_MICROSOFT_TENANT = "common";
      expect(emailBolehDipercaya("microsoft", { email_verified: true })).toBe(true);
    });
  });

  describe("Google tidak ikut pelonggaran", () => {
    it("menolak Google tanpa klaim email_verified", () => {
      process.env.OIDC_MICROSOFT_TENANT = TENANT_UNSIA;
      expect(emailBolehDipercaya("google", { email: "a@contoh.com" })).toBe(false);
    });

    it("menolak Google dengan email_verified false", () => {
      expect(emailBolehDipercaya("google", { email_verified: false })).toBe(false);
    });

    it("mengabaikan xms_edov pada Google — klaim itu milik Entra ID", () => {
      expect(emailBolehDipercaya("google", { xms_edov: true })).toBe(false);
    });
  });

  describe("Microsoft tanpa klaim email_verified", () => {
    it("DITERIMA bila xms_edov true, walau tenant kumpulan", () => {
      process.env.OIDC_MICROSOFT_TENANT = "common";
      expect(emailBolehDipercaya("microsoft", { xms_edov: true })).toBe(true);
    });

    it("DITERIMA pada tenant spesifik — ini yang membuka #305", () => {
      process.env.OIDC_MICROSOFT_TENANT = TENANT_UNSIA;
      expect(emailBolehDipercaya("microsoft", { email: "a@lecturer.unsia.ac.id" })).toBe(true);
    });

    it("DITOLAK pada tenant common — batas pelonggarannya", () => {
      process.env.OIDC_MICROSOFT_TENANT = "common";
      expect(emailBolehDipercaya("microsoft", { email: "a@lecturer.unsia.ac.id" })).toBe(false);
    });

    it("DITOLAK pada organizations dan consumers", () => {
      process.env.OIDC_MICROSOFT_TENANT = "organizations";
      expect(emailBolehDipercaya("microsoft", { email: "a@contoh.com" })).toBe(false);
      process.env.OIDC_MICROSOFT_TENANT = "consumers";
      expect(emailBolehDipercaya("microsoft", { email: "a@contoh.com" })).toBe(false);
    });

    it("DITOLAK bila tenant tidak disetel sama sekali — bawaannya common", () => {
      delete process.env.OIDC_MICROSOFT_TENANT;
      expect(emailBolehDipercaya("microsoft", { email: "a@contoh.com" })).toBe(false);
    });

    it("email_verified false tetap ditolak walau tenant spesifik", () => {
      process.env.OIDC_MICROSOFT_TENANT = TENANT_UNSIA;
      expect(emailBolehDipercaya("microsoft", { email_verified: false, xms_edov: false })).toBe(
        false
      );
    });
  });

  describe("tenantMicrosoftSpesifik", () => {
    it("mengenali GUID tenant sebagai spesifik", () => {
      process.env.OIDC_MICROSOFT_TENANT = TENANT_UNSIA;
      expect(tenantMicrosoftSpesifik()).toBe(true);
    });

    it("tidak terkecoh huruf besar pada nilai kumpulan", () => {
      process.env.OIDC_MICROSOFT_TENANT = "Common";
      expect(tenantMicrosoftSpesifik()).toBe(false);
    });

    it("nilai kosong diperlakukan sebagai tidak spesifik", () => {
      process.env.OIDC_MICROSOFT_TENANT = "   ";
      expect(tenantMicrosoftSpesifik()).toBe(false);
    });
  });
});
