import { z } from "zod";

/**
 * #703 (B1 = a) — satu tag = SATU isu nyata dari Daftar Isu.
 *
 * `label` disimpan bersama id-nya dan bukan diambil saat membaca: isu boleh
 * dihapus, catatan rapat tidak boleh kemudian menampilkan id mentah atau — lebih
 * buruk lagi — nama isu lain yang kebetulan memakai id yang sama.
 */
const tagMasuk = z.object({
  id: z.string().max(100),
  label: z.string().max(500),
});

/**
 * #704 (B3) — tautan jamak.
 *
 * `url` WAJIB http/https. Nilai ini kelak jadi `href` di layar, jadi `javascript:`
 * dan `data:` harus ditolak di sini, bukan dipercayakan pada komponen penampil —
 * sama seperti #674 menolak mempercayakan identitas pada body.
 */
const tautanMasuk = z.object({
  id: z.string().max(100),
  label: z.string().max(255).optional().nullable(),
  url: z
    .string()
    .max(2000, "Alamat tautan terlalu panjang")
    .regex(/^https?:\/\//i, "Alamat tautan harus diawali http:// atau https://"),
});

/**
 * #703 (B2 = b) — penerima jamak. Batasnya bukan hiasan: setiap id jadi satu
 * baris di `discussion_point_assignees`, dan daftar tanpa batas berarti satu
 * permintaan POST bisa menyisipkan ribuan baris.
 */
const penerimaMasuk = z
  .array(z.string().max(100))
  .max(50, "Terlalu banyak penerima")
  .optional()
  .nullable();

const lapanganDiskusi = {
  assigneeIds: penerimaMasuk,
  tags: z.array(tagMasuk).max(50, "Terlalu banyak tag").optional().nullable(),
  links: z.array(tautanMasuk).max(50, "Terlalu banyak tautan").optional().nullable(),
};

export const createDiscussionPointSchema = z.object({
  parentPointId: z.string().max(100).optional().nullable(),
  parent_point_id: z.string().max(100).optional().nullable(),
  assignTo: z.string().max(100).optional().nullable(),
  assignee_id: z.string().max(100).optional().nullable(),
  concern: z.string().max(10000, "Uraian concern terlalu panjang").optional().nullable(),
  fitur: z.string().max(255).optional().nullable(),
  feature_id: z.string().max(100).optional().nullable(),
  system: z.string().max(255).optional().nullable(),
  system_id: z.string().max(100).optional().nullable(),
  surrounding: z.string().max(255).optional().nullable(),
  surrounding_id: z.string().max(100).optional().nullable(),
  keterangan: z.string().max(10000, "Keterangan terlalu panjang").optional().nullable(),
  tindakanLanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  tindakan_lanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  targetDate: z.string().max(100).optional().nullable(),
  target_date: z.string().max(100).optional().nullable(),
  tanggalUpdateStatus: z.string().max(100).optional().nullable(),
  authorId: z.string().max(100).optional().nullable(),
  ...lapanganDiskusi,
});

export const updateDiscussionPointSchema = z.object({
  parentPointId: z.string().max(100).optional().nullable(),
  parent_point_id: z.string().max(100).optional().nullable(),
  assignTo: z.string().max(100).optional().nullable(),
  assignee_id: z.string().max(100).optional().nullable(),
  concern: z.string().max(10000, "Uraian concern terlalu panjang").optional().nullable(),
  fitur: z.string().max(255).optional().nullable(),
  feature_id: z.string().max(100).optional().nullable(),
  system: z.string().max(255).optional().nullable(),
  system_id: z.string().max(100).optional().nullable(),
  surrounding: z.string().max(255).optional().nullable(),
  surrounding_id: z.string().max(100).optional().nullable(),
  keterangan: z.string().max(10000, "Keterangan terlalu panjang").optional().nullable(),
  tindakanLanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  tindakan_lanjut: z.string().max(10000, "Tindakan lanjut terlalu panjang").optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  targetDate: z.string().max(100).optional().nullable(),
  target_date: z.string().max(100).optional().nullable(),
  tanggalUpdateStatus: z.string().max(100).optional().nullable(),
  ...lapanganDiskusi,
});

export const createCommentSchema = z.object({
  commentText: z
    .string()
    .min(1, "Teks komentar wajib diisi")
    .max(5000, "Teks komentar terlalu panjang"),
  userId: z.string().max(100).optional(),
  userName: z.string().max(100).optional(),
});

export const updateCommentSchema = z.object({
  commentText: z
    .string()
    .min(1, "Teks komentar wajib diisi")
    .max(5000, "Teks komentar terlalu panjang"),
});

/**
 * #704 — metadata satu berkas yang SUDAH naik lewat `/api/v1/upload-document`.
 *
 * Why the bytes are not posted here: `/api/v1/upload-document` is the only path
 * that runs `validateFileBuffer()` (magic bytes + whitelist + size) and writes
 * through `storage.service.ts`. Re-implementing that in this route would create
 * a second, weaker upload path — the exact mistake #674 was about. So the client
 * uploads the bytes there, then registers the RESULT here, where the project
 * guard (`jagaProyek("meetingNotes", "C")`) still decides who may attach.
 *
 * `fileRef` wajib: tanpa rujukan berkas, baris ini menunjuk ke mana tidak ada.
 */
export const buatBerkasDiskusiSchema = z.object({
  fileRef: z.string().min(1, "Rujukan berkas wajib ada").max(500),
  name: z.string().max(255).optional().nullable(),
  originalName: z.string().max(255).optional().nullable(),
  mimetype: z.string().max(100).optional().nullable(),
  size: z.number().int().min(0).max(20000000).optional().nullable(),
  url: z.string().max(2000).optional().nullable(),
});
