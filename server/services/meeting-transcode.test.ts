import { ekstensiPerluMp3UntukGemini, perintahFfmpegKeMp3 } from "./meeting-transcode";

describe("meeting-transcode (#320)", () => {
  it("webm dan mp4 wajib ke MP3; mp3/wav aman untuk Gemini", () => {
    expect(ekstensiPerluMp3UntukGemini(".webm")).toBe(true);
    expect(ekstensiPerluMp3UntukGemini(".mp4")).toBe(true);
    expect(ekstensiPerluMp3UntukGemini(".m4a")).toBe(true);
    expect(ekstensiPerluMp3UntukGemini(".mp3")).toBe(false);
    expect(ekstensiPerluMp3UntukGemini(".wav")).toBe(false);
  });

  it("perintah ffmpeg memakai -vn pada percobaan video", () => {
    const cmd = perintahFfmpegKeMp3("in.webm", "out.mp3", true);
    expect(cmd).toContain("-vn");
    expect(cmd).toContain("libmp3lame");
    expect(perintahFfmpegKeMp3("in.webm", "out.mp3", false)).not.toMatch(/\s-vn\s/);
  });
});
