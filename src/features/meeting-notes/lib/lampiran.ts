import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  attachDiscussionPointFile,
  uploadDiscussionPointFile,
} from "../../../services/meetingService";
import type { BerkasDiskusi } from "../../../types";

/**
 * #704/#709 — unggah dan daftarkan satu berkas ke satu titik diskusi.
 *
 * MENGAPA DI SINI. `DiscussionPointsTable.tsx` berada di 780 baris dari batas
 * 800 §4 sebelum #709 menambah antrean berkasnya, dan jalur unggah adalah
 * potongan terbesar yang tidak punya state layar sendiri. Memindahkannya ke
 * hook fitur lebih jujur daripada memendekkan komentar penjaga.
 *
 * MENGAPA DUA PERMINTAAN, BUKAN SATU. Hanya `/api/v1/upload-document` yang
 * memvalidasi magic byte dan menulis lewat `storage.service.ts`; rute
 * pendaftarannya berada di bawah `jagaProyek("meetingNotes", "C")` yang sama,
 * jadi tidak ada pemeriksaan izin yang dilompati.
 *
 * MENGAPA `pointId` DIPAKSA DARI LUAR. Baris `discussion_point_files` menunjuk
 * `point_id`, jadi berkas tidak bisa menempel pada titik diskusi yang belum
 * ada. Dua pemanggilnya punya id dari arah berbeda: laci sunting sudah
 * memegangnya, baris cepat baru menerimanya setelah `createDiscussionPoint`
 * pulang (#709).
 *
 * Galat TIDAK dilempar ke pemanggil. Yang gagal hanyalah satu berkas dari
 * sebuah daftar, dan satu alamat salah tidak boleh membuang gambar lain yang
 * sudah naik maupun titik diskusi yang sudah tersimpan.
 */
export const useLampiranDiskusi = (
  projectId: string,
  meetingId: string,
  userId?: string | null
) => {
  const { t } = useTranslation();
  /* #704 — unggah bergantian, bukan serentak: setiap berkas butuh satu
   * permintaan unggah lalu satu permintaan daftar, dan dua-duanya menulis
   * daftar yang sama. */
  const [sedangMengunggah, setSedangMengunggah] = useState(false);

  const lampirkanKePoin = async (pointId: string, file: File): Promise<BerkasDiskusi | null> => {
    if (!userId) return null;
    setSedangMengunggah(true);
    try {
      const hasilUnggah: any = await uploadDiscussionPointFile(file);
      const info = hasilUnggah?.data;
      if (!info?.filename) throw new Error(t("toast.gagalUnggahBerkas"));
      return await attachDiscussionPointFile(
        projectId,
        meetingId,
        pointId,
        {
          fileRef: info.filename,
          name: info.originalName || file.name,
          originalName: info.originalName || file.name,
          mimetype: file.type || null,
          size: typeof info.size === "number" ? info.size : file.size,
          url: info.url || null,
        },
        userId
      );
    } catch (error: any) {
      toast.error(t("toast.gagalUnggahBerkas") + (error?.message || ""));
      return null;
    } finally {
      setSedangMengunggah(false);
    }
  };

  return { sedangMengunggah, lampirkanKePoin };
};
