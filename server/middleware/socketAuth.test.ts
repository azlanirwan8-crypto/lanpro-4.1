/**
 * Test perilaku untuk gerbang autentikasi Socket.IO — item #50 dan #59 (§13.5).
 *
 * Berbeda dari penjaga statis pada #52, test ini benar-benar MENJALANKAN
 * penjaganya: itulah alasan `penjagaSocket` dipisah dari server.ts.
 *
 * Kondisi sebelum perbaikan: tidak ada `io.use()` sama sekali. Dibuktikan
 * dengan menyambungkan klien anonim ke server yang sedang berjalan — ia
 * tersambung dan menerima profil lengkap akun admin yang sedang login.
 */

import jwt from "jsonwebtoken";
import {
  penjagaSocket,
  idPemilikSocket,
  profilAman,
  PESAN_TANPA_TOKEN,
  PESAN_TOKEN_TIDAK_VALID,
} from "./socketAuth";

const RAHASIA = "test-secret-key-for-socket-auth";

const buatSocket = (handshake: any) => ({ handshake, data: {} } as any);

const jalankan = (socket: any): Promise<Error | undefined> =>
  new Promise((resolve) => penjagaSocket(socket, resolve));

describe("penjagaSocket — #50 koneksi Socket.IO wajib membawa token sah", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = RAHASIA;
  });

  it("MENOLAK koneksi tanpa token sama sekali", async () => {
    const err = await jalankan(buatSocket({ auth: {}, query: {} }));

    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe(PESAN_TANPA_TOKEN);
  });

  it("MENOLAK koneksi tanpa handshake sama sekali", async () => {
    const err = await jalankan(buatSocket(undefined));

    expect(err?.message).toBe(PESAN_TANPA_TOKEN);
  });

  it("MENOLAK token yang tidak bisa diverifikasi", async () => {
    const err = await jalankan(buatSocket({ auth: { token: "bukan.token.sah" } }));

    expect(err?.message).toBe(PESAN_TOKEN_TIDAK_VALID);
  });

  it("MENOLAK token yang ditandatangani rahasia lain", async () => {
    const token = jwt.sign({ id: "user-1" }, "rahasia-yang-salah");
    const err = await jalankan(buatSocket({ auth: { token } }));

    expect(err?.message).toBe(PESAN_TOKEN_TIDAK_VALID);
  });

  it("MENOLAK token yang sudah kedaluwarsa", async () => {
    const token = jwt.sign({ id: "user-1" }, RAHASIA, { expiresIn: -10 });
    const err = await jalankan(buatSocket({ auth: { token } }));

    expect(err?.message).toBe(PESAN_TOKEN_TIDAK_VALID);
  });

  it("menerima token sah dan menempelkan identitasnya ke socket.data", async () => {
    const token = jwt.sign({ id: "user-1", uid: "user-1", role: "user" }, RAHASIA);
    const socket = buatSocket({ auth: { token } });

    const err = await jalankan(socket);

    expect(err).toBeUndefined();
    expect(socket.data.user.id).toBe("user-1");
    expect(socket.data.user.role).toBe("user");
  });

  it("menerima token lewat query sebagai jalur cadangan", async () => {
    const token = jwt.sign({ id: "user-2" }, RAHASIA);
    const socket = buatSocket({ auth: {}, query: { token } });

    const err = await jalankan(socket);

    expect(err).toBeUndefined();
    expect(socket.data.user.id).toBe("user-2");
  });
});

describe("idPemilikSocket — identitas berasal dari token, bukan payload", () => {
  it("mengembalikan id dari socket.data yang diisi penjaga", () => {
    expect(idPemilikSocket({ data: { user: { id: "rido" } } } as any)).toBe("rido");
  });

  it("jatuh ke uid bila id tidak ada", () => {
    expect(idPemilikSocket({ data: { user: { uid: "eri" } } } as any)).toBe("eri");
  });

  it("mengembalikan string kosong bila socket belum terautentikasi", () => {
    expect(idPemilikSocket({ data: {} } as any)).toBe("");
    expect(idPemilikSocket({} as any)).toBe("");
  });
});

describe("profilAman — #59 presence tidak boleh membawa PII & matriks permission", () => {
  const penuh = {
    id: "1",
    uid: "admin-uid",
    username: "admin",
    displayName: "Administrator",
    nama_lengkap: "Administrator",
    role: "admin",
    status: "approved",
    avatar_url: "/uploads/avatar-1.png",
    photoURL: "/uploads/avatar-1.png",
    avatarUrl: "/uploads/avatar-1.png",
    email: "admin@contoh.test",
    phone: "0800000000",
    department: "Technology & IT",
    position: "System Administrator",
    permissions: { settings: { create: true, read: true, update: true, delete: true } },
  };

  it("membuang email, telepon, departemen, jabatan, dan permissions", () => {
    const hasil = profilAman(penuh) as any;

    expect(hasil.email).toBeUndefined();
    expect(hasil.phone).toBeUndefined();
    expect(hasil.department).toBeUndefined();
    expect(hasil.position).toBeUndefined();
    expect(hasil.permissions).toBeUndefined();
  });

  it("mempertahankan seluruh bidang yang memang dibaca antarmuka", () => {
    const hasil = profilAman(penuh) as any;

    expect(hasil.id).toBe("1");
    expect(hasil.uid).toBe("admin-uid");
    expect(hasil.username).toBe("admin");
    expect(hasil.displayName).toBe("Administrator");
    expect(hasil.role).toBe("admin");
    expect(hasil.status).toBe("approved");
    expect(hasil.avatar_url).toBe("/uploads/avatar-1.png");
  });

  it("tidak membocorkan bidang tak dikenal yang ditambahkan belakangan", () => {
    const hasil = profilAman({ ...penuh, rahasiaBaru: "jangan-ikut" }) as any;

    expect(hasil.rahasiaBaru).toBeUndefined();
  });

  it("mengembalikan null untuk masukan kosong", () => {
    expect(profilAman(null)).toBeNull();
    expect(profilAman(undefined)).toBeNull();
  });
});
