/**
 * #424 — judul PageHeader UPPERCASE 15px tanpa breadcrumb.
 * #445 — topbar punya border-b (garis Velzon antara navbar dan page-title).
 */
import fs from "fs";
import path from "path";

const akar = path.join(__dirname, "../..");

describe("chrome list #424/#445", () => {
  it("topbar AppContainer punya border-b border-border-subtle (#445 Velzon)", () => {
    const isi = fs.readFileSync(path.join(akar, "AppContainer.tsx"), "utf8");
    const header = isi.match(/<header className="([^"]+)"/);
    expect(header).not.toBeNull();
    expect(header![1]).toContain("bg-surface-raised");
    expect(header![1]).toMatch(/border-b/);
    expect(header![1]).toContain("border-border-subtle");
  });

  it("PageHeader memakai text-[15px] dan tidak merender nav breadcrumb", () => {
    const isi = fs.readFileSync(path.join(__dirname, "PageHeader.tsx"), "utf8");
    expect(isi).toContain("text-[15px]");
    expect(isi).not.toContain('aria-label="Breadcrumb"');
    expect(isi).not.toContain("ChevronRight");
  });
});
