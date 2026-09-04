/**
 * #424 — kunci sumber: judul nempel di bawah topbar (tanpa garis ganda).
 */
import fs from "fs";
import path from "path";

const akar = path.join(__dirname, "../..");

describe("chrome list #424", () => {
  it("topbar AppContainer tanpa border-b supaya PageHeader nempel", () => {
    const isi = fs.readFileSync(path.join(akar, "AppContainer.tsx"), "utf8");
    const header = isi.match(/<header className="([^"]+)"/);
    expect(header).not.toBeNull();
    expect(header![1]).toContain("bg-surface-raised");
    expect(header![1]).not.toMatch(/border-b/);
  });

  it("PageHeader memakai text-[15px] dan tidak merender nav breadcrumb", () => {
    const isi = fs.readFileSync(path.join(__dirname, "PageHeader.tsx"), "utf8");
    expect(isi).toContain("text-[15px]");
    expect(isi).not.toContain('aria-label="Breadcrumb"');
    expect(isi).not.toContain("ChevronRight");
  });
});
