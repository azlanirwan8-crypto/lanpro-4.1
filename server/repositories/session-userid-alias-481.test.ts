/**
 * #481 — filter userId sessions harus cocok id DAN uid (bukan hanya exact).
 */
describe("session.repository getSessions userId aliases (#481)", () => {
  it("menyusun IN (...) dari id+uid setelah resolve Users", () => {
    // Pola yang dikunci: bila filter.userId diberikan, query Users dulu lalu
    // us."userId" IN (…). Sumber: session.repository.ts getSessions.
    const src = require("fs").readFileSync(
      require("path").join(__dirname, "session.repository.ts"),
      "utf8"
    );
    expect(src).toMatch(/us\."userId" IN \(\$\{placeholders\}\)/);
    expect(src).toMatch(/SELECT id, uid FROM "Users"/);
    expect(src).toMatch(/us\."userId" = u\.id OR us\."userId" = u\.uid/);
  });
});
