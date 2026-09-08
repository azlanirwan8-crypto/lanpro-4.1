/**
 * #471 — gerbang: PascalCase di migrate yang tidak di pgTables wajib dikutip di SQL.
 */
import path from "node:path";

const { auditPgTablesKutip, ekstrakTabelPascalMigrate, ekstrakPgTables } = require(
  path.join(__dirname, "..", "..", "scripts", "validate", "audit-pg-tables-kutip.cjs")
);

describe("#471 pgTables ↔ migrate PascalCase kutip", () => {
  it("enam tabel landmine #469 tidak di pgTables (regresi daftar)", () => {
    const hasil = auditPgTablesKutip();
    for (const t of [
      "TaskWorkLogs",
      "NotificationDeliveryFailures",
      "UserIdentities",
      "UserSessions",
      "BroadcastConfig",
      "IntegrationSettings",
    ]) {
      expect(hasil.tanpaAutoQuote).toContain(t);
      expect(hasil.pgTables).not.toContain(t);
    }
  });

  it("tidak ada call site SQL server tanpa kutip untuk tabel non-pgTables", () => {
    const hasil = auditPgTablesKutip();
    expect(hasil.pelanggaran).toEqual([]);
    expect(hasil.ok).toBe(true);
  });

  it("ekstraktor migrate membaca CREATE TABLE berkutip PascalCase", () => {
    const contoh = `
      CREATE TABLE IF NOT EXISTS "TaskWorkLogs" (id VARCHAR(36));
      CREATE TABLE IF NOT EXISTS meeting_details (id VARCHAR(36));
      CREATE TABLE IF NOT EXISTS "Users" (id VARCHAR(36));
    `;
    expect(ekstrakTabelPascalMigrate(contoh)).toEqual(["TaskWorkLogs", "Users"]);
  });

  it("ekstraktor pgTables membaca daftar di db.ts", () => {
    const contoh = `const pgTables = [\n  "Users",\n  "Tasks",\n];`;
    expect(ekstrakPgTables(contoh)).toEqual(["Users", "Tasks"]);
  });
});
