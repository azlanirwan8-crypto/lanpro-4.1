/**
 * #315 gelombang 3 — spek OpenAPI harus ada dan berasal dari generator Zod.
 */
import fs from "node:fs";
import path from "node:path";

describe("openapi #315 gelombang 3", () => {
  const root = path.join(__dirname, "../..");
  const full = path.join(root, "docs", "openapi.json");
  const subset = path.join(root, "docs", "openapi-subset.json");

  it("docs/openapi.json ada, punya paths + schemas Zod", () => {
    expect(fs.existsSync(full)).toBe(true);
    const spec = JSON.parse(fs.readFileSync(full, "utf8"));
    expect(spec.openapi).toMatch(/^3\./);
    expect(Object.keys(spec.paths || {}).length).toBeGreaterThan(20);
    expect(Object.keys(spec.components?.schemas || {}).length).toBeGreaterThan(10);
    expect(spec.components.schemas.ErrorEnvelope).toBeTruthy();
    expect(spec["x-lanpro-stats"]?.operationsWithZod).toBeGreaterThan(10);
    for (const p of Object.keys(spec.paths)) {
      expect(p.startsWith("/")).toBe(true);
    }
  });

  it("openapi-subset.json adalah salinan spek yang sama", () => {
    const a = fs.readFileSync(full, "utf8");
    const b = fs.readFileSync(subset, "utf8");
    expect(b).toBe(a);
  });
});
