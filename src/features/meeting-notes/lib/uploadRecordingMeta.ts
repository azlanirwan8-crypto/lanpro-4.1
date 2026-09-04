/**
 * #439 — metadata unggah harus mengikuti berkas yang BENAR-BENAR dikirim.
 *
 * Setelah FFmpeg klien mengekstrak MP3 dari video, byte-nya sudah audio
 * tetapi FormData lama masih mengirim nama/ukuran video asli. Server
 * menggabung chunk memakai ekstensi dari file_name → pipeline FFmpeg salah jalur.
 */

export function metadataUnggahRekaman(fileToUpload: { name: string; size: number }): {
  file_name: string;
  fileSize: string;
} {
  return {
    file_name: fileToUpload.name,
    fileSize: String(fileToUpload.size),
  };
}
