/**
 * Rekaman live mikrofon untuk Asisten Rapat (#320).
 *
 * Bukan simulasi: MediaRecorder + getUserMedia. MIME dipilih dari yang
 * didukung peramban; meter level memakai AnalyserNode agar pengguna melihat
 * suara benar-benar tertangkap.
 */

const MIME_KANDIDAT = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] as const;

export function pilihMimeRekaman(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of MIME_KANDIDAT) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

export function ekstensiDariMime(mime: string): "webm" | "m4a" {
  return mime.includes("mp4") ? "m4a" : "webm";
}

/** Video kontainer yang perlu FFmpeg -vn. audio/webm live JANGAN masuk sini. */
export function rekamanPerluEkstrakVideo(fileExt: string): boolean {
  return [".mp4", ".mkv", ".mov", ".avi"].includes(fileExt.toLowerCase());
}

export async function bukaAliranMikrofon(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    video: false,
  });
}

export function buatMeterLevel(
  stream: MediaStream,
  onLevel: (level: number) => void
): { stop: () => void } {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return { stop: () => undefined };
  }

  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let frame = 0;
  let hidup = true;

  const tick = () => {
    if (!hidup) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    onLevel(Math.min(1, rms * 4));
    frame = requestAnimationFrame(tick);
  };

  void ctx.resume();
  frame = requestAnimationFrame(tick);

  return {
    stop: () => {
      hidup = false;
      cancelAnimationFrame(frame);
      source.disconnect();
      void ctx.close();
    },
  };
}
