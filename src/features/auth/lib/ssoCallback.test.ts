/**
 * Test pembacaan kembalian SSO.
 *
 * Fungsi ini menentukan apa yang dilihat pengguna sepulang dari Google:
 * masuk, ditolak, atau diminta memilih username. Salah membacanya berarti
 * pengguna terjebak di layar yang salah tanpa penjelasan.
 */
import { bacaHasilSso, bersihkanQuerySso } from "./ssoCallback";

describe("bacaHasilSso", () => {
  it("mengembalikan tidak_ada untuk query kosong", () => {
    expect(bacaHasilSso("")).toEqual({ jenis: "tidak_ada" });
    expect(bacaHasilSso("?")).toEqual({ jenis: "tidak_ada" });
  });

  it("mengabaikan query yang tidak berkaitan dengan SSO", () => {
    expect(bacaHasilSso("?tab=dashboard&id=7")).toEqual({ jenis: "tidak_ada" });
  });

  it("membaca token", () => {
    expect(bacaHasilSso("?sso_token=abc.def.ghi")).toEqual({
      jenis: "token",
      token: "abc.def.ghi",
    });
  });

  it("membaca galat beserta pesannya", () => {
    const hasil = bacaHasilSso("?sso_error=belum_terdaftar&sso_message=Akun%20belum%20terdaftar");
    expect(hasil).toEqual({
      jenis: "galat",
      kode: "belum_terdaftar",
      pesan: "Akun belum terdaftar",
    });
  });

  it("memakai pesan cadangan bila sso_message tidak dikirim", () => {
    const hasil: any = bacaHasilSso("?sso_error=dibatalkan");
    expect(hasil.jenis).toBe("galat");
    expect(hasil.pesan).toBeTruthy();
  });

  it("membaca permintaan lengkapi pendaftaran", () => {
    const hasil = bacaHasilSso("?sso_lengkapi=1&email=budi%40perusahaan.com&nama=Budi");
    expect(hasil).toEqual({
      jenis: "lengkapi",
      email: "budi@perusahaan.com",
      nama: "Budi",
    });
  });

  it("mendahulukan token bila beberapa parameter hadir sekaligus", () => {
    // Tidak seharusnya terjadi, tetapi bila terjadi, sesi yang sudah sah
    // tidak boleh kalah oleh pesan galat sisa.
    const hasil = bacaHasilSso("?sso_token=t1&sso_error=dibatalkan");
    expect(hasil.jenis).toBe("token");
  });

  it("tidak menganggap sso_lengkapi selain '1' sebagai permintaan", () => {
    expect(bacaHasilSso("?sso_lengkapi=0").jenis).toBe("tidak_ada");
  });
});

describe("bersihkanQuerySso", () => {
  it("membuang seluruh jejak SSO", () => {
    expect(bersihkanQuerySso("?sso_token=abc")).toBe("");
    expect(bersihkanQuerySso("?sso_error=x&sso_message=y")).toBe("");
    expect(bersihkanQuerySso("?sso_lengkapi=1&email=a%40b.com&nama=A")).toBe("");
  });

  it("mempertahankan parameter lain yang bukan milik SSO", () => {
    expect(bersihkanQuerySso("?sso_token=abc&tab=dashboard")).toBe("?tab=dashboard");
  });

  it("token tidak boleh tersisa di hasil", () => {
    const hasil = bersihkanQuerySso("?sso_token=rahasia-sekali&tab=x");
    expect(hasil).not.toContain("rahasia-sekali");
  });

  it("mengembalikan string kosong bila tidak ada sisa", () => {
    expect(bersihkanQuerySso("")).toBe("");
  });
});
