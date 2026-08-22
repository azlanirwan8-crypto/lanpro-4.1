import { getPgPool } from "../src/lib/db";
import { taskRepository } from "../server/repositories/task.repository";
const ID = "327ebd06-8be3-4ebb-b04b-32a01628c9b1";
const PID = "2SGXiPUTwHnF8D576hfO";
(async () => {
  const p = getPgPool();
  const kolom = await p.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name='Tasks' AND column_name IN ('resolution','release','category','environment','projectRisk')
      ORDER BY column_name`);
  console.log("kolom ada:", kolom.rows.map((r: any) => r.column_name).join(", "));

  // Tulis lewat jalur repository yang sama dengan rute.
  await taskRepository.updateTaskWithVersionLock(ID, PID, [
    { field: "resolution", val: "Done" },
    { field: "release", val: "R-UJI" },
    { field: "category", val: "Backend" },
    { field: "environment", val: "SIT" },
    { field: "projectRisk", val: "High" },
  ]);
  const r = await p.query(
    `SELECT resolution, release, category, environment, "projectRisk" FROM "Tasks" WHERE id=$1`, [ID]);
  console.log("tersimpan:", JSON.stringify(r.rows[0]));
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
