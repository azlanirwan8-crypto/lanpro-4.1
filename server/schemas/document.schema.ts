import { z } from "zod";

/**
 * Batas untuk dokumen proyek (#584).
 *
 * Dua hal yang sebelumnya tidak dibatasi sama sekali: panjang `canvasData` dan
 * `fileData`. Keduanya string yang DISUSUN KLIEN, dan `canvasData` papan
 * flowchart ditulis ulang oleh autosave tiap beberapa detik — tanpa batas, satu
 * tab yang rusak bisa menaruh puluhan megabyte pada satu baris basis data, dan
 * setiap simpan berikutnya menulis ulang semuanya.
 *
 * Angkanya dipilih di atas pemakaian papan sekarang (kanvas JSON saja, jauh di
 * bawah ini) supaya baris lama yang masih menyimpan lampiran base64 tidak
 * tiba-tiba ditolak. Yang melewatinya bukan pemakaian wajar, melainkan tab yang
 * rusak atau tulisan tangan. Catatan: batas platform (body request serverless)
 * lebih kecil dari ini dan berdiri sendiri — papan raksasa bisa gagal di lapis
 * itu meski skema ini meloloskannya.
 */
const BATAS_PAYLOAD = 8 * 1024 * 1024;

const payload = (nama: string) =>
  z
    .string()
    .max(
      BATAS_PAYLOAD,
      `${nama} terlalu besar (maks 8 MB) — buang lampiran lama atau tautkan berkasnya`
    )
    .optional()
    .nullable();

/**
 * Skrip di dalam `link` tidak boleh masuk. Tautan TANPA awalan (mis.
 * "docs.google.com/abc") tetap diterima — banyak orang menempel seperti itu,
 * dan menolaknya hanya membuat penyimpanan gagal tanpa alasan yang dipahami.
 */
const tautan = z
  .string()
  .max(2048)
  .refine((v) => !/^\s*(?:javascript|vbscript|livescript)\s*:/i.test(v), {
    message: "Tautan dokumen tidak boleh berupa skrip",
  })
  .optional()
  .nullable();

export const createDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Judul dokumen tidak boleh kosong")
    .max(255, "Judul dokumen terlalu panjang"),
  description: z.string().max(10000, "Deskripsi dokumen terlalu panjang").optional().nullable(),
  type: z.string().max(255).optional().nullable(),
  link: tautan,
  fileData: payload("Isi berkas"),
  fileName: z.string().max(255).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
  canvasData: payload("Isi papan"),
  category: z.string().max(255).optional().nullable(),
  createdBy: z.string().max(100).optional().nullable(),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, "Judul dokumen tidak boleh kosong")
    .max(255, "Judul dokumen terlalu panjang")
    .optional(),
  description: z.string().max(10000, "Deskripsi dokumen terlalu panjang").optional().nullable(),
  type: z.string().max(255).optional().nullable(),
  link: tautan,
  fileData: payload("Isi berkas"),
  fileName: z.string().max(255).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
  canvasData: payload("Isi papan"),
  category: z.string().max(255).optional().nullable(),
  // #568 — stempel yang dibaca klien tadi; kalau barisnya sudah bergeser, PUT
  // ini ditolak 409 alih-alih menimpa diam-diam.
  versiDibaca: z.string().max(64).optional().nullable(),
});
