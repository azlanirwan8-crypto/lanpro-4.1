/**
 * #424 — judul PageHeader UPPERCASE 15px tanpa breadcrumb.
 * #445 — topbar punya border-b (garis Velzon antara navbar dan page-title).
 */
import fs from "fs";
import path from "path";

const akar = path.join(__dirname, "../..");

describe("chrome list #424/#445", () => {
  it("topbar AppContainer punya garis bawah (#445 Velzon, token pemisah sejak #862)", () => {
    const isi = fs.readFileSync(path.join(akar, "AppContainer.tsx"), "utf8");
    const header = isi.match(/<header className="([^"]+)"/);
    expect(header).not.toBeNull();
    expect(header![1]).toContain("bg-surface-raised");
    expect(header![1]).toMatch(/border-b/);
    // #862 — garis topbar adalah PEMISAH, bukan batas kontrol. Token kontrol
    // (#8b9299 di gelap, 4,90:1) membuat navbar lebih bergaris daripada Velzon;
    // token pemisah mempertahankan tampilan terang persis dan menurunkan gelap.
    expect(header![1]).toContain("border-border-divider");
    expect(header![1]).not.toContain("border-border-subtle");
  });

  it("PageHeader memakai text-[15px] dan tidak merender nav breadcrumb", () => {
    const isi = fs.readFileSync(path.join(__dirname, "PageHeader.tsx"), "utf8");
    expect(isi).toContain("text-[15px]");
    expect(isi).not.toContain('aria-label="Breadcrumb"');
    expect(isi).not.toContain("ChevronRight");
  });
});
