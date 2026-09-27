/**
 * #479 — gerbang try/catch query dalam txn tanpa SAVEPOINT.
 */
import path from "node:path";

const { auditTxnSavepoint, temukanTryQueryTanpaSavepoint } = require(
  path.join(__dirname, "..", "..", "scripts", "validate", "audit-txn-savepoint.cjs")
);

describe("#479 txn SAVEPOINT lint", () => {
  it("codebase server lulus (hapusAnakOpsional / project cascade OK)", () => {
    const hasil = auditTxnSavepoint();
    expect(hasil.pelanggaran).toEqual([]);
    expect(hasil.ok).toBe(true);
  });

  it("mendeteksi try+query setelah begin tanpa SAVEPOINT", () => {
    const contoh = `
      async function buruk() {
        await connection.beginTransaction();
        try {
          await connection.query("DELETE FROM Foo");
        } catch (e) {}
        await connection.commit();
      }
    `;
    const temuan = temukanTryQueryTanpaSavepoint(contoh);
    expect(temuan.length).toBeGreaterThan(0);
  });

  it("mengizinkan SAVEPOINT sebelum try", () => {
    const contoh = `
      async function baik() {
        await connection.beginTransaction();
        await connection.query("SAVEPOINT sp1");
        try {
          await connection.query("DELETE FROM Foo");
          await connection.query("RELEASE SAVEPOINT sp1");
        } catch (e) {
          await connection.query("ROLLBACK TO SAVEPOINT sp1");
        }
        await connection.commit();
      }
    `;
    expect(temukanTryQueryTanpaSavepoint(contoh)).toEqual([]);
  });
});
