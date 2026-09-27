/**
 * #320 — kunci sumber: pipeline COMPLETED menghapus berkas lalu clearRecordingFile.
 */
import fs from "fs";
import path from "path";

describe("retensi rekaman #320", () => {
  it("meeting.service memanggil clearRecordingFile setelah COMPLETED", () => {
    const isi = fs.readFileSync(path.join(__dirname, "meeting.service.ts"), "utf8");
    const idxCompleted = isi.indexOf("upload_status = 'COMPLETED'");
    const idxClear = isi.indexOf("clearRecordingFile");
    expect(idxCompleted).toBeGreaterThan(0);
    expect(idxClear).toBeGreaterThan(idxCompleted);
  });
});
