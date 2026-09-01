import { adalahWaterfall, normalisasiMetodologi } from "./methodology";

describe("methodology frontend (#311)", () => {
  it("menyatukan casing ke WATERFALL", () => {
    expect(normalisasiMetodologi("Waterfall")).toBe("WATERFALL");
    expect(adalahWaterfall("waterfall")).toBe(true);
    expect(adalahWaterfall("Agile")).toBe(false);
  });
});
