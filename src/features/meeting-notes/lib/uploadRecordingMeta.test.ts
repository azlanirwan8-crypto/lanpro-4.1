import { metadataUnggahRekaman } from "./uploadRecordingMeta";

describe("#439 metadata unggah mengikuti berkas yang dikirim", () => {
  it("video asli tidak boleh menimpa nama/ukuran MP3 hasil ekstrak", () => {
    const video = { name: "rapat.mp4", size: 50_000_000 };
    const mp3 = { name: "extracted_audio.mp3", size: 800_000 };

    const meta = metadataUnggahRekaman(mp3);

    expect(meta.file_name).toBe("extracted_audio.mp3");
    expect(meta.fileSize).toBe("800000");
    expect(meta.file_name).not.toBe(video.name);
    expect(meta.fileSize).not.toBe(String(video.size));
  });

  it("audio/webm live memakai namanya sendiri", () => {
    const webm = { name: "live-recording.webm", size: 12_345 };
    expect(metadataUnggahRekaman(webm)).toEqual({
      file_name: "live-recording.webm",
      fileSize: "12345",
    });
  });
});
