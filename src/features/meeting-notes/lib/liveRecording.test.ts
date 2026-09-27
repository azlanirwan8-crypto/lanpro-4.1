import {
  ekstensiDariMime,
  pilihMimeRekaman,
  rekamanPerluEkstrakVideo,
  rekamanPerluTranscodeKeMp3,
} from "./liveRecording";

describe("liveRecording (#320)", () => {
  it("webm audio live tidak diperlakukan sebagai video", () => {
    expect(rekamanPerluEkstrakVideo(".webm")).toBe(false);
    expect(rekamanPerluEkstrakVideo(".mp4")).toBe(true);
    expect(rekamanPerluEkstrakVideo(".MOV")).toBe(true);
  });

  it("ekstensi mengikuti mime", () => {
    expect(ekstensiDariMime("audio/webm;codecs=opus")).toBe("webm");
    expect(ekstensiDariMime("audio/mp4")).toBe("m4a");
  });

  it("pilihMimeRekaman mengembalikan string (jsdom boleh kosong)", () => {
    const mime = pilihMimeRekaman();
    expect(typeof mime).toBe("string");
  });

  it("webm/m4a live wajib transcode ke MP3 sebelum Gemini", () => {
    expect(rekamanPerluTranscodeKeMp3({ name: "recording.webm", type: "audio/webm" })).toBe(true);
    expect(rekamanPerluTranscodeKeMp3({ name: "clip.m4a", type: "audio/mp4" })).toBe(true);
    expect(rekamanPerluTranscodeKeMp3({ name: "rapat.mp3", type: "audio/mpeg" })).toBe(false);
  });
});
