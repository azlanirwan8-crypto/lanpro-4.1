/**
 * #810 — kontrak presigned URL yang sekarang menjadi satu-satunya kunci
 * berkas privat: token HMAC terikat `namafile:uid:masaBerlaku`, dan di luar
 * itu Bearer JWT mana pun tidak boleh lagi mengalirkan berkas (redirect
 * saja, dikunci di `secure-stream-810.test.ts`). Perilaku fungsinya diuji
 * di sini karena ia murni kripto — tanpa server, tanpa penyimpanan.
 */
import { generatePresignedUrl, verifyPresignedToken } from "./fileSecurity";

const RAHASIA = "rahasia-uji-810";
const KOMPONEN = (url: string) => {
  const q = new URL(url, "http://lanpro.test").searchParams;
  return {
    file: q.get("file") as string,
    uid: q.get("uid") as string,
    expires: q.get("expires") as string,
    token: q.get("token") as string,
  };
};

beforeAll(() => {
  process.env.JWT_SECRET = RAHASIA;
});

describe("#810 — presigned URL: tanda tangan dan masa berlaku", () => {
  it("roundtrip: URL yang baru diterbitkan lolos verifikasi", () => {
    const { file, uid, expires, token } = KOMPONEN(
      generatePresignedUrl("laporan_q3.pdf", "u-42", 1440)
    );
    expect(verifyPresignedToken(file, uid, expires, token)).toBe(true);
  });

  it("token kedaluwarsa ditolak — inilah yang membuat URL tersalin mati dalam 24 jam", () => {
    const { file, uid, expires, token } = KOMPONEN(generatePresignedUrl("a.pdf", "u-1", 1440));
    const kedaluwarsa = String(Number(expires) - 2 * 86400);
    expect(verifyPresignedToken(file, uid, kedaluwarsa, token)).toBe(false);
  });

  it("nama berkas yang diubah satu karakter saja ditolak", () => {
    const { file, uid, expires, token } = KOMPONEN(generatePresignedUrl("a.pdf", "u-1", 1440));
    expect(verifyPresignedToken(file.replace("a", "b"), uid, expires, token)).toBe(false);
  });

  it("token milik uid lain ditolak — tanda tangan memang terikat uid", () => {
    const { file, expires, token } = KOMPONEN(generatePresignedUrl("a.pdf", "u-1", 1440));
    expect(verifyPresignedToken(file, "u-2", expires, token)).toBe(false);
  });

  it("1440 menit berarti masa berlaku 24 jam sejak diterbitkan", () => {
    const sebelum = Math.floor(Date.now() / 1000);
    const { expires } = KOMPONEN(generatePresignedUrl("a.pdf", "u-1", 1440));
    const sesudah = Math.floor(Date.now() / 1000);
    expect(Number(expires) - sebelum).toBeGreaterThanOrEqual(86400);
    expect(Number(expires) - sesudah).toBeLessThanOrEqual(86400);
  });

  it("parameter lengkap wajib ada; token tanpa expires ditolak", () => {
    const { file, uid, token } = KOMPONEN(generatePresignedUrl("a.pdf", "u-1", 1440));
    expect(verifyPresignedToken(file, uid, "", token)).toBe(false);
  });
});
