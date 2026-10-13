import type { Response } from "express";

/**
 * Identitas pemanggil — HANYA dari token yang sudah diverifikasi (#54, #674).
 *
 * Header `x-user-id`, `?userId=`, dan field `authorId`/`userId`/`createdBy` di
 * body semuanya bisa ditulis klien, jadi tidak satu pun boleh menjadi identitas.
 * Sebuah header yang bisa ditulis klien tidak boleh pernah menjadi identitas.
 *
 * `id` didahulukan sesuai `penulisDari` di discussion-points.routes.ts. Baris
 * LAMA di beberapa tabel menyimpan `uid` karena dulu ditulis dari body, jadi
 * pembandingan kepemilikan harus menerima keduanya — pakai `matchesCaller` dari
 * `server/services/task.service.ts`, bukan `===`.
 */
export const identitasPemanggil = (req: any): string | undefined => {
  const mentah = req?.user?.id || req?.user?.uid;
  if (mentah === undefined || mentah === null || mentah === "") return undefined;
  return String(mentah);
};

/**
 * Sama seperti di atas, tetapi MENOLAK permintaan tanpa identitas alih-alih
 * jatuh ke `"guest"`.
 *
 * Gerbang `/api/*` di `server.ts` seharusnya sudah menjamin `req.user` terisi.
 * Penjaga ini tetap ada supaya keselamatan sebuah rute tidak bersandar pada
 * lapisan lain — bentuk asumsi yang melahirkan #49 dan #68.
 */
export const identitasWajib = (req: any, res: Response): string | undefined => {
  const id = identitasPemanggil(req);
  if (id) return id;
  res.status(401).json({
    status: "error",
    code: "srv.akses_ditolak_identitas",
    message: "Akses ditolak: token tidak memuat identitas pengguna.",
  });
  return undefined;
};
