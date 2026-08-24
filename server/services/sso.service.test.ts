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

/** Melacak apakah transaksi benar-benar dipakai saat membuat akun. */
const jejakTransaksi = { begin: 0, commit: 0, rollback: 0, release: 0 };

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: any[]) => kueriPalsu(...a),
    // Koneksi transaksional memakai fungsi kueri yang sama, sehingga assertion
    // yang memeriksa SQL tetap berlaku baik lewat db.query maupun lewat
    // connection.query.
    getConnection: async () => ({
      query: (...a: any[]) => kueriPalsu(...a),
      beginTransaction: async () => {
        jejakTransaksi.begin++;
      },
      commit: async () => {
        jejakTransaksi.commit++;
      },
      rollback: async () => {
        jejakTransaksi.rollback++;
      },
      release: () => {
        jejakTransaksi.release++;
      },
    }),
  },
}));

import { putuskanKebijakan, buatAkunDariSso, usernameSah, daftarkanSesi } from "./sso.service";
import { activeUserSessions } from "../middleware/auth";
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
  jejakTransaksi.begin = 0;
  jejakTransaksi.commit = 0;
  jejakTransaksi.rollback = 0;
  jejakTransaksi.release = 0;
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

/**
 * #177 — TAUTAN BASI SETELAH EMAIL DIPINDAH KE AKUN LAIN.
 *
 * `sub` sengaja dipercaya di atas email supaya pengguna yang mengganti
 * emailnya SENDIRI tetap bisa SSO (lihat test di atas, "sub tidak berubah
 * walau email berganti"). Tapi itu berbeda dari kasus ini: email tersebut
 * sekarang dipakai user AKTIF LAIN di tabel Users — tandanya admin sudah
 * memindahkan email itu ke akun lain sejak tautan ini dibuat. Sebelum
 * perbaikan ini, kode tetap login sebagai pemilik tautan LAMA tanpa peduli
 * siapa pemilik email SEKARANG. Dilaporkan pemilik proyek.
 */
describe("putuskanKebijakan — #177 email tertaut sudah dipindah ke user lain", () => {
  it("mode LOGIN: MENOLAK, bukan login sebagai pemilik tautan lama", async () => {
    pasangDb({
      identitas: { userId: "u9" },
      userById: { id: "u9", status: "active" },
      userByEmail: { id: "u10", status: "active" }, // email kini milik user LAIN
    });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "tautan_kedaluwarsa" });
  });

  it("mode LOGIN: TIDAK diam-diam login sebagai pemilik email baru (u10) juga", async () => {
    pasangDb({
      identitas: { userId: "u9" },
      userById: { id: "u9", status: "active" },
      userByEmail: { id: "u10", status: "active" },
    });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil.aksi).not.toBe("masuk");
  });

  it("mode DAFTAR: MENOLAK juga — tidak diam-diam menaut ke akun lain", async () => {
    pasangDb({
      identitas: { userId: "u9" },
      userById: { id: "u9", status: "active" },
      userByEmail: { id: "u10", status: "active" },
    });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "daftar");
    expect(hasil).toEqual({ aksi: "tolak", alasan: "tautan_kedaluwarsa" });
  });

  it("memutus tautan basi supaya tidak terkunci permanen", async () => {
    pasangDb({
      identitas: { userId: "u9" },
      userById: { id: "u9", status: "active" },
      userByEmail: { id: "u10", status: "active" },
    });
    await putuskanKebijakan(IDENTITAS, "login");

    const adaDelete = kueriPalsu.mock.calls.some(
      (c) => String(c[0]).includes("DELETE") && String(c[0]).includes("UserIdentities")
    );
    expect(adaDelete).toBe(true);
  });

  it("email dipindah ke user yang statusnya BELUM aktif (pending) — tautan lama tetap dipercaya", async () => {
    // Pemilik email baru belum aktif, jadi bukan konflik nyata: perilaku lama
    // (percaya sub) tetap berlaku, sama seperti kasus ganti email sendiri.
    pasangDb({
      identitas: { userId: "u9" },
      userById: { id: "u9", status: "active" },
      userByEmail: { id: "u10", status: "pending" },
    });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "login");
    expect(hasil.aksi).toBe("masuk");
    expect(hasil.user.id).toBe("u9");
  });
});

/**
 * IDENTITAS YATIM — baris tautan ada, tetapi user yang ditunjuknya tidak.
 *
 * Terjadi saat akun dihapus admin sementara identitasnya tertinggal. Versi
 * pertama kode ini menolak dengan "belum_terdaftar" tanpa memandang mode,
 * sehingga email tersebut TERKUNCI SELAMANYA — tombol Daftar pun ikut tertolak.
 * Ditemukan pemilik proyek 16 Agu 2026 saat mencoba mendaftar.
 */
describe("putuskanKebijakan — identitas yatim", () => {
  it("mode DAFTAR: membersihkan tautan basi lalu meneruskan pendaftaran", async () => {
    // identitas ada, tetapi cariUserById tidak mengembalikan siapa pun
    pasangDb({ identitas: { userId: "sudah-dihapus" } });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "daftar");

    expect(hasil.aksi).toBe("lengkapi_pendaftaran");

    const adaDelete = kueriPalsu.mock.calls.some(
      (c) => String(c[0]).includes("DELETE") && String(c[0]).includes("UserIdentities")
    );
    expect(adaDelete).toBe(true);
  });

  it("mode DAFTAR: TIDAK lagi menolak dengan belum_terdaftar", async () => {
    pasangDb({ identitas: { userId: "sudah-dihapus" } });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "daftar");
    expect(hasil.aksi).not.toBe("tolak");
  });

  it("mode LOGIN: tetap menolak, tetapi setelah tautan basi dibersihkan", async () => {
    pasangDb({ identitas: { userId: "sudah-dihapus" } });
    const hasil: any = await putuskanKebijakan(IDENTITAS, "login");

    // Menolak memang benar untuk mode login — yang salah sebelumnya adalah
    // tautan basi dibiarkan sehingga pendaftaran ulang ikut terkunci.
    expect(hasil.aksi).toBe("tolak");
    expect(hasil.alasan).toBe("belum_terdaftar");

    const adaDelete = kueriPalsu.mock.calls.some(
      (c) => String(c[0]).includes("DELETE") && String(c[0]).includes("UserIdentities")
    );
    expect(adaDelete).toBe(true);
  });

  it("identitas SEHAT tidak ikut terhapus", async () => {
    pasangDb({ identitas: { userId: "u9" }, userById: { id: "u9", status: "active" } });
    await putuskanKebijakan(IDENTITAS, "login");

    const adaDelete = kueriPalsu.mock.calls.some(
      (c) => String(c[0]).includes("DELETE") && String(c[0]).includes("UserIdentities")
    );
    expect(adaDelete).toBe(false);
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

  it("menulis KEDUA tabel dalam SATU transaksi yang di-commit", async () => {
    pasangDb({});
    await buatAkunDariSso(IDENTITAS, "budi");

    expect(jejakTransaksi.begin).toBe(1);
    expect(jejakTransaksi.commit).toBe(1);
    expect(jejakTransaksi.rollback).toBe(0);
    expect(jejakTransaksi.release).toBe(1);

    const insertUsers = kueriPalsu.mock.calls.filter(
      (c) => String(c[0]).includes("INSERT") && String(c[0]).includes("Users")
    );
    const insertIdentitas = kueriPalsu.mock.calls.filter(
      (c) => String(c[0]).includes("INSERT") && String(c[0]).includes("UserIdentities")
    );
    expect(insertUsers.length).toBe(1);
    expect(insertIdentitas.length).toBe(1);
  });

  it("ROLLBACK bila penulisan gagal — tidak meninggalkan tautan yatim", async () => {
    // Kegagalan pada INSERT kedua adalah cara tautan yatim lahir di produksi.
    kueriPalsu.mockImplementation(async (sql: string) => {
      if (String(sql).includes("INSERT") && String(sql).includes("UserIdentities")) {
        throw new Error("kegagalan buatan di dalam test");
      }
      return [[]];
    });

    const hasil: any = await buatAkunDariSso(IDENTITAS, "budi");

    expect(hasil.hasil).toBe("gagal");
    expect(jejakTransaksi.rollback).toBe(1);
    expect(jejakTransaksi.commit).toBe(0);
    expect(jejakTransaksi.release).toBe(1);
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

/**
 * SESI TUNGGAL — penyebab kegagalan login SSO yang paling sulit dilacak.
 *
 * `authenticateJWT` menolak setiap permintaan bila `Users.currentSessionToken`
 * terisi dan BERBEDA dari token yang dibawa. Callback SSO versi pertama hanya
 * menerbitkan JWT tanpa memperbarui kolom itu, sehingga pengguna yang pernah
 * login memakai password tidak bisa masuk lewat Google — dan gagalnya SENYAP,
 * karena callback-nya sendiri sukses dan penolakan baru muncul pada permintaan
 * API berikutnya. Ditemukan pemilik proyek 16 Agu 2026.
 */
describe("daftarkanSesi", () => {
  it("memperbarui currentSessionToken di database", async () => {
    kueriPalsu.mockImplementation(async () => [[]]);
    await daftarkanSesi("u1", "token-baru");

    const update = kueriPalsu.mock.calls.find(
      (c) => String(c[0]).includes("UPDATE Users") && String(c[0]).includes("currentSessionToken")
    );
    expect(update).toBeTruthy();
    expect(update![1][0]).toBe("token-baru");
    expect(update![1][2]).toBe("u1");
  });

  it("ikut memperbarui lastSeen", async () => {
    kueriPalsu.mockImplementation(async () => [[]]);
    await daftarkanSesi("u1", "token-baru");

    const update = kueriPalsu.mock.calls.find((c) => String(c[0]).includes("currentSessionToken"));
    expect(Number(update![1][1])).toBeGreaterThan(0);
  });

  it("mendaftarkan sesi ke activeUserSessions sebagai jalur cadangan", async () => {
    kueriPalsu.mockImplementation(async () => [[]]);
    activeUserSessions.delete("u2");

    await daftarkanSesi("u2", "token-xyz", { ip: "1.2.3.4", browser: "Chrome" });

    const sesi = activeUserSessions.get("u2");
    expect(sesi).toBeTruthy();
    expect(sesi!.token).toBe("token-xyz");
    expect(sesi!.ip).toBe("1.2.3.4");

    activeUserSessions.delete("u2");
  });
});
