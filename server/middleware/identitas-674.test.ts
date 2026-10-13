/**
 * Test #674 — identitas pemanggil HANYA dari token yang sudah diverifikasi.
 *
 * Sebelumnya sebagian rute menerima `x-user-id` dari header, `userId` dari
 * query, dan `authorId`/`userId`/`createdBy` dari body sebagai identitas.
 * Ketiganya ditulis klien, jadi pemanggil bebas memilih atas nama siapa sebuah
 * baris ditulis — dan karena kolom penulis itulah yang menentukan siapa boleh
 * mengubah atau menghapusnya, memilih identitas berarti memilih hak.
 *
 * Test ini mengunci dua hal: sumber yang dibaca, dan penolakan alih-alih jatuh
 * ke sentinel `"guest"` yang membuat baris yatim tampak sah.
 */
import type { Response } from "express";
import { identitasPemanggil, identitasWajib } from "./identitas";

describe("identitasPemanggil (#674)", () => {
  it("mengambil id dari token", () => {
    expect(identitasPemanggil({ user: { id: "u-1", uid: "u-1" } })).toBe("u-1");
  });

  it("memakai uid bila token hanya memuat uid", () => {
    expect(identitasPemanggil({ user: { uid: "u-2" } })).toBe("u-2");
  });

  it("TIDAK membaca header x-user-id, query userId, maupun body userId/authorId", () => {
    const req = {
      headers: { "x-user-id": "palsu-header" },
      query: { userId: "palsu-query" },
      body: { userId: "palsu-body", authorId: "palsu-author", createdBy: "palsu-created" },
    };
    expect(identitasPemanggil(req)).toBeUndefined();
  });

  it("mengembalikan undefined, bukan string kosong, untuk token tanpa identitas", () => {
    expect(identitasPemanggil({ user: { id: "", uid: "" } })).toBeUndefined();
    expect(identitasPemanggil({ user: {} })).toBeUndefined();
    expect(identitasPemanggil({})).toBeUndefined();
  });
});

describe("identitasWajib (#674)", () => {
  const panggil = (req: any) => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return { hasil: identitasWajib(req, res as Response), res };
  };

  it("mengembalikan identitas dari token", () => {
    const { hasil, res } = panggil({ user: { id: "u-1", uid: "u-1" } });
    expect(hasil).toBe("u-1");
    expect(res.status).not.toHaveBeenCalled();
  });

  it("menolak 401 dan TIDAK jatuh ke 'guest' saat identitas tidak ada", () => {
    const { hasil, res } = panggil({ headers: { "x-user-id": "palsu-header" } });
    expect(hasil).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);

    const payload = res.json.mock.calls[0][0];
    expect(payload.code).toBe("srv.akses_ditolak_identitas");
    expect(JSON.stringify(payload)).not.toContain("guest");
  });
});
