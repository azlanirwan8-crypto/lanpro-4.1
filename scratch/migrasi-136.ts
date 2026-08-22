import { getPgPool } from "../src/lib/db";
import { runMigrations } from "../src/lib/pg-migrate";
(async () => {
  await runMigrations(getPgPool());
  console.log("MIGRASI SELESAI");
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
