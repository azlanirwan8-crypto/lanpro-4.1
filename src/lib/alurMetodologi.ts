/**
 * #465 — flow metodologi ala Jira: Agile = Sprint; Waterfall = Roadmap/Milestone.
 * Fondasi #311 (casing) + #312 (milestone UI) + nav sembunyikan Sprint.
 */

import { adalahWaterfall, normalisasiMetodologi } from "./methodology";

/**
 * Alur navigasi kanonik per metodologi — untuk tes & dokumentasi produk.
 * Waterfall tidak punya view sprint; Agile tidak memakai gate fase sebagai nav utama.
 */
export function alurNavigasiMetodologi(category: unknown): {
  metodologi: string;
  sembunyikanSprint: boolean;
  viewUtamaPerencanaan: "sprints" | "timeline";
  labelRoadmapKey: string;
} {
  const wf = adalahWaterfall(category);
  return {
    metodologi: normalisasiMetodologi(category) || "AGILE",
    sembunyikanSprint: wf,
    viewUtamaPerencanaan: wf ? "timeline" : "sprints",
    labelRoadmapKey: wf ? "sidebar.roadmapTimelineWaterfall" : "sidebar.roadmapTimeline",
  };
}
