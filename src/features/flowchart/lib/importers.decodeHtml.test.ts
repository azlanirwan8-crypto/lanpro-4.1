/**
 * Decode HTML entities tanpa DOM innerHTML (#348).
 */
import { decodeHtmlEntity } from "./importers";

describe("decodeHtmlEntity #348", () => {
  it("decodes named entities", () => {
    expect(decodeHtmlEntity("A &amp; B &lt;C&gt;")).toBe("A & B <C>");
  });

  it("decodes numeric entities", () => {
    expect(decodeHtmlEntity("&#65;&#x42;")).toBe("AB");
  });

  it("does not execute markup (string-only)", () => {
    const raw = "<img src=x onerror=alert(1)>&amp;";
    const out = decodeHtmlEntity(raw);
    expect(out).toContain("<img");
    expect(out).toContain("&");
  });
});
