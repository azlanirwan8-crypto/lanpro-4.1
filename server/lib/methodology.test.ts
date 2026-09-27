/**
 * Test kanonik metodologi waterfall (Item #311, #316).
 */

import { normalisasiMetodologi, adalahWaterfall } from "../lib/methodology";

describe("normalisasiMetodologi (Item #311)", () => {
  it("menyatukan Title Case dan UPPERCASE ke WATERFALL", () => {
    expect(normalisasiMetodologi("Waterfall")).toBe("WATERFALL");
    expect(normalisasiMetodologi("WATERFALL")).toBe("WATERFALL");
    expect(normalisasiMetodologi("  waterfall  ")).toBe("WATERFALL");
  });

  it("adalahWaterfall mengenali kedua casing lama", () => {
    expect(adalahWaterfall("Waterfall")).toBe(true);
    expect(adalahWaterfall("WATERFALL")).toBe(true);
    expect(adalahWaterfall("Agile")).toBe(false);
    expect(adalahWaterfall("AGILE")).toBe(false);
  });
});

describe("Sprint block waterfall guard", () => {
  it("task.routes memakai adalahWaterfall untuk gerbang fase", () => {
    const fs = require("fs");
    const path = require("path");
    const sumber = fs.readFileSync(path.join(__dirname, "../routes/task.routes.ts"), "utf8");
    expect(sumber).toMatch(/adalahWaterfall\(/);
    expect(sumber).not.toMatch(/projectCategory === "WATERFALL"/);
  });

  it("project.routes menormalisasi category pada create/update/methodology", () => {
    const fs = require("fs");
    const path = require("path");
    const sumber = fs.readFileSync(path.join(__dirname, "../routes/project.routes.ts"), "utf8");
    expect(sumber).toMatch(/normalisasiMetodologi/);
  });
});
