/**
 * Test yang mengunci perilaku verifyProjectAccess — item #49 (§13.5).
 *
 * Kondisi sebelum perbaikan: rute ber-`['*']` memanggil `next()` untuk SIAPA PUN
 * yang punya JWT sah, tanpa pernah menyentuh tabel ProjectMembers. 184 test yang
 * ada tidak satu pun menangkapnya. Test ini ada supaya jalan pintas itu tidak
 * bisa kembali tanpa ketahuan.
 */

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: jest.fn(),
  },
}));

import { verifyProjectAccess } from "./rbac";
import { createMockRequest, createMockResponse } from "../test/setup";
import db from "../../src/lib/db";

/**
 * Membangun koneksi tiruan yang menjawab per-query.
 *
 * Urutan query di rbac.ts: (1) Users, (2) Projects.ownerId, (3) ProjectMembers.
 * Dipilih berdasarkan isi SQL-nya, bukan urutan panggilan, supaya test tidak
 * ikut rusak hanya karena urutan query digeser.
 */
const buatKoneksi = (opsi: {
  peranPengguna?: string;
  pemilikProyek?: string | null;
  peranAnggota?: string | null;
}) => {
  const release = jest.fn();
  const query = jest.fn(async (sql: string) => {
    if (sql.includes("FROM Users")) {
      return [opsi.peranPengguna ? [{ id: "user-1", role: opsi.peranPengguna }] : []];
    }
    if (sql.includes("FROM Projects")) {
      return [opsi.pemilikProyek ? [{ ownerId: opsi.pemilikProyek }] : []];
    }
    if (sql.includes("FROM ProjectMembers")) {
      return [opsi.peranAnggota ? [{ role: opsi.peranAnggota }] : []];
    }
    return [[]];
  });
  return { query, release };
};

const jalankan = async (
  allowedRoles: string[],
  opsi: Parameters<typeof buatKoneksi>[0] & { params?: any }
) => {
  (db as any).getConnection.mockResolvedValue(buatKoneksi(opsi));

  const req = createMockRequest({
    params: opsi.params ?? { projectId: "proyek-A" },
    user: { id: "user-1", uid: "user-1", role: opsi.peranPengguna ?? "user" },
  });
  const res = createMockResponse();
  const next = jest.fn();

  await verifyProjectAccess(allowedRoles)(req as any, res as any, next);
  return { res, next };
};

describe("verifyProjectAccess — #49 keanggotaan proyek benar-benar diperiksa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("MENOLAK pengguna terautentikasi yang bukan anggota, walau rutenya ['*']", async () => {
    const { res, next } = await jalankan(["*"], {
      peranPengguna: "user",
      pemilikProyek: "orang-lain",
      peranAnggota: null,
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("mengizinkan anggota proyek pada rute ['*'], peran apa pun", async () => {
    const { res, next } = await jalankan(["*"], {
      peranPengguna: "user",
      pemilikProyek: "orang-lain",
      peranAnggota: "viewer",
    });

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("mengizinkan pemilik proyek walau tidak terdaftar di ProjectMembers", async () => {
    const { res, next } = await jalankan(["*"], {
      peranPengguna: "user",
      pemilikProyek: "user-1",
      peranAnggota: null,
    });

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("mengizinkan admin global tanpa melihat keanggotaan", async () => {
    const { res, next } = await jalankan(["*"], {
      peranPengguna: "admin",
      pemilikProyek: "orang-lain",
      peranAnggota: null,
    });

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("tetap MENOLAK anggota yang perannya di luar daftar peran eksplisit", async () => {
    const { res, next } = await jalankan(["admin", "manager", "head"], {
      peranPengguna: "user",
      pemilikProyek: "orang-lain",
      peranAnggota: "viewer",
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("mengizinkan anggota yang perannya ada di daftar peran eksplisit", async () => {
    const { res, next } = await jalankan(["admin", "manager", "head"], {
      peranPengguna: "user",
      pemilikProyek: "orang-lain",
      peranAnggota: "manager",
    });

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("melepaskan koneksi database walau permintaan ditolak", async () => {
    const koneksi = buatKoneksi({
      peranPengguna: "user",
      pemilikProyek: "orang-lain",
      peranAnggota: null,
    });
    (db as any).getConnection.mockResolvedValue(koneksi);

    const req = createMockRequest({
      params: { projectId: "proyek-A" },
      user: { id: "user-1", uid: "user-1", role: "user" },
    });
    const res = createMockResponse();

    await verifyProjectAccess(["*"])(req as any, res as any, jest.fn());

    expect(koneksi.release).toHaveBeenCalled();
  });
});
