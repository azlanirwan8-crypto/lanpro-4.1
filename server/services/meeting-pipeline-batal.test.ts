import {
  pipelineDibatalkan,
  PipelineDibatalkanError,
  updateMenyentuhBaris,
} from "./meeting-pipeline-batal";

describe("#441 batal analisis tidak boleh menimpa hasil", () => {
  it("IDLE berarti dibatalkan — COMPLETED/FAILED tidak boleh ditulis", () => {
    expect(pipelineDibatalkan("IDLE")).toBe(true);
    expect(pipelineDibatalkan("EXTRACTING_AUDIO")).toBe(false);
    expect(pipelineDibatalkan("TRANSCRIBING_STT")).toBe(false);
    expect(pipelineDibatalkan("ANALYZING_LLM")).toBe(false);
    expect(pipelineDibatalkan("COMPLETED")).toBe(false);
  });

  it("UPDATE 0 baris (sudah IDLE) dianggap batal", () => {
    expect(updateMenyentuhBaris({ rowCount: 0 })).toBe(false);
    expect(updateMenyentuhBaris({ affectedRows: 0 })).toBe(false);
    expect(updateMenyentuhBaris({ rowCount: 1 })).toBe(true);
  });

  it("PipelineDibatalkanError bisa dibedakan dari galat Gemini", () => {
    const err = new PipelineDibatalkanError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PipelineDibatalkanError");
  });
});
