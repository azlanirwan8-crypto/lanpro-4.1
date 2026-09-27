/**
 * #305 opsi A — akun tamu (B2B) dari BNI di direktori Universitas Siber Asia.
 *
 * Percobaan login 31 Agu 2026 memakai `100783@hq.bni.co.id` ditolak Microsoft
 * dengan `AADSTS50020` sebelum satu baris kode di sini dijalankan: aplikasi
 * LanPro terdaftar single-tenant di direktori Universitas Siber Asia, dan akun
 * itu milik direktori BNI. Jalan keluar tercepat adalah mengundangnya sebagai
 * TAMU ke direktori kita.
 *
 * Tetapi di belakang dinding Azure itu ada dinding kedua yang belum pernah
 * terlihat karena tidak pernah tercapai: alamatnya berdomain **`hq.bni.co.id`**,
 * bukan `bni.co.id`. `domainDiizinkan()` mencocokkan domain **persis**, tanpa
 * sufiks, jadi daftar yang memuat `bni.co.id` TIDAK mencakup subdomainnya.
 *
 * Berkas ini mengunci kedua sisinya: alamat tamu yang sah harus lolos, dan
 * pencocokan persis harus TETAP persis — sebab melonggarkannya jadi sufiks
 * akan membuat `bni.co.id` ikut mengizinkan domain apa pun yang berakhiran
 * sama, termasuk yang tidak dimiliki BNI.
 */
import * as oidc from "./oidc.service";

describe("#305 opsi A — domain tamu BNI", () => {
  const envAsli = process.env;

  beforeEach(() => {
    process.env = { ...envAsli };
  });

  afterAll(() => {
    process.env = envAsli;
  });

  it("MENOLAK alamat subdomain bila hanya domain induk yang terdaftar", () => {
    process.env.SSO_ALLOWED_DOMAINS = "bni.co.id";
    expect(oidc.domainDiizinkan("100783@hq.bni.co.id")).toBe(false);
  });

  it("menerima alamat tamu BNI setelah subdomainnya didaftarkan sendiri", () => {
    process.env.SSO_ALLOWED_DOMAINS = "bni.co.id,hq.bni.co.id";
    expect(oidc.domainDiizinkan("100783@hq.bni.co.id")).toBe(true);
    expect(oidc.domainDiizinkan("siti@bni.co.id")).toBe(true);
  });

  it("pencocokan tetap PERSIS — subdomain lain tidak ikut terbawa", () => {
    process.env.SSO_ALLOWED_DOMAINS = "bni.co.id,hq.bni.co.id";
    expect(oidc.domainDiizinkan("orang@cabang.bni.co.id")).toBe(false);
    expect(oidc.domainDiizinkan("penyerang@jahat-bni.co.id")).toBe(false);
    expect(oidc.domainDiizinkan("penyerang@hq.bni.co.id.example.com")).toBe(false);
  });
});
