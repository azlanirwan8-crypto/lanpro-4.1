import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(
    `SELECT type, count(*)::int AS total,
            count(icon) FILTER (WHERE icon IS NOT NULL AND icon <> '')::int AS ber_ikon,
            count(color) FILTER (WHERE color IS NOT NULL AND color <> '')::int AS ber_warna
       FROM "MasterData" GROUP BY type ORDER BY type`);
  console.table(r.rows);
  process.exit(0);
})();
