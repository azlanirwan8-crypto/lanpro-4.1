import { getPgPool } from "../src/lib/db";
import { masterDataRepository } from "../server/repositories/master-data.repository";
import { createRequire } from "module";
const { kodeUnik } = createRequire(import.meta.url)("../server/lib/kode-master.cjs");
const ID = "uji-143-sementara";
(async () => {
  const p = getPgPool();
  await p.query(`DELETE FROM "MasterData" WHERE id=$1`, [ID]);

  const terpakai = await masterDataRepository.findCodesByType("priority");
  console.log("kode priority terpakai:", JSON.stringify(terpakai));

  await masterDataRepository.create({
    id: ID,
    type: "priority",
    label: "Sangat Mendesak",
    code: kodeUnik("Sangat Mendesak", terpakai),
    order: 99,
  } as never);

  const r = await p.query(`SELECT type, label, code FROM "MasterData" WHERE id=$1`, [ID]);
  console.log("baris tercipta:", JSON.stringify(r.rows[0]));

  await p.query(`DELETE FROM "MasterData" WHERE id=$1`, [ID]);
  const sisa = await p.query(`SELECT count(*)::int n FROM "MasterData" WHERE id=$1`, [ID]);
  console.log("dibersihkan, sisa baris uji:", sisa.rows[0].n);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
