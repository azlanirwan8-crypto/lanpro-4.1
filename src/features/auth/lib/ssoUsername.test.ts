/**
 * Test usulan username dari email.
 *
 * Usulan yang salah bentuk akan langsung ditolak backend dan membuat pengguna
 * bingung di layar terakhir pendaftaran, jadi tiap aturan lama dikunci di sini:
 * huruf saja, maksimal 10 karakter.
 */
import { usulkanUsername } from "./ssoUsername";

describe("usulkanUsername", () => {
  it("mengambil bagian sebelum @", () => {
    expect(usulkanUsername("budi@perusahaan.com")).toBe("budi");
  });

  it("membuang titik dan angka — aturan huruf-saja tidak dilonggarkan", () => {
    expect(usulkanUsername("budi.santoso@perusahaan.com")).toBe("budisantos");
    expect(usulkanUsername("azlanirwan9@gmail.com")).toBe("azlanirwan");
    expect(usulkanUsername("budi_santoso-01@x.com")).toBe("budisantos");
  });

  it("memotong pada 10 karakter", () => {
    const hasil = usulkanUsername("abcdefghijklmnop@x.com");
    expect(hasil).toBe("abcdefghij");
    expect(hasil.length).toBe(10);
  });

  it("menormalkan ke huruf kecil", () => {
    expect(usulkanUsername("Budi.Santoso@Perusahaan.COM")).toBe("budisantos");
  });

  it("mengembalikan kosong bila hasilnya kurang dari 3 huruf", () => {
    // Usulan sependek ini lebih mungkin keliru daripada disengaja, jadi
    // kolomnya dibiarkan kosong untuk diisi pengguna.
    expect(usulkanUsername("ab@perusahaan.com")).toBe("");
    expect(usulkanUsername("a1@perusahaan.com")).toBe("");
    expect(usulkanUsername("12345@perusahaan.com")).toBe("");
  });

  it("mengembalikan kosong untuk masukan tidak sah", () => {
    expect(usulkanUsername("")).toBe("");
    expect(usulkanUsername("@perusahaan.com")).toBe("");
  });

  it("hasilnya SELALU lolos aturan username lama", () => {
    const contoh = [
      "budi.santoso@perusahaan.com",
      "azlanirwan9@gmail.com",
      "ABCDEFGHIJKLMNOP@x.co.id",
      "n.a.m.a.p.a.n.j.a.n.g@x.com",
    ];
    for (const email of contoh) {
      const hasil = usulkanUsername(email);
      if (hasil === "") continue;
      expect(hasil).toMatch(/^[a-z]+$/);
      expect(hasil.length).toBeLessThanOrEqual(10);
    }
  });
});
