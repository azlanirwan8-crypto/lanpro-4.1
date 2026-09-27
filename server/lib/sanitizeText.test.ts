import { sanitizeUserText, sanitizeOptionalText } from "./sanitizeText";

describe("sanitizeText #348", () => {
  it("strips script tags from user text", () => {
    expect(sanitizeUserText("<script>alert(1)</script>halo")).toBe("halo");
  });

  it("strips event handlers and tags", () => {
    const out = sanitizeUserText("<img src=x onerror=alert(1)>teks");
    expect(out).not.toMatch(/onerror/i);
    expect(out).toContain("teks");
  });

  it("returns empty for nullish", () => {
    expect(sanitizeUserText(null)).toBe("");
    expect(sanitizeUserText(undefined)).toBe("");
  });

  it("sanitizeOptionalText preserves undefined", () => {
    expect(sanitizeOptionalText(undefined)).toBeUndefined();
    expect(sanitizeOptionalText("<b>x</b>")).toBe("x");
  });
});
