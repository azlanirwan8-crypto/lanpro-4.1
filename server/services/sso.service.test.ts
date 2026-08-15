/**
 * Test kebijakan akun SSO.
 *
 * Yang diuji: siapa yang BOLEH masuk dan siapa yang harus ditolak. Satu
 * kelonggaran di sini berarti orang luar bisa masuk ke akun karyawan, jadi tiap
 * ketetapan F5.1 punya test yang menguncinya.
 *
 * Adapter database di-mock. Tidak ada koneksi nyata, tidak ada baris yang
 * ditulis ke database mana pun.
 */
const kueriPalsu = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { query: (...a: any[]) => kueriPalsu(...a) },
}));

import { putuskanKebijakan, buatAkunDariSso, usernameSah } from "./sso.service";
import type { IdentitasOidc } from "./oidc.service";

const IDENTITAS: IdentitasOidc = {
  provider: "google",
  sub: "sub-123",
  email: "budi@perusahaan.com",
  emailTerverifikasi: true,
  nama: "Budi",
};

/** Menjawab kueri berdasarkan potongan SQL-nya, bukan urutan pemanggilan. */
function pasangDb(opsi: {
  identitas?: any;
  userByEmail?: any;
  userById?: any;
  usernameTerpakai?: boolean;
}) {
  kueriPalsu.mockImplementation(async (sql: string) => {
    if (sql.includes("UserIdentities") && sql.includes("SELECT")) {
      return [opsi.identitas ? [opsi.identitas] : []];
    }
    if (sql.includes("LOWER(email)")) {
      return [opsi.userByEmail ? [opsi.userByEmail] : []];
    }
    if (sql.includes("WHERE username = ?")) {
      return [opsi.usernameTerpakai ? [{ id: "lain" }] : []];
    }
    if (sql.includes("WHERE id = ?")) {
      return [opsi.userById ? [opsi.userById] : []];
    }
    return [[]]; // INSERT dan lainnya
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SSO_ALLOWED_DOMAINS = "perusahaan.com";
});

describe("putuskanKebijakan — penolakan", () => {
  it("MENOLAK domain di luar daftar, walau emailnya terverifikasi", async () => {
    pasangDb({ userByEmail: { id: "1", status: "active" } });
    const hasil = await putuskanKebijakan({ ...IDENTITAS, email: "orang@gmail.com" }, "login");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "domain_tidak_diizinkan" });
  });

  it("MENOLAK email yang belum terverifikasi — ketetapan F5.1 #2", async () => {
    pasangDb({ userByEmail: { id: "1", status: "active" } });
    const hasil = await putuskanKebijakan({ ...IDENTITAS, emailTerverifikasi: false }, "login");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "email_belum_terverifikasi" });
  });

  it("MENOLAK akun berstatus pending", async () => {
    pasangDb({ userByEmail: { id: "1", status: "pending" } });
    const hasil = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "akun_belum_aktif" });
  });

  it("MENOLAK akun yang ditolak admin", async () => {
    pasangDb({ userByEmail: { id: "1", status: "rejected" } });
    const hasil = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "akun_belum_aktif" });
  });
});

describe("putuskanKebijakan — tombol LOGIN tidak pernah membuat akun", () => {
  it("MENOLAK email yang belum terdaftar", async () => {
    pasangDb({});
    const hasil = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "belum_terdaftar" });
  });

  it("tidak pernah menyentuh INSERT saat email belum terdaftar", async () => {
    pasangDb({});
    await putuskanKebijakan(IDENTITAS, "login");
    const adaInsert = kueriPalsu.mock.calls.some((c) => String(c[0]).includes("INSERT"));
    expect(adaInsert).toBe(false);
  });

  it("mengizinkan masuk dan menautkan bila email sudah terdaftar & aktif", async () => {
    pasangDb({ userByEmail: { id: "u1", status: "active", username: "budi" } });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil.aksi).toBe("masuk");
    expect(hasil.user.id).toBe("u1");
    const adaInsertIdentitas = kueriPalsu.mock.calls.some(
      (c) => String(c[0]).includes("INSERT") && String(c[0]).includes("UserIdentities")
    );
    expect(adaInsertIdentitas).toBe(true);
  });
});

describe("putuskanKebijakan — tombol DAFTAR", () => {
  it("mengarahkan ke layar lengkapi pendaftaran bila email belum terdaftar", async () => {
    pasangDb({});
    const hasil: any = await putuskanKebijakan(IDENTITAS, "daftar");
    expect(hasil.aksi).toBe("lengkapi_pendaftaran");
    expect(hasil.identitas.email).toBe("budi@perusahaan.com");
  });

  it("BELUM membuat akun pada tahap ini — tidak ada INSERT ke Users", async () => {
    pasangDb({});
    await putuskanKebijakan(IDENTITAS, "daftar");
    const adaInsertUser = kueriPalsu.mock.calls.some(
      (c) => String(c[0]).includes("INSERT") && String(c[0]).includes("Users")
    );
    expect(adaInsertUser).toBe(false);
  });

  it("tidak membuat duplikat bila emailnya sudah terdaftar — langsung masuk", async () => {
    pasangDb({ userByEmail: { id: "u1", status: "active" } });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "daftar");
    expect(hasil.aksi).toBe("masuk");
  });
});

describe("putuskanKebijakan — identitas yang sudah tertaut", () => {
  it("memakai tautan provider, bukan email — sub tidak berubah walau email berganti", async () => {
    pasangDb({
      identitas: { userId: "u9" },
      userById: { id: "u9", status: "active" },
    });
    const hasil: any = await putuskanKebijakan(
      { ...IDENTITAS, email: "baru@perusahaan.com" },
      "login"
    );
    expect(hasil.aksi).toBe("masuk");
    expect(hasil.user.id).toBe("u9");
  });

  it("MENOLAK bila akun pemilik tautan sudah tidak aktif", async () => {
    pasangDb({ identitas: { userId: "u9" }, userById: { id: "u9", status: "pending" } });
    const hasil = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "akun_belum_aktif" });
  });
});

describe("usernameSah — aturan lama TIDAK berubah", () => {
  it("menerima huruf saja maksimal 10 karakter", () => {
    expect(usernameSah("budi")).toBe(true);
    expect(usernameSah("abcdefghij")).toBe(true);
  });

  it("menolak angka, simbol, dan lebih dari 10 karakter", () => {
    expect(usernameSah("budi123")).toBe(false);
    expect(usernameSah("budi_santoso")).toBe(false);
    expect(usernameSah("abcdefghijk")).toBe(false);
    expect(usernameSah("")).toBe(false);
    expect(usernameSah("budi@perusahaan.com")).toBe(false);
  });
});

describe("buatAkunDariSso", () => {
  it("membuat akun berstatus pending TANPA password", async () => {
    pasangDb({});
    const hasil: any = await buatAkunDariSso(IDENTITAS, "budi");
    expect(hasil.hasil).toBe("berhasil");

    const insert = kueriPalsu.mock.calls.find(
      (c) => String(c[0]).includes("INSERT") && String(c[0]).includes("Users")
    );
    expect(insert).toBeTruthy();
    expect(String(insert![0])).toContain("NULL");
    expect(insert![1]).toContain("pending");
  });

  it("MENOLAK username yang tidak sah", async () => {
    pasangDb({});
    const hasil: any = await buatAkunDariSso(IDENTITAS, "budi123");
    expect(hasil.hasil).toBe("gagal");
    expect(hasil.alasan).toBe("username_tidak_sah");
  });

  it("MENOLAK username yang sudah dipakai", async () => {
    pasangDb({ usernameTerpakai: true });
    const hasil: any = await buatAkunDariSso(IDENTITAS, "budi");
    expect(hasil.hasil).toBe("gagal");
  });

  it("MENOLAK email yang belum terverifikasi", async () => {
    pasangDb({});
    const hasil: any = await buatAkunDariSso({ ...IDENTITAS, emailTerverifikasi: false }, "budi");
    expect(hasil.hasil).toBe("gagal");
    expect(hasil.alasan).toBe("email_belum_terverifikasi");
  });

  it("MENOLAK domain di luar daftar", async () => {
    pasangDb({});
    const hasil: any = await buatAkunDariSso({ ...IDENTITAS, email: "a@gmail.com" }, "budi");
    expect(hasil.hasil).toBe("gagal");
    expect(hasil.alasan).toBe("domain_tidak_diizinkan");
  });

  it("MENOLAK bila email sudah terdaftar", async () => {
    pasangDb({ userByEmail: { id: "u1" } });
    const hasil: any = await buatAkunDariSso(IDENTITAS, "budi");
    expect(hasil.hasil).toBe("gagal");
    expect(hasil.alasan).toBe("email_sudah_terdaftar");
  });

  it("MENOLAK bila identitas provider sudah tertaut akun lain", async () => {
    pasangDb({ identitas: { userId: "lain" } });
    const hasil: any = await buatAkunDariSso(IDENTITAS, "budi");
    expect(hasil.hasil).toBe("gagal");
    expect(hasil.alasan).toBe("identitas_milik_akun_lain");
  });
});
