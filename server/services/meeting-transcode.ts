/**
 * #320 — Gemini generateContent inlineData hanya menerima MP3/WAV/AAC/OGG/FLAC.
 * Rekaman live MediaRecorder hampir selalu WebM/Opus atau MP4 — harus diubah dulu.
 */

const EKSTENSI_AMAN_GEMINI = new Set([".mp3", ".wav", ".aac", ".ogg", ".flac"]);

export function ekstensiPerluMp3UntukGemini(fileExt: string): boolean {
  return !EKSTENSI_AMAN_GEMINI.has(fileExt.toLowerCase());
}

export function perintahFfmpegKeMp3(sumber: string, tujuan: string, pakaiVn: boolean): string {
  const potongVideo = pakaiVn ? "-vn " : "";
  return `ffmpeg -y -i "${sumber}" ${potongVideo}-acodec libmp3lame -ar 16000 -ac 1 "${tujuan}"`;
}
