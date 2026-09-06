import { alurNavigasiMetodologi } from "./alurMetodologi";
import { adalahWaterfall } from "./methodology";

describe("#465 alur metodologi clean (Jira-style dual)", () => {
  it("Agile: tampilkan Sprint, perencanaan = sprints", () => {
    const a = alurNavigasiMetodologi("Agile");
    expect(a.sembunyikanSprint).toBe(false);
    expect(a.viewUtamaPerencanaan).toBe("sprints");
    expect(a.labelRoadmapKey).toBe("sidebar.roadmapTimeline");
  });

  it("Waterfall: sembunyikan Sprint, perencanaan = timeline/milestone", () => {
    expect(adalahWaterfall("WATERFALL")).toBe(true);
    const w = alurNavigasiMetodologi("Waterfall");
    expect(w.sembunyikanSprint).toBe(true);
    expect(w.viewUtamaPerencanaan).toBe("timeline");
    expect(w.labelRoadmapKey).toBe("sidebar.roadmapTimelineWaterfall");
  });
});
